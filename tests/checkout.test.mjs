import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('../api/checkout.js', import.meta.url), 'utf8');
const { default: handler } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const originalFetch = globalThis.fetch;
const originalKey = process.env.PAYMONGO_SECRET_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.PAYMONGO_SECRET_KEY;
  else process.env.PAYMONGO_SECRET_KEY = originalKey;
});
const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('checkout rejects unauthenticated requests without contacting PayMongo', async () => {
  process.env.PAYMONGO_SECRET_KEY = 'sk_test_example';
  globalThis.fetch = () => { throw new Error('Must not fetch'); };
  const res = response(); await handler({ method: 'POST', headers: {}, body: { userId: 'victim' } }, res);
  assert.equal(res.code, 401);
});
test('checkout uses verified Firebase identity and the current return domain', async () => {
  process.env.PAYMONGO_SECRET_KEY = 'sk_test_example';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => calls.length === 1
      ? { users: [{ localId: 'actual-user', email: 'actual@example.com' }] }
      : { data: { attributes: { checkout_url: 'https://checkout.paymongo.com/example' } } } };
  };
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer signed-token' }, body: { userId: 'victim' } }, res);
  assert.equal(res.code, 200);
  assert.equal(calls[0].body.idToken, 'signed-token');
  const attrs = calls[1].body.data.attributes;
  assert.equal(attrs.reference_number, 'actual-user');
  assert.equal(attrs.billing.email, 'actual@example.com');
  assert.equal(attrs.line_items[0].amount, 29900);
  assert.equal(attrs.success_url, 'https://byahe-bulacan-743h.vercel.app/?payment=success');
});
test('invalid identity never creates checkout; provider errors are not reported as success', async () => {
  process.env.PAYMONGO_SECRET_KEY = 'sk_test_example';
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: false, json: async () => ({ error: {} }) }; };
  let res = response();
  const req = { method: 'POST', headers: { authorization: 'Bearer invalid' } };
  await handler(req, res); assert.equal(res.code, 401); assert.equal(calls, 1);
  calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: calls === 1, json: async () => calls === 1 ? { users: [{ localId: 'user' }] } : { errors: [] } };
  };
  res = response(); await handler(req, res); assert.equal(res.code, 502);
});
test('missing payment configuration fails before authentication or checkout', async () => {
  delete process.env.PAYMONGO_SECRET_KEY;
  const res = response(); await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.code, 503);
});
