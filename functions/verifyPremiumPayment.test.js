const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createPaymentVerifier } = require("./verifyPremiumPayment");
function setup() {
  const records = new Map([
    ["premiumOrders/order_1", { userId: "user_1", checkoutSessionId: "cs_1", amount: 29900, currency: "PHP", status: "pending" }],
    ["users/user_1", { isPremium: false }],
  ]);
  const session = { id: "cs_1", type: "checkout_session", attributes: {
    reference_number: "order_1", livemode: false,
    payments: [{ id: "pay_1", attributes: { amount: 29900, currency: "PHP", status: "paid" } }],
  } };
  const snapshot = (path) => ({ exists: records.has(path), data: () => records.get(path) });
  const db = {
    collection: (name) => ({ doc: (id) => ({ path: name + "/" + id, get: async () => snapshot(name + "/" + id) }) }),
    runTransaction: async (callback) => {
      const writes = [];
      await callback({ get: async (ref) => snapshot(ref.path), update: (ref, data) => writes.push([ref.path, data]) });
      for (const [path, data] of writes) records.set(path, { ...records.get(path), ...data });
    },
  };
  let calls = 0; let providerOk = true;
  const verify = createPaymentVerifier({ db, getSecret: () => "sk_test_example", serverTimestamp: () => "now", fetchSession: async (url) => {
    calls++;
    assert.equal(url, "https://api.paymongo.com/v1/checkout_sessions/cs_1");
    return { ok: providerOk, json: async () => ({ data: session }) };
  } });
  return { verify, records, session, calls: () => calls, fail: () => { providerOk = false; } };
}
const request = { auth: { uid: "user_1" }, data: { orderId: "order_1" } };
test("server-confirmed paid checkout upgrades the owning user even without webhook", async () => {
  const { verify, records } = setup();
  assert.deepEqual(await verify(request), { paid: true });
  assert.equal(records.get("users/user_1").isPremium, true);
  assert.equal(records.get("premiumOrders/order_1").status, "paid");
  assert.deepEqual(await verify(request), { paid: true });
});
test("unpaid checkout never grants access regardless of redirect", async () => {
  const { verify, records, session } = setup(); session.attributes.payments = [];
  assert.deepEqual(await verify(request), { paid: false });
  assert.equal(records.get("users/user_1").isPremium, false);
});
test("unauthenticated, other-user and missing-order lookups cannot reach provider", async () => {
  const { verify, calls } = setup();
  await assert.rejects(verify({ data: request.data }), { code: "unauthenticated" });
  await assert.rejects(verify({ auth: { uid: "other" }, data: request.data }), { code: "permission-denied" });
  await assert.rejects(verify({ auth: request.auth, data: { orderId: "unknown" } }), { code: "permission-denied" });
  assert.equal(calls(), 0);
});
test("wrong amount, currency, session, reference and mode cannot grant Premium", async () => {
  for (const mutate of [
    (s) => { s.attributes.payments[0].attributes.amount = 1; },
    (s) => { s.attributes.payments[0].attributes.currency = "USD"; },
    (s) => { s.id = "cs_other"; },
    (s) => { s.attributes.reference_number = "different"; },
    (s) => { s.attributes.livemode = true; },
  ]) {
    const { verify, records, session } = setup(); mutate(session);
    await assert.rejects(verify(request), { code: "failed-precondition" });
    assert.equal(records.get("users/user_1").isPremium, false);
  }
});
test("provider failures do not change Premium status", async () => {
  const { verify, records, fail } = setup(); fail();
  await assert.rejects(verify(request), { code: "unavailable" });
  assert.equal(records.get("users/user_1").isPremium, false);
});
test("paid orders with a false Premium flag are repaired after re-verification", async () => {
  const { verify, records } = setup(); records.get("premiumOrders/order_1").status = "paid";
  assert.deepEqual(await verify(request), { paid: true });
  assert.equal(records.get("users/user_1").isPremium, true);
});
