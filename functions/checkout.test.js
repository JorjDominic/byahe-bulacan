const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const { createPremiumCheckout } = require("./index");
const db = admin.firestore();
const originalCollection = db.collection;
const originalFetch = global.fetch;
const originalKey = process.env.PAYMONGO_SECRET_KEY;
const originalBase = process.env.APP_BASE_URL;
afterEach(() => {
  db.collection = originalCollection; global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.PAYMONGO_SECRET_KEY; else process.env.PAYMONGO_SECRET_KEY = originalKey;
  if (originalBase === undefined) delete process.env.APP_BASE_URL; else process.env.APP_BASE_URL = originalBase;
});
function setup({ premium = false, providerOk = true } = {}) {
  const orders = []; const requests = [];
  process.env.PAYMONGO_SECRET_KEY = "sk_test_example"; delete process.env.APP_BASE_URL;
  db.collection = (name) => ({ doc: (id) => name === "users" ? {
    get: async () => ({ exists: true, get: (key) => ({ name: "Traveler", isPremium: premium })[key] }),
  } : {
    id: "order_1", set: async (data) => orders.push(data), update: async (data) => orders.push(data),
  } });
  global.fetch = async (url, options) => {
    requests.push({ url, ...options, payload: JSON.parse(options.body) });
    return { ok: providerOk, status: providerOk ? 200 : 400, json: async () => ({
      data: { id: "cs_1", attributes: { checkout_url: "https://checkout.paymongo.com/example" } },
    }) };
  };
  return { orders, requests };
}
test("Firebase checkout rejects unauthenticated callers", async () => {
  await assert.rejects(createPremiumCheckout.run({ data: { userId: "victim" } }), { code: "unauthenticated" });
});
test("Firebase checkout binds an order to authenticated user and uses current redirect domain", async () => {
  const { orders, requests } = setup();
  const result = await createPremiumCheckout.run({ auth: { uid: "actual-user", token: { email: "actual@example.com" } }, data: { userId: "victim", amount: 1 } });
  assert.equal(result.checkoutUrl, "https://checkout.paymongo.com/example");
  assert.equal(orders[0].userId, "actual-user");
  assert.equal(orders[0].amount, 29900);
  const attrs = requests[0].payload.data.attributes;
  assert.equal(attrs.reference_number, "order_1");
  assert.equal(attrs.success_url, "https://byahe-bulacan-743h.vercel.app/?payment=success&order=order_1");
  assert.equal(requests[0].headers["Idempotency-Key"], "order_1");
  assert.equal(orders[1].checkoutSessionId, "cs_1");
});
test("existing Premium accounts cannot start another checkout", async () => {
  const { requests } = setup({ premium: true });
  await assert.rejects(createPremiumCheckout.run({ auth: { uid: "user", token: {} } }), { code: "already-exists" });
  assert.equal(requests.length, 0);
});
test("provider rejection marks the order failed and returns an error", async () => {
  const { orders } = setup({ providerOk: false });
  await assert.rejects(createPremiumCheckout.run({ auth: { uid: "user", token: {} } }), { code: "internal" });
  assert.equal(orders.at(-1).status, "checkout_failed");
});
