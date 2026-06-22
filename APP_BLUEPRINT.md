# App Blueprint — Reusable Architecture & Patterns

A domain-agnostic blueprint extracted from this project. It captures the **stack,
patterns, and conventions** so a brand-new app (any domain) can be built with the
same logic. Replace the example domain nouns (e.g. "household", "agency", "child")
with your own entities; the structure stays the same.

---

## 1. Philosophy

- **One unified full-stack codebase** (Next.js App Router): UI, API routes, and the
  ORM live together. Don't split frontend/backend unless you truly need a separate
  client (e.g. a native app calling a shared API).
- **Deny-by-default access control**, enforced on every route; the database query is
  always scoped to the caller's tenant (no trust in client-supplied ids).
- **Secrets are environment-only** — never settable through the admin UI.
- **A generic CRUD factory** so each new resource is ~10 lines, not a hand-written
  controller. New features should reuse shared infra, not re-implement it.
- **Always ship green**: typecheck + unit tests + production build pass before "done".

---

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router, route handlers, server components) + TypeScript |
| DB / ORM | PostgreSQL + Prisma |
| Auth | NextAuth (credentials provider) + JWT session, role re-read from DB each request |
| Validation | Zod (one schema per resource; reused by API + forms) |
| Payments | Stripe (Checkout + Customer Portal + webhooks **and** a pull-reconcile fallback) |
| Styling | Tailwind CSS with a custom `brand` palette + component classes in `globals.css` |
| Tests | Vitest (unit tests for lib/ logic) |
| PDF | Zero-dependency hand-rolled text-PDF generator |
| Hosting | Monolith on a Node host (Railway) + CDN/DNS/WAF in front (Cloudflare); managed Postgres |

---

## 3. Project structure (folder → role)

```
src/
  app/
    (group)/layout.tsx, page.tsx     ← FRONTEND: route groups per area, server components
    api/**/route.ts                  ← BACKEND: route handlers (GET/POST/PATCH/DELETE)
    globals.css                      ← theme component classes (.card/.btn/.input/.badge)
    middleware.ts                    ← auth pre-filter + security headers + cache-control
  components/                        ← FRONTEND: client + shared UI, generic <CrudResource>
  lib/                               ← BACKEND core: auth, authz, prisma, validation,
                                       a resource factory, http helpers, audit, rate-limit,
                                       billing, pdf, config, email, storage
prisma/
  schema.prisma, migrations/, seed.ts ← DATABASE
```

Route groups (parenthesized dirs) map URL areas to layouts/roles, e.g. a dashboard
area, an admin console, an auth area, a public/legal area, and (optionally) a
separate tenant-portal area at its own top-level path.

---

## 4. Data layer (Prisma) conventions

- Every tenant-owned model carries the tenant FK (e.g. `tenantId`/`householdId`) with
  `@@index`, and `onDelete: Cascade` from the tenant.
- Optional cross-links use `onDelete: SetNull`; declare **both** sides of a relation.
- Lifecycle/state uses **enums** (status fields), with a separate "response/decision"
  enum when a human must accept/decline something.
- Stamp creator/author columns (`createdById`/`authorId`) when you'll later report
  per-user activity.
- Append-only **audit log** tables (admin actions + security events): actor, action,
  target, old→new value, IP, timestamp. No edit/delete path exists for them.
- Iterate locally with `prisma db push`; deploy with `prisma migrate deploy`.

---

## 5. Auth & RBAC (three layers)

1. **Identity** — `requireUser()` resolves the session and **re-reads role + active +
   tokenVersion from the DB every request** (a demoted/banned/forced-logout user loses
   access immediately, not at token expiry). Per-device session rows allow selective revoke.
2. **Tenant capabilities** — a `Capability` string union + a per-role capability map
   (e.g. OWNER / MEMBER / LIMITED). `requireCapability(ctx, cap)` throws 403. Optional
   granular allow/deny overrides layered on the role.
3. **Multi-tenant org layer** (when an org oversees many tenants) — a parallel
   `requireOrgMember()` + `requireOrgCapability()` + `requireOrgResource(ctx, id)` that
   verifies the resource belongs to the caller's org before any mutation. Roles:
   ADMIN (all) / WORKER (operational) / VIEWER (read-only).

**GOLDEN RULE:** privileged/admin users can see aggregate data but never another
tenant's private records, passwords, or audit history.

---

## 6. The CRUD factory (the big time-saver)

A generic factory turns a config into REST handlers:

- `collection(config)` → `{ GET, POST }`; `item(config)` → `{ PATCH, DELETE }`.
- `ResourceConfig` fields: `delegate` (the Prisma model), `scope` (rate-limit key),
  `readCap`/`writeCap`, optional plan `feature` gate, Zod `schema`, `childField`
  (`'required'|'optional'` for sub-entity links), `include`, `orderBy`, optional
  row-count `limit` (plan limit), `stamp(ctx)` (inject author/creator), `listWhere(ctx)`
  (extra filters, e.g. hide sensitive rows from limited roles), `transform(data, ctx)`
  (derive computed fields on create/edit).
- The factory **always** scopes queries by `tenantId` (IDOR-safe), enforces the
  capability + feature gate, validates input with Zod, and validates that any
  referenced sub-entity id belongs to the same tenant.

**Adding a resource = ** Prisma model + Zod schema + a `ResourceConfig` + two ~3-line
route files (`collection`/`item`) + a page using a generic `<CrudResource>` with
field/column defs + a nav entry. No bespoke controller.

---

## 7. API route conventions

- Wrap handlers in `handle(async () => …)` which turns thrown `HttpError`/`ZodError`
  into safe responses and **never leaks internal messages/stack traces**.
- `Errors.{unauthorized,forbidden,notFound,badRequest,rateLimited,payment,conflict}()`.
- `json(data, status)` for responses; raw `new Response(buf, {headers})` for files/PDF
  (mark those routes `runtime='nodejs'` + `dynamic='force-dynamic'`).
- Mutations: `mutationGuard(scope, userId, RateLimits.write)` (CSRF/origin + rate limit)
  then an audit write (`logSecurity`/`logAdmin`).
- Scope every query by the resolved tenant id; for `[id]` routes, re-verify ownership
  before mutating.

---

## 8. Validation (Zod)

- One schema per resource in a central `validation.ts`; reuse small helpers
  (`shortText`, `optionalShort`, `longText`, `isoDate`, `optionalDate`).
- **Coercion footgun:** `z.coerce.boolean('false') === true`. For string `'true'/'false'`
  from selects use `z.union([z.boolean(), z.enum(['true','false']).transform(v=>v==='true')])`.
- `schema.partial()` powers PATCH; `transform` re-derives computed flags on edit too.

---

## 9. Billing (Stripe), if monetized

- Checkout Sessions (preferred) + Customer Portal; entitlements derive **only** from
  signed, idempotent webhooks **plus** a pull-reconcile fallback (resolves missed/delayed
  webhooks by customer id or owner email). Card data never touches your server.
- Plan catalogue + feature gating live **in code** (source of truth, tamper-proof);
  only Stripe Price IDs are configured via UI/env. Effective tier re-resolved per request.
- Admin tools: in-app refunds/credits, manual comp/grant, CSV export — all audited.

---

## 10. PDF generation (zero-dependency)

A small `pdf.ts` builds simple, paginated, word-wrapped text PDFs (Helvetica) with
dynamically-computed xref offsets and ASCII sanitization — no heavy library. Expose
`buildTextPdf(lines)` plus domain helpers; serve from auth-gated `force-dynamic` GET routes.

---

## 11. UI & theming

- Define a `brand` color scale + neutral surface scale in `tailwind.config.ts`.
- Component classes in `globals.css`: `.card`, `.btn`/`.btn-primary`/`.btn-secondary`,
  `.input`, `.label`, `.badge`. Re-theming = change the palette + these classes; the
  whole app follows because everything uses `brand-*` tokens.
- Generic `<CrudResource>` renders list + create/edit form from field/column defs
  (`text|textarea|date|datetime|number|money|select|childSelect`), so resource pages
  are declarative.

---

## 12. Security posture

- Secrets in env only; masked, never returned to clients.
- Parameterized queries (Prisma), React auto-escaping + nonce CSP, CSRF origin check
  (no fail-open), rate limiting (in-memory, optional Redis), bcrypt(12), optional 2FA/TOTP,
  optional upload AV-scan + CAPTCHA (gated), private file storage with authed download.
- Generic error responses; audit metadata carries no private PII.
- CSV exports: neutralize formula injection (prefix `=+-@`-leading cells with `'`).

---

## 13. Deployment topology

Keep the monolith. Deploy the whole app to a Node host (Railway) with a managed
Postgres service; put a CDN/DNS/WAF (Cloudflare) in front. Build = `prisma generate &&
next build`; start = `prisma migrate deploy && next start`. CDN caches static assets,
bypasses cache for `/api/*` and authenticated (cookie-bearing) requests. Document a
folder→role mapping (frontend / backend / database) even though it deploys as one unit.

---

## 14. Dev & verify workflow

- Central `.env.example`; resolve config DB-first with env fallback where you want
  runtime overrides.
- Definition of done for any batch: `tsc --noEmit` clean · unit tests pass · production
  build passes; then a concise summary of what shipped and what's deferred.
- Keep a living spec/status file (PART-structured, with ✅/🟡/⬜/➖ markers) updated as
  features land. Run a code review on the diff and save findings to `CODE_REVIEW.md`.
- (Windows/OneDrive only) prepend Node to PATH, set `DATABASE_URL`, and kill node +
  delete the `.next` dir before building to avoid file-lock/EINVAL errors.
  `prisma generate` can fail intermittently with `EPERM` (file lock) while the dev
  server runs or OneDrive syncs — stop dev or simply retry.

### 14.1 Standard command surface (document every command)

Every app from this blueprint exposes the same script set in `package.json`, and
the README documents all of them (commands and scripts should map 1:1 — no orphans
either direction). Keep the project-specific seed logins in the README, never here.

```jsonc
// package.json → "scripts"
"dev":          "next dev",                              // hot-reload dev server
"build":        "prisma generate && next build",         // production build
"start":        "next start",                            // serve the build
"lint":         "next lint",
"typecheck":    "tsc --noEmit",
"test":         "vitest run",
"test:watch":   "vitest",
"verify":       "tsc --noEmit && vitest run",            // one-shot pre-commit gate
"db:push":      "prisma db push",                        // apply schema (no migrations in dev)
"db:generate":  "prisma generate",                       // regenerate client after schema edits
"db:seed":      "tsx prisma/seed.ts",
"db:studio":    "prisma studio",
"db:reset":     "prisma db push --force-reset && npm run db:seed"
```

Workflow: edit `schema.prisma` → `db:push` → `db:generate`; before committing run
`verify`; the definition of done stays `verify` + `build` green. Mirror the script
set with an **env-var table** in both `.env.example` and the README — at minimum
`DATABASE_URL`, `NEXTAUTH_SECRET`/`NEXTAUTH_URL`, the field-encryption key, the mail
provider key + from-address, the white-label root domain, and any billing keys —
each marked optional-with-fallback for local dev vs. required-in-prod.

---

## 15. Bootstrapping a new app from this blueprint

1. Scaffold Next.js + TS + Tailwind; add Prisma + Postgres; add NextAuth (credentials).
2. Copy the `lib/` core: `http`, `authz` (capabilities + `requireUser`/`requireCapability`),
   `validation` helpers, the resource factory (`household-resource` equivalent),
   `rate-limit`, `audit`, `config`, `pdf`, and (if needed) `stripe`/`billing-sync`.
3. Define your tenant model + role/capability map for YOUR domain.
4. For each entity: Prisma model → Zod schema → `ResourceConfig` → two route files →
   `<CrudResource>` page → nav entry.
5. Add an admin console route group gated by an admin permission matrix + audit logs.
6. (Optional) add the org/multi-tenant oversight layer mirroring §5.3.
7. Set the `brand` palette + `globals.css` classes to your brand.
8. Wire deployment per §13; keep the verify workflow per §14.

---

## 16. Proven extensions (battle-tested in a full build)

These patterns were validated building a large multi-tenant SaaS on top of the core.
They are domain-agnostic — reuse them directly.

### 16.1 One dynamic route instead of two files per resource
Replace per-resource `route.ts` files with a single dispatcher keyed by a central
registry, so adding a resource never touches routing:

```
src/lib/resources.ts            // const resources = { <slug>: ResourceConfig } satisfies Record<…>
src/app/api/r/[resource]/route.ts        // GET/POST  → collection(resources[params.resource])
src/app/api/r/[resource]/[id]/route.ts   // GET/PATCH/DELETE → item(resources[params.resource])
```
A page is then `<CrudResource {...resourceDefs[slug]} />`, and a generic
`/dashboard/[resource]/page.tsx` can render *any* registered resource. Adding a
feature = schema + `ResourceConfig` + declarative column/field defs + a nav entry.

### 16.2 Extend `ResourceConfig` with composable hooks
The factory stays generic by accepting optional hooks; each new requirement is a
field on the config, never a new controller:
- `scope`: `{mode:'agency'}` (has tenant FK) **or** `{mode:'parent', relation, fkField, parentDelegate}`
  for child rows scoped through an agency-owned parent (IDOR-safe, no tenant FK needed).
- `listWhere(ctx)`: extra row filters — the seam for **row-level isolation**
  (e.g. assignment-scoping: `{ visits: { some: { caregiver: { userId: ctx.userId } } } }`).
- `branchField`: scalar column name → branch isolation applied automatically for
  branch-bound roles (`!seesAllBranches(role) && ctx.branchId`).
- `validate(data, ctx, mode, existing?)`: async business rules (auth/eligibility,
  time-window locks). `existing` enables compare-against-current rules.
- `transform(data, ctx)` / `stamp(ctx)`: derive fields / inject author+tenant ids.
- `encryptFields: string[]`: transparent at-rest field encryption (see §16.3).
- `auditView: true`: log sensitive reads on item GET.
- `limit`: per-tenant row cap for plan gating.

### 16.4 Multi-layer access control (defense in depth)
Stack these so the backend — never the frontend — decides what's allowed:
1. **Capability tiers**, not just resource:action. Split sensitive data into tiers
   (`care:*` vs `clinical:*` vs `billing:*`) and map roles accordingly, so a
   field worker sees safety data but not full medical/financial records. Re-cap
   the resource configs; gate detail-page panels with `hasCapability(role, cap)`.
2. **Tenant scope** (always) → **branch scope** (`branchField` + agency-wide role
   allowlist) → **assignment scope** (`listWhere` relation filter) → applied on
   list **and** item/detail reads.
3. **Audit-on-view** for sensitive reads; **append-only** audit + security logs.
Keep tiny pure helpers (`seesAllBranches(role)`, `assignmentScoped(role)`) and
unit-test the capability map + helpers — they're the security contract.

### 16.3 Field encryption at rest (zero-dep)
`lib/crypto.ts`: AES-256-GCM, key from `ENCRYPTION_KEY` (base64-32 or passphrase;
dev fallback derived from `NEXTAUTH_SECRET`). `encryptField`/`decryptField` use a
`enc:v1:` prefix so legacy plaintext passes through unchanged (safe rollout). The
factory encrypts `encryptFields` on write and decrypts on read; secrets (TOTP)
encrypt/decrypt at their call sites.

### 16.5 Per-tenant feature flags + white-label config center
- Store flags as a JSON column on the tenant; `parseFlags()` defaults everything
  **on** unless explicitly off. Map nav hrefs → feature keys and filter nav by
  `(capability OK) && (feature enabled)`.
- White-label = tenant columns (`portalName`, `logoUrl`, `primaryColor`) read in
  the layout; pass to a brand-aware `<Logo>`; inject `--agency-accent` via a
  `<style>` tag. "One codebase, configured per tenant."
- A **Configuration Center** page bundles branding + flags + a service catalog +
  config (pay period, rates) + links to forms/integrations — all plain config,
  no per-tenant code.

### 16.6 Auth hardening you can lift directly
- **TOTP 2FA** (`lib/totp.ts`, RFC-6238, zero-dep): enroll → verify → store secret
  **encrypted**; the credentials `authorize()` requires the code when enabled.
- **Email verification + resend** via a provider-agnostic `lib/mail.ts`
  (`mailConfigured` gate): dev logs/returns the link, prod wires Resend/SMTP. Same
  abstraction serves invites and notifications.
- **Force-logout** by bumping `tokenVersion`; re-read it every request in `requireUser`.

### 16.7 Portal + request→approve workflow
External users (customer/family) never mutate operational data directly: they
submit a typed **request** (`status: PENDING|APPROVED|DECLINED`) that staff review;
approval applies the change (e.g. an open-shift *claim* approval assigns the worker).
Sub-accounts (family) are created **only under** their parent record. Resolve the
"current user's record" with small server helpers (`portalPatientId(ctx)`,
`workerForUser(ctx)`) that back self-service endpoints (`/api/<role>/summary`,
`/api/<role>/shifts`) returning **only that user's** data.

### 16.8 In-app notifications + marketplace
A `Notification` model + a `/api/notifications` (list + mark-read) + a polling bell
gives real-time-ish delivery with no extra infra. A "marketplace" (open work items
visible with **redacted** detail until claimed+approved) reuses the request model.

### 16.9 What to keep as config, not code (multi-tenant SaaS)
Branding, services offered, enabled features, pay/PTO/compliance rules, forms, and
integration connections are **tenant configuration rows**, never branches in code.
One codebase → many tenants, each a different experience. Keep secrets env-only;
integration *connection* toggles can live in the DB, credentials cannot.

### 16.10 Capability removal is the cheapest, deepest visibility fix
When a role should lose a whole surface (e.g. field staff must not see the
schedule or assign work), **remove the capability**, don't hide UI. One coarse
cap (`scheduling:read`) drives the nav filter *and* the resource factory's read
guard, so dropping it from a role cascades to the sidebar, the list API, and any
detail route at once. Give that role a **purpose-built self-service surface**
instead (a "My X" page backed by `/api/<role>/*` endpoints that return only
their own rows), and guard sensitive pages server-side with `requireCap` too —
the API is the real gate, the page guard stops direct URL access. Audit
single-action endpoints separately: an action cap (`evv:write`) is not the same
as ownership — also assert the target row belongs to the actor
(`row.workerId === workerForUser(ctx).id`) for assignment-scoped roles.

### 16.11 Participant-scoped messaging with a sender→recipient policy
Make conversations private by membership, not by tenant: a `ConversationParticipant`
join (`conversationId,userId`) scopes list/read/post to members, while an
oversight cap (`admin:manage`) sees all. Encode "who may talk to whom" as a pure
function `canMessage(senderRole, recipientRole)` and enforce it at **conversation
create** (validate every recipient) *and* surface it through a
`/messages/recipients` endpoint so the compose UI only ever offers allowed
targets. Frontend filtering is convenience; the create-time check is the rule.

### 16.17 Owner-granted per-user permissions (capabilities beyond the role)
Roles are the baseline; let the tenant owner grant **extra capabilities to
individual users** without inventing new roles. Store a `extraCapabilities` JSON
array on the user, define a curated **grantable** allow-list (never `admin:manage`
/ `platform:manage`), and compute **effective caps** once in the request context:
`effectiveCaps(role, granted) = ROLE_CAPS[role] ∪ granted` — auto-adding the
`:read` sibling for any granted `:write` so the matching nav/list also appears.
Switch enforcement from role-based to context-based: `requireCapability(ctx, cap)`
and a `can(ctx, cap)` check `ctx.caps`, and `filterNav(ctx.caps, …)` drives the
sidebar. Only the owner may edit grants (gate the mutation on the owner role, not
just `admin:manage`), and re-filter the submitted list against the allow-list so a
forged payload can't escalate. This is how "patient admissions is Owner+Admin, but
the owner can also enable it for a coordinator" works with zero new roles.

### 16.15 Platform super-admin + "view as" tenant impersonation
A SaaS needs an operator above the tenants. Add a `PLATFORM_OWNER` role with a
`platform:manage` capability and a console whose endpoints are the **only** ones
that query without an `agencyId` scope (list all tenants, provision agency+owner,
suspend, change plan) — every other route stays tenant-scoped. To let the operator
*work inside* any tenant without a parallel UI, resolve an **effective agency** in
the request context: when a platform owner sets an `acting_agency` cookie,
`getOptionalUser()` swaps `ctx.agencyId` to it (keeping `homeAgencyId` for "Home"
and an `impersonating` flag for a banner). The entire existing app — every
tenant-scoped query, branding, nav — then operates on the chosen agency for free,
with no per-page changes. Validate the cookie against `platform:manage` on every
read so a stolen cookie on a normal account is inert.

### 16.14 Authority that crosses role × credential; encrypted tenant secrets
Some permissions track a **credential/discipline**, not an org role — e.g. "who may
administer medication" is Med Tech / LPN / RN. Model it as its own capability
(`meds:*`) and grant it to the licensed roles **plus** a dedicated role for the
non-licensed-but-authorized case (a `MED_TECH` role), rather than overloading the
generic field-staff role. Keep money behind a single predicate
(`canSeeFinancials(role)`) and *subtract* it from otherwise-powerful roles — admin
runs operations but is built as `ALL_CAPABILITIES` minus `billing:*`/`payroll:*`,
so "Owner + Billing only" holds without per-view allow-lists everywhere. Make
"required at registration" real by tightening the **Zod schema** (not just the form)
so the API rejects incomplete records. Store per-tenant integration credentials with
the same field-encryption used for PHE (`encryptField`, `enc:v1:` prefix) and never
return them — expose only `hasSecret`. Transactional email is provider-agnostic:
one `sendMail` that POSTs to Resend when `RESEND_API_KEY` is set (zero-dep fetch),
carries a per-agency from-name for white-label, and falls back to a logged dev link.

### 16.13 Runtime white-label (customize data, not code)
True multi-tenant branding is resolved **per request from the host**, never
compiled in. Priority: **custom domain** (an `AgencyDomain` row, `domain` unique)
→ **platform subdomain** (`Agency.slug`, e.g. `acme.yourplatform.com`) →
**logged-in user's agency** → **platform default**. Public pages (login/signup)
brand by host; authenticated shells brand by the user's own agency (so visuals
match their data — never cross-tenant). Make the whole theme reskin from **one
color**: define the Tailwind `brand` scale as CSS-variable channels
(`rgb(var(--brand-600) / <alpha-value>)`) with defaults in `:root`, then a tiny
server `<BrandStyle>` emits a `:root{…}` override generated from the agency's
primary hex (lighten-toward-white / darken-toward-black ramp) plus favicon and
optional custom CSS. Everything else (portal name, logo, login banner, support
info, PDF footer) is just agency columns read at render. Result: one codebase,
one deploy, thousands of agencies each "having their own software." The admin
panel edits these rows (branding + domains); no developer, no redeploy.

### 16.16 Two distinct onboarding paths: tenant signup vs. employee invite
Keep them separate. **Public signup** (`/signup`) creates a *new tenant* + its
owner (role fixed server-side). **Employee invites** add a person to an
*existing tenant*: an admin creates an `Invitation` (email + preset role + branch
+ unique token + expiry), the agency sends the link (emailed via the provider and
shown to copy), and a **public** `/invite/<token>` page lets the invitee set
name+password to create their account with the invited role — the link itself
proves the email, so mark it verified. Validate the token server-side (PENDING +
unexpired) on both render and accept, and re-check email uniqueness at accept time
(it may have been taken since the invite). Auto-provision dependent records the
role implies (e.g. a caregiver profile for field roles) so the account is usable
on first login. Never trust a client-supplied role — it comes from the invite row.

### 16.12 Self-serve tenant signup (new tenant + its owner)
A public signup that provisions a **new tenant** and makes the registrant its
**owner** is one transaction: create the agency (+ a default branch), hash the
password, create the user with the role **fixed server-side** (never trust a
client-supplied role), stamp an email-verify token, send mail (dev returns the
link). Keep credential login deterministic by rejecting an email that already
exists in any tenant. Staff are then invited from inside the tenant — signup is
owner-only; joining an existing tenant is a separate invite flow.
