export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY; 
  if (!/^sk_(test|live)_/.test(PAYMONGO_SECRET_KEY || "")) {
    return res.status(503).json({ error: "Payments are not configured yet." });
  }
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ error: "Please sign in before paying." });
  const encodedKey = Buffer.from(PAYMONGO_SECRET_KEY + ":").toString('base64');

  try {
    // Validate the token against the same v2 project used by the app.
    // This public web API key identifies the project; it is not a server secret.
    const authResponse = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyAj6GwQBL0HzMps7uggUiv-fcaAQZG3K80", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
    const identity = await authResponse.json();
    const user = identity.users?.[0];
    if (!authResponse.ok || !user?.localId || user.disabled) {
      return res.status(401).json({ error: "Your session expired. Please sign in again." });
    }
    const userId = user.localId;
    const userName = user.displayName || "Traveler";
    const userEmail = user.email;
    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        authorization: `Basic ${encodedKey}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            payment_method_types: ["gcash", "paymaya", "card"],
            line_items: [
              {
                currency: "PHP",
                amount: 29900,
                name: "BiyaheBulacan Premium",
                quantity: 1,
                description: "Lifetime access to unlimited itineraries."
              }
            ],
            // Return travelers to the current production deployment.
            success_url: "https://byahe-bulacan-743h.vercel.app/?payment=success",
            cancel_url: "https://byahe-bulacan-743h.vercel.app/?payment=cancelled",
            reference_number: userId,
            billing: {
              name: userName || "Traveler",
              email: userEmail
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: "PayMongo could not create checkout. Please try again." });
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Failed to connect to PayMongo" });
  }
}
