const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Replace this with your PayMongo SECRET key (starts with sk_test_)
const PAYMONGO_SECRET_KEY = "sk_test_YOUR_PAYMONGO_SECRET_KEY"; 
const ENCODED_KEY = Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64");

// 1. Endpoint to create a checkout session
exports.createPremiumCheckout = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userId, userEmail, userName } = req.body;

      const options = {
        method: 'POST',
        url: 'https://api.paymongo.com/v1/checkout_sessions',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          authorization: `Basic ${ENCODED_KEY}`
        },
        data: {
          data: {
            attributes: {
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              payment_method_types: ['gcash', 'paymaya', 'card'],
              line_items: [
                {
                  currency: 'PHP',
                  amount: 29900, // ₱299.00 (Amount must be in centavos)
                  name: 'BiyaheBulacan Premium',
                  quantity: 1,
                  description: 'Lifetime access to unlimited itineraries and multi-day planning.'
                }
              ],
              // We pass the userId in the reference_number so we know who paid later!
              reference_number: userId, 
              success_url: 'http://localhost:3000/dashboard?payment=success',
              cancel_url: 'http://localhost:3000/dashboard?payment=cancelled',
              billing: {
                name: userName,
                email: userEmail
              }
            }
          }
        }
      };

      const response = await axios.request(options);
      
      // Send the checkout URL back to React
      res.status(200).send({ checkoutUrl: response.data.data.attributes.checkout_url });

    } catch (error) {
      console.error("PayMongo Error:", error.response ? error.response.data : error);
      res.status(500).send({ error: "Failed to create checkout session" });
    }
  });
});

// 2. Webhook Endpoint to listen for successful payments
exports.paymongoWebhook = functions.https.onRequest(async (req, res) => {
  // PayMongo sends a POST request here when an event happens
  const event = req.body.data.attributes.type;

  if (event === "checkout_session.payment.paid") {
    // Extract the userId we passed earlier
    const userId = req.body.data.attributes.data.attributes.reference_number; 

    try {
      // Automatically upgrade the user in Firestore!
      await admin.firestore().collection("users").doc(userId).update({
        isPremium: true,
        premiumDate: new Date().toISOString()
      });
      console.log(`Successfully upgraded user: ${userId}`);
    } catch (error) {
      console.error("Failed to update user in Firestore:", error);
    }
  }

  // Always respond with 200 so PayMongo knows you received it
  res.status(200).send("Webhook received"); 
});