# Shopkeeper Order Management App — Technical Documentation

## 1. What This App Actually Is

This is **not** a customer-facing ordering app. It is the **shopkeeper-side counterpart** — the app a shop owner/staff uses to:

- Set up their shop profile
- Add/manage items and prices
- Receive incoming orders (from a customer app, website, or manual entry)
- Approve or reject orders
- Track order status (preparing/packing → ready → completed)
- Update stock/availability of items in real time
- Log in securely via Phone OTP

Explicitly **out of scope**: revenue analytics, dashboards, charts, payouts, marketing tools, multi-location chains, delivery-partner assignment. Keep it lean — only what's functionally necessary to run daily operations.

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Mobile App | **Flutter** (or React Native / Capacitor Hybrid) | Single codebase for Android + iOS, fast to build a focused app |
| Backend | **Node.js (NestJS / Express)** | Structured, scalable, good for OTP + real-time order flow |
| Database | **PostgreSQL** (or Firebase Firestore/Realtime DB) | Relational integrity or real-time sync for orders ↔ items ↔ stock |
| Real-time updates | **WebSockets (Socket.IO)** or **Firebase Cloud Messaging / Firestore Listeners** | Instant order push notifications to the shopkeeper |
| Auth/OTP | **Firebase Phone Auth** or **MSG91 / Twilio Verify** | Reliable OTP delivery, avoids building SMS gateway from scratch |
| File/Image storage | **AWS S3 / Cloudinary / Firebase Storage** | Item/product photos |
| Hosting | **AWS / Render / Railway / Firebase** | Standard managed deployment |

---

## 3. Core Entities (Database Schema)

This is the backbone. Get this right first — everything else is built on top of it.

### 3.1 `Shop`
```
id                UUID (PK)
name              String
owner_phone       String (unique, indexed)
address           String
city              String
gst_number        String (optional)
license_number    String (optional)        // e.g. Trade license, FSSAI
logo_url          String
is_open           Boolean (default true)   // manual open/close toggle
opening_time      Time
closing_time      Time
timezone          String                   // e.g. "Asia/Kolkata" for local offsets
created_at        Timestamp
updated_at        Timestamp
```

### 3.2 `User` (shopkeeper owner / staff who log in)
```
id                UUID (PK)
shop_id           UUID (FK -> Shop)
phone_number      String (unique, indexed)
name              String
role              Enum('OWNER', 'STAFF')
is_active         Boolean
last_login_at     Timestamp
created_at        Timestamp
```

### 3.3 `OTP_Verification`
```
id                UUID (PK)
phone_number      String (indexed)
otp_code_hash     String                       // NEVER store plain OTP
purpose           Enum('LOGIN', 'REGISTER')
attempts          Integer (default 0)
expires_at        Timestamp
verified          Boolean (default false)
provider_used     Enum('PRIMARY', 'FALLBACK')  // tracks which SMS provider was used
created_at        Timestamp
```

### 3.4 `Category`
```
id                UUID (PK)
shop_id           UUID (FK -> Shop)
name              String                       // e.g. "Groceries", "Beverages", "Dairy"
display_order     Integer
is_active         Boolean
```

### 3.5 `Item`
```
id                UUID (PK)
shop_id           UUID (FK -> Shop)
category_id       UUID (FK -> Category)
name              String
description       String
price             Decimal(10,2)
image_url         String
is_veg            Boolean (optional)           // relevant for food-based groceries
is_available      Boolean (default true)       // toggled by stock updates
stock_quantity    Integer (nullable)           // null = untracked/unlimited
created_at        Timestamp
updated_at        Timestamp
```

### 3.6 `Order`
```
id                UUID (PK)
shop_id           UUID (FK -> Shop)
order_number      String (human-readable, e.g. #A1023)
customer_name     String
customer_phone    String
status            Enum('PENDING', 'ACCEPTED', 'REJECTED',
                        'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')
rejection_reason  String (nullable)
total_amount      Decimal(10,2)
payment_mode      Enum('COD', 'ONLINE_PREPAID')
placed_at         Timestamp
accepted_at       Timestamp (nullable)
ready_at          Timestamp (nullable)
completed_at      Timestamp (nullable)
idempotency_key   String (unique, indexed)     // prevents duplicate order creation
```

### 3.7 `OrderItem`
```
id                UUID (PK)
order_id          UUID (FK -> Order)
item_id           UUID (FK -> Item)
item_name_snapshot String                      // freeze name at order time (item may change later)
price_snapshot    Decimal(10,2)                // freeze price at order time
quantity          Integer
special_instructions String (nullable)
```

### 3.8 `StockLog` (audit trail)
```
id                UUID (PK)
item_id           UUID (FK -> Item)
changed_by        UUID (FK -> User)
old_quantity      Integer
new_quantity      Integer
reason            Enum('MANUAL_UPDATE', 'ORDER_DEDUCTION', 'RESTOCK')
created_at        Timestamp
```

### 3.9 `Notification` (in-app order alerts)
```
id                UUID (PK)
shop_id           UUID (FK -> Shop)
type              Enum('NEW_ORDER', 'ORDER_CANCELLED_BY_CUSTOMER')
order_id          UUID (nullable)
is_read           Boolean
created_at        Timestamp
```

### 3.10 `Session`
```
id                UUID (PK)
user_id           UUID (FK -> User)
refresh_token_hash String
device_info       String                       // e.g. "Samsung Galaxy S23, Android 14"
ip_address        String
is_active         Boolean (default true)
created_at        Timestamp
last_used_at      Timestamp
```

> [!NOTE]
> **Why snapshot fields on `OrderItem`?** If you later change an item's price/name, historical orders must NOT change retroactively. This is a very common bug source — always snapshot transactional data.

---

## 4. Authentication Flow (Phone OTP) — Step by Step

This needs to be bulletproof since it's the front door to the app.

**Step 1 — Request OTP**
`POST /auth/request-otp` — Body: `{ phone_number }`
- Validate phone format (regex + country code).
- Rate limit: max 3 OTP requests per phone per 10 minutes (prevents SMS bombing/abuse).
- Generate 6-digit OTP, hash it (bcrypt/argon2), store with 5-minute expiry.
- Send via SMS gateway.

**Step 2 — Verify OTP**
`POST /auth/verify-otp` — Body: `{ phone_number, otp_code }`
- Check expiry — reject if expired.
- Check attempts — lock after 5 wrong attempts, force new OTP request.
- Compare hashed OTP.
- On success:
  - If phone exists in `User` table → issue JWT (access + refresh token) → login.
  - If new phone → proceed to shop registration flow.
- Mark OTP record as `verified = true` so it can't be reused.

**Step 3 — Session Management**
- Access token: short-lived (15 min).
- Refresh token: long-lived (30 days), stored securely, rotated on use.
- `POST /auth/refresh-token` and `POST /auth/logout` (invalidate refresh token).

**Step 4 — Registration (first-time only)**
`POST /auth/register-shop` — after OTP verified, collect shop name, address, and create `Shop` + `User(role=OWNER)` in a single DB transaction (so you never get a User without a Shop, or vice versa).

---

## 5. Order Lifecycle — The Core Business Logic

This is the heart of the app. Model it as a strict state machine so no invalid transitions can ever happen (this is where most "buggy" apps fail).

```
PENDING → ACCEPTED → PREPARING → READY → COMPLETED
PENDING → REJECTED
ACCEPTED → CANCELLED (edge case: e.g. item ran out after accepting)
```

**Rules to enforce server-side (never trust client state):**
- An order can only move to the *next valid* state. Reject any API call trying to skip states or move backward.
- Only `PENDING` orders can be rejected.
- When an order is **ACCEPTED**, atomically deduct `stock_quantity` for each `OrderItem`'s `item_id` inside a **database transaction**. If any item has insufficient stock, reject the whole accept-action and notify the shopkeeper.
- If `stock_quantity` hits 0, auto-set `is_available = false` on that `Item`.
- Every status change writes a timestamp (`accepted_at`, `ready_at`, `completed_at`) — needed for order history.

**Key Endpoints:**
```
GET   /orders?status=PENDING              // incoming orders queue
GET   /orders/:id                         // order detail
PATCH /orders/:id/accept
PATCH /orders/:id/reject      { reason }
PATCH /orders/:id/status      { status: PREPARING | READY | COMPLETED }
GET   /orders/history?date_from&date_to   // simple list, no analytics — just records
```

**Real-time delivery:** New order → push via WebSocket/FCM to the shopkeeper app instantly + create a `Notification` row as a fallback so nothing is missed if the app was offline.

---

## 6. Item & Stock Management

**Item CRUD**
```
POST   /items/categories
GET    /items/categories
POST   /items
PUT    /items/:id
DELETE /items/:id             // soft delete (is_active flag), never hard-delete if it's referenced by past orders
PATCH  /items/:id/availability   { is_available: true/false }
```

**Stock updates**
```
PATCH /items/:id/stock   { quantity }
```
- Every update writes a `StockLog` row (audit trail — critical for debugging "why did this item disappear from the catalog").
- Stock deduction from orders and manual stock updates must both go through the **same service function** so there's a single source of truth and no race conditions.
- Use DB-level row locking (`SELECT ... FOR UPDATE`) or atomic increment/decrement queries when reducing stock — this prevents the classic bug of two simultaneous orders over-selling the last item.

---

## 7. Shop Profile & Open/Close Control

```
GET  /shop/profile
PUT  /shop/profile
PATCH /shop/status   { is_open: true/false }   // instantly stop accepting new orders
```
Simple but important: an "Open/Closed" toggle is one of the most-used buttons in shop apps — when closed, the backend should auto-reject or hide the shop from new incoming orders at the API level, not just the UI.

---

## 8. Sales/Orders View (Not Analytics — Just Records)

Since you explicitly don't want revenue tracking/analytics, keep this to a **simple filterable list**, not dashboards:

```
GET /orders/history?status=COMPLETED&date=2026-07-18
```
Returns a plain list: order number, items, amount, time, status. No charts, no totals-over-time, no graphs — just a record book the shopkeeper can scroll through and search.

---

## 9. Security

Security isn't one line item, it's woven through every layer.

### 9.1 Authentication & Session Security
- **OTP hashing**: never store the raw OTP anywhere — hash it (bcrypt/argon2) like a password, compare hashes only.
- **OTP expiry**: 5 minutes max, single-use (mark `verified = true` immediately after success so it can't be replayed).
- **Attempt limiting**: lock an OTP record after 5 failed guesses; force the user to request a fresh one. This stops brute-forcing a 6-digit code.
- **Rate limiting on OTP requests**: max 3 requests per phone per 10 minutes, and also rate-limit per IP address to stop someone spamming random numbers.
- **JWT tokens**: short-lived access token (15 min) + longer-lived refresh token (30 days). Refresh tokens are rotated on every use (old one invalidated) so a stolen refresh token has a limited window of use.
- **Multi-device session control**: store active refresh tokens per device in a `Session` table. Let the owner see "logged in devices" and revoke any session remotely. When a new login happens, don't silently kill old sessions — notify the user ("New login detected on Device X") so a stolen phone/session gets flagged, not just replaced quietly.
- **Logout**: must invalidate the refresh token server-side immediately, not just delete it client-side.

### 9.2 Authorization (Role-Based Access Control)
- Every API endpoint checks the caller's `role` (`OWNER` vs `STAFF`) server-side — never rely on the app UI hiding a button.
- **OWNER-only actions**: edit shop profile, change pricing, delete items, add/remove staff accounts, view full order history.
- **STAFF-allowed actions**: accept/reject orders, update order status, update stock quantity.
- Every write operation is scoped to `shop_id` — a logged-in user from Shop A must never be able to read or modify Shop B's data, even by guessing an ID. Enforce this at the query level (always filter by `shop_id` derived from the authenticated token, never from the request body).

### 9.3 Input & Transport Security
- All traffic over HTTPS/TLS only — no plain HTTP endpoint, ever.
- Every request body validated against a strict schema (Zod/Joi/Pydantic) server-side — reject anything with unexpected fields or wrong types before it touches business logic.
- Parameterized queries / ORM only — no raw string-concatenated SQL, to eliminate SQL injection.
- File upload validation for item images: restrict file type (jpg/png only), max file size, and scan/re-encode images server-side rather than trusting the uploaded file blindly.

### 9.4 Data Protection
- Phone numbers and customer data treated as PII: encrypt at rest where the database supports it, and never log full phone numbers in plaintext application logs (mask like `9876XXXXX0`).
- Secrets (DB credentials, JWT signing key, SMS API keys) go in environment variables / a secrets manager — never hardcoded or committed to source control.
- Database backups encrypted, access restricted to need-only.

### 9.5 Abuse & Fraud Prevention
- Duplicate order detection: generate an `idempotency_key` client-side per order submission; the backend rejects a second insert with the same key within a short window, so a network retry or double-tap never creates two orders.
- Idempotent accept/reject: check the order's current status before acting — calling "accept" twice on an already-accepted order is a no-op, not an error, not a double stock-deduction.
- API rate limiting globally (not just OTP) to prevent scripted abuse of any endpoint.

### 9.6 Monitoring & Incident Response
- Centralized structured logging for all auth events, order state changes, and stock changes — this is what lets you actually investigate "something went wrong" after the fact instead of guessing.
- Error monitoring (e.g. Sentry) wired in from day one, not bolted on later.
- Alerting on anomalies: spike in failed OTP attempts, spike in order-rejections, repeated 500 errors on a specific endpoint.

---

## 10. Edge Case Decisions (Explicitly Resolved)

1. **Multi-device / session conflict** — Resolved in §9.1: multiple sessions allowed, but tracked in a `Session` table, visible to the owner, revocable, and a notification is sent on new-device login.

2. **Partial order rejection** — Kept simple: **no partial accept**. An order is accepted or rejected as a whole. If an item is genuinely out of stock, the shopkeeper rejects the whole order with `reason = "item unavailable"`, or updates stock first and asks the customer to reorder. (Partial fulfillment adds real complexity — payment splitting, partial refunds — which conflicts with keeping this app lean.)

3. **Auto-timeout on pending orders** — A `PENDING` order that isn't actioned within a configurable window (default 10 minutes) is **auto-marked `REJECTED`** with `reason = "no response - auto timeout"`, and a notification is fired to the shopkeeper so they know it happened. This is handled by a scheduled background job (cron/queue), not by the client.

4. **Staff permission boundaries** — Resolved in §9.2: `STAFF` can action orders and update stock; only `OWNER` can touch pricing, item deletion, and staff accounts.

5. **Duplicate order prevention** — Resolved in §9.5: idempotency key per order submission, enforced server-side.

6. **Item category deleted mid-order** — Categories and items are **soft-deleted only** (`is_active = false`), never hard-deleted, if they're referenced by any existing order. The `OrderItem` snapshot fields mean an in-flight or historical order is unaffected either way even if the live item is later removed.

7. **SMS/OTP provider outage** — Configure a **secondary OTP provider as fallback** (e.g. primary: Firebase, fallback: MSG91/Twilio). If the primary fails to send within a timeout, automatically retry via the secondary before showing the user an error. Surface a clear "SMS delayed, try resend in 30s" state client-side rather than a silent failure.

8. **Timezone handling** — All timestamps stored in **UTC** in the database, converted to the shop's local timezone only at the display layer (app/API response formatting). The `Shop` table gets a `timezone` field (e.g. `Asia/Kolkata`) so this is explicit and not assumed.

---

## 11. Non-Functional Requirements (For a "Flawless" Backend)

| Concern | How to Handle It |
|---|---|
| **Data integrity** | Use DB transactions for any multi-table write (e.g., accept order + deduct stock) |
| **Race conditions** | Row-level locking on stock updates; idempotency keys on order-accept API (prevent double-accept from double-tap) |
| **Validation** | Validate every request payload server-side with a schema library (Zod/Joi/Pydantic) — never trust the client |
| **Error handling** | Centralized error middleware; consistent error response shape (`{ error_code, message }`); never leak stack traces to client |
| **Idempotency** | Order-accept/reject endpoints should be safe to call twice without side effects (check current status before acting) |
| **Rate limiting** | On OTP endpoints especially, and on all public-facing APIs |
| **Logging** | Structured logs (order state changes, auth events, stock changes) for debugging production issues |
| **Testing** | Unit tests for state machine transitions + stock deduction logic; integration tests for full order flow (place → accept → complete) |
| **Offline resilience** | Notification table as fallback if push notification fails/app was closed |

---

## 12. Build Plan — Step by Step, In Order

Build in this exact sequence. Each phase should be fully working and tested before moving to the next.

### Phase 1 — Foundation
1. Set up backend project structure, database, and ORM/migrations.
2. Implement `Shop`, `User`, `OTP_Verification` tables.
3. Build Phone OTP auth end-to-end (request → verify → JWT issue → refresh → logout).
4. Build shop registration flow.

### Phase 2 — Catalog Management
5. Implement `Category` and `Item` CRUD APIs.
6. Add image upload for items (S3/Cloudinary/Firebase Storage).
7. Build availability toggle and stock update APIs + `StockLog`.

### Phase 3 — Order Engine (the critical core)
8. Implement `Order` and `OrderItem` tables.
9. Build the order state machine with strict server-side transition validation.
10. Implement accept/reject logic with atomic stock deduction inside a transaction.
11. Implement status progression (PREPARING → READY → COMPLETED).
12. Write tests specifically for concurrent-order stock edge cases.

### Phase 4 — Real-Time Layer
13. Set up WebSocket or push notifications for new orders.
14. Implement `Notification` table as fallback/history of alerts.
15. Add open/close shop toggle that gates new-order intake.

### Phase 5 — Shopkeeper Mobile/Web App
16. Build login/OTP screens.
17. Build item catalog management screens (add/edit items, toggle stock).
18. Build incoming-orders screen (accept/reject with real-time updates).
19. Build order status tracking screens (queue: preparing/ready).
20. Build simple order history/records screen.
21. Build shop profile + open/close screens.

### Phase 6 — Hardening
22. Load-test the order-accept endpoint for concurrency bugs.
23. Full regression test of the entire order lifecycle.
24. Add centralized logging/error monitoring (e.g. Sentry).
25. Security review: auth token handling, rate limits, input validation everywhere.

---

## 13. Summary of Entities (Quick Reference)

`Shop → User (Owner/Staff) → Category → Item → Order → OrderItem`
Supporting: `OTP_Verification`, `StockLog`, `Notification`, `Session`
