# Kart Kirana — System Architecture & Dependency Graph

**Purpose:** Master Architectural Map & Dependency Reference for Engineering Team  
**Scope:** Shared Firebase Models, Cross-App Event Flow, API Boundaries, & Component Dependencies.

---

## 1. High-Level Ecosystem Topology

```mermaid
graph TD
    subgraph Frontend Applications
        C[Customer App - acustoomer]
        S[Shopkeeper App - shopkeeper pov]
        R[Rider App - delivery boy app]
        A[Admin Dashboard - admin]
    end

    subgraph Firebase Cloud Infrastructure
        FA[Firebase Auth]
        FS[Firestore Database]
        ST[Firebase Storage]
        AC[AppCheck Engine]
    end

    subgraph Backend Microservice
        API[Express.js Server - server]
        RZ[Razorpay Payment Gateway]
        DISP[Rider Dispatch Engine]
    end

    C -->|Auth / Read Store / Create Order| FS
    S -->|Manage Store / Orders| FS
    R -->|Stream Location / Update Order| FS
    A -->|Monitor / Manage| FS

    C -->|Init Razorpay / Verify Signature| API
    S -->|Trigger Dispatch / Cancel| API
    API -->|Razorpay SDK| RZ
    API -->|Dispatch Algorithm| DISP
    DISP -->|Target Rider| FS
```

---

## 2. Shared Firestore Data Schema Dependencies

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ SHOPS : owns
    SHOPS ||--o{ PRODUCTS : catalogs
    SHOPS ||--o{ ORDERS : fulfills
    ORDERS ||--o{ DISPATCH_REQUESTS : triggers
    RIDERS ||--o{ ORDERS : delivers
    ORDERS ||--o{ MESSAGES : subcollection
    ORDERS ||--o{ VIDEO_CALLS : signals

    USERS {
        string uid PK
        string role "owner | rider | customer | admin"
        string shopId FK
        string fullName
        string phone
    }

    SHOPS {
        string shopId PK
        string ownerId FK
        string name
        boolean isOpen
        number lat
        number lng
    }

    PRODUCTS {
        string productId PK
        string shopId FK
        string name
        number price
        number stock
        boolean isAvailable
    }

    ORDERS {
        string orderId PK
        string userId FK
        string shopId FK
        string riderId FK
        string status "DRAFT | PLACED | ACCEPTED | PREPARING | READY | PICKED_UP | DELIVERED"
        number totalAmount
        string otpCode
    }
```

---

## 3. Cross-App Module & Code Dependency Map

| Module / Service | Exporting Source | Consuming Applications | Risk Rating | Regression Guard Constraint |
| :--- | :--- | :--- | :---: | :--- |
| **`firestore.rules`** | Workspace Root | All 4 Apps + `server` | 🔴 **CRITICAL** | Modifying rule logic impacts all client permissions. Must verify with `firebase emulators:exec`. |
| **`orderStatus.ts`** | Central Types | Customer, Shopkeeper, Rider, Admin | 🔴 **CRITICAL** | Modifying order status strings or enums breaks real-time snapshot filters in all apps. |
| **`paymentService.js`** | `server/services` | Customer App, Razorpay Webhook | 🔴 **CRITICAL** | Changes to amount calculations or signature logic cause payment verification failures. |
| **`dispatchService.js`** | `server/services` | Rider App, Admin Operations | 🟡 **HIGH** | Modifying dispatch algorithms alters rider assignment priority. |
| **`useAppStore.ts`** | `acustoomer/src/core` | Customer App Pages | 🟡 **HIGH** | Centralized Zustand store; handles shop caching and realtime order snapshot listeners. |

---

## 4. Order Lifecycle State Machine & Event Cascade

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Customer opens checkout
    DRAFT --> PLACED : Payment Verified (Razorpay / COD)
    PLACED --> ACCEPTED : Shopkeeper clicks Accept
    PLACED --> CANCELLED : Customer cancels before acceptance
    ACCEPTED --> PREPARING : Shopkeeper starts packing
    PREPARING --> READY : Shopkeeper marks order ready
    READY --> PICKED_UP : Rider verifies pickup code
    PICKED_UP --> DELIVERED : Rider verifies delivery OTP code
    DELIVERED --> [*]
    CANCELLED --> [*]
```

### State Modification Rule Matrix:
1. **DRAFT ➔ PLACED:** Handled strictly by `server/services/paymentService.js` after Razorpay signature verification or COD commitment.
2. **ACCEPTED / PREPARING / READY:** Handled strictly by Shopkeeper App (`shopkeeper pov`).
3. **PICKED_UP / DELIVERED:** Handled strictly by Rider App (`delivery boy app`) via verified OTP code matching `orders/{orderId}` doc.
4. **CANCELLED / RE-ASSIGN:** Handled by Customer (if status == `PLACED`) or Admin Dashboard (`admin`).

---

## 5. Safe Engineering Guidelines for Developers

1. **Shared Enum Stability:** Never rename an order status string (`PLACED`, `ACCEPTED`, `PREPARING`, `READY`, `PICKED_UP`, `DELIVERED`, `CANCELLED`). All 4 frontends and backend share these exact literals.
2. **Address Schema Compatibility:** All apps expect delivery address objects to contain `{ address, lat, lng, details, area, city, pinCode }`. When adding Google Places geocoding, maintain this exact schema.
3. **Inventory Deduction Lock:** Always perform inventory deduction using Firestore transactions (`db.runTransaction`) to guarantee atomic consistency.
