# Shopora Security Review

| Property | Value |
|---|---|
| Security-sensitive | Yes |
| Reviewer | Codex |
| Reviewed | 2026-10-01 |
| Scope | Committed baseline `371fa2c` |
| Method | Static review of authentication, API routes, database access, uploads, and client sinks; production dependency audit |
| Status | **REMEDIATED_WITH_RESIDUAL_RISKS** — reviewed findings addressed on `security/fix-review-findings`; payment-provider integration and durable upload quotas remain follow-up work |

This is a source review, not a penetration test. The findings below were first recorded against the baseline commit; remediation changes and their verification are summarized at the end. The baseline production dependency audit was run with `npm audit --omit=dev`.

## Findings

| ID | OWASP | Severity | Finding | Status |
|---|---|---:|---|---|
| S1 | A02/A05 | Critical | Default JWT secret and demo admin credentials can enable admin access when production environment settings are omitted. | Fixed |
| S2 | A01 | High | Sellers can change the delivery company for arbitrary orders. | Fixed |
| S3 | A01 | High | Sellers can create return requests against orders they do not own. | Fixed |
| S4 | A04 | High | The API accepts payment as complete without verifying a payment-provider result. | Partially fixed — customers cannot mark orders paid; provider verification remains unimplemented |
| S5 | A04 | High | Customers can set an arbitrary manual order price at checkout. | Fixed — only privileged Admins and a Seller's own fulfillment orders can use an override |
| S6 | A03/A05 | High | Uploads trust client MIME types, allow SVG, and serve uploaded files from the application origin. | Partially fixed — allowlist, signature checks, attachment sandboxing, and per-file caps; durable quotas remain |
| S7 | A07 | High | Login and registration have no rate limit; password policy and synchronous bcrypt increase brute-force and denial-of-service risk. | Partially fixed — process-local throttles, 12-character minimum, asynchronous bcrypt; distributed limits remain |
| S8 | A07 | Medium | JWT role claims remain trusted until token expiry, including after account deletion or role changes. | Fixed |
| S9 | A05 | Medium | CORS allows every origin and the Express app lacks common security headers. | Fixed |
| S10 | A06 | High | Production dependency audit reports two high-severity vulnerable direct dependencies. | Fixed — `npm audit` reports zero findings |
| S11 | A01 | Medium | Carrier lookup and order-status synchronization are available to any authenticated role without an order ownership check. | Fixed — these operations now require Admin |
| S12 | A09 | Low | Authentication failures and authorization denials are not logged as security events; generic errors expose the underlying message. | Partially fixed — auth/authorization events logged and 5xx messages sanitized; broader audit trail remains |
| S13 | A01/A02 | Medium | Customers can fetch inactive products directly by ID, including internal product fields. | Fixed |

### S1 — Unsafe production defaults (Critical)

Production startup now requires an explicit 32-character JWT secret, MySQL driver, and non-default database password. MySQL demo identities receive random unusable passwords in production. Development defaults remain for local demos only.

**Remediation:** Production configuration is validated at startup and production demo passwords are randomized on startup. Deployment still needs secret management and a configured production database.

### S2 — Seller can edit another order's delivery carrier (High)

`server/src/routes/orders.ts:204-208` authorizes both sellers and Admins, then calls `setDeliveryCompany` without loading the order or checking that a seller owns it. Any authenticated seller who can guess an order ID can change the carrier on another seller's order.

**Remediation:** The handler now returns 404 for a missing order, validates the carrier field, and checks that a Seller owns every product before allowing the carrier update.

### S3 — Seller can open a return for another user's order (High)

`server/src/routes/returns.ts:29-45` checks order ownership only for Customers. A Seller can submit a return for any order ID; the created request records the Seller's own user ID as `dropshipper_id`.

**Remediation:** Sellers can request returns only for orders containing only their products; the return records the order's actual customer owner.

### S4 — Payment status is client-controlled (High)

`server/src/routes/orders.ts:245-257` marks a Customer's order as `paid` after a direct API call; it does not verify Stripe or PayPal. New non-COD orders are also inserted as `paid` in `server/src/store/mysql.ts:2541-2546` and `server/src/store/memory.ts:984`. The README describes payment as mocked, so this must not be treated as production payment processing.

**Remediation / residual risk:** New orders start unpaid and the customer-facing pay endpoint cannot mark them paid. No payment provider or signed webhook is implemented yet. The Admin-only reconciliation endpoint remains privileged manual state management and must only be used after out-of-band verification.

### S5 — Customer-supplied order price (High)

`server/src/routes/orders.ts:28,59-121` accepts `manual_price` for every role and forwards it to `createOrder`. The MySQL and memory stores replace the computed product total with that value (`server/src/store/mysql.ts:2570-2593`, `server/src/store/memory.ts:943-1001`). A Customer can therefore submit an arbitrarily low positive amount.

**Remediation:** Customers are rejected if they submit `manual_price`. Seller overrides are retained only for the existing own-product fulfillment flow; Admin overrides remain privileged.

### S6 — Untrusted uploads can execute as same-origin SVG (High)

`server/src/routes/upload.ts:22-33` trusts the client-provided MIME type and accepts any `image/*`, including SVG, while using the original filename extension. The app serves uploads from its own origin (`server/src/app.ts:33-44`) and `contentTypeFor` serves SVG as `image/svg+xml` (`server/src/routes/upload.ts:39-46`). A malicious SVG may execute script when opened directly on that origin. The video endpoint also permits individual 200 MB uploads and has no quota or rate limit.

**Remediation / residual risk:** SVG and unsupported MIME types are rejected, signatures are checked for allowed formats, names use server-selected extensions, videos are capped at 25 MB, and uploaded content is served with `nosniff` and sandbox CSP (safe raster/video types remain inline for storefront rendering). Durable per-user storage quotas and separate-origin hosting are not implemented.

### S7 — No auth throttling and weak password policy (High)

`server/src/routes/auth.ts:47-76` applies no rate limiter to registration or login, allows six-character passwords, and calls synchronous bcrypt for hash and comparison. This permits password guessing and lets repeated login requests block the Node event loop. Rate limiting exists only in the separate API-key router, not these auth endpoints.

**Remediation / residual risk:** Registration and login now have per-IP/account-key process-local throttles, new passwords require 12 characters, and bcrypt is asynchronous. The throttle map resets on restart and is not shared across server replicas; deploy a shared rate-limit store before horizontal scaling.

### S8 — Deleted or downgraded accounts retain access (Medium)

Tokens contain role claims and live for seven days (`server/src/middleware/auth.ts:23-31`). `requireAuth` verifies the signature but does not reload the user or current role (`server/src/middleware/auth.ts:42-51`). A deleted user or a user whose role was reduced can continue using the existing token until it expires.

**Remediation:** Requests with bearer tokens now reload the account and compare its current role before route authorization. Deleted or role-changed users' tokens are rejected. Tokens remain seven-day JWTs and logout/revocation sessions are not implemented.

### S9 — Broad browser security configuration (Medium)

`server/src/app.ts:30-31` enables default `cors()` for all origins. No security-header middleware is configured, and the error handler returns the original exception message to clients (`server/src/middleware/error.ts:35-45`).

**Remediation:** CORS uses the configured `WEB_BASE_URL` allowlist, Helmet supplies security headers, and 5xx responses no longer expose exception messages. Review/adjust CSP and allowed origins for the actual deployment.

### S10 — Vulnerable production dependencies (High)

The initial baseline audit reported **8 production findings: 2 high, 5 moderate, 1 low**. Remediation upgraded Axios and patched transitive packages, replaced SheetJS (`xlsx`) with CSV export, and upgraded React Router and Vite. The current `npm audit` and `npm audit --omit=dev` both report zero findings.

- `axios` 1.19.0: multiple advisories, including denial-of-service and prototype-pollution issues; npm reports a compatible fix.
- `xlsx` 0.18.5: prototype-pollution and ReDoS advisories; npm reports no automatic fix.

The baseline also reported moderate findings in `express`, `body-parser`, `qs`, and `react-router` / `react-router-dom`. The baseline report reflects the registry state at the initial review; the current lockfile was audited after remediation.

**Remediation:** Dependency lockfile is updated and `xlsx` is removed. Order exports are generated as CSV with formula-leading cell escaping. The current lead-import page only accepts and labels files; it does not parse uploaded workbooks.

### S11 — Carrier operations lack resource scoping (Medium)

`server/src/routes/integration.ts:142-154` allows any authenticated role to query carrier status/filter endpoints. The `sync-status/:orderId` route (`:188-206`) also accepts any authenticated role and updates delivery status by order ID without checking Admin status or ownership. This can expose carrier/order state and use the platform's carrier credentials to query guessed references.

**Remediation:** Carrier reference lookup, list/filter, and status synchronization now require Admin authorization. Order-specific status sync loads the order before querying the carrier.

### S13 — Direct product lookup bypasses customer visibility filters (Medium)

`server/src/routes/products.ts:173-180` returns `store.getProduct(id)` to any authenticated role without checking whether a product is active and approved. The catalog list applies those filters for Customers, but a Customer who guesses/enumerates a product ID can fetch an inactive listing. The MySQL mapper includes fields such as `cost_price`, `moderation_note`, `house_stock`, and `committed_stock` (`server/src/store/mysql.ts:1328-1370`).

**Remediation:** Customer detail lookups enforce active/approved/eligible visibility and omit cost, internal inventory, and moderation fields.

### S12 — Security logging and error disclosure (Low)

Authentication failures and authorization denials return responses without security-event logging. The global handler logs the exception and also returns `err.message` to the client (`server/src/middleware/error.ts:35-45`), which can expose implementation or database details.

**Remediation / residual risk:** Authentication failures and authorization denials are logged without credential values; unexpected 5xx responses are generic. A structured request-ID audit trail for sensitive administrative actions remains follow-up work.

## OWASP checklist

| Category | Result | Notes |
|---|---|---|
| A01 Broken Access Control | Remediated findings | Seller order-carrier and return ownership checks; carrier status routes restricted to Admin; customer product visibility filtered. |
| A02 Cryptographic Failures | Remediated finding | Production JWT secret required; bcrypt hashing is asynchronous. |
| A03 Injection | Reduced risk | SVG rejected, file signatures validated, untrusted files served as attachments; no obvious SQL injection found in reviewed query paths. |
| A04 Insecure Design | Residual risk | Customer-set totals removed and payment status starts unpaid; provider/webhook verification still needs implementation. |
| A05 Security Misconfiguration | Remediated findings | Production config validation, origin allowlist, Helmet, sanitized 5xx errors. |
| A06 Vulnerable Components | Remediated | Current npm audit reports zero findings. |
| A07 Identification and Authentication Failures | Reduced risk | Throttles and stronger password policy added; shared rate limits and token revocation are future work. |
| A08 Software and Data Integrity Failures | No direct issue confirmed | Request bodies generally use Zod validation; this was a static review. |
| A09 Security Logging and Monitoring Failures | Reduced risk | Auth/authorization events logged; full structured audit trail remains future work. |
| A10 Server-Side Request Forgery | No user-controlled fetch URL found | Carrier destinations are fixed or environment-configured; API v1 webhook URLs are stored but not fetched in the reviewed code. |

## Positive controls observed

- JWTs are signed and verified with `jsonwebtoken`; claims are validated for integer IDs and recognized roles.
- Passwords are stored with bcrypt hashes.
- Most SQL values are parameterized; dynamic update identifiers observed in the store are assembled from fixed field maps.
- API keys are stored as SHA-256 hashes in the MySQL store rather than plaintext.
- Staff-oriented route groups generally apply Admin authorization, and many entity operations include owner checks.

## Review completion

- [x] Security-sensitive paths reviewed
- [x] OWASP categories checked (10/10)
- [x] Production dependency audit run
- [x] Critical/high findings addressed or explicitly marked with residual risk
- [x] Residual risks documented in this report
- [x] Security review artifact created

**Security Review Status: REMEDIATED_WITH_RESIDUAL_RISKS**

## Verification on the remediation branch

- `npm run typecheck` — passed.
- `npm run build` — passed. Vite still warns that the main JavaScript bundle exceeds 500 kB; this is a performance warning, not a security failure.
- `npm audit --omit=dev` — zero findings.
- `npm audit` — zero findings.
- GitHub Actions now runs Gitleaks over repository history on pull requests; the action result requires a GitHub Actions run and has not been observed locally.

This update is a code-level remediation review, not a penetration test. Payment processing, production secret provisioning, distributed authentication throttling, durable upload quotas, token revocation, and a structured administrative audit trail remain follow-up work before a production launch.
