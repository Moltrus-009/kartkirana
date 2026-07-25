# KartKirana Rider App — Fix Changelog

Every item below maps to a finding ID in `KartKirana_Rider_App_Audit.docx`.
Verified with `tsc -b --noEmit` (clean, zero errors) after every change.
`npm run build` (vite) could not be run in this sandbox — the archived
`node_modules` only contains the **Windows** native bundler binding
(`@rolldown/binding-win32-x64-msvc`), not Linux, and this environment has no
network access to reinstall the correct one. Run `npm install` on your own
machine/CI first; `tsc` passing project-wide is the strongest check available
offline, but do run the real build before shipping.

## Critical

- **C-1 — Login bypass button shipped to production.** Removed the
  `hs_bypass_active` localStorage write from the real login flow. The "Quick
  Dev Login Bypass" button and its helper text are now wrapped in
  `import.meta.env.DEV`, so Vite dead-code-eliminates the entire block from
  any `vite build` output — it cannot exist in a shipped APK.
  (`src/pages/Login.tsx`)

- **C-2 — OTP verification bypassed via phone number pattern.** Removed the
  independent `isBypassNum` phone-digit check from `sendOTP()`. Auth mode
  now comes from a single source of truth, `isFirebaseActive()`.
  (`src/context/AppContext.tsx`)

- **C-3 — Mock mode allows unauthenticated Firestore writes.** Root-caused
  in `isMockBypassMode()`: it now hard-returns `false` whenever
  `!import.meta.env.DEV`, so nothing client-controlled (localStorage, phone
  digits) can flip a production build into the unauthenticated write path.
  This is the single fix underlying C-1/C-2/C-3. (`src/lib/firebase.ts`)

- **C-4 — Cleartext HTTP to a private IP.** New `src/lib/apiConfig.ts`
  centralizes API origin resolution and **throws** if `VITE_API_URL` is
  missing or non-HTTPS outside of `vite dev`. All 4 fetch call sites
  (dispatch accept/reject, video initiate/terminate) now use it. Added
  `.env.example`, rewrote `.env` with hygiene comments, gitignored `.env`
  going forward. Also flagged the matching cleartext allowance in
  `android/.../network_security_config.xml` as dev-only.

- **C-5 — WebView `allowNavigation: ['*']`.** Replaced with an explicit
  host allow-list (own domain, Firebase/Google hosts, Razorpay).
  (`capacitor.config.ts`)

## High

- **H-1 — No background location tracking.** Switched `locationService.ts`
  to the native `@capacitor/geolocation` plugin (already a dependency)
  instead of the raw browser `navigator.geolocation` API, which holds up
  far better under Android's WebView JS-timer throttling. **Not fully
  resolved**: true continuous tracking through an Android-killed process
  needs a dedicated background-geolocation plugin + foreground service,
  which requires `npm install` with network access this sandbox doesn't
  have. Manifest permissions for it are already present
  (`ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`) — just no
  plugin implementing them yet.

- **H-2 — No push notifications.** Implemented real Firebase Cloud
  Messaging using the `firebase` package's `messaging` module (already a
  dependency, no install needed): `src/lib/messaging.ts`,
  `public/firebase-messaging-sw.js` for background delivery, FCM token
  registration + storage on the rider profile wired into `AppContext.tsx`,
  foreground messages tied to the existing alert sound. Requires
  `VITE_FIREBASE_VAPID_KEY` to be set (see `.env.example`). Native-APK note
  in the file: pairing this with `@capacitor/push-notifications` later is
  the recommended long-term addition for the most reliable native delivery.

- **H-3 — Inconsistent order status casing.** New
  `src/types/orderStatus.ts`: single canonical `OrderStatus` union +
  `normalizeOrderStatus`/`isOrderStatus` helpers. Removed every `as any`
  cast around status comparisons across `AppContext.tsx`,
  `firestoreService.ts`, `ActiveDelivery.tsx`, `Layout.tsx`, `Orders.tsx`,
  `Earnings.tsx`. **Found and fixed a real bug in the process**: batch-order
  acceptance was writing `status: 'accepted'` while single-order acceptance
  wrote `'RIDER_ASSIGNED'` for the identical event — a genuine cross-app
  desync, not just a style issue. Also fixed a stray write of legacy
  `'ready_for_pickup'` to the canonical `'ARRIVED_AT_SHOP'`.

- **H-4 — No proof-of-delivery mechanism.** Turned out to already be
  *partially* implemented — the original audit's keyword grep missed it
  (searched for `deliveryOtp`/`deliveryCode`; actual code uses
  `enteredOtp`/`isOtpModalOpen` in `ActiveDelivery.tsx`). The real gap:
  for **batch** orders, the OTP check read `activeOrders[0]` instead of the
  order tied to the *current* stop, so verification would silently check
  the wrong order's code past the first delivery, and batch delivery stops
  had no OTP gate triggered at all (`updateWorkflowStep` marked them
  delivered directly). Fixed by deriving `stopOrder` correctly and gating
  the OTP modal for both single and batch delivery stops.

- **H-5 — No Firestore/Storage Security Rules found.** None existed in the
  archive. Added `firestore.rules`, `storage.rules`, and `firebase.json`
  wiring them up. Rules require authentication everywhere, scope rider
  writes to their own orders/batches/profile, and explicitly block a rider
  from writing their own `rating`/`acceptanceRate`/`documentStatus` (feeds
  into M-2). **These do nothing until deployed**: `firebase deploy --only
  firestore:rules,storage`. Scope note in the file: the Customer/Shopkeeper
  apps aren't in this archive, so re-verify against their write patterns
  before deploying to production.

## Medium

- **M-1 — Hardcoded earnings values.** New `src/constants/earnings.ts`
  (`PER_DELIVERY_FEE`, `BATCH_BONUS`, `MAX_BATCH_SIZE`) replacing 3
  independently-duplicated magic numbers that could silently drift out of
  sync. Not a full fix — a real backend/pricing-engine value should
  ultimately be authoritative for rider payouts — but removes the
  duplication risk today and gives you one place to point at a real API
  response later.

- **M-2 — No ratings aggregation pipeline.** Client-side half closed via
  the new Firestore rule (rider can't write their own `rating`). Added
  `functions/index.js` as a documented, **not-yet-deployed** Cloud Function
  stub for the server-side aggregation — needs `npm install` +
  `firebase deploy --only functions`, neither run in this sandbox.

- **M-3 — No maximum batch size constant.** Added `MAX_BATCH_SIZE` (see
  M-1) and used it both client-side (`AppContext.tsx` batch creation) and
  server-side (`acceptBatchTransaction` now rejects any batch exceeding it,
  so a tampered/malformed batch document can't bypass the cap).

- **M-4 — `.env` committed with real secrets.** Added `.env.example` as the
  template, gitignored `.env`/`.env.*` going forward (`!.env.example`
  excepted). Existing `.env` values weren't rotated (no way to know if this
  key is already compromised in git history) — rotating the Firebase API
  key and Razorpay key is a manual step you should still do.

- **M-5 — Verbose console logging of config.** Wrapped the Firebase config
  console.log in `import.meta.env.DEV`. (`src/lib/firebase.ts`)

## Not independently re-verified
Anything requiring the Customer, Shopkeeper, or Admin apps (not included in
this archive) to fully validate — e.g. whether the new order-status writes
match what those apps expect, or whether the Firestore rules are too
narrow/broad for flows this app doesn't drive.
