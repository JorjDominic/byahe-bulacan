const { HttpsError } = require("firebase-functions/v2/https");
const { fulfillPremiumPayment } = require("./paymentWebhook");

function createPaymentVerifier({ db, getSecret, serverTimestamp, fetchSession = fetch }) {
  return async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in.");
    const orderId = request.data?.orderId;
    if (typeof orderId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(orderId)) {
      throw new HttpsError("invalid-argument", "A valid payment order is required.");
    }
    const snapshot = await db.collection("premiumOrders").doc(orderId).get();
    if (!snapshot.exists || snapshot.data().userId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "This payment order is not available.");
    }
    const order = snapshot.data();
    if (!/^cs_[a-zA-Z0-9]+$/.test(order.checkoutSessionId || "")) {
      throw new HttpsError("failed-precondition", "Checkout has not been created yet.");
    }
    const key = getSecret();
    if (!/^sk_(test|live)_/.test(key || "")) throw new HttpsError("unavailable", "Payments are not configured.");
    let result;
    try {
      const response = await fetchSession("https://api.paymongo.com/v1/checkout_sessions/" + order.checkoutSessionId, {
        headers: { Authorization: "Basic " + Buffer.from(key + ":").toString("base64"), accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Payment lookup failed");
      result = await response.json();
    } catch {
      throw new HttpsError("unavailable", "Payment could not be checked. Please try again shortly.");
    }
    const session = result?.data;
    const attributes = session?.attributes;
    if (session?.id !== order.checkoutSessionId || session?.type !== "checkout_session"
        || attributes?.reference_number !== orderId || attributes?.livemode !== key.startsWith("sk_live_")) {
      throw new HttpsError("failed-precondition", "Payment details do not match this order.");
    }
    const paid = Array.isArray(attributes.payments)
      ? attributes.payments.find((payment) => payment?.attributes?.status === "paid") : null;
    if (!paid) return { paid: false };
    if (typeof paid.id !== "string" || !/^pay_[a-zA-Z0-9]+$/.test(paid.id)
        || paid.attributes.amount !== 29900 || paid.attributes.currency !== "PHP") {
      throw new HttpsError("failed-precondition", "Payment does not match the Premium price.");
    }
    await fulfillPremiumPayment({ db, orderId, session, paid, serverTimestamp });
    return { paid: true };
  };
}

module.exports = { createPaymentVerifier };
