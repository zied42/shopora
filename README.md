# Shopora

Shopora is a small e-commerce learning project built with React, TypeScript, Node.js, Express, and MySQL. It focuses on the main store workflow: customers browse products and manage orders; admins manage products, inventory, orders, users, and support requests.

## Roles

- **Customer**: browse the catalog, place and track orders, manage a profile, and contact support.
- **Admin**: manage users, products, stock, orders, and support tickets.

New public registrations always create customer accounts. Admin access is granted to existing admin accounts; it cannot be selected during registration.

## Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- API: Node.js, Express, TypeScript
- Persistence: MySQL or the in-memory demo store
- Authentication: bcrypt password hashes and JWT sessions

## Run locally

```sh
npm install
```

Configure `server/.env` with a database driver and the required application settings. Use `DB_DRIVER=memory` to run the seeded in-memory demo, or `DB_DRIVER=mysql` with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` for MySQL. Set a unique strong `JWT_SECRET` and the correct `WEB_BASE_URL` for the environment.

Start the API and client in separate terminals:

```sh
npm run dev -w server
npm run dev -w client
```

## Main routes

- Customer: `/dropshipper/store`, `/dropshipper/commandes`, `/dropshipper/support`, `/profile`
- Admin: `/admin`, `/admin/products`, `/admin/orders`, `/admin/inventory`, `/admin/users`, `/admin/support`
- API health: `/api/health`

## Security and CI

The API validates request bodies, checks roles and resource ownership, hashes passwords, uses parameterized MySQL queries, and applies Helmet security headers. GitHub Actions runs secret scanning, TypeScript checks, production builds, and dependency auditing. Treat findings as work to investigate; a passing pipeline does not prove an application is secure.

Payment-provider processing is not implemented. Order payment state is application data only; do not treat it as proof that a payment succeeded.
