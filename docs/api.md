# Shopora API

Reference for the Express API currently mounted by `server/src/app.ts`.

## Base URL and conventions

- Local API base URL: `http://localhost:5000/api` (configurable with `PORT` and `API_BASE_URL`).
- Routes return JSON. Successful responses use `{ "success": true, "data": ... }`; failures use `{ "success": false, "error": "..." }`.
- Send JSON with `Content-Type: application/json`. Upload routes use `multipart/form-data`.
- IDs in path parameters are numeric unless the route says otherwise.
- Protected endpoints require `Authorization: Bearer <jwt>`.
- Authenticated users are loaded from the database on each request. The token is rejected if the account is gone or its persisted role no longer matches the role in the token.

Example:

```sh
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

## Roles and access

| Role | Intended access |
|---|---|
| `customer` | Catalog, own orders, own returns, support, profile, and customer chat. |
| `admin` | Store administration, all users and orders, inventory, support replies, and manual payment reconciliation. |
| `seller` | Legacy role still present in some product/order/return/chat route checks. New seller registration and login are disabled. |

The active application is intended to have customer and admin accounts. Existing seller-specific API branches have not all been removed yet; treat them as legacy functionality, not as an advertised role or a production-ready supplier portal.

## Authentication

### `POST /auth/register`

Creates a customer account and returns a JWT. Admin cannot be selected through public registration.

Request:

```json
{ "name": "Sam Example", "email": "sam@example.com", "password": "a-long-password" }
```

Validation: name is at least 2 characters; email must be valid; password must be at least 12 characters. Limited to 5 requests per IP per 15 minutes (in-memory limiter).

Success: `201` with `{ "token": "...", "user": { "id", "name", "email", "role", "photo", "cin", "created_at" } }` inside `data`.

### `POST /auth/login`

Request: `{ "email": "sam@example.com", "password": "a-long-password" }`.

Returns the same token/user shape as registration. Only `admin` and `customer` users may log in. Invalid credentials return `401`; an account with a disallowed legacy role returns `403`. Limited to 10 attempts per IP/email per 15 minutes (in-memory limiter).

### `GET /auth/me`

Returns the authenticated user’s public account fields.

### `PATCH /auth/me`

Updates the authenticated user’s profile. Body fields are optional: `name` (minimum 2 characters) and `photo` (string or `null`). Returns the updated public user.

## Users — admin only

All `/users` routes require an authenticated admin.

| Method and path | Description |
|---|---|
| `GET /users` | List public user records. Password hashes are not returned. |
| `POST /users` | Create an admin or customer account. Requires `name`, `email`, `password` (minimum 12 characters), and `role`; optional `cin`. Returns `201` and the created public account. |
| `PATCH /users/:id` | Update optional `name`, `role` (`admin` or `customer`), `photo`, and `cin`. Returns `{ "ok": true }`. |
| `DELETE /users/:id` | Delete a user. An admin cannot delete their own account. Returns `{ "ok": true }`. |

Duplicate email returns `409`. Admin-created accounts do not return a login token; the user must sign in separately.

## Products

All `/products` routes require authentication. Customer reads expose only active, approved products and omit internal fields such as cost price and moderation notes.

| Method and path | Access | Description |
|---|---|---|
| `GET /products?q=...` | Authenticated | List products; optional text query `q`. Results are filtered according to role. |
| `GET /products/trending?limit=20` | Authenticated | Get trending products; limit is clamped to 1–50. |
| `GET /products/saved` | Authenticated | List the current user’s saved products. |
| `POST /products/:id/save` | Authenticated | Save a product. Optional body: `{ "offer_type": "dropshipping" | "wholesale" }`. |
| `DELETE /products/saved/:productId` | Authenticated | Remove a saved product. |
| `POST /products/saved/:productId/price` | Authenticated | Set the saved product’s `my_price` to a non-negative number or `null`. |
| `GET /products/:id` | Authenticated | Get product details. Customers receive a filtered representation. |
| `GET /products/:id/suppliers` | Authenticated | List supplier offers for a product. |
| `GET /products/:id/invoices` | Authenticated | Derived invoices for the current user’s delivered orders containing this product. |
| `POST /products` | Admin or legacy seller | Create a product. |
| `PATCH /products/:id` | Admin or owner legacy seller | Update product fields. Seller ownership is checked. |
| `DELETE /products/:id` | Admin or owner legacy seller | Delete a product. Seller ownership is checked. |
| `POST /products/:id/stock` | Admin or owner legacy seller | Replace stock with `{ "stock": 0 }` (non-negative integer). |
| `POST /products/:id/rating` | Customer | Add a 1–5 rating; optional `comment`. |
| `GET /products/my-supplier-org` | Legacy seller | Return the current seller’s supplier organization, if present. |

Product creation accepts `name`, `price`, and non-negative integer `stock`; optional fields include `description`, `cost_price`, `category`, `offers`, `retail_category`, dimensions/weight, `sku`, `barcode`, media URLs/arrays, keywords, specifications, and wholesale tiers. Categories are `dropshipping`, `wholesale`, `white_label`, and `fulfillment`.

## Orders

All `/orders` routes require authentication. Customers can see and change only their own orders where the handler enforces ownership. Order totals are calculated by the server from product prices; customer-supplied `manual_price` is rejected.

| Method and path | Access | Description |
|---|---|---|
| `GET /orders` | Authenticated | List orders visible to the current user. |
| `POST /orders` | Customer, admin, or legacy seller | Create an order; see request example below. Returns `201`. |
| `GET /orders/:id` | Authenticated | Fetch one order. Non-admin access is checked against customer/supplier ownership. |
| `PATCH /orders/:id/status` | Customer, admin, or legacy seller | Change order status subject to role and workflow rules. |
| `PATCH /orders/:id/delivery-company` | Admin or legacy seller | Set `delivery_company` to a string or `null`. |
| `DELETE /orders/:id` | Authenticated | Customers may delete only their own draft orders; admins have broader deletion access. |
| `POST /orders/:id/pay` | Customer or admin | Payment processing is not configured. After validation and ownership checks, this endpoint returns `409`; it does not mark an order paid. |
| `PATCH /orders/:id/payment` | Admin | Manually reconcile `status` (`paid` or `unpaid`) and optional `method` (`stripe`, `paypal`, or `cod`). This is an admin data change, not gateway verification. |
| `POST /orders/:id/tracking` | Admin or legacy seller | Add tracking information: `carrier`, `tracking_number`, `status`, and optional `detail`. |
| `GET /orders/confirmation-service/status` | Customer | Read legacy confirmation-service application status. |
| `POST /orders/confirmation-service/apply` | Customer | Create a legacy confirmation-service application. |

Create-order example:

```json
{
  "customer_name": "Sam Example",
  "customer_phone": "+21600000000",
  "governorate": "Tunis",
  "city": "Tunis",
  "shipping_address": "10 Example Street",
  "payment_method": "cod",
  "items": [{ "product_id": 12, "quantity": 2 }]
}
```

Required fields: `customer_name`, `shipping_address` (at least 3 characters), `payment_method` (`stripe`, `paypal`, or `cod`), and a non-empty `items` array. Each item requires positive integer `product_id` and `quantity`. Optional legacy fields include `telephone2`, `offer_type`, `locality_id`, `commentaire`, `est_fragile`, `ouvrir_colis`, `nombre_article`, `nombre_echange`, and `dropshipper_id` (admin/seller use only). The customer flow cannot set `dropshipper_id` or `manual_price`.

Statuses accepted by the status endpoint: `draft`, `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`. Customers can submit a draft order (`pending`) or cancel an order allowed by the workflow; other transitions are rejected. A rejected workflow transition returns `409`.

## Returns

| Method and path | Access | Description |
|---|---|---|
| `GET /returns` | Authenticated | List returns visible to the user. |
| `POST /returns` | Customer, admin, or legacy seller | Create a return/exchange request with `order_id`, `type` (`retour` or `echange`), `reason` (at least 3 characters), and optional `attachments` string array. Customers can request only for their own order. Exchanges require a delivered order. |
| `PATCH /returns/:id` | Admin | Update optional `status` (`pending`, `approved`, `rejected`, `processed`) and/or `reply`. |

## Support

| Method and path | Access | Description |
|---|---|---|
| `GET /support` | Authenticated | Admins see all tickets; customers see only their own. |
| `POST /support` | Authenticated | Create a ticket with `type` (1–80 characters) and `message` (5–5000 characters). The API uses the authenticated account’s email and user ID. |
| `PATCH /support/:id` | Admin | Reply with `answer` (1–5000 characters) and `status` (`open`, `answered`, or `closed`). |

## Dashboard

### `GET /dashboard`

Requires authentication. Returns role-specific `totals`, `revenueByDay`, `statusCounts`, and `recentOrders`. Admin responses also include user/customer/seller counts and low-stock products. Customer responses contain only their order-derived totals and available-product count. Legacy seller accounts get the legacy seller dashboard shape if they have a valid session.

## Inventory

| Method and path | Access | Description |
|---|---|---|
| `GET /inventory/by-code/:code` | **Public** | Look up inventory by its code. |
| `GET /inventory` | Authenticated | List inventories. |
| `GET /inventory/:id` | Authenticated | Get an inventory and its items. |
| `POST /inventory` | Admin | Create inventory with `name`, optional `location`, and optional positive `capacity` (defaults to 50). |
| `DELETE /inventory/:id` | Admin | Delete an inventory. |
| `POST /inventory/:id/stock` | Admin | Add stock using positive `product_id` and `quantity`. |

## Uploads and media

| Method and path | Access | Description |
|---|---|---|
| `POST /upload` | Authenticated | Upload one `file` field: JPEG, PNG, GIF, WebP, or PDF; maximum 10 MB. Returns `{ "url": "..." }`. |
| `POST /upload/video` | Authenticated | Upload one `file` field: MP4 or WebM; maximum 25 MB. Returns `{ "url": "..." }`. |
| `GET /uploads/:name` | **Public** | Retrieve an uploaded file. Content is served inline for the allowlisted image/video MIME types and as an attachment otherwise. |

The upload handler checks file signatures as well as the multipart MIME type. The URL is public, so do not upload private documents unless public access is intended.

## Chat and notifications

Chat is exposed as HTTP REST endpoints; there is no WebSocket API in this server.

| Method and path | Access | Description |
|---|---|---|
| `GET /chat/conversations` | Authenticated | List conversations for the current user. |
| `GET /chat/unread` | Authenticated | Return `{ "count": number }`. |
| `POST /chat/ensure` | Admin | Ensure an admin-to-admin conversation with `{ "peer_role": "admin" }`. |
| `POST /chat/ensure-team` | Admin | Ensure the team conversation. |
| `POST /chat/ensure-supplier` | Customer or legacy seller | Ensure a supplier conversation with `{ "supplier_id": number }`. |
| `GET /chat/:id/messages` | Authenticated participant | List messages for a conversation. |
| `POST /chat/:id/messages` | Authenticated participant | Send `{ "body": "...", "image_url": "..." }`; a non-empty body or image is required. Body max is 4000 characters. |
| `POST /chat/:id/read` | Authenticated participant | Mark conversation read. |
| `GET /notifications` | Authenticated | List the current user’s notifications. |
| `GET /notifications/unread` | Authenticated | Return `{ "count": number }`. |
| `POST /notifications/read` | Authenticated | Mark the current user’s notifications as read. |

Conversation membership is checked by the store when messages are listed, sent, or marked read.

## Health and errors

### `GET /api/health`

No authentication required. Returns `{ "success": true, "data": { "status": "ok", "store": "ready" } }`.

Common status codes:

| Code | Meaning |
|---|---|
| `400` | Invalid request body/query or invalid workflow input. Validation returns the first Zod issue. |
| `401` | Missing/invalid credentials or expired/invalid JWT. |
| `403` | Authenticated user lacks the required role or resource access. |
| `404` | Route or resource not found. |
| `409` | Conflict, duplicate account, disallowed state transition, or online payment unavailable. |
| `429` | Authentication rate limit reached; check `Retry-After`. |
| `500` | Unexpected server error; response hides internal details. |

## Security and implementation notes

- API authorization is enforced server-side; frontend route hiding is not an access control boundary.
- The request-level middleware checks the persisted user and role for supplied bearer tokens. Protected routes then enforce authentication, roles, and resource ownership where implemented.
- No payment gateway is connected. `stripe` and `paypal` are accepted as order method labels only; `/orders/:id/pay` deliberately cannot mark payment successful. Admin payment reconciliation is manual and must not be treated as provider verification.
- The authentication throttle is in-memory and resets when the server restarts; it is not a distributed production rate limiter.
- Some route validation/authorization is less uniform in legacy areas (notably inventory inputs and remaining seller branches). Review the handler before relying on an endpoint in a production deployment.
