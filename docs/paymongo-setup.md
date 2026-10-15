# PayMongo deployment setup

The application creates PayMongo Checkout Sessions only from an authenticated
Firebase callable function. Premium access is granted only after the signed
`checkout_session.payment.paid` webhook is verified and matched to the pending
Firestore order.

## Required secrets

Never put either value in a React `.env` file or commit it to Git.

1. Rotate any PayMongo API key that has been pasted into chat or otherwise
   exposed, then save the replacement in Firebase Secret Manager:

   ```powershell
   firebase functions:secrets:set PAYMONGO_SECRET_KEY --project biyahe-bulacan
   ```

2. Create a temporary value so the webhook function can be deployed initially:

   ```powershell
   firebase functions:secrets:set PAYMONGO_WEBHOOK_SECRET --project biyahe-bulacan
   firebase deploy --only functions --project biyahe-bulacan
   ```

3. In the PayMongo Dashboard, add this test-mode webhook endpoint and subscribe
   it only to `checkout_session.payment.paid`:

   ```text
   https://us-central1-biyahe-bulacan.cloudfunctions.net/paymongoWebhook
   ```

4. PayMongo displays a signing secret for the new endpoint. Replace the
   temporary Firebase secret with that value and redeploy:

   ```powershell
   firebase functions:secrets:set PAYMONGO_WEBHOOK_SECRET --project biyahe-bulacan
   firebase deploy --only functions:paymongoWebhook --project biyahe-bulacan
   ```

## Verification

Use a PayMongo test payment and confirm all of the following:

- A `premiumOrders` document is created with `status: "pending"`.
- PayMongo redirects to the hosted checkout page.
- A successful test payment changes the order to `status: "paid"`.
- The matching user document receives `isPremium: true`.
- Re-sending the same webhook does not create another entitlement.

Test and live webhooks have separate signing secrets. Repeat the webhook setup
with the live API key and a live-mode webhook only when the account is ready to
accept real payments.
