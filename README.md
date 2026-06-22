# Cura_Sera — Home Health Care Agency Operating System (HHCOS)

A complete, multi-tenant SaaS for home health care agencies: patients,
caregivers, scheduling, EVV, clinical documentation, compliance/AHCA, billing,
payroll, HR, referrals, portals, messaging, analytics, subscriptions, white-label
branding, a platform super-admin, and an AI automation layer. Built on the
architecture in [`APP_BLUEPRINT.md`](./APP_BLUEPRINT.md); feature status is tracked
in [`BACKLOG.md`](./BACKLOG.md) and the product spec in [`appExpectations.txt`](./appExpectations.txt).

## Stack

- **Next.js 14** (App Router, route handlers, server components) + **TypeScript**
- **Prisma** — SQLite for local dev (zero external deps), **Postgres-ready** for prod
- **NextAuth** (credentials + JWT, role/active/tokenVersion re-read every request)
- **Zod** validation · generic **CRUD factory** + dynamic `/api/r/[resource]` dispatcher
- **Tailwind** (CSS-variable brand palette for white-label) · **Stripe** subscriptions
- AES-256-GCM field encryption · provider-agnostic email (**Resend**) · zero-dep PDF/CSV
- **Vitest** unit tests

## Quick start

```bash
npm install
cp .env.example .env          # dev defaults work as-is (SQLite)
npm run db:push               # create the SQLite schema (dev.db)
npm run db:seed               # demo data: 2 agencies + every role
npm run dev                   # http://localhost:3000
```

Sign in at `/login` with any account below (password `password123`); the login
screen has one-click quick-fill buttons too.

## All commands

### App
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload (`http://localhost:3000`) |
| `npm run build` | Production build (`prisma generate && next build`) |
| `npm start` | Serve the production build (after `npm run build`) |
| `npm run lint` | Next.js ESLint |

### Verify (before committing)
| Command | Purpose |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run verify` | Typecheck **and** tests together |

### Database (Prisma)
| Command | Purpose |
|---|---|
| `npm run db:push` | Apply `prisma/schema.prisma` to the DB (no migration files) |
| `npm run db:generate` | Regenerate the Prisma client (`prisma generate`) |
| `npm run db:seed` | Reset + load demo data (`prisma/seed.ts`) |
| `npm run db:reset` | Force-reset schema **and** re-seed (wipes data) |
| `npm run db:studio` | Open Prisma Studio (DB browser) |

After editing `prisma/schema.prisma`: `npm run db:push` then `npm run db:generate`.
On Windows/OneDrive, `prisma generate` can intermittently fail with `EPERM` (file
lock) — stop `npm run dev` if running, or just retry.

## Environment variables

All optional for local dev (sensible fallbacks) — see [`.env.example`](./.env.example).

| Var | Purpose |
|---|---|
| `DATABASE_URL` | DB connection (default SQLite `file:./dev.db`) |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Session signing + base URL |
| `ENCRYPTION_KEY` | base64-32 key for AES-256-GCM field encryption (PHI + integration secrets). Dev derives one from `NEXTAUTH_SECRET`; **set explicitly in prod** |
| `RESEND_API_KEY` | Enables real email (verification, invites). Unset → dev logs the link to the server console |
| `MAIL_FROM` | Default email "from"; per-agency display name applied automatically |
| `PLATFORM_ROOT_DOMAIN` | Root domain for white-label subdomains in prod (blank in dev; `*.localhost` resolves automatically) |
| `STRIPE_*` | Subscription billing (optional) |

## Demo accounts

All passwords are `password123`.

**System super-admin (Platform Owner)** — defaults to the System Monitor at `/dashboard/platform`:

| Email | Role |
|---|---|
| `superadmin@curasera.com` | Platform Owner — oversees every agency, "View as" any tenant |

**Cura_Sera Home Care (teal)** — `http://localhost:3000`:

| Role | Email |
|---|---|
| Agency Owner | owner@curasera.com |
| Administrator | admin@curasera.com |
| Clinical Director | director@curasera.com |
| Nurse Supervisor | nurse@curasera.com |
| Scheduler | scheduler@curasera.com |
| Registered Nurse | rn@curasera.com |
| Licensed Practical Nurse | lpn@curasera.com |
| Med Tech | medtech@curasera.com |
| Home Health Aide | hha@curasera.com |
| CNA | cna@curasera.com |
| Companion (generic) | caregiver@curasera.com |
| Billing | billing@curasera.com |
| HR | hr@curasera.com |
| Compliance | compliance@curasera.com |
| Patient (portal) | patient@curasera.com |
| Family (portal) | family@curasera.com |

**Sunrise Care (blue, white-label demo)** — `http://sunrise.localhost:3000`:

| Role | Email |
|---|---|
| Agency Owner | owner@sunrisecare.com |
| Scheduler | scheduler@sunrisecare.com |

Browsers route `*.localhost` to `127.0.0.1`, so the white-label subdomains work
with no hosts-file edits.

## Key URLs

| Path | Who |
|---|---|
| `/login` | Everyone (branded by host) |
| `/signup` | Public — creates a **new agency** + its Owner |
| `/invite/<token>` | Invited employees register into an existing agency. Demo: `/invite/demo-invite-hha` |
| `/dashboard` | Staff (role-aware: field staff → personal home; platform owner → System Monitor) |
| `/dashboard/platform` | Platform Owner — System Monitor + agency oversight |
| `/dashboard/admin/config` | Owner/Admin — branding, feature flags, custom domains, services |
| `/dashboard/admin/users` | Owner/Admin — users, roles, **employee invites** |
| `/portal` | Patient / Family |

Staff land on `/dashboard`; patient/family on `/portal`. Navigation and APIs are
gated by a deny-by-default capability matrix (`src/lib/authz.ts`).

## Onboarding paths

- **New agency:** `/signup` creates a fresh tenant and makes you its Agency Owner.
- **New employee:** Owner/Admin → **Users & Roles → Invite an employee** generates a
  role-preset link (emailed via Resend + copyable); the hire opens `/invite/<token>`,
  sets a password, and joins that agency. Field roles auto-get a caregiver profile.

## White-label (multi-tenant)

Branding is resolved from the request host: custom domain → platform subdomain
(`Agency.slug`) → logged-in agency → platform default. One primary color re-themes
the whole app (Tailwind brand scale is CSS-variable-backed). Manage branding +
custom domains in the Configuration Center. The Platform Owner can "View as" any
tenant (the app then operates on it; a banner exits back to the monitor).

## Going to Postgres (production)

1. In `prisma/schema.prisma` set `datasource.provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres URL; run `prisma migrate deploy`.
3. (Optional) convert the String status columns to native Prisma enums.
4. Set `ENCRYPTION_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `PLATFORM_ROOT_DOMAIN`, and
   `STRIPE_*` for live encryption/email/subdomains/billing.

Deploy the monolith to a Node host (Railway) with managed Postgres and a CDN/WAF
(Cloudflare) in front. Build = `prisma generate && next build`;
start = `prisma migrate deploy && next start` (see `APP_BLUEPRINT.md` §13).

## Architecture highlights

- **One config per resource** (`src/lib/resources.ts`) → REST handlers via the
  factory (`src/lib/resource.ts`) → declarative pages via `<CrudResource>`.
  Every query is tenant-scoped (IDOR-safe), capability-gated, Zod-validated, audited.
- **Service Authorization Engine** blocks scheduling against inactive/exhausted
  authorizations (`validate` hook on the Visit resource).
- **Scheduling intelligence** ranks caregivers by certification, availability and
  overtime (`/api/scheduling/suggest`).
- **EVV** GPS check-in/out drives the visit lifecycle (`/api/visits/[id]/evv`).
- **AI layer** is a deterministic rule engine over agency data (`/api/ai/generate`).
- Reusable patterns (white-label, invites, platform super-admin, field encryption,
  messaging participants, etc.) are documented in `APP_BLUEPRINT.md` §16.
