# shopora

# shopora — Dropshipping Platform (Phase 1 / MVP)

The ** Dropshipping Platform** functional MVP built from the Roadmap Phase 1 requirements.

## Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS v4 + React Router + Recharts (charts) + SheetJS (Excel export) + QR/Barcode
- **Backend:** Node.js + Express + TypeScript
- **Data:** Driver-based store abstraction — **MySQL** now, **memory** demo store, **Supabase** (Phase 2). Swap by changing `DB_DRIVER`.

## Features delivered (Phase 1)
| Roadmap item | Where |
|---|---|
| Authentication | `/auth` JWT login/register, `/auth/me` |
| Roles & Permissions | Admin / Customer / Seller — three-role RBAC plus resource ownership checks |
| Admin Dashboard | platform revenue, orders, users, products, low stock, 7-day chart |
| Dropshipper Dashboard | own revenue / profit / unpaid / margin |
| Seller Dashboard | own products, stock, pending confirmations, revenue |
| Gestion des Commandes | create orders (single-supplier), status workflow, cancel |
| Fulfillment | Sellers and admins confirm, ship, and deliver orders |
| Gestion du Stock | stock quantity, auto-decrement on order, low-stock alerts |
| Tracking | carrier + tracking number + status timeline |
| Code QR / Barcode | QR + CODE128 barcode generated per order / product |
| Photos | product image URL + file upload (`/api/upload`, served from `/uploads`) |
| Videos | optional video URL on products |
| Support | ticket creation + admin replies |
| Paiement | Stripe / PayPal / Cash-on-delivery flow (integrated-ready, mocked) |
| Rating | Customers rate ordered products, product average is updated |
| Calculation Profit | per order + totals per role, margin % |
| Excel Export | one-click `.xlsx` download of any order list |

---

## Getting started

```bash
npm install
```

### Option A — MySQL (recommended, configured)
Backend uses the MySQL connection from `server/.env`:

```
DB_DRIVER=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ecom
```

On first start the backend **creates the `ecom` database + tables and seeds demo data automatically**.

### Option B — No database (demo)
Set `DB_DRIVER=memory` in `server/.env` (or delete `.env`) and the API runs on an in-memory seeded store.

### Run
```bash
npm run dev          # runs API (port 5000) + web app (port 3000) together
npm run build        # build both for production
```

Open **http://localhost:3000** and sign in with a demo account (password `password`):

| Email | Role |
|---|---|
| `admin@demo.com` | Admin |
| `dropshipper@demo.com` | Customer |
| `fournisseur@demo.com` | Seller (account A) |
| `lina@demo.com` | Seller (account B) |

```bash
# reset MySQL demo data
mysql -u root -p -e "USE ecom; DROP TABLE IF EXISTS support_tickets, ratings, tracks, order_items, orders, products, users;"
```

---

## Project structure
```
├── client/                # React + TS + Tailwind app
│   └── src/
│       ├── pages/admin        # Admin dashboards
│       ├── pages/dropshipper  # Customer catalog/cart/checkout/orders
│       ├── pages/fournisseur  # Seller products/stock/fulfillment
│       ├── components/        # Layout, OrderCenter, ProductTable, Charts...
│       ├── context/           # Auth + Cart
│       └── lib/               # api client, excel export
└── server/                # Express + TS API
    └── src/
        ├── routes/        # auth, users, products, orders, support, dashboard, upload
        ├── middleware/    # JWT auth, RBAC, validation, error handler
        ├── store/         # Store interface + drivers (memory, mysql) ← swap point
        └── config/        # env
```

## Moving from MySQL to Supabase (aka "the swap")
All data access goes through the `Store` interface (`server/src/store/types.ts`). The swap is contained:

1. Create `server/src/store/supabase.ts` implementing the same `Store` interface using `@supabase/supabase-js` (Postgres).
2. Register it in `server/src/store/index.ts` under `DB_DRIVER=supabase`.
3. Reuse the same SQL schema (already portable except `ENUM`→`TEXT` + `CHECK`/`VARCHAR`).
4. Keep the `memory` driver for unit-testing and local demos.

Nothing else in the routes/UI changes.

## Deployment notes (free hosting)
- **Frontend** → Vercel / Netlify / Cloudflare Pages. Point the `VITE_API_URL` (or keep proxy during dev) to the hosted API. Build: `npm run build -w client`.
- **Backend** → Render / Railway / Fly.io (free tiers). Set the `DB_*` env vars there.
- **Supabase (free)** is the recommended hosted database once Phase 2 starts — PostgreSQL-backed, made for this swap.

## Security notes
- Passwords hashed with bcrypt; JWT auth; role-checked endpoints; SQL uses parameterized queries.
- Change `JWT_SECRET` in production.
- User-controlled `order_number`/IDs are validated (`:id(\d+)`, zod schemas).
