# Kart Kirana Payment Handoff

## Deployed Live environment

- Public API: `https://api-lna3kdnwxq-el.a.run.app`
- Firebase project: `kartkirana-3cd12`
- Region/runtime: `asia-south1`, Node.js 22
- Functions: public HTTPS `api`; scheduled timeout, reconciliation, notification, dispatch, and cleanup workers; plus the order-ready dispatch trigger
- Payment mode: Razorpay **LIVE**
- Managed Live secrets: `RAZORPAY_KEY_ID_LIVE`, `RAZORPAY_KEY_SECRET_LIVE`, `RAZORPAY_WEBHOOK_SECRET_LIVE`
- Test secrets remain separate for a future staging project and are never selected by the Live runtime.
- Health checks: `/health` and `/health/payments`

On 31 August 2026, `/health/payments` returned HTTP 200 with `environment: LIVE`, `gateway: authenticated`, `webhook: configured`, and `maintenance: false`. This probe validates the Live API credentials without creating a payment.

The managed credentials authenticate with Razorpay. Signed webhook handling passes the isolated integration suite. All 12 payment integration tests pass, including idempotency, stock locking, signature verification, replay protection, coupon release, failure recovery, cancellation, COD restoration, refunds, and concurrent oversell prevention. Live webhook delivery still needs confirmation during the controlled real-payment acceptance.

## Customer Android security

The customer app uses native Firebase App Check with Play Integrity. The release SHA-256 signing certificate is registered for Firebase Android app `1:555627629169:android:97a159c7f8a186737869d0`. The sideload policy allows unrecognized app versions, does not require Play licensing, and still requires device integrity. No App Check debug token or Razorpay secret is embedded in the APK.

Web deployments still require a reCAPTCHA Enterprise App Check site key through `VITE_RECAPTCHA_ENTERPRISE_KEY`; this is not required by the native Android APK.

## Razorpay Live webhook

In Razorpay **Live Mode**:

1. Open **Account & Settings → Webhooks → Add New Webhook**.
2. Use URL `https://api-lna3kdnwxq-el.a.run.app/v1/payments/webhook`.
3. Use the exact same strong secret stored as `RAZORPAY_WEBHOOK_SECRET_LIVE`; never use the API key secret.
4. Subscribe to `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, and `refund.failed`.
5. Save and keep automatic capture enabled for Orders API payments.

## Required controlled Live acceptance

Install the signed APK on a Play-Integrity-capable Android device, sign in, and use a controlled low-value product with a real payment method. This creates a real charge and must be monitored in the Razorpay Live Dashboard.

1. Confirm checkout opens without a restart/backend error.
2. Confirm a successful payment creates exactly one placed order and updates the shop once.
3. Retry verification and replay a webhook; stock, coupon redemption, invoice, and notifications must remain single.
4. Run a failed payment; stock and coupon reservations must release.
5. Verify an abandoned checkout releases reservations through `paymentTimeoutSweep`.
6. Verify COD collection and partial/full refund reconciliation.

No Android device was connected during the build session, so this physical-device attestation/payment step cannot be automated from the workstation.

## Signed customer artifacts

- Customer source release: `1.4.7` (`versionCode 12`)
- APK: `FINAL APKAAB/app-release.apk`
  - SHA-256: `52459B592851639912662A88E66489CD85574457C8659FA0BF28F853E0C8DA43`
- AAB: `FINAL APKAAB/app-release.aab`
  - SHA-256: `2DCE035DBBBFD5559EAFDD16CFAB69683571D5F22D1C8379B4E6D67781EFBE3F`

## Live-money rollback

If the controlled Live acceptance does not reconcile exactly, set `PAYMENT_ENVIRONMENT=TEST` in `server/.env.kartkirana-3cd12`, redeploy all Functions, and investigate before accepting further Live payments. Never replace or reuse the separate Test and Live secret values.
