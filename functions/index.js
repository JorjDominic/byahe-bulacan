const admin = require("firebase-admin");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");
const { cleanBaseUrl, verifyPayMongoSignature } = require("./paymongo");

admin.initializeApp();

const db = admin.firestore();
const PAYMONGO_SECRET_KEY = defineSecret("PAYMONGO_SECRET_KEY");
const PAYMONGO_WEBHOOK_SECRET = defineSecret("PAYMONGO_WEBHOOK_SECRET");
const DEFAULT_APP_BASE_URL = "https://biyahe-bulacan.vercel.app";

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
    invoker: "public",
    secrets: [PAYMONGO_SECRET_KEY, PAYMONGO_WEBHOOK_SECRET],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const rawBody = req.rawBody;
    const signature = req.get("paymongo-signature");
    const testMode = PAYMONGO_SECRET_KEY.value().startsWith("sk_test_");
    if (!verifyPayMongoSignature(
      rawBody,
      signature,
      PAYMONGO_WEBHOOK_SECRET.value(),
      testMode
    )) {
      logger.warn("Rejected PayMongo webhook with an invalid signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const event = req.body?.data;
    if (event?.type !== "checkout_session.payment.paid") {
      res.status(200).json({ received: true });
      return;
    }

    const session = event.data;
    const orderId = session?.attributes?.reference_number;
    const paidPayment = session?.attributes?.payments?.find(
      (payment) => payment?.attributes?.status === "paid"
    );

    if (!orderId || !session?.id || !paidPayment) {
      logger.error("Paid webhook is missing required checkout data");
      res.status(400).json({ error: "Invalid event data" });
      return;
    }

    try {
      const orderRef = db.collection("premiumOrders").doc(orderId);
      await db.runTransaction(async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists) throw new Error("Premium order not found");

        const order = orderSnapshot.data();
        if (order.status === "paid") return;
        if (order.checkoutSessionId !== session.id) throw new Error("Checkout session mismatch");
        if (paidPayment.attributes.currency !== PREMIUM_CURRENCY) {
          throw new Error("Payment currency mismatch");
        }
        if (paidPayment.attributes.amount !== PREMIUM_AMOUNT) {
          throw new Error("Payment amount mismatch");
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        transaction.update(db.collection("users").doc(order.userId), {
          isPremium: true,
          premiumDate: now,
          premiumOrderId: orderId,
        });
        transaction.update(orderRef, {
          status: "paid",
          paymentId: paidPayment.id,
          paidAt: now,
          updatedAt: now,
        });
      });

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error("PayMongo webhook processing failed", { orderId, error });
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);
