const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { createWebhookHandler } = require("./paymentWebhook");

admin.initializeApp();
const webhookSecret = defineSecret("PAYMONGO_WEBHOOK_SECRET");
const paymentMode = defineString("PAYMONGO_MODE", { default: "test" });

exports.paymongoWebhook = onRequest({
  region: "us-central1", secrets: [webhookSecret], invoker: "public",
}, (req, res) => createWebhookHandler({
  db: admin.firestore(), secret: webhookSecret.value(), mode: paymentMode.value(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
})(req, res));
