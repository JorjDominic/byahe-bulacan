const crypto = require("crypto");
const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanBaseUrl, verifyPayMongoSignature } = require("./paymongo");

test("cleanBaseUrl removes one trailing slash", () => {
  assert.equal(cleanBaseUrl("https://example.com/"), "https://example.com");
});

test("verifyPayMongoSignature accepts a current test signature", () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = Buffer.from('{"data":{"type":"checkout_session.payment.paid"}}');
  const secret = "whsec_test";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body.toString("utf8")}`)
    .digest("hex");

  assert.equal(
    verifyPayMongoSignature(body, `t=${timestamp},te=${signature},li=`, secret, true),
    true
  );
});

test("verifyPayMongoSignature rejects tampering and stale events", () => {
  const oldTimestamp = Math.floor(Date.now() / 1000) - 301;
  const body = Buffer.from("{}");
  const secret = "whsec_test";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${oldTimestamp}.${body.toString("utf8")}`)
    .digest("hex");

  assert.equal(
    verifyPayMongoSignature(body, `t=${oldTimestamp},te=${signature},li=`, secret, true),
    false
  );
  assert.equal(
    verifyPayMongoSignature(body, `t=${Math.floor(Date.now() / 1000)},te=bad,li=`, secret, true),
    false
  );
});
