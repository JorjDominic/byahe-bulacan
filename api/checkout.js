export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, userName, userEmail } = req.body;
  
  // SECURED: Now pulling from Vercel Environment Variables
  const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY; 
  const encodedKey = Buffer.from(PAYMONGO_SECRET_KEY + ":").toString('base64');

  try {
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
            // FIXED: Using live URLs instead of localhost
            success_url: "https://biyahe-bulacan.vercel.app/?payment=success",
            cancel_url: "https://biyahe-bulacan.vercel.app/?payment=cancelled",
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
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Failed to connect to PayMongo" });
  }
}