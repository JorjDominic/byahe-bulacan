const crypto = require("crypto");

function cleanBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function safeEqualHex(left, right) {
  const validHex = /^[a-f0-9]{64}$/i;
  if (!validHex.test(left || "") || !validHex.test(right || "")) return false;
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function verifyPayMongoSignature(rawBody, signatureHeader, webhookSecret, testMode) {
  if (!rawBody || !signatureHeader || !webhookSecret) return false;

  const fields = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const separator = part.indexOf("=");
      return separator === -1
        ? [part.trim(), ""]
        : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    })
  );
  const timestamp = Number(fields.t);
  if (!Number.isFinite(timestamp)) return false;

  // Reject stale deliveries to reduce replay risk. PayMongo retries promptly.
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const suppliedSignature = testMode ? fields.te : fields.li;
  const signedPayload = `${fields.t}.${rawBody.toString("utf8")}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  return safeEqualHex(expectedSignature, suppliedSignature);
}

module.exports = { cleanBaseUrl, verifyPayMongoSignature };
