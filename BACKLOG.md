# Cura_Sera — Implementation Backlog (deduped & categorized)

Derived from `appExpectations.txt` (incl. the data-isolation / workforce / agency-config
spec). Duplicates across the spec are collapsed into one entry. Check items off as built.

Legend: `[x]` done · `[~]` partial · `[ ]` to do · `(➖)` ops/infra concern

---

## 1. Multi-tenant & Isolation
- [x] Agency isolation — every query scoped by `agencyId` (IDOR-safe factory)
- [x] Agency network / platform layer (models + PLATFORM_OWNER role)
- [x] Branch isolation — branch-bound roles see only their branch (`branchField` + `seesAllBranches`)
- [x] Assignment-based patient access — caregivers/clinical see only assigned patients (list + detail)
- [x] Branch-aware dashboards (overview figures scoped to branch for branch-bound roles)
- [ ] Row-level `created_by`/`updated_by` stamping on all tables
- [ ] Cross-branch coverage flag (explicit per-caregiver grants)

## 2. Identity, Auth & Security
- [x] NextAuth credentials + JWT, live role/active/tokenVersion re-read
- [x] RBAC capability matrix (deny-by-default) + medical 2-level (`care:*` vs `clinical:*`)
- [x] TOTP 2FA (enroll + verify-on-login)
- [x] Email verification + resend (dev-link; SMTP-ready)
- [x] Encryption at rest (AES-256-GCM): 2FA secrets + insurance member IDs (`encryptFields`)
- [x] Audit log (admin actions) + audit-on-view (patient/medical reads)
- [x] Self-serve signup — creates a new agency + its Agency Owner (role fixed server-side; email verify)
- [~] Device/session tracking (model exists, no UI)
- (➖) Backups · disaster recovery · transport encryption (deployment)

## 3. Patients & Clinical
- [x] Patient profiles, contacts, insurance, diagnoses, allergies, meds, physicians
- [x] Care plans + goals; assessments; visit notes; incidents; service auth; waivers
- [x] Medication administration logs (Med Tech); care tasks
- [x] Medical data 2-level separation (care-safety vs clinical, gated by capability)
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
- [ ] Shift swap (caregiver-initiated); drag-and-drop; visit buffer/travel rules
- [ ] Distance/route optimization (needs patient geocoordinates)

## 6. EVV & Hours / Time
- [x] GPS check-in/out, duration, e-signature, verification state
- [x] Caregiver self check-in/out from My Shifts (own-visit ownership enforced server-side); agency-wide EVV board is a supervisor monitor
- [x] EVV flags (late in / early out / missing checkout)
- [x] Time entries (types + full status workflow)
- [x] Employee Hours self-dashboard (My Time: week/PTO/mileage/est pay)
- [~] Hours-ledger auto-aggregation → supervisor-approve → payroll pipeline

## 7. Payroll, Pay Rates, PTO, Mileage
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
- [ ] Recruiting CRM polish; onboarding checklist gating → auto-provision

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
- [~] Integrations page (per-agency connect registry); live QuickBooks/ADP/Twilio/DocuSign API wiring pending

## 18. Mobile
- [~] Responsive web (works on mobile browser)
- (➖) Native iOS/Android · push · offline · mobile shift claiming
