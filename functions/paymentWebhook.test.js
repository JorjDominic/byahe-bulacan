const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const { verifySignature, createWebhookHandler } = require("./paymentWebhook");
const secret = "test-webhook-secret";
function event(live = false) {
  return { data: { id: "evt_1", attributes: { type: "checkout_session.payment.paid", data: {
    id: "cs_1", type: "checkout_session", attributes: {
      reference_number: "order_1", livemode: live,
      line_items: [{ name: "BiyaheBulacan Premium", amount: 29900, currency: "PHP", quantity: 1 }],
      payments: [{ id: "pay_1", attributes: { status: "paid", amount: 29900, currency: "PHP" } }],
    },
  } } } };
}
function request(payload = event(), mode = "test", timestamp = Math.floor(Date.now() / 1000)) {
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(timestamp + ".").update(rawBody).digest("hex");
  return { method: "POST", rawBody, get: () => `t=${timestamp},${mode === "live" ? "li" : "te"}=${signature}` };
}
function setup({ missingUser = false, fail = false, mode = "test" } = {}) {
  const records = new Map(missingUser ? [] : [["users/user_1", { isPremium: false }]]);
  records.set("premiumOrders/order_1", {
    userId: "user_1", status: "pending", checkoutSessionId: "cs_1", amount: 29900, currency: "PHP",
  });
  let writes = 0;
  const db = {
    collection: (name) => ({ doc: (id) => `${name}/${id}` }),
    runTransaction: async (callback) => {
      if (fail) throw new Error("Firestore unavailable");
      const pending = [];
      await callback({
        get: async (ref) => ({ exists: records.has(ref), data: () => records.get(ref) }),
        update: (ref, data) => pending.push([ref, { ...records.get(ref), ...data }]),
        set: (ref, data) => pending.push([ref, data]),
      });
      for (const [ref, data] of pending) { records.set(ref, data); writes++; }
    },
  };
  const handler = createWebhookHandler({ db, secret, mode, serverTimestamp: () => "server-time", logger: { error() {} } });
  const call = async (req) => {
    const res = { status(code) { this.code = code; return this; }, send(body) { this.body = body; return this; } };
    await handler(req, res);
    return res;
  };
  return { call, records, writes: () => writes };
}

test("verifies exact raw bytes, test/live signatures and rejects tampering, stale timestamps", () => {
  for (const mode of ["test", "live"]) {
    const req = request(event(mode === "live"), mode);
    assert.equal(verifySignature(req.rawBody, req.get(), secret, mode), true);
    assert.equal(verifySignature(Buffer.from("{}"), req.get(), secret, mode), false);
    assert.equal(verifySignature(req.rawBody, req.get(), "wrong", mode), false);
    assert.equal(verifySignature(req.rawBody, req.get(), secret, mode === "test" ? "live" : "test"), false);
  }
  const old = request(event(), "test", Math.floor(Date.now() / 1000) - 600);
  assert.equal(verifySignature(old.rawBody, old.get(), secret, "test"), false);
});
test("paid checkout upgrades the user and duplicate sessions do not write again", async () => {
  const { call, records, writes } = setup();
  assert.equal((await call(request())).code, 200);
  assert.equal(records.get("users/user_1").isPremium, true);
  assert.equal(records.get("premiumOrders/order_1").status, "paid");
  const duplicate = event(); duplicate.data.id = "evt_retry";
  assert.equal((await call(request(duplicate))).code, 200);
  assert.equal(writes(), 2);
});
test("rejects unsigned, wrong-mode, unpaid, underpaid, wrong-currency and malformed purchases", async () => {
  const { call, writes } = setup();
  const unsigned = request(); unsigned.get = () => undefined;
  assert.equal((await call(unsigned)).code, 401);
  for (const mutate of [
    (a) => { a.livemode = true; },
    (a) => { a.payments[0].attributes.status = "failed"; },
    (a) => { a.payments[0].attributes.amount = 100; },
    (a) => { a.payments[0].attributes.currency = "USD"; },

    (a) => { a.reference_number = "bad/id"; },
    (a) => { a.payments = {}; },
  ]) {
    const payload = event(); mutate(payload.data.attributes.data.attributes);
    assert.equal((await call(request(payload))).code, 400);
  }
  assert.equal(writes(), 0);
});
test("returns errors on missing profile or database failure so payment is not acknowledged", async () => {
  for (const options of [{ missingUser: true }, { fail: true }]) {
    const { call, writes } = setup(options);
    assert.equal((await call(request())).code, 500);
    assert.equal(writes(), 0);
  }
});
test("ignores unrelated signed events and rejects non-POST requests", async () => {
  const { call, writes } = setup();
  const payload = event(); payload.data.attributes.type = "payment.failed";
  assert.equal((await call(request(payload))).code, 200);
  assert.equal((await call({ method: "GET" })).code, 405);
  assert.equal(writes(), 0);
});
test("live mode accepts live signatures and rejects test signatures", async () => {
  const { call } = setup({ mode: "live" });
  assert.equal((await call(request())).code, 401);
  assert.equal((await call(request(event(true), "live"))).code, 200);
});

test("Hosted Checkout v2 envelope upgrades the same order without line items", async () => {
  const payload = event();
  const envelope = payload.data.attributes;
  envelope.livemode = false;
  delete envelope.data.attributes.line_items;
  delete envelope.data.attributes.livemode;
  const { call, records } = setup();
  assert.equal((await call(request({ event_type: "send.webhook", data: envelope }))).code, 200);
  assert.equal(records.get("users/user_1").isPremium, true);
});
test("unknown orders, wrong sessions and mismatched server orders cannot grant access", async () => {
  for (const mutate of [
    (payload, records) => { payload.data.attributes.data.attributes.reference_number = "unknown"; },
    (payload, records) => { payload.data.attributes.data.id = "cs_other"; },
    (payload, records) => { records.get("premiumOrders/order_1").amount = 100; },
  ]) {
    const { call, records, writes } = setup(); const payload = event();
    mutate(payload, records);
    assert.equal((await call(request(payload))).code, 500);
    assert.equal(records.get("users/user_1").isPremium, false);
    assert.equal(writes(), 0);
  }
});
