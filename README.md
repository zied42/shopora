# Shopora

Shopora is a multi-role dropshipping and operations platform built with React, TypeScript, Node.js, Express, and MySQL. It combines the customer marketplace with supplier fulfillment and internal warehouse, support, and order-confirmation workflows.

## Roles

- **Customer / dropshipper**: browse products, manage saved products and orders, request returns, use support and marketplace tools.
- **Supplier / fournisseur**: manage products and stock, fulfill orders, and handle reservations, shipments, warehouses, and support.
- **Admin**: manage users, products, orders, inventory, payments, support, staff, and integrations.
- **Chef**: oversee operations, fulfillment, shipments, returns, inventory, products, suppliers, and reconciliation.
- **Support**: handle inbox, tickets, services, order assistance, and partner records.
- **Stocking**: process picks, inventory, reservations, storage, shipments, and returns.
- **Confirmateur**: work the pending-order queue and confirmation dashboards.

New public registrations always create customer accounts. Staff and supplier roles can only be assigned by an admin; they cannot be selected during public registration.

## Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- API: Node.js, Express, TypeScript
- Persistence: MySQL or the in-memory demo store
- Authentication: bcrypt password hashes and JWT sessions

## Run locally

```sh
npm install
```

Configure `server/.env` with a database driver and the required application settings. Use `DB_DRIVER=memory` to run the seeded in-memory demo, or `DB_DRIVER=mysql` with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` for MySQL. Set a unique strong `JWT_SECRET` and the correct `WEB_BASE_URL` for the environment. For online checkout, add Flouci test credentials as `FLOUCI_PUBLIC_KEY` and `FLOUCI_SECRET_KEY`; keep the private key server-side.

Start the API and client in separate terminals:

```sh
npm run dev -w server
npm run dev -w client
```

## Main routes

- Customer: `/shop`, `/saved`, `/orders`, `/support`, `/profile`
- Dropshipper: `/dropshipper`, `/dropshipper/trending`, `/dropshipper/reservations`, `/dropshipper/integrations`, `/dropshipper/api`, `/dropshipper/payments`
- Supplier: `/fournisseur`, `/fournisseur/products`, `/fournisseur/orders`, `/fournisseur/inventory`, `/fournisseur/stock-shipments`, `/fournisseur/fulfillment/orders`
- Staff: `/chef`, `/support/desk`, `/stocking`, `/confirmateur`
- Admin: `/admin`, `/admin/products`, `/admin/orders`, `/admin/inventory`, `/admin/users`, `/admin/support`, `/admin/staff`, `/admin/integration`
- API health: `/api/health`

See [docs/api.md](docs/api.md) for the API endpoint reference, request schemas, role access, examples, and payment limitations.

## Security and CI

The API validates request bodies, checks roles and resource ownership, hashes passwords, uses parameterized MySQL queries, and applies Helmet security headers. GitHub Actions runs secret scanning, TypeScript checks, production builds, and dependency auditing. Treat findings as work to investigate; a passing pipeline does not prove an application is secure.

Customers can pay by cash on delivery or start a Flouci checkout after submitting an order. The API marks Flouci orders paid only after server-side verification with Flouci. Without configured Flouci credentials, online checkout is unavailable; use the provider's test-app credentials for development.
