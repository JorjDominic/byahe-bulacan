# PayMongo setup for the merged payment flow

The final app creates checkout sessions and receives payment confirmations in
Firebase. Vercel hosts the website. The old Vercel /api/checkout route is removed.

## 1. Prepare Firebase

Select byahe-bulacan-v2. Enable Email/Password sign-in, confirm Firestore and the
paying user's users/{uid} profile exist. Cloud Functions requires the Blaze plan.
Accounts and records from the old project do not move automatically.

In Vercel, remove old Firebase environment overrides or set them to the v2 values
from .env.example. Keep the Maps API key and map ID. Authorize the current domain
https://byahe-bulacan-743h.vercel.app/* in the Maps key's website restrictions.

## 2. Save the API secret in Firebase

Run from the project folder in PowerShell:

```powershell
firebase login --reauth
npm --prefix functions ci
firebase functions:secrets:set PAYMONGO_SECRET_KEY --project byahe-bulacan-v2
```

Paste the sk_test_... API key when prompted. Firebase cannot read the key already
in Vercel, so save it in Firebase too. Never prefix payment secrets with REACT_APP_.
Test/live mode now comes from this API key. PAYMONGO_MODE is no longer used.

## 3. Add the PayMongo webhook

In PayMongo test mode, open Developers > Webhooks > Add endpoint.
Use this address:

```text
https://us-central1-byahe-bulacan-v2.cloudfunctions.net/paymongoWebhook
```

Subscribe to checkout_session.payment.paid. Save and copy the webhook signing
secret, which is different from the API key. The endpoint becomes available
when deployment completes. Do not accept payments until setup finishes.

## 4. Save the signing secret and deploy

```powershell
firebase functions:secrets:set PAYMONGO_WEBHOOK_SECRET --project byahe-bulacan-v2
```

Paste the webhook signing secret. Then deploy all three payment functions:

```powershell
firebase deploy --only "functions:createPremiumCheckout,functions:paymongoWebhook,functions:verifyPremiumPayment" --project byahe-bulacan-v2
```

Confirm all three functions deploy in us-central1. If Firebase prints a different public
webhook URL, use that exact URL in PayMongo. A browser GET returning 405 is expected;
PayMongo sends signed POST requests.

The default return domain is https://byahe-bulacan-743h.vercel.app/.
If functions/.env.byahe-bulacan-v2 contains APP_BASE_URL, update it to that domain
or remove the override. This file is ignored by Git.

If Firebase refuses to replace an existing first-generation function, pause
payment testing, disable the PayMongo endpoint, delete only the old conflicting
function from Firebase Console, and deploy again. Re-enable the endpoint afterward.
This code uses second-generation functions.

Review and deploy rules/indexes to v2 as needed:

```powershell
firebase deploy --only "firestore:rules,firestore:indexes" --project byahe-bulacan-v2
```

Users can read their profile but cannot change their own isPremium. Payment orders
are server-only under the catch-all deny rule.

## 5. Redeploy Vercel and test

Deploy the merged source to the Vercel project serving
https://byahe-bulacan-743h.vercel.app/.

Sign in with a v2 account, start checkout from the app and finish a test payment.
Verify:

- A premiumOrders document is created for the signed-in user.
- PayMongo's webhook delivery receives HTTP 200.
- The order becomes paid and users/{uid}.isPremium becomes true.
- The website shows Premium without signing out/in.
- Re-delivering the payment does not grant access twice.

Only signed confirmations with the matching amount, currency, mode, order and
session grant access. Both documented PayMongo event envelope formats are supported.
A URL containing payment=success cannot grant Premium by itself.

On return, the website also calls verifyPremiumPayment with the order ID. This
function checks the signed-in user's order directly with PayMongo and grants
Premium only after validating the paid checkout. It can recover from a delayed
or missed webhook using the existing PAYMONGO_SECRET_KEY. It requires no new
secret. Redeploy the website too so this verification runs after checkout.

npm start serves React. Firebase callable functions still need deployment for
local checkout. The return domain remains the requested production site.

## Troubleshooting

```powershell
firebase functions:log --only paymongoWebhook --project byahe-bulacan-v2
```

- 401: wrong signing secret, test/live mismatch, invalid or stale signature.
- 400: invalid payment, wrong amount/currency/mode, or missing order reference.
- 500: missing order/profile, session mismatch or Firebase write failure. Fix the
  cause and retry delivery in PayMongo where available; old events may not replay.
- 403 before the handler: the webhook must allow public requests. Its signature
  authenticates PayMongo.
- Profile error: verify the deployed app targets v2, with the correct users and rules.

Generic dashboard sample events may not match real orders. Test through the app.
Previous UID-based Vercel payments require separate payment verification/account
mapping and are not automatically reconciled as new orders.

## Real payments

After testing, set Firebase PAYMONGO_SECRET_KEY to the sk_live_... API key. Configure
the live PayMongo webhook and store its signing secret in Firebase. Redeploy both
functions before accepting real payments. Live mode rejects test confirmations.
Use a separate project/deployment if test and live must operate at the same time.

## Code checks

```powershell
npm --prefix functions test
$env:CI = 'true'
npm test -- --watchAll=false --runInBand
npm run build
```

References:
- https://docs.paymongo.com/docs/developer-tools-webhook-setup-management
- https://docs.paymongo.com/docs/developer-tools-webhooks-events
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- https://firebase.google.com/docs/functions/config-env
- https://firebase.google.com/docs/functions/http-events
