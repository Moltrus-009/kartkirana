# Share cart and routine implementation work

Inspected: customer CartContext/Cart/Checkout/preorder utilities/PreOrders, Auth/Address contexts and routing; customer and merchant product schemas; backend payment, pricing, inventory, dispatch, notifications, cleanup and function deployment architecture; existing deletion safeguards.

Findings: saved addresses are currently device-local although users have an addresses field; backend checkout requires one shop; COD commits physical stock in the normal checkout transaction; online checkout reserves stock; no recurring-payment mandate exists; old preorder fields do not defer dispatch. Merchant/rider screens already show legacy preorder fields.

Plan:
1. Secure expiring share snapshots using server product data; public read with opaque token, authenticated area-aware matching, explicit single-shop import.
2. Centralize schedule windows/India calendar validation; preserve old preorder fields and enforce dispatch timing.
3. Store reusable routines, server-owned executions and deterministic standard-order IDs. Reuse PaymentService/InventoryService with an atomic execution guard. COD only automatically; online/price/fallback confirmation stays pending until customer acts.
4. Add customer create/edit/pause/resume/skip/cancel/history, notification outbox, admin visibility, merchant/rider window labels.
5. Integrate account deletion, rules/indexes/cleanup; test emulators, concurrency, failures, timezones, UI and all builds. Document configuration and manual acceptance checks.

No live customer data or production mutations are needed for implementation tests. Existing unrelated working-tree changes will be preserved.
