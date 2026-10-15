const admin = require("firebase-admin");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");
const { cleanBaseUrl } = require("./paymongo");
const { createWebhookHandler } = require("./paymentWebhook");

admin.initializeApp();

const db = admin.firestore();
const PAYMONGO_SECRET_KEY = defineSecret("PAYMONGO_SECRET_KEY");
const PAYMONGO_WEBHOOK_SECRET = defineSecret("PAYMONGO_WEBHOOK_SECRET");
const DEFAULT_APP_BASE_URL = "https://byahe-bulacan-743h.vercel.app";

const PREMIUM_AMOUNT = 29900;
const PREMIUM_CURRENCY = "PHP";

exports.createPremiumCheckout = onCall(
  { invoker: "public", secrets: [PAYMONGO_SECRET_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in before upgrading.");
    }

    const userId = request.auth.uid;
    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "Your user profile is missing.");
    }
    if (userSnapshot.get("isPremium") === true) {
      throw new HttpsError("already-exists", "This account already has Premium access.");
    }

    const orderRef = db.collection("premiumOrders").doc();
    await orderRef.set({
      userId,
      amount: PREMIUM_AMOUNT,
      currency: PREMIUM_CURRENCY,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const baseUrl = cleanBaseUrl(process.env.APP_BASE_URL || DEFAULT_APP_BASE_URL);
    const payMongoKey = PAYMONGO_SECRET_KEY.value();
    const encodedKey = Buffer.from(`${payMongoKey}:`).toString("base64");

    try {
      const response = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": orderRef.id,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              billing: {
                name: userSnapshot.get("name") || "Traveler",
                email: request.auth.token.email || userSnapshot.get("email"),
              },
              line_items: [
                {
                  name: "BiyaheBulacan Premium",
                  description: "Lifetime Premium access",
                  amount: PREMIUM_AMOUNT,
                  currency: PREMIUM_CURRENCY,
                  quantity: 1,
                },
              ],
              payment_method_types: ["card", "gcash", "qrph"],
              reference_number: orderRef.id,
              metadata: { orderId: orderRef.id, product: "premium-lifetime" },
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              success_url: `${baseUrl}/?payment=success&order=${encodeURIComponent(orderRef.id)}`,
              cancel_url: `${baseUrl}/?payment=cancelled`,
            },
          },
        }),
      });
      const result = await response.json();
      const checkoutSession = result?.data;
      const checkoutUrl = checkoutSession?.attributes?.checkout_url;

      if (!response.ok || !checkoutSession?.id || !checkoutUrl) {
        logger.error("PayMongo checkout creation failed", {
          status: response.status,
          orderId: orderRef.id,
          errors: result?.errors,
        });
        await orderRef.update({
          status: "checkout_failed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        throw new HttpsError("internal", "PayMongo could not start checkout.");
      }

      await orderRef.update({
        checkoutSessionId: checkoutSession.id,
        checkoutUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { checkoutUrl };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Unexpected checkout error", { orderId: orderRef.id, error });
      await orderRef.update({
        status: "checkout_failed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw new HttpsError("internal", "PayMongo could not start checkout.");
    }
  }
);
exports.paymongoWebhook = onRequest(
  {
    region: "us-central1", invoker: "public",
    secrets: [PAYMONGO_SECRET_KEY, PAYMONGO_WEBHOOK_SECRET],
  },
  (req, res) => {
    const key = PAYMONGO_SECRET_KEY.value();
    const mode = /^sk_live_/.test(key) ? "live" : /^sk_test_/.test(key) ? "test" : "invalid";
    return createWebhookHandler({
      db, secret: PAYMONGO_WEBHOOK_SECRET.value(), mode,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(), logger,
    })(req, res);
  }
);
