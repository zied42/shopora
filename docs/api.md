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
| `customer` / `dropshipper` | Marketplace, own orders and returns, reservations, payouts, integrations, and API access. |
| `seller` / `fournisseur` | Own products, stock, reservations, fulfillment, shipments, and supplier support. |
| `admin` | Store administration, all users and orders, inventory, support, staff, and integrations. |
| `chef` | Operational dashboards, orders, shipments, returns, products, inventory, and reconciliation. |
| `support` | Support inbox, tickets, services, order assistance, and partner records. |
| `stocking` | Warehouse inventory, picks, reservations, shipments, and returns. |
| `confirmateur` | Pending orders and confirmation dashboards. |
| `seller` | Shopora supplier alias retained for existing accounts. |

Public registration still creates customer accounts only. Admin-created accounts can use the operational roles. Server endpoints enforce role checks and data ownership; the browser route guards are for navigation and do not replace API authorization.

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

Returns the same token/user shape as registration for supported customer, supplier, or staff roles. Invalid credentials return `401`; disabled or unsupported accounts return `403`. Limited to 10 attempts per IP/email per 15 minutes (in-memory limiter).

### `GET /auth/me`

Returns the authenticated user’s public account fields.

### `PATCH /auth/me`

Updates the authenticated user’s profile. Body fields are optional: `name` (minimum 2 characters) and `photo` (string or `null`). Returns the updated public user.

## Users — admin only

All `/users` routes require an authenticated admin.

| Method and path | Description |
|---|---|
| `GET /users` | List public user records. Password hashes are not returned. |
| `POST /users` | Create an account with an operational role. Requires `name`, `email`, `password` (minimum 12 characters), and `role`; optional `cin`. Returns `201` and the created public account. |
| `PATCH /users/:id` | Update optional `name`, supported `role`, `photo`, and `cin`. Returns `{ "ok": true }`. |
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
| `POST /products` | Admin | Create a product. |
| `PATCH /products/:id` | Admin | Update product fields. |
| `DELETE /products/:id` | Admin | Delete a product. |
| `POST /products/:id/stock` | Admin | Replace stock with `{ "stock": 0 }` (non-negative integer). |
| `POST /products/:id/rating` | Customer | Add a 1–5 rating; optional `comment`. |
| `POST /products` | Admin or supplier | Create a product; suppliers can create only under their own account. |
| `PATCH /products/:id` | Admin or owning supplier | Update a product; supplier ownership and visibility rules apply. |
| `DELETE /products/:id` | Admin or owning supplier | Delete a product. |
| `POST /products/:id/stock` | Admin or owning supplier | Set a product’s stock. |
| `POST /products/:id/rating` | Customer or dropshipper | Add a 1–5 rating; optional `comment`. |
| `GET /products/my-supplier-org` | Supplier | Return the current supplier’s organization, if present. |

Product creation accepts `name`, `price`, and non-negative integer `stock`; optional fields include `description`, `cost_price`, `category`, `offers`, `retail_category`, dimensions/weight, `sku`, `barcode`, media URLs/arrays, keywords, specifications, and wholesale tiers. Categories are `dropshipping`, `wholesale`, `white_label`, and `fulfillment`.

## Orders

All `/orders` routes require authentication. Customers can see and change only their own orders where the handler enforces ownership. Order totals are calculated by the server from product prices; customer-supplied `manual_price` is rejected.

| Method and path | Access | Description |
|---|---|---|
| `GET /orders` | Authenticated | List orders visible to the current user. |
| `POST /orders` | Customer, dropshipper, supplier, support, or admin | Create an order; see request example below. Returns `201`. |
| `GET /orders/:id` | Authenticated | Fetch an order visible to the current account; customer and supplier ownership is checked. |
| `PATCH /orders/:id/status` | Customer, dropshipper, supplier, chef, or admin | Change order status subject to ownership, payment, and transition rules. |
| `PATCH /orders/:id/delivery-company` | Admin, chef, stocking, or owning supplier | Set `delivery_company` to a string or `null`. |
| `DELETE /orders/:id` | Authenticated | Customers may delete only their own drafts; suppliers and staff are restricted by role and order status. |
| `PATCH /orders/:id/payment` | Admin | Manually reconcile a COD order as `paid` or `unpaid`; online orders require provider verification. |
| `POST /orders/:id/tracking` | Admin or owning supplier | Add tracking information: `carrier`, `tracking_number`, `status`, and optional `detail`. |
| `GET /orders/confirmation-service/status` | Customer or dropshipper | Read confirmation-service application status. |
| `POST /orders/confirmation-service/apply` | Customer or dropshipper | Create a confirmation-service application. |

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

Required fields: `customer_name`, `shipping_address` (at least 3 characters), `payment_method` (`flouci` or `cod`), and a non-empty `items` array. Each item requires positive integer `product_id` and `quantity`. Optional fields include `telephone2`, `offer_type`, `locality_id`, `commentaire`, `est_fragile`, `ouvrir_colis`, `nombre_article`, `nombre_echange`, and admin-only `dropshipper_id`. Customers cannot set `dropshipper_id` or `manual_price`.

Statuses accepted by the status endpoint: `draft`, `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`. Customers can submit a draft order (`pending`) or cancel an order allowed by the workflow; other transitions are rejected. A rejected workflow transition returns `409`.

## Returns

| Method and path | Access | Description |
|---|---|---|
| `GET /returns` | Authenticated | List returns visible to the user. |
| `POST /returns` | Customer or admin | Create a return/exchange request with `order_id`, `type` (`retour` or `echange`), `reason` (at least 3 characters), and optional `attachments` string array. Customers can request only for their own order. Exchanges require a delivered order. |
| `PATCH /returns/:id` | Admin | Update optional `status` (`pending`, `approved`, `rejected`, `processed`) and/or `reply`. |

## Support

| Method and path | Access | Description |
|---|---|---|
| `GET /support` | Authenticated | Admins see all tickets; customers see only their own. |
| `POST /support` | Authenticated | Create a ticket with `type` (1–80 characters) and `message` (5–5000 characters). The API uses the authenticated account’s email and user ID. |
| `PATCH /support/:id` | Admin | Reply with `answer` (1–5000 characters) and `status` (`open`, `answered`, or `closed`). |

## Dashboard

### `GET /dashboard`

Requires authentication. Returns role-specific `totals`, `revenueByDay`, `statusCounts`, and `recentOrders`. Admin responses also include user/customer/supplier counts and low-stock products. Customer responses contain only their order-derived totals and available-product count.

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

## Payments

Flouci credentials are optional environment settings (`FLOUCI_PUBLIC_KEY` and `FLOUCI_SECRET_KEY`). The private key is used only by the API. Checkout is available only for an unpaid Flouci order in `pending` state.

| Method and path | Access | Description |
|---|---|---|
| `POST /payments/orders/:id/flouci` | Customer | Create or resume the order's Flouci checkout session. Returns `payment_url` and `payment_id`; requires Flouci credentials. |
| `POST /payments/flouci/verify` | Customer | Verify `{ "order_id": number }` directly with Flouci. The provider-reported amount and tracking ID must match the stored order attempt before the order is marked paid. |

The payment result page calls verification after Flouci redirects back. The redirect itself never marks an order paid. A `pending` verification leaves it unpaid; the customer can request another check. Use the Flouci test-app keys and documented test cards for local development. The memory store loses payment attempts when the server restarts; use MySQL for persistence across restarts.

## Notifications

| Method and path | Access | Description |
|---|---|---|
| `GET /notifications` | Authenticated | List the current user’s notifications. |
| `GET /notifications/unread` | Authenticated | Return `{ "count": number }`. |
| `POST /notifications/read` | Authenticated | Mark the current user’s notifications as read. |

## Restored operations APIs

These route groups are mounted in addition to the marketplace endpoints:

| Prefix | Portal/workflow |
|---|---|
| `/chat` | Role-scoped conversations and messages. |
| `/chef` | Operations, fulfillment, shipments, returns, tickets, warehouse records, partners, leads, and reconciliation. |
| `/confirmateur` | Pending order confirmation queue and activity dashboards. |
| `/stocking` | Warehouse inventory, picks, refill and storage requests, shipments, and returns. |
| `/reservations` | Dropshipper reservations, supplier decisions, and warehouse refill steps. |
| `/batches` | Batch and scan workflows. |
| `/staff` | Staff activity and performance summaries. |
| `/integration` | Delivery provider settings and shipment dispatch. |
| `/flouci` | Wallets and payouts. |
| `/keys` and `/v1` | Dropshipper API keys and versioned public API. |

Each group applies server-side role checks. Consult its route handler for exact request fields and state-transition constraints.

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
| `503` | Optional provider credentials are not configured. |
| `500` | Unexpected server error; response hides internal details. |

## Security and implementation notes

- API authorization is enforced server-side; frontend route hiding is not an access control boundary.
- The request-level middleware checks the persisted user and role for supplied bearer tokens. Protected routes then enforce authentication, roles, and resource ownership where implemented.
- Flouci payment state is set only after server-side provider verification. Admin manual payment reconciliation is restricted to COD orders.
- The authentication throttle is in-memory and resets when the server restarts; it is not a distributed production rate limiter.
- The MySQL role migration expands the account enum without rewriting existing accounts. If a previous run already merged staff roles into `admin`, restore those role assignments from a database backup or have an admin reassign them; their former role cannot be inferred from the current row.
