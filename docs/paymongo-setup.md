# PayMongo Premium setup

The website creates checkout sessions on Vercel. PayMongo sends payment
confirmations to a Firebase function in `byahe-bulacan-v2`. Only a signed,
matching PHP 299 payment can update `users/{uid}.isPremium` to `true`.
The app listens for that change automatically. The return URL does not grant access.

## 1. Prepare Firebase

Open Firebase Console and select **byahe-bulacan-v2**.

- Enable Authentication > Email/Password if not already enabled.
- Confirm the Firestore database and the paying user's `users/{uid}` profile exist
  in this project. Accounts and records from the old project do not move automatically.
- Cloud Functions deployment requires the **Blaze** billing plan.
- Confirm the deployed Firestore rules allow users to read their own profile
  and do not allow them to change their own `isPremium`. The repository's
  `firestore.rules` already does this; its catch-all also protects `premiumPayments`.

From PowerShell in the project folder:

```powershell
firebase login --reauth
npm --prefix functions ci
```

Use a current Firebase CLI that supports Node.js 24 and 2nd-generation functions.

## 2. Add the payment confirmation address in PayMongo

Start with **test mode** in PayMongo Dashboard.
Go to **Developers > Webhooks > Add endpoint**.

Endpoint URL:

```text
https://us-central1-byahe-bulacan-v2.cloudfunctions.net/paymongoWebhook
```

Select the event:

```text
checkout_session.payment.paid
```

Save the endpoint and copy its **webhook signing secret**. This is different from
an API secret key starting with `sk_test_` or `sk_live_`.
The endpoint will become available after step 3. Do not take payments until setup finishes.

## 3. Save the webhook secret in Firebase and deploy

Run:

```powershell
firebase functions:secrets:set PAYMONGO_WEBHOOK_SECRET --project byahe-bulacan-v2
```

When prompted, paste the **webhook signing secret** from step 2 into the terminal.
Do not put it in React code, commit it, or send it in chat.

Create the function's local configuration (this file is ignored by Git):

```powershell
Set-Content -LiteralPath functions/.env.byahe-bulacan-v2 -Value 'PAYMONGO_MODE=test'
```

If that file already contains other settings, edit/add only `PAYMONGO_MODE` instead
of replacing the file.

Deploy only the webhook:

```powershell
firebase deploy --only functions:paymongoWebhook --project byahe-bulacan-v2
```

Confirm the deployment prints a function URL. If it prints a `run.app` URL,
that is also a valid public function endpoint; you can use that exact URL in PayMongo.
Check that the PayMongo endpoint is enabled and its URL reaches the deployed function.
A browser GET returning `405 POST required` is expected: PayMongo sends POST requests.

If deployment says an existing **1st-generation** `paymongoWebhook` cannot be
upgraded in place, pause payment testing, disable the PayMongo endpoint, delete
only that old function in Firebase Console > Functions, then run the deployment
command again. Update/re-enable the PayMongo endpoint afterward. This source uses
2nd-generation functions for the existing Node.js 24 runtime.

The unused `createPremiumCheckout` implementation was removed from source.
Checkout continues through Vercel `/api/checkout`. If the old Firebase
`createPremiumCheckout` function was previously deployed, delete that unused
function from Firebase Console too.

## 4. Configure and deploy Vercel

In the Vercel project serving `https://byahe-bulacan-743h.vercel.app/`, open
**Settings > Environment Variables** and set:

```text
PAYMONGO_SECRET_KEY=sk_test_your_actual_key
```

Keep the existing Google Maps variables. Redeploy the latest source so it includes
both the authenticated checkout request and the v2 Firebase configuration.
The API verifies the signed-in Firebase account with the v2 project's web API key;
if you apply restrictions to that key, allow the Firebase Authentication API and
account for the server-side identity lookup as well as browser authentication.
Do not use `REACT_APP_` for either payment secret.

For localhost, `npm start` serves React only; it does not run Vercel `/api/checkout`.
Use the deployed test environment for this checklist. Return URLs intentionally
point to the requested production domain.

## 5. Check that the whole process works

1. Sign in on the updated website using an account in v2. Confirm its Firestore
   profile exists and `isPremium` is `false`.
2. Start checkout from the website and complete a PayMongo test payment.
3. In PayMongo, open the webhook delivery details. A matching payment should get
   HTTP **200** from the Firebase function.
4. In Firebase > Firestore > `users` > that user's UID, confirm `isPremium: true`.
   A server-only receipt should also appear in `premiumPayments/{checkoutSessionId}`.
5. The returned website should show Premium automatically, including when the
   confirmation arrives after the redirect. Logging out/in should preserve access.
6. Re-delivering the same signed payment should not create a second receipt.

For failures, inspect Firebase logs:

```powershell
firebase functions:log --only paymongoWebhook --project byahe-bulacan-v2
```

- **401:** wrong signing secret, wrong test/live mode, or invalid/expired signature.
- **400:** payment does not match the expected PHP 299 Premium checkout, or its
  Firebase user reference is missing/invalid. Generic dashboard sample events may
  lack the real user reference; test through the website instead.
- **500:** Firebase could not save the upgrade, including a missing user profile.
  Fix the cause and use PayMongo's delivery tools to retry where available; check
  the provider delivery history rather than assuming every old event will replay.
- **403 before the function runs:** the function is not publicly invokable. It
  must accept public requests; the PayMongo signature authenticates the message.

## 6. Switch to real payments

When testing passes, register/configure the corresponding **live-mode** webhook
and store its signing secret in Firebase using the same secrets command. Set
`PAYMONGO_MODE=live` in `functions/.env.byahe-bulacan-v2`, then redeploy the function.
Set Vercel's `PAYMONGO_SECRET_KEY` to the matching `sk_live_...` key and redeploy
Vercel. Do this before accepting real payments. A live-mode handler rejects test
confirmations. Use a separate deployment/project if test and live environments
must operate at the same time.

Old payments are not repaired automatically. Verify their PayMongo payment and
original Firebase user mapping before restoring access. A user ID from the old
Firebase project may not match their v2 account.

References:
- https://docs.paymongo.com/docs/developer-tools-webhook-setup-management
- https://docs.paymongo.com/reference/checkout-session-resource
- https://firebase.google.com/docs/functions/config-env
- https://firebase.google.com/docs/functions/http-events
- https://firebase.google.com/docs/functions/manage-functions
