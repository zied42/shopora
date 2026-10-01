import { ReactNode } from 'react';

const BASE = `${window.location.origin}/api/v1`;

const TOC: { href: string; label: string }[] = [
  { href: '#getting-started', label: 'Getting started' },
  { href: '#authentication', label: 'Authentication' },
  { href: '#countries', label: 'Countries' },
  { href: '#divisions', label: 'Divisions' },
  { href: '#products-list', label: 'List products' },
  { href: '#products-get', label: 'Get product' },
  { href: '#orders-list', label: 'List orders' },
  { href: '#orders-create', label: 'Create order' },
  { href: '#orders-get', label: 'Get order' },
  { href: '#orders-cancel', label: 'Cancel order' },
  { href: '#dashboard-overview', label: 'Dashboard overview' },
  { href: '#dashboard-delivery-stats', label: 'Delivery stats' },
  { href: '#dashboard-confirmation-stats', label: 'Confirmation stats' },
  { href: '#dashboard-internal-confirmation-stats', label: 'Internal confirmation stats' },
  { href: '#dashboard-product-performance', label: 'Product performance' },
  { href: '#webhooks-register', label: 'Register webhook' },
  { href: '#webhooks-list', label: 'List webhooks' },
  { href: '#webhooks-delete', label: 'Delete webhook' },
  { href: '#webhooks-payload', label: 'Webhook payload' },
  { href: '#errors', label: 'Errors' },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-slate-200 pb-10 pt-10 first:pt-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-slate-600">{children}</div>
    </section>
  );
}

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-slate-950">
      {title && <div className="border-b border-neutral-800 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</div>}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-neutral-300">{code}</pre>
    </div>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-rose-600">{children}</code>;
}

function KV({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-2 align-top font-mono text-[13px] text-slate-800">{k}</td>
      <td className="px-4 py-2 text-sm text-slate-600">{v}</td>
    </tr>
  );
}

function Params({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v], i) => (
            <KV key={i} k={k} v={v} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-base font-bold text-slate-900">{children}</h3>;
}

function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export default function ApiDocs() {
  const productLink = `${BASE}/products/1`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* hero */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1">
            <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[11px] font-black text-white">v1</span>
            <span className="text-xs font-semibold text-brand-700">API Reference</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Store API</h1>
          <p className="mt-2 text-base text-slate-500">Manage countries, products, orders and dashboard stats with a simple REST API.</p>
          <p className="mt-4 text-sm text-slate-500">
            Base URL: <code className="rounded bg-slate-900 px-2 py-1 font-mono text-[13px] text-emerald-300">{BASE}</code>
          </p>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Download Postman Collection
        </a>
      </div>

      <div className="mt-8 flex gap-10">
        {/* sticky toc */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">On this page</p>
            {TOC.map((t) => (
              <a key={t.href} href={t.href} className="block rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                {t.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* docs */}
        <div className="min-w-0 flex-1">
          <Section id="getting-started" title="Getting started">
            <P>
              The API is organised around REST. It returns JSON everywhere, including errors. All requests must go over HTTPS and authenticate with a Bearer API key.
            </P>
            <P>
              Create your key from the <strong>API</strong> page — the secret is shown only once, store it somewhere safe. Every request you make counts against a per-key rate limit; the response headers{' '}
              <InlineCode>X-RateLimit-Limit</InlineCode> and <InlineCode>X-RateLimit-Remaining</InlineCode> tell you where you stand.
            </P>
            <CodeBlock
              title="First call"
              code={`curl -X GET "${BASE}/me" \\
  -H "Authorization: Bearer sk_live_YOUR_API_KEY"`}
            />
          </Section>

          <Section id="authentication" title="Authentication">
            <P>Send your API key in the Authorization header as a Bearer token:</P>
            <CodeBlock
              title="Request header"
              code={'Authorization: Bearer sk_live_YOUR_API_KEY'}
            />
            <P>
              A missing or malformed header returns <InlineCode>401 Unauthorized</InlineCode>; an unknown or revoked key returns <InlineCode>403 Forbidden</InlineCode>.
            </P>
            <CodeBlock
              title="Response — 401"
              code={'{ "error": "Missing API key. Send \\"Authorization: Bearer YOUR_API_KEY\\"." }'}
            />
          </Section>

          <Section id="countries" title="Countries">
            <P>List the countries we ship to and the geographic structure expected when creating an order.</P>
            <CodeBlock
              title="GET /api/v1/countries"
              code={`GET ${BASE}/countries`}
            />
            <CodeBlock
              title="Response 200"
              code={`[
                  {
                    "code": "TN",
                    "name": "Tunisia",
                    "geo_structure": {
                      "fields": [
                        { "id": "division_1_id", "label": "Governorate", "level": 1, "required": true, "depends_on": null },
                        { "id": "division_2_id", "label": "Delegation", "level": 2, "required": true, "depends_on": "division_1_id" }
                      ]
                    }
                  },
                ]`}
            />
          </Section>

          <Section id="divisions" title="Divisions">
            <P>Fetch the list of divisions (governorates / delegations) for a country. Level 1 divisions can be filtered by <InlineCode>parent_id</InlineCode> to get level 2 child divisions.</P>
            <CodeBlock
              title="GET /api/v1/countries/{code}/divisions"
              code={`GET ${BASE}/countries/TN/divisions?level=1`}
            />
            <CodeBlock
              title="Response 200"
              code={`{
  "country": "TN",
  "geo_structure": { "fields": [ /* ... */ ] },
  "divisions": [
    { "id": 1, "name": "Tunis", "level": 1, "parent_id": null },
    { "id": 2, "name": "Ariana", "level": 1, "parent_id": null }
  ]
}`}
            />
            <P>
              Get the delegations of a governorate: <InlineCode>{`${BASE}/countries/TN/divisions?level=2&parent_id=1`}</InlineCode>
            </P>
          </Section>

          <Section id="products-list" title="List products">
            <P>Returns your store's active products with variants and fulfilment info. Supports <InlineCode>search</InlineCode>, <InlineCode>page</InlineCode> and <InlineCode>per_page</InlineCode>.</P>
            <CodeBlock
              title="GET /api/v1/products"
              code={`GET ${BASE}/products?search=watch&page=1&per_page=20`}
            />
            <CodeBlock
              title="Response 200"
              code={`{
  "data": [
    {
      "uuid": "1",
      "name": "Smart Watch Series 7",
      "sku": "SW-7-BLK",
      "price": 149,
      "cost": 62,
      "status": "active",
      "link": "${productLink}",
      "supplier_identifier": "TechSupplier SARL",
      "available_qte": 24,
      "variants": []
    }
  ],
  "pagination": { "total": 1, "current_page": 1, "per_page": 20, "last_page": 1 }
}`}
            />
            <H3>Query parameters</H3>
            <Params
              rows={[
                ['search', 'Filters products by name or SKU.'],
                ['page', 'Page number, defaults to 1.'],
                ['per_page', 'Items per page (1–100), defaults to 20.'],
              ]}
            />
          </Section>

          <Section id="products-get" title="Get product">
            <P>Fetch a single product by its id (the <InlineCode>uuid</InlineCode> from the list, e.g. <InlineCode>1</InlineCode>).</P>
            <CodeBlock
              title="GET /api/v1/products/{uuid}"
              code={`GET ${BASE}/products/1`}
            />
            <CodeBlock
              title="Response 200"
              code={`{
  "uuid": "1",
  "name": "Smart Watch Series 7",
  "sku": "SW-7-BLK",
  "price": 149,
  "cost": 62,
  "status": "active",
  "link": "${productLink}",
  "supplier_identifier": "TechSupplier SARL",
  "available_qte": 24,
  "variants": [],
  "created_at": "2026-01-18T10:22:00.000Z"
}`}
            />
            <P>A missing or inactive product returns <InlineCode>404 {`{ "error": "Product not found" }`}</InlineCode>.</P>
          </Section>

          <Section id="orders-list" title="List orders">
            <P>Returns the orders placed by your store with customer + item summary. Filters: <InlineCode>status</InlineCode>, <InlineCode>search</InlineCode>, <InlineCode>start_date</InlineCode>, <InlineCode>end_date</InlineCode>, plus pagination.</P>
            <CodeBlock
              title="GET /api/v1/orders"
              code={`GET ${BASE}/orders?status=delivered&start_date=2026-05-01&end_date=2026-05-14`}
            />
            <CodeBlock
              title="Response 200"
              code={`{
  "data": [
    {
      "id": 42,
      "status": "Delivered",
      "store_name": "My Store",
      "is_cod": true,
      "is_paid": true,
      "created_at": "2026-05-12T09:41:00.000Z",
      "address": { "first_name": "Ahmed", "last_name": "Gharbi", "phone1": "+216 22 123 456" },
      "items_count": 1,
      "shipments_count": 1,
      "products": ["Smart Watch Series 7"],
      "revenue": "149",
      "external_order_id": "CMD-2026-0123",
      "external_order_url": "${window.location.origin}/dropshipper/commandes"
    }
  ],
  "pagination": { "total": 1, "current_page": 1, "per_page": 20, "last_page": 1 }
}`}
            />
            <P>
              Note: dates are given as <InlineCode>YYYY-MM-DD</InlineCode> (space-separated times must be URL-encoded, e.g. <InlineCode>2026-05-14%2010:30</InlineCode>, never <InlineCode>+</InlineCode>).
            </P>
          </Section>

          <Section id="orders-create" title="Create order">
            <P>Place a new order for a customer from your store.</P>
            <CodeBlock
              title="POST /api/v1/orders"
              code={`POST ${BASE}/orders

{
  "is_cod": true,
  "address": {
    "name": "Ahmed Gharbi",
    "phone1": "+216 22 123 456",
    "phone2": "",
    "address1": "12 Rue de la Liberté",
    "address2": "",
    "division_1": "Tunis",
    "division_2": "Medina",
    "country": "TN"
  },
  "items": [
    { "id": 1, "quantity": 1, "total_price": 149 }
  ]
}`}
            />
            <CodeBlock
              title="Response 201"
              code={'{ "id": 43 }'}
            />
            <P>
              The <InlineCode>id</InlineCode> on each item is the product's <InlineCode>uuid</InlineCode> from <InlineCode>GET /products</InlineCode>. Items whose product is unavailable, or missing address / country / items, return{' '}
              <InlineCode>422</InlineCode> with a list of errors.
            </P>
          </Section>

          <Section id="orders-get" title="Get order">
            <P>Fetch a single order with full address and shipment tracking.</P>
            <CodeBlock
              title="GET /api/v1/orders/{uuid}"
              code={`GET ${BASE}/orders/42`}
            />
            <CodeBlock
              title="Response 200"
              code={`{
  "id": 42,
  "status": "Paid",
  "contact_task_status": null,
  "shipments": [],
  "address": {
    "first_name": "Ahmed",
    "last_name": "Gharbi",
    "phone1": "+216 22 123 456",
    "phone2": "",
    "address1": "12 Rue de la Liberté",
    "address2": "",
    "division_1": "Tunis",
    "division_2": "Medina",
    "country": "TN"
  }
}`}
            />
          </Section>

          <Section id="orders-cancel" title="Cancel order">
            <P>Cancel an order that is still pending or confirmed and has no shipments.</P>
            <CodeBlock
              title="POST /api/v1/orders/{uuid}/cancel"
              code={`POST ${BASE}/orders/42/cancel`}
            />
            <CodeBlock
              title="Response 200"
              code={'{ "success": true, "canceled_shipments": 0 }'}
            />
            <P>
              Orders that have left the warehouse return <InlineCode>422 {`{ "error": "No shipments available to cancel" }`}</InlineCode>.
            </P>
          </Section>

          <Section id="dashboard-overview" title="Dashboard overview">
            <P>Aggregated revenue / expenses / profit for your store, grouped by shipment state.</P>
            <CodeBlock
              title="GET /api/v1/dashboard/overview"
              code={`GET ${BASE}/dashboard/overview?start_date=2026-05-01&end_date=2026-05-14`}
            />
            <CodeBlock
              title="Response 200"
              code={`{
  "shipments_pending": { "count": 2, "revenue": [{ "amount": "298", "currency": "TND" }] },
  "shipments_delivered_paid": { "count": 1, "revenue": [{ "amount": "149", "currency": "TND" }] },
  "shipments_delivered_non_paid": { "count": 0 },
  "shipments_failed_delivery": { "count": 0 },
  "stats_by_order_type": [
    { "order_type": "dropshipping", "shipments_pending": {}, "shipments_delivered_paid": {}, "shipments_delivered_non_paid": {}, "shipments_failed_delivery": {} }
  ]
}`}
            />
            <P>Money amounts are objects of <InlineCode>{`{ amount, currency }`}</InlineCode> where currency is <InlineCode>TND</InlineCode>.</P>
          </Section>

          <Section id="dashboard-delivery-stats" title="Delivery stats">
            <P>Delivery speed and failure-ratio stats over a date range.</P>
            <CodeBlock
              title="GET /api/v1/dashboard/delivery-stats"
              code={`GET ${BASE}/dashboard/delivery-stats?start_date=2026-05-01&end_date=2026-05-14`}
            />
            <CodeBlock
              title="Response 200"
              code={`{
  "total_by_status": [
    { "status": "delivered", "count": 1, "on_hold_count": 0 },
    { "status": "intransit", "count": 1, "on_hold_count": 0 }
  ],
  "total_delivery_failures_by_reason": [
    { "reason": "Customer unavailable for delivery", "count": 0 },
    { "reason": "Trust or credibility issues at delivery", "count": 0 },
    { "reason": null, "count": 0 }
  ],
  "avg_delivery_speed_business_days": 1.5,
  "max_delivery_speed_business_days": 1.5,
  "delivered_within_1bd_pct": 50,
  "delivered_within_2bd_pct": 100,
  "delivered_over_2bd_pct": 0
}`}
            />
          </Section>

          <Section id="dashboard-confirmation-stats" title="Confirmation stats">
            <P>Confirmation-ratio statistics. Returns an empty result when no stats are available yet for your store.</P>
            <CodeBlock
              title="GET /api/v1/dashboard/confirmation-stats"
              code={`GET ${BASE}/dashboard/confirmation-stats`}
            />
            <CodeBlock
              title="Response 200"
              code={'{ "has_stats": false, "stats": null }'}
            />
          </Section>

          <Section id="dashboard-internal-confirmation-stats" title="Internal confirmation stats">
            <P>Confirmation statistics seen from your store's fulfilment side.</P>
            <CodeBlock
              title="GET /api/v1/dashboard/internal-confirmation-stats"
              code={`GET ${BASE}/dashboard/internal-confirmation-stats`}
            />
            <CodeBlock
              title="Response 200"
              code={'{ "has_stats": false, "stats": null }'}
            />
          </Section>

          <Section id="dashboard-product-performance" title="Product performance">
            <P>Per-product shipped / delivered / failed / in-transit counts and conversion rate.</P>
            <CodeBlock
              title="GET /api/v1/dashboard/product-performance"
              code={`GET ${BASE}/dashboard/product-performance?sort_by=shipped_orders`}
            />
            <CodeBlock
              title="Response 200"
              code={`{
  "products": [
    {
      "retailer_product_id": "1",
      "name": "Smart Watch Series 7",
      "shipped_orders": 2, "shipped_units": 2,
      "delivered_orders": 1, "delivered_units": 1,
      "failed_orders": 0, "failed_units": 0,
      "in_transit_orders": 1, "in_transit_units": 1,
      "returning_orders": 0, "returning_units": 0,
      "confirmed_return_orders": 0, "confirmed_return_units": 0,
      "leads_total": 2, "leads_confirmed": 1,
      "overall_confirmation_rate": 70,
      "absolute_confirmation_rate": 72,
      "conversion_rate": 50
    }
  ],
  "total": 1
}`}
            />
            <H3>Query parameters</H3>
            <Params
              rows={[
                ['sort_by', 'One of shipped_orders, delivered_orders, failed_orders, in_transit_orders, leads_total, leads_confirmed, overall_confirmation_rate, absolute_confirmation_rate, conversion_rate.'],
                ['start_date / end_date', 'Optional date range.'],
                ['retailer_product_id', 'Optional filter for a single product.'],
                ['page / per_page', 'Pagination (per_page max 50).'],
              ]}
            />
          </Section>

          <Section id="webhooks-register" title="Register webhook">
            <P>Subscribe to events so our servers can push updates to your endpoint.</P>
            <CodeBlock
              title="POST /api/v1/webhooks"
              code={`POST ${BASE}/webhooks

{
  "url": "https://myapp.example.com/webhooks/shopora",
  "events": ["order.status_changed", "shipment.status_changed"],
  "secret": "whsec_replacethis"
}`}
            />
            <CodeBlock
              title="Response 201"
              code={`{ "id": 1, "url": "https://myapp.example.com/webhooks/shopora", "events": ["order.status_changed", "shipment.status_changed"], "status": "active", "created_at": "2026-08-18T14:00:00.000Z" }`}
            />
            <P>
              The URL must be <InlineCode>https://</InlineCode> and the secret at least 16 characters. You can register up to 5 webhooks per key.
            </P>
          </Section>

          <Section id="webhooks-list" title="List webhooks">
            <P>List the webhooks registered for your key.</P>
            <CodeBlock
              title="GET /api/v1/webhooks"
              code={`GET ${BASE}/webhooks`}
            />
            <CodeBlock
              title="Response 200"
              code={`[
  { "id": 1, "url": "https://myapp.example.com/webhooks/shopora", "events": ["order.status_changed"], "status": "active", "created_at": "2026-08-18T14:00:00.000Z", "last_triggered_at": null, "failure_count": 0 }
]`}
            />
          </Section>

          <Section id="webhooks-delete" title="Delete webhook">
            <P>Remove a webhook by its id.</P>
            <CodeBlock
              title="DELETE /api/v1/webhooks/{uuid}"
              code={`DELETE ${BASE}/webhooks/1`}
            />
            <CodeBlock title="Response 200" code={'{ "success": true }'} />
          </Section>

          <Section id="webhooks-payload" title="Webhook payload">
            <P>When a subscribed event fires we POST a JSON payload to your endpoint, signed with an <InlineCode>X-SHOPORA-Signature</InlineCode> header built with HMAC-SHA256 of the raw body using your secret.</P>
            <CodeBlock
              title="Payload — order.status_changed"
              code={`{
  "event": "order.status_changed",
  "order_id": 42,
  "status": "delivered",
  "updated_at": "2026-05-14T20:05:00.000Z"
}`}
            />
            <CodeBlock
              title="Payload — shipment.status_changed"
              code={`{
  "event": "shipment.status_changed",
  "order_id": 42,
  "tracking_number": "TND123456789",
  "status": "in_transit",
  "updated_at": "2026-05-12T11:00:00.000Z"
}`}
            />
            <P>Always respond <InlineCode>2xx</InlineCode> promptly; failures are retried with backoff and bump <InlineCode>failure_count</InlineCode>.</P>
          </Section>

          <Section id="errors" title="Errors">
            <P>Errors are returned as JSON with an <InlineCode>error</InlineCode> message, and sometimes extra details.</P>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-2.5">Status code</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">When</th>
                  </tr>
                </thead>
                <tbody>
                  <KV k="401" v={<>Unauthorized — missing or malformed <InlineCode>Authorization</InlineCode> header.</>} />
                  <KV k="403" v={<>Forbidden — unknown, revoked or inactive API key.</>} />
                  <KV k="404" v={<>Not found — the resource or id does not exist.</>} />
                  <KV k="422" v={<>Unprocessable — validation failed (bad dates, unavailable products, invalid webhook).</>} />
                  <KV k="429" v={<>Too many requests — you hit the rate limit for your key.</>} />
                </tbody>
              </table>
            </div>
            <CodeBlock
              title="Example error"
              code={`HTTP/1.1 422 Unprocessable Entity

{ "error": "Invalid end_date format.", "value": "14/05/2026", "expected_formats": ["YYYY-MM-DD", "YYYY-MM-DD HH:MM", "YYYY-MM-DD HH:MM:SS"], "hint": "..." }`}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}