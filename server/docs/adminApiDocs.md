# Kart Kirana Admin API Documentation

All administrative endpoints are prefixed with `/v1/admin` and require Firebase ID token authentication in the `Authorization: Bearer <Token>` header.

---

## Authentication & Permissions
All routes must pass through:
1. `authMiddleware`: Decodes the Firebase ID token and populates `req.user`.
2. `rbacMiddleware`: Checks that the user's custom claim `role` contains permission matching the action.

---

## Endpoints Summary

### 1. User Account Operations

#### `POST /v1/admin/users/:uid/status`
- **Description**: Sets the status (active/banned) and disables/enables the user in Firebase Auth.
- **Permission**: `edit_users`
- **Request Body**:
  ```json
  {
    "disabled": true,
    "ban": true,
    "reason": "Suspicious account activity"
  }
  ```
- **Response Schema** (200 OK):
  ```json
  {
    "status": "success",
    "message": "User account status updated successfully."
  }
  ```

#### `POST /v1/admin/users/:uid/reset-password`
- **Description**: Resets the password of the specified user.
- **Permission**: `super_admin` (or elevated check)
- **Request Body**:
  ```json
  {
    "newPassword": "SecretPassword123"
  }
  ```
- **Response Schema** (200 OK):
  ```json
  {
    "status": "success",
    "message": "User password updated successfully."
  }
  ```

#### `DELETE /v1/admin/users/:uid`
- **Description**: Deletes user from Firebase Auth and Firestore.
- **Permission**: `super_admin` (Kill switch delete access only)
- **Response Schema** (200 OK):
  ```json
  {
    "status": "success",
    "message": "User account permanently deleted."
  }
  ```

---

### 2. Live Notifications Broadcast

#### `POST /v1/admin/notifications/send`
- **Description**: Enqueues push/SMS/email alerts for dispatching.
- **Permission**: `broadcast_notifications`
- **Request Body**:
  ```json
  {
    "target": "everyone", // everyone, users, riders, shops, area
    "title": "Monsoon Festival Sale!",
    "body": "Get 30% off all fruits and vegetables today.",
    "areaId": "zone-noida-15" // optional
  }
  ```
- **Response Schema** (200 OK):
  ```json
  {
    "status": "success",
    "enqueuedCount": 42
  }
  ```

---

### 3. Helpdesk/Complaints Management

#### `GET /v1/admin/complaints`
- **Description**: Lists all customer/merchant/rider support complaints.
- **Permission**: `resolve_complaints` (or `view_users`)
- **Response Schema** (200 OK):
  ```json
  [
    {
      "id": "c_92m49k",
      "userId": "usr_x39",
      "userName": "Jane Doe",
      "userType": "customer",
      "orderId": "ord_a02n",
      "subject": "Missing item in order",
      "message": "I ordered 2L Milk but only received 1L.",
      "status": "OPEN", // OPEN, RESOLVED, CLOSED
      "assignedTo": null,
      "createdAt": "2026-07-11T12:00:00Z"
    }
  ]
  ```

#### `PUT /v1/admin/complaints/:id`
- **Description**: Resolves or updates a complaint state.
- **Permission**: `resolve_complaints`
- **Request Body**:
  ```json
  {
    "status": "RESOLVED",
    "reply": "Refund of ₹50 initiated for missing milk.",
    "assignedTo": "ops-admin-uid"
  }
  ```

---

### 4. Zone Geofencing

#### `GET /v1/admin/zones`
- **Description**: Returns all operational zones.
- **Permission**: `view_dashboard`
- **Response Schema** (200 OK):
  ```json
  [
    {
      "id": "zone-noida-15",
      "name": "Noida Sector 15",
      "polygon": [{ "lat": 28.58, "lng": 77.31 }, { "lat": 28.59, "lng": 77.31 }, { "lat": 28.59, "lng": 77.32 }],
      "pricing": { "minOrder": 150, "deliveryFee": 30 },
      "isActive": true
    }
  ]
  ```

#### `POST /v1/admin/zones`
- **Description**: Creates or updates geofenced area.
- **Permission**: `change_settings`

---

### 5. Platform Settings & Feature Flags

#### `GET /v1/admin/settings`
- **Description**: Retrieves feature toggles and app config.
- **Permission**: `view_dashboard`
- **Response Schema** (200 OK):
  ```json
  {
    "featureFlags": {
      "cod": true,
      "upi": true,
      "wallet": true,
      "delivery": true,
      "maintenance": false
    },
    "versionControl": {
      "androidMinVersion": "1.2.0",
      "androidLatestVersion": "1.4.0",
      "iosMinVersion": "1.1.0",
      "iosLatestVersion": "1.3.0"
    }
  }
  ```

#### `POST /v1/admin/settings`
- **Description**: Updates feature toggles.
- **Permission**: `change_settings`
