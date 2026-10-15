const { createHmac, timingSafeEqual } = require("node:crypto");

function verifySignature(rawBody, header, secret, mode, now = Date.now()) {
  if (!Buffer.isBuffer(rawBody) || typeof header !== "string" || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((part) => part.trim().split("=")));
  const timestamp = Number(parts.t);
  if (!/^\d+$/.test(parts.t || "") || !Number.isSafeInteger(timestamp)
      || Math.abs(now / 1000 - timestamp) > 300) return false;
  const signature = parts[mode === "live" ? "li" : "te"];
  if (!/^[a-f\d]{64}$/i.test(signature || "")) return false;
  const expected = createHmac("sha256", secret).update(parts.t + ".").update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

function createWebhookHandler({ db, secret, mode, serverTimestamp, logger = console }) {
  return async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("POST required");
    if (!secret || !["live", "test"].includes(mode)) return res.status(503).send("Webhook not configured");
    if (!verifySignature(req.rawBody, req.get("Paymongo-Signature"), secret, mode)) {
      return res.status(401).send("Invalid signature");
    }
    let event;
    try { event = JSON.parse(req.rawBody.toString("utf8")).data; }
    catch { return res.status(400).send("Invalid JSON"); }
    if (event?.attributes?.type !== "checkout_session.payment.paid") return res.status(200).send("Ignored");
    const session = event.attributes.data;
    const attributes = session?.attributes;
    const uid = attributes?.reference_number;
    const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 128
      && !value.includes("/") && value !== "." && value !== "..";
    const paid = Array.isArray(attributes?.payments)
      ? attributes.payments.find((payment) => payment?.attributes?.status === "paid") : null;
    const items = attributes?.line_items;
    if (!validId(event.id) || !validId(session?.id) || session.type !== "checkout_session"
        || !validId(uid) || attributes.livemode !== (mode === "live")
        || !validId(paid?.id) || paid.attributes.amount !== 29900 || paid.attributes.currency !== "PHP"
        || !Array.isArray(items) || items.length !== 1
        || items[0]?.name !== "BiyaheBulacan Premium" || items[0].amount !== 29900
        || items[0].quantity !== 1 || items[0].currency !== "PHP") {
      return res.status(400).send("Payment does not match Premium checkout");
    }
    try {
      // The session ID deduplicates separate event deliveries for the same purchase.
      const receiptRef = db.collection("premiumPayments").doc(session.id);
      const userRef = db.collection("users").doc(uid);
      await db.runTransaction(async (transaction) => {
        const receipt = await transaction.get(receiptRef);
        if (receipt.exists) return;
        const user = await transaction.get(userRef);
        if (!user.exists) throw new Error("Payment user profile is missing");
        transaction.update(userRef, {
          isPremium: true,
          ...(!user.data().premiumDate ? { premiumDate: serverTimestamp() } : {}),
        });
        transaction.set(receiptRef, {
          userId: uid, eventId: event.id, paymentId: paid.id,
          amount: 29900, currency: "PHP", livemode: mode === "live", processedAt: serverTimestamp(),
        });
      });
      return res.status(200).send("Payment recorded");
    } catch (error) {
      logger.error("Premium payment could not be saved", { eventId: event.id, message: error.message });
      return res.status(500).send("Payment could not be saved; retry delivery");
    }
  };
}

module.exports = { verifySignature, createWebhookHandler };
