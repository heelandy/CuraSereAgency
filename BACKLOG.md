# Cura_Sera — Implementation Backlog (deduped & categorized)

Derived from `appExpectations.txt` (incl. the data-isolation / workforce / agency-config
spec). Duplicates across the spec are collapsed into one entry. Check items off as built.

Legend: `[x]` done · `[~]` partial · `[ ]` to do · `(➖)` ops/infra concern

---

## 1. Multi-tenant & Isolation
- [x] Agency isolation — every query scoped by `agencyId` (IDOR-safe factory)
- [x] Agency network / platform layer (models + PLATFORM_OWNER role)
- [x] **Platform (super-admin) console** — PLATFORM_OWNER oversees ALL agencies: cross-tenant list + totals, provision a new agency+owner, suspend/reactivate, change plan; **"view as" tenant switcher** (acting-agency cookie overrides effective tenant; banner to exit). Only place that intentionally crosses tenants (gated by `platform:manage`).
- [x] Branch isolation — branch-bound roles see only their branch (`branchField` + `seesAllBranches`)
- [x] Assignment-based patient access — caregivers/clinical see only assigned patients (list + detail)
- [x] Branch-aware dashboards (overview figures scoped to branch for branch-bound roles)
- [ ] Row-level `created_by`/`updated_by` stamping on all tables
- [ ] Cross-branch coverage flag (explicit per-caregiver grants)

## 2. Identity, Auth & Security
- [x] NextAuth credentials + JWT, live role/active/tokenVersion re-read
- [x] RBAC capability matrix (deny-by-default) + medical 2-level (`care:*` vs `clinical:*`)
- [x] UI hides Add/Edit/Delete when the user lacks a resource's write capability, and read-gates the generic resource page (server still enforces every call — defense in depth, not frontend-only)
- [x] TOTP 2FA (enroll + verify-on-login)
- [x] Email verification + resend (dev-link; SMTP-ready)
- [x] Encryption at rest (AES-256-GCM): 2FA secrets + insurance member IDs + per-agency integration API keys (never returned to client)
- [x] Real transactional email via Resend (`RESEND_API_KEY`) with per-agency from-name; dev falls back to logged link
- [x] Audit log (admin actions) + audit-on-view (patient/medical reads)
- [x] Self-serve signup — creates a new agency + its Agency Owner (role fixed server-side; email verify)
- [x] Employee invitations — owner/admin generates a role-preset invite link (emailed via Resend + copyable from Users & Roles); invitee registers into the agency via `/invite/<token>`; field roles auto-provision a linked caregiver profile (ONBOARDING)
- [~] Device/session tracking (model exists, no UI)
- (➖) Backups · disaster recovery · transport encryption (deployment)

## 3. Patients & Clinical
- [x] Patient profiles, contacts, insurance, diagnoses, allergies, meds, physicians
- [x] Care plans + goals; assessments; visit notes; incidents; service auth; waivers
- [x] Medication administration logs (Med Tech); care tasks
- [x] Medical data 2-level separation (care-safety vs clinical, gated by capability)
- [x] Medication administration restricted to Med Tech / LPN / RN (`meds:*` capability + MED_TECH role); aides (HHA/CNA/Companion) cannot give meds
- [x] Patient create/edit/delete = Owner + Administrator (admissions) only by default; everyone else read-only (Clinical Director, Nurse Supervisor, field staff)
- [x] **Owner-granted per-user permissions** — the Agency Owner can enable extra capabilities (patient admissions, scheduling, billing, payroll, clinical, meds, …) for individual users beyond their role. Deny-by-default; read sibling auto-added; non-grantable caps (admin/platform) can never be granted. (Users & Roles → Custom permissions; owner-only)
- [x] Registration requires data: caregiver = skills + available hours + days; patient = needed hours + days
- [~] Structured visit-note checklist (field present; rich checklist UI pending)
- [x] Patient care-requirement inputs (required skills / gender pref drive matching)

## 4. Caregivers & Workforce
- [x] Caregiver profiles, certs, background checks, availability, skills
- [x] Disciplines incl. Med Tech / Medical Assistant / Homemaker; gender/experience
- [x] W2 vs 1099 employment classification
- [x] Caregiver-to-caregiver visibility OFF (no `caregivers:read` for field roles)
- [x] Performance scores; onboarding pipeline; evaluations

## 5. Scheduling & Open Shifts
- [x] Visits CRUD, agenda board, inline reassign/reschedule, AI suggest
- [x] Recurring auto-generation; overtime prevention; scope-of-practice block
- [x] 48h rule (senior-only edits; patient/caregiver self-service >48h)
- [x] Scheduling + visits visible only to scheduler-and-up (Owner/Admin/Director/Nurse Sup./Scheduler); field staff never see the schedule or assign caregivers — they get only their own shifts (My Shifts)
- [x] Open Shift Marketplace (limited-info claim → scheduler approve → assignment)
- [x] Caregiver-initiated shift change/drop (My Shifts → request → scheduler approves → re-opens shift)
- [x] Change-request notice window: patient + caregiver requests need >=24h; inside 48h only senior staff apply
- [ ] Shift swap (caregiver↔caregiver); drag-and-drop; visit buffer/travel rules
- [ ] Distance/route optimization (needs patient geocoordinates)

## 6. EVV & Hours / Time
- [x] GPS check-in/out, duration, e-signature, verification state
- [x] Caregiver self check-in/out from My Shifts (own-visit ownership enforced server-side); agency-wide EVV board is a supervisor monitor
- [x] EVV flags (late in / early out / missing checkout)
- [x] Time entries (types + full status workflow)
- [x] Employee Hours self-dashboard (My Time: week/PTO/mileage/est pay)
- [~] Hours-ledger auto-aggregation → supervisor-approve → payroll pipeline

## 7. Payroll, Pay Rates, PTO, Mileage
- [x] Financial data (revenue, A/R, payroll, est. profitability) restricted to Owner + Billing (Admin & HR excluded); profitability card on dashboard
- [x] Payroll entries; exports (QuickBooks/ADP/Gusto/Paychex)
- [x] PTO requests + balances (request→approve; per-caregiver balances)
- [x] Mileage entries (types, approve/paid) + agency mileage rate
- [x] Employee payroll self-visibility (own est gross/hours/PTO)
- [~] Pay-rate engine — employee rate + OT + mileage live; service/weekend/holiday config via Service Catalog

## 8. Billing & Subscriptions (SaaS)
- [x] Plan catalogue + Stripe checkout + webhook; subscription page
- [x] Patient invoices/payments/claims
- [ ] Hybrid metered billing (base + per caregiver/patient/branch + modules)

## 9. Portals (Patient / Family / Caregiver)
- [x] Patient & family portals; change requests → staff approve
- [x] Patient can request a specific caregiver + request an additional visit; scheduler approval reassigns / creates the visit (scope-of-practice checked)
- [x] Family invite via patient (register only under a patient)
- [x] Caregiver portal — My Shifts (assigned + open-shift pickup) + My Time & Pay
- [~] Configurable portal visibility (feature flags drive module on/off)

## 10. Communication & Notifications
- [x] Secure messaging (threads), announcements, in-app notification bell
- [x] Messaging restrictions — conversation participants model; caregivers may only message supervisors/schedulers; threads are participant-scoped (admins oversee all)
- [ ] Multi-channel delivery (Email/SMS/Push) + per-event config

## 11. Compliance & AHCA
- [x] Compliance items, AHCA agency items, expiry alerts, compliance CSV
- [~] Required-credential config + 30/60/90 alert tiers
- [ ] Deficiencies / corrective actions / inspection history

## 12. Documents & Forms
- [x] Documents (versioned, expiry, signed flags)
- [~] Forms builder (template CRUD with field defs; drag runtime renderer pending)
- [~] Document library (documents categorized; agency library view pending)
- [ ] Real e-signature flow + file upload/storage

## 13. Referrals & HR / Recruiting
- [x] Referral sources + pipeline; applicant onboarding (stages); evaluations
- [~] Onboarding auto-provision (invite link → account created; caregiver profile auto-created for field roles); recruiting CRM polish + checklist gating still pending

## 14. Analytics & Dashboards
- [x] Agency analytics; role-aware "needs attention" strip; branch-aware overview
- [~] Dedicated role dashboards per role; branch performance comparison

## 15. AI Automation
- [x] Rule-based insights (compliance, fall-risk, staffing, burnout, revenue, referral)
- [x] AI caregiver matching + **% match score** surfaced
- [ ] AI documentation assistant; staffing forecast model

## 16. Agency Configuration Center & White Label
- [x] **Config Center** — branding, feature flags, service catalog, payroll config, links
- [x] **Feature flags** per agency (toggle modules; applied to nav)
- [x] **White label (runtime, multi-agency)** — tenant resolved from host (custom
  domain → platform subdomain `slug` → logged-in agency → platform default);
  per-agency portal name, logo, favicon, login banner, support info; **full brand
  palette re-themed from one primary color** (CSS-variable channels); custom CSS;
  PDF footer/brand. Admin manages branding + custom domains; second demo agency
  (Sunrise) proves it. "Customize data, not code."
- [x] Service catalog

## 17. Integrations
- [x] Stripe; payroll CSV exports
- [x] Per-agency integration credentials stored encrypted (AES-256-GCM), never returned to client; Resend live email
- [~] Integrations page (per-agency connect registry + encrypted keys); live QuickBooks/ADP/Twilio/DocuSign API call wiring pending

## 18. Mobile
- [~] Responsive web (works on mobile browser)
- (➖) Native iOS/Android · push · offline · mobile shift claiming
