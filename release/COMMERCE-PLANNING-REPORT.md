# KartKirana — Share Cart and scheduled/routine orders

Implemented in the existing repository at `C:\Users\Mehul\Desktop\KartKirana`. Validated locally on 22 September 2026. **Not deployed or enabled in production.** No real customer orders, payments, accounts or credentials were changed by this work. Existing unrelated working-tree changes were preserved.

## 1. Implementation summary

- Secure, expiring product-list sharing with a public `/shared-cart/:token` route, recipient address selection, nearby-shop matching and explicit single-shop cart import.
- Existing checkout scheduling gains server validation, India-time windows, protected rescheduling and delayed dispatch.
- One-time, daily, weekday, weekend, weekly and selected-weekday routine templates use the existing pricing, payment, inventory and order pipeline.
- Customer management, occurrence history, notifications, admin monitoring, deletion cleanup and security rules are integrated.

## 2. Major files created

Paths below are relative to the repository root above.

| Area | Files |
|---|---|
| Backend configuration | `server/config/planning.js` |
| Backend services | `server/services/planningCalendar.js`, `cartMatching.js`, `sharedCartService.js`, `routineService.js`, `routineExecution.js`, `routineRuntime.js` |
| API and abuse protection | `server/routes/planningRoutes.js`, `server/middleware/planningRateLimit.js` |
| Worker | `server/workers/routineWorker.js` |
| Customer pages | `acustoomer/src/pages/SharedCart.tsx`, `Routines.tsx` |
| Customer components | `acustoomer/src/components/ShareCart.tsx`, `PlanningAddressPicker.tsx`, `UpcomingRoutine.tsx` |
| Customer integration | `acustoomer/src/services/planningService.ts`, `acustoomer/src/utils/planningReturn.ts` |
| Admin | `admin/src/pages/Routines.tsx` |
| Automated tests | `server/tests/planningCalendar.test.cjs`, `commercePlanning.integration.cjs`, `commercePlanning.rules.mjs`, `commercePlanning.http.cjs` |
| Isolated browser QA | `scripts/commerce-ui-server.mjs`, `commerce-ui-qa.cjs`, `commerce-public-qa.cjs` |
| Handover | This report, `release/COMMERCE-PLANNING-WORK.md`, local test/build logs and UI screenshots |

## 3. Major files modified

- Customer: `src/App.tsx`; `context/CartContext.tsx`, `AddressContext.tsx`; `pages/Cart.tsx`, `Checkout.tsx`, `Home.tsx`, `Login.tsx`, `Orders.tsx`, `Profile.tsx`; `services/dbService.ts`, `paymentService.ts`; `utils/preorder.ts`; `components/layout/BottomNavigation.tsx`.
- Partner: `shopkeeper pov/src/pages/Orders.tsx`.
- Rider: `delivery boy app/src/pages/ActiveDelivery.tsx`.
- Admin: `admin/src/App.tsx`, `src/lib/adminPermissions.ts`, `src/services/adminService.ts`.
- Backend: `server/controllers/paymentController.js`; `services/paymentService.js`, `inventoryService.js`, `dispatchService.js`, `accountDeletionService.js`; `routes/dispatchRoutes.js`; `workers/notificationWorker.js`; `jobs/cleanupJob.js`; `index.js`, `functions.js`, `.env.example`.
- Firebase: `firestore.rules`, `firestore.indexes.json`.
- Existing deletion test: `server/tests/accountDeletion.test.cjs` now verifies cleanup of new commerce data.

## 4. Firestore collections and documents

- `sharedCarts`: private creator UID, random token/hash, normalized public product snapshots, creation/expiry, status and idempotency fingerprint. The public API never returns the creator UID, phone, address or notes.
- `routines`: verified owner, product snapshots/quantities, saved-address ID, shop, recurrence, IST window, payment/fallback preferences, approved baseline, version, status, next scheduled time and next worker action time.
- `routineExecutions`: deterministic occurrence ID, template version, lease, outcome/reason, generated-order ID and a private checkout replay response.
- `planningRateLimits`: one server-owned, expiring account request counter per UID.
- Existing `orders`, `payments`, `paymentAttempts`, `reservations`, `products`, `notificationQueue`, `users/{uid}/notifications`, `users/{uid}.addresses` and deletion-state records are reused.
- New order metadata: `orderSource`, `scheduledDeliveryStart`, `scheduledDeliveryEnd`, timestamp `dispatchNotBefore`, and optional routine/occurrence IDs. Legacy preorder fields remain populated.

## 5. API endpoints

All paths use the existing `/v1` prefix.

| Method | Path | Access |
|---|---|---|
| GET | `/planning/config` | Public configuration and enablement flag |
| POST | `/shared-carts` | Verified customer; Idempotency-Key required |
| GET | `/shared-carts/:token` | Public, safe product projection only |
| POST | `/shared-carts/:token/match` | Verified recipient; validated delivery coordinates |
| GET | `/routines` | Own templates and latest 100 occurrences |
| POST | `/routines` | Create; Idempotency-Key required |
| POST | `/routines/:id/edit` | Edit own future template; Idempotency-Key required |
| POST | `/routines/:id/action` | Pause, resume, skip or cancel own template |
| GET | `/routine-executions/:id/preview` | Review current eligible products, shop, address and total |
| POST | `/scheduled-orders/:id/reschedule` | Own scheduled order, before preparation/assignment |
| GET | `/admin/routines` | Existing allowlisted admin authorization |

The existing `/payments/create-order` accepts an optional occurrence ID. The backend derives and rechecks the actual owner, template, products, shop, saved address and authorized total. A client cannot supply trusted execution metadata.

## 6. Worker behavior

`routineSweep` runs every five minutes in Asia/Kolkata when enabled. Local development uses the same worker. Each pass reads up to 100 due actions and 100 timed pauses, rather than scanning every active template. `nextActionAt` prevents pending confirmations from repeatedly occupying the due queue.

The worker queues a notice up to 24 hours ahead, claims an occurrence at the 45-minute preparation lead, validates current conditions, and either creates a normal COD order, requests confirmation, or records failure. Leases recover after five minutes. Dependency failures retain a retryable lease; passed windows are recorded as missed without immediate catch-up orders. Timed pauses resume automatically.

## 7. Firestore rules

All four new collections are server-only. Clients cannot forge shared snapshots, enable templates, alter leases, mark occurrences complete or reset rate limits. New scheduled orders cannot be accepted early by a rider. Merchant-created batches must also satisfy each included order's dispatch window. Existing role/deletion guards remain in place.

## 8. Indexes

Added composite indexes:

- `routineExecutions`: `userId ASC`, `scheduledFor DESC`.
- `routines`: `status ASC`, `nextActionAt ASC`.
- `routines`: `status ASC`, `pausedUntil ASC`.

Wait for these indexes to become ready before enabling the worker.

## 9. Configuration

New backend environment variable: `ROUTINE_ORDERS_ENABLED=false` by default. Routine creation/editing remain unavailable until enabled; users can still stop existing routines.

`server/config/planning.js` contains the current four two-hour windows, timezone, seven-day share expiry, quantity/item limits, 20-active-template limit, preparation/dispatch/notice leads, worker cadence/batch size, 366-day booking horizon, radius cap and price limits. Automatic COD uses the baseline plus the **lower of 10% or ₹50**. Existing normal preorder UI retains its established four windows; if those windows are changed later, update that legacy UI configuration too.

No Firebase project, application identifier, payment credential, package name or dependency was changed for this feature.

## 10. Deep links and app links

Shared links use `https://kartkirana.com/shared-cart/<opaque-token>`. They open publicly in the browser, retain an allowlisted return path through login, and support direct refresh through the existing SPA rewrite.

The existing customer Android manifest has no verified HTTPS App Link configuration. This implementation uses the working browser fallback; it does not invent signing fingerprints or alter native intent filters. Verified Android app-opening links can be enabled later with the actual Play signing certificate and domain association. Capacitor uses the same screens and existing checkout integration; Web Share is used when available, with WhatsApp/copy fallback.

## 11. Customer UI

- Cart: Share Cart and Schedule / repeat buttons.
- Public shared list: expiry, account-independent preview, login return, address picker, nearby shops, exact matches, quantity selection and explicit cart replacement.
- My Routines: create/edit products and quantities, recurrence, dates, window, saved address, name, payment and fallback preferences; pause until a date, resume, skip, cancel and history.
- Profile: My Routines link. Home: compact upcoming-routine card. Order history: schedule/repeat previous products.
- Routine confirmation imports the reviewed selection into the existing checkout; the API rejects changed items, address or total.
- Cart imports are atomic. Cross-shop cart additions now use the existing replacement confirmation, matching the backend's single-shop checkout requirement.

## 12. Merchant app

Existing normal order screens identify scheduled/routine deliveries and their IST window. No separate fulfillment pipeline was created. Merchant acceptance/preparation continues through the existing statuses.

## 13. Rider app

Active delivery shows the scheduled window in IST. Backend dispatch candidate selection and assignment transactions check timing, as does rider acceptance. New timestamp-based rules prevent early direct-client assignment. Dispatch opens 20 minutes before the window starts.

## 14. Admin

Routine Orders page shows worker enablement, active/paused counts, failure and confirmation counts, and the latest 100 occurrences with reasons and generated-order references. Existing admin/finance permissions and phone allowlist protect the endpoint. This page does not expose payment secrets or offer unsafe manual re-execution.

## 15. Notifications

Advance, confirmation-required, failed/missed and placed-order notices use the existing notification queue. Deterministic queue IDs and atomic occurrence markers avoid duplicate enqueueing on retries. COD order/customer and merchant queue entries commit with the actual order. Routine notices open My Routines; order notices retain normal order references. Existing FCM token/configuration requirements still apply; no SMS service was added.

## 16. Migration and deployment

1. Back up and review the intended patch; the workspace contains unrelated pre-existing changes.
2. Deploy Firestore rules/indexes. Wait for index readiness.
3. Keep `ROUTINE_ORDERS_ENABLED=false` initially. Deploy the API plus `routineSweep`, `dispatchSweep`, `dispatchOnOrderReady`, `notificationQueueSweep`, `operationalCleanup` and `accountDeletionSweep` from the updated source. The deletion worker must also receive the new cleanup logic.
4. Deploy the assembled website through the existing Vercel project. Existing rewrites cover both new customer routes; no rewrite modification was needed.
5. Verify the website against the deployed API, App Check and authorized Firebase domains. Enable `ROUTINE_ORDERS_ENABLED=true` for both API and routine worker in the existing project environment and redeploy those functions.
6. Monitor execution failures and queue backlog. Batch capacity is configurable; increase capacity deliberately if demand exceeds the current worker budget.
7. Build/release updated native apps through the existing signing and closed-testing process if these features should be delivered inside installed applications.

No bulk mutation of existing orders/products is required. Local-only saved addresses are persisted through the existing authenticated profile update flow when customers save a routine; normal address add/edit/delete now also sync to the profile. New devices restore saved profile addresses. Routine lookup fails safely when its saved address is removed.

## 17. Share expiry

Tokens contain 32 random bytes. The API rejects malformed, inactive and expired links immediately after seven days. The daily operational cleanup removes expired snapshots and stale rate-limit documents. Cleanup delays do not extend link validity. Account deletion removes the customer's shared snapshots.

## 18. Duplicate prevention

An occurrence ID hashes the routine ID plus the scheduled window start. Generated order/payment/attempt IDs derive from it. A Firestore claim lease reduces duplicate work; the decisive guard is inside the **same transaction** that consumes/reserves inventory and writes the standard order/payment records. That transaction rechecks template version, ownership, active status, next occurrence, lease, address, shop and price, and stores the checkout result atomically.

Repeats return the persisted result. Pause/edit/skip/cancel races invalidate an old plan before it can commit. Closing an online checkout does not silently create a second order for the same occurrence.

## 19. Routine payments

- COD: automatically places an order only under saved preferences and price limits.
- Online: always waits for explicit customer checkout. Existing Razorpay creation, verification, webhook, cancellation and reconciliation flows remain responsible for payment.
- Price-limit or ask-first fallback: confirmation required before an order is created.
- No payment mandates, stored-card charging or simulated autopay were introduced.

## 20. Stock

Saving a template does not reserve inventory. At execution the current shop, catalog, product identity, prices and available stock are checked again. COD uses existing atomic stock commitment; online checkout uses existing expiring reservations. Inventory transaction checks prevent a changed price/shop or invalid stock from slipping through a stale plan. Existing cancellation/payment-failure paths release or restore inventory.

Normal scheduled checkout creates a real order at checkout time and retains its existing stock/payment behavior; a one-time routine template creates its order near its delivery window.

## 21. Tests performed

- Six calendar/matching tests: IST midnight, windows, invalid dates/cutoff, recurrence/end dates, dispatch boundary and malformed scheduling, conservative product matching, private-field projection, invalid quantities, reserved stock and radius.
- Thirteen emulator scenarios: share projection/expiry/retry/conflict/location; concurrent workers and exact-once COD stock; online pending/explicit checkout; price confirmation; removed address; insufficient stock; authorized exact fallback; ask-first fallback; missed windows; one advance notice and lease recovery; pause/resume/skip/cancel and wrong owner; cancellation race; deletion lock.
- HTTP middleware tests: authentication/revocation flag, App Check rejection, safe anonymous reads, ignored UID injection, validation, retry, JSON IP limiting and distributed account limiting. Scheduled rescheduling also covers owner success, wrong-owner rejection and preparation-state blocking. SDK verification is stubbed in these isolated HTTP tests; no production tokens or SMS are used.
- Rules emulator: all new collections reject direct reads/writes, forged mutations fail, early scheduled rider acceptance fails and due acceptance succeeds.
- Existing regression suites: 14 deletion-service scenarios, 12 payment integration cases, order-lifecycle rules and deletion rules. The customer-deletion scenario also verifies new commerce-record cleanup.
- Isolated browser fixtures at widths 320, 390, 768 and 1440: public route/refresh, matching, import, sharing, create/pause/resume, expired links, horizontal overflow and page errors.
- Actual production bundle smoke test: anonymous shared page, HTTP 200 direct/refresh, first-visit onboarding completion and retained shared-cart return intent at login. External traffic is blocked and the share API response is a fixture; this does not exercise live OTP verification.

Artifacts: `release/commerce-integration.log`, `commerce-build.log`, `commerce-customer-final-build.log`, `commerce-customer-lint.log`, `commerce-ui-results.json`, `commerce-routine-mobile.png`, `commerce-routines-desktop.png`.

## 22. Build and lint results

| Application | TypeScript / production web build | Lint |
|---|---|---|
| Customer | Passed, including final production bundle | Passed; existing warnings |
| Shopkeeper / Partner | Passed | Passed; existing warnings |
| Rider | Passed | Existing 84 errors and 12 warnings remain |
| Admin | Passed | Passed; existing warnings |

The assembled customer/partner/rider/admin output passed the existing web assembly command. Existing large-chunk warnings remain. No new signed AAB or native Gradle release build was produced during this task.

## 23. Remaining limitations and acceptance work

- The implementation is local, not a confirmed live rollout. Public production URLs for these new features are not claimed to be live.
- Real-device OTP/App Check, WhatsApp/native sharing and a real test-mode Razorpay checkout still need the manual checks below. No live money was charged during automated testing.
- Matching is deliberately conservative: exact catalog identity or sufficiently complete brand/pack/variant metadata. Medicines require strict identity; different-product substitutions are not automatically suggested/accepted. Customers can explicitly rebuild/edit their routine from other catalog products.
- Nearby matching evaluates up to the closest 40 eligible shops and uses the existing coordinate/radius approximation, not a new road-routing service. At larger scale, add a geospatial catalog index and operational monitoring for worker capacity.
- Online occurrences that expire or are cancelled are not automatically recreated for that same window; customers can place a separate manual order. This preserves the no-duplicate-order guarantee.
- Routine/history lists are bounded for UI/worker operation as described above. Routine cancellation preserves history; account deletion erases personal template/execution records while existing required order/financial history follows the established retention system.

## Manual acceptance checklist

- [ ] Deploy API, rules, indexes, workers and web assets in the order above; confirm flag consistency.
- [ ] With a real customer, share a cart; open the link logged out on another phone, refresh, log in and return to the same list.
- [ ] Choose another address; verify nearby matching, stock, different pack sizes, missing items, quantities and explicit replacement of an existing cart.
- [ ] Test copy, WhatsApp and the device share sheet; verify expiry and offline/API-error messages.
- [ ] Create each recurrence, a one-time template and an existing checkout preorder. Verify displayed IST dates/windows.
- [ ] Edit products, quantities, address, dates, payment and fallback preferences. Remove a saved address and confirm the next occurrence fails safely.
- [ ] Pause indefinitely/until a date, resume, skip and cancel. Confirm already-placed orders remain unchanged.
- [ ] Test closed/out-of-range shops, insufficient stock and price increases; exercise skip, ask-first and authorized exact fallback.
- [ ] Confirm COD creates one normal order and reduces stock once. Retry a worker/HTTP request and verify no duplicate order/payment.
- [ ] Complete online checkout using Razorpay TEST credentials through the existing application environment; test dismissal/failure, reservation release and verification. Confirm no automatic online charge.
- [ ] Confirm merchant/rider windows, no early dispatch, near-window dispatch, notifications and admin failure visibility.
- [ ] Delete a test account through the reviewed deletion flow; verify templates, executions, share snapshots and request counters are removed without corrupting financial history.
- [ ] Smoke-test ordinary checkout, orders, addresses, partner inventory, rider GPS, all privacy/deletion URLs and admin access.
- [ ] Test installed Android customer/partner/rider builds on devices before closed-testing publication. Enable verified App Links only with the real signing certificate/domain configuration.
