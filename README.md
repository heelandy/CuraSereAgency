# Cura_Sera — Home Health Care Agency Operating System (HHCOS)

A complete, multi-tenant SaaS for home health care agencies: patients,
caregivers, scheduling, EVV, clinical documentation, compliance/AHCA, billing,
payroll, HR, referrals, portals, messaging, analytics, subscriptions and an AI
automation layer. Built on the architecture in [`APP_BLUEPRINT.md`](./APP_BLUEPRINT.md);
feature status is tracked in [`appExpectations.txt`](./appExpectations.txt).

## Stack

- **Next.js 14** (App Router, route handlers, server components) + **TypeScript**
- **Prisma** — SQLite for local dev (zero external deps), **Postgres-ready** for prod
- **NextAuth** (credentials + JWT, role/active/tokenVersion re-read every request)
- **Zod** validation · generic **CRUD factory** + dynamic `/api/r/[resource]` dispatcher
- **Tailwind** teal "Cura_Sera" theme · **Stripe** subscriptions · zero-dep PDF · CSV export
- **Vitest** unit tests

## Quick start

```bash
npm install
cp .env.example .env          # dev defaults work as-is (SQLite)
npm run db:push               # create the SQLite schema
npm run db:seed               # demo agency + data
npm run dev                   # http://localhost:3000
```

### Demo logins (password: `password123`)

| Role | Email |
|---|---|
| Agency Owner | owner@curasera.com |
| Administrator | admin@curasera.com |
| Clinical Director | director@curasera.com |
| Nurse Supervisor | nurse@curasera.com |
| Scheduler | scheduler@curasera.com |
| Caregiver | caregiver@curasera.com |
| Billing | billing@curasera.com |
| HR | hr@curasera.com |
| Compliance | compliance@curasera.com |
| Family (portal) | family@curasera.com |
| Patient (portal) | patient@curasera.com |

Staff land on `/dashboard`; patient/family land on `/portal`. Navigation and APIs
are gated by a deny-by-default capability matrix (`src/lib/authz.ts`).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate && next build` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run db:push` / `db:seed` / `db:reset` / `db:studio` | Database helpers |

## Going to Postgres (production)

1. In `prisma/schema.prisma` set `datasource.provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres URL; run `prisma migrate deploy`.
3. (Optional) convert the String status columns to native Prisma enums.
4. Configure `STRIPE_SECRET_KEY` + price IDs to enable live subscription checkout.

Deploy the monolith to a Node host (Railway) with managed Postgres, CDN/WAF
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
