# KartKirana account deletion — implementation report

Status: implemented, tested and deployed. All four public URLs return the correct deletion page with HTTP 200, including direct refresh, without a login redirect. Firestore/Storage Rules and the five required backend functions are live. No real user account was deleted during testing.

## 1. Files created

- `server/services/accountDeletionService.js`: verified requests, inspection, review, cleanup, checkpoints and retries.
- `server/services/accountDeletionRuntime.js`: existing Firebase Admin/Storage integration.
- `server/services/accountDeletionGuard.js`: transactional guards against orders/assignments during cleanup.
- `server/routes/accountDeletionRoutes.js`: user and administrative APIs.
- `acustoomer/src/pages/AccountDeletion.tsx`, `acustoomer/src/services/accountDeletion.ts`, `acustoomer/src/account-deletion.css`: public responsive pages and isolated phone verification.
- `admin/src/pages/AccountDeletion.tsx`: review queue and documented approval.
- `server/tests/accountDeletion.test.cjs`, `accountDeletionIntegration.test.cjs`, `accountDeletionRules.test.mjs`, `accountDeletionStorage.test.mjs`, `paymentDeletionRegression.cjs`.
- `firebase.deletion-test.json`; `scripts/deletion-ui-qa.cjs`, `deletion-live-check.cjs`, `audit-deletion-schema.cjs`.
- `release/deletion-*.json`, screenshots and data-map inventory: validation evidence (no personal field values in the schema inventory).

## 2. Files modified for this feature

- Customer: `src/App.tsx`, `src/pages/Profile.tsx`, `src/components/privacy/PolicyLayout.tsx`, and the central/customer/shopkeeper/rider privacy pages.
- Shopkeeper and rider: each application's `src/pages/Profile.tsx`.
- Admin: `src/App.tsx`, `src/lib/adminPermissions.ts`, `src/services/adminService.ts`.
- Backend: `index.js`, `functions.js`, `config/firebase.js`, `middleware/auth.js`, `controllers/paymentController.js`, `repositories/OrderRepository.js`, `routes/dispatchRoutes.js`, `services/dispatchService.js`, `services/paymentService.js`, `services/notificationService.js`, `workers/notificationWorker.js`, `.env.example`.
- Root `firestore.rules`, `storage.rules`.
- Only two non-secret deletion settings were added to the existing ignored project environment file. No payment secrets, package names or Firebase project changes.

Many unrelated changes already existed in the working tree; they were not reverted. Existing SPA rewrites already cover `/delete-account/**`, so no deletion-specific rewrite change was necessary. Native Android code/package/version settings were not changed for this feature.

## 3. Firestore collections affected

New server-only collections: `accountDeletionRequests` (including `audit` and ID-only `targets` subcollections), `accountDeletionState`, `accountDeletionRateLimits`.

Cleanup affects the selected role's `users`, `merchants` or `riders` profile and its subcollections; `orders/messages`, `calls`, `videoCalls`, `notificationQueue`, customer `reviews`, `offerTargets`, `idempotencyKeys`, `shopSubscriptions`, rider `dispatchRequests`/`batches`, and owned `shops`. Closed complaints lose contact phone/name/callback-request fields for the deleted role; their evidence remains.

Profiles may share one Firebase UID across apps. The remaining app's profile, sign-in and shared notification inbox/files are preserved. Server tombstones prevent a removed role from silently recreating its profile using that shared UID.

Live top-level collections and a sample schema per collection were inspected read-only. This is a schema sample, not an exhaustive scan of every field value. See `deletion-live-schema.json` and the repository reference inventory `deletion-data-map.txt`.

## 4. APIs and scheduled job

- `GET /v1/account-deletion/:type`: verified account existence/request status.
- `POST /v1/account-deletion/:type`: accepts only `{ "confirm": "DELETE" }`.
- `GET /v1/admin/account-deletion`: outstanding queue (up to 100).
- `GET /v1/admin/account-deletion/:id`: current blockers and record references.
- `POST /v1/admin/account-deletion/:id/approve`: documented settlement/retention approval.
- `accountDeletionSweep`: scheduled every 15 minutes, processes reviewed jobs, with leases, per-order checkpoints and durable retry state.

Types: `customer`, `shopkeeper`, `rider`. A supplied type must match a server profile belonging to the authenticated UID. No API accepts a target UID/phone for deletion.

## 5. Storage paths

- Rider deletion: removes `riders/{uid}/` after review clears document-retention obligations.
- Final remaining account: removes `users/{uid}/` and `temp/{uid}/`.
- Shared `users/{uid}/` files remain while another role needs them.
- Retains `shops/{shopId}/`, `products/{shopId}/...` and `orders/{orderId}/...` as business/legal/financial records.

Live folder inventory found `products`, `riders`, `shops`, `users`; no unexpected personal-upload root was found. Cleanup uses exact known UID prefixes, never arbitrary user-supplied file URLs.

## 6. Authentication and request flow

Public page → registered phone → Firebase reCAPTCHA/SMS OTP → recent verified phone token → server profile validation → warning/explicit confirmation → durable request → admin/finance review → scheduled cleanup.

Public pages sit outside the normal AuthProvider, avoiding automatic profile creation or login redirects. Verification uses a separate in-memory Firebase Auth instance and does not sign the normal app out. A previously unregistered phone accidentally created by Firebase phone sign-in is removed immediately after verification.

Requests remain `PENDING_REVIEW` or `BLOCKED` until reviewed. Approval is required because existing payout metrics estimate settlement from order age and are not authoritative proof of a bank payment. Review records a non-sensitive evidence reference. A changed order/financial snapshot invalidates approval before cleanup starts.

## 7. Customer behavior

Deletes the customer profile, saved server addresses/preferences, personal files when exclusive, reviews/targeting, notification data and cached checkout responses. Cancels/anonymizes customer shop memberships. Redacts operational addresses/contact/notes from completed orders and removes order chats/call signalling while preserving totals/payment references.

Active orders delay deletion. Device-only cart/wishlist/cache on another device cannot be remotely erased by the website; the page instructs the user to clear that app's storage. Shared-role sign-in survives when applicable.

## 8. Shopkeeper behavior

Blocks unresolved orders, payouts/refunds/disputes/balances and owned shops still open for business. Deletes the personal merchant profile. Closes and anonymizes the owned shop's owner/contact association, preserving shop identity, inventory, products and transactional history. Employee deletion removes that personal merchant profile without deleting the shop.

## 9. Rider behavior

Blocks active deliveries/batches/offers and unresolved financial obligations. Removes rider profile/location/tokens/documents after review. Clears personal rider snapshots and batch stop details; retains historical rider IDs as pseudonymous financial join keys so earnings reports remain consistent.

## 10. Retention

Retains orders, invoices, payment attempts/payments/refunds, payouts, inventory/accounting history, coupon-abuse evidence, disputes/support evidence, security/audit records and minimal deletion audit/tombstones for reconciliation and applicable obligations. Required business documents are retained. Internal administrative SQLite communications/audit/security caches are not bulk-erased by this distributed worker and must be included in the administrator's retention review.

No arbitrary statutory duration was invented. The business must apply its documented legal retention/hold schedule, including backups and payment-provider records. Do not approve if a personal file in an automatically removed prefix must remain under a legal hold. Keep the request pending until resolved. The system does not promise immediate erasure of all information.

## 11. Security protections

Revocation-checked Firebase ID tokens; phone sign-in provider and five-minute recent-auth requirement; server-derived identity/profile roles; production App Check; input validation; IP and Firestore-backed identity rate limits; deterministic duplicate protection; admin allowlist/claims; audit records; fail-closed unknown order/payment states; transaction-level deletion locks on checkout/dispatch; protected client rules; role tombstones; Storage prefix restrictions; cleanup leases/checkpoints/retries. No OTP or service-account secret is stored in frontend/request records.

Storage Rules preserve the two-Firestore-document limit for invoice access. Source: [Firebase cross-service rules limits](https://firebase.blog/posts/2022/09/announcing-cross-service-security-rules/).

## 12. Validation performed

- All four web production builds and TypeScript checks passed (existing chunk-size warnings).
- 14 deletion-service tests passed: invalid/recent auth, identifier manipulation, duplicates, three roles, active orders/deliveries, payout/COD/open-shop blockers, shared identity, storage/Auth failure retries, changed approvals, per-order checkpoints, transaction locks and rate limiting.
- Firebase Auth/Firestore/Storage emulator integration passed: correct/incorrect OTP, forged token, expired verification, actual emulator deletion, stale-token rejection and repeat processing.
- Firestore deletion, multi-role login, order-lifecycle, admin access and rider approval rule tests passed.
- Storage deletion-lock/tombstone/stale-claim tests and existing rider document tests passed. Ordinary customer/rider/merchant invoice access remains working.
- Dispatch batch integration and rider payout tests passed.
- Existing payment suite passed through `paymentDeletionRegression.cjs`, which supplies its outdated mock admin with the required allowlisted phone. The unwrapped legacy fixture fails admin authorization; production permissions were not weakened.
- 16 page/viewport combinations passed at 320/390/768/1440px, including direct refresh, no login redirect, no horizontal overflow and privacy-page round trip. No browser runtime exceptions. Screenshots and JSON evidence are in `release`.
- Customer/shopkeeper/admin lint passed with existing warnings. Rider's full lint still has 84 existing errors and 12 warnings in existing source and generated Android assets; the new profile link adds no lint diagnostic.
- Live SMS/reCAPTCHA on a real registered phone, end-user production deletion and new signed AAB behavior were not exercised. No production user was deleted as a test.

## 13. Deployment and remaining operational configuration

Firestore/Storage Rules and `api`, `accountDeletionSweep`, `dispatchSweep`, `dispatchOnOrderReady`, `notificationQueueSweep` deployed successfully. Unrelated payment workers were excluded from this narrowed rollout. Existing project: `kartkirana-3cd12`; existing bucket: `kartkirana-3cd12.firebasestorage.app`. Vercel production deployment `dpl_HRbWHFQVJbJcvz6MMQfc18qGWzQH` is aliased to `kartkirana.com`.

`ACCOUNT_DELETION_ENABLED=true` and `ACCOUNT_DELETION_STORAGE_BUCKET=kartkirana-3cd12.firebasestorage.app` were loaded by Firebase deployment from the ignored project environment file. Existing credentials/payment settings were preserved. The scheduler was created successfully. Keep App Check, authorized domains and existing Firebase phone authentication enabled. Actual runtime cleanup permissions should be observed when a legitimate, reviewed request is processed; no real user was deleted to test them.

Assign an admin/finance reviewer to monitor the deletion queue and check actual settlements, disputes, business documents and legal holds. Establish processing/retention policy and monitor failed cleanup jobs. Do not treat the earnings UI as evidence of payout.

Rebuild/release each signed Android AAB to deliver the new Profile link to installed apps; earlier completed AABs do not gain source changes automatically. After deployment, verify a consenting test account's real OTP request without approving any real person's deletion solely for QA. Update each Play Console app's account-deletion URL/Data safety answers.

Public URL verification passed for all four routes below: HTTP 200 on direct visit and refresh, correct role-specific heading, unchanged URL and visible deletion page. See `deletion-live-check.json`. The live API health endpoint returned 200; all three unauthenticated deletion status requests returned 401. Real phone SMS/reCAPTCHA remains an end-user acceptance check; OTP and cleanup were tested with isolated Firebase emulators.

- `https://kartkirana.com/delete-account`
- `https://kartkirana.com/delete-account/customer`
- `https://kartkirana.com/delete-account/shopkeeper`
- `https://kartkirana.com/delete-account/rider`

Google Play requirement reference: [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en). This implementation supports the in-app and web request paths; Play review remains Google's decision.
