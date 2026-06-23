import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { Errors } from "./http";
import type { Role } from "./enums";

// ── Capabilities (APP_BLUEPRINT §5.2) ────────────────────────────────────────
// Coarse capability strings; per-role map below. The CRUD factory checks these.
export type Capability =
  | "patients:read" | "patients:write"
  | "caregivers:read" | "caregivers:write"
  | "scheduling:read" | "scheduling:write"
  | "evv:write"
  | "care:read" | "care:write"
  | "meds:read" | "meds:write"
  | "clinical:read" | "clinical:write"
  | "incidents:read" | "incidents:write"
  | "compliance:read" | "compliance:write"
  | "documents:read" | "documents:write"
  | "messaging:read" | "messaging:write"
  | "billing:read" | "billing:write"
  | "payroll:read" | "payroll:write"
  | "hr:read" | "hr:write"
  | "referrals:read" | "referrals:write"
  | "qa:read" | "qa:write"
  | "analytics:read"
  | "ai:read"
  | "audit:read"
  | "admin:manage"
  | "platform:manage";

export const ALL_CAPABILITIES: Capability[] = [
  "patients:read", "patients:write",
  "caregivers:read", "caregivers:write",
  "scheduling:read", "scheduling:write",
  "evv:write",
  "care:read", "care:write",
  "meds:read", "meds:write",
  "clinical:read", "clinical:write",
  "incidents:read", "incidents:write",
  "compliance:read", "compliance:write",
  "documents:read", "documents:write",
  "messaging:read", "messaging:write",
  "billing:read", "billing:write",
  "payroll:read", "payroll:write",
  "hr:read", "hr:write",
  "referrals:read", "referrals:write",
  "qa:read", "qa:write",
  "analytics:read",
  "ai:read",
  "audit:read",
  "admin:manage",
];

// Financial data (revenue, payroll, A/R, profitability) — Owner + Billing only.
const FINANCE_ROLES: Role[] = ["AGENCY_OWNER", "BILLING", "PLATFORM_OWNER"];
export function canSeeFinancials(role: Role): boolean {
  return FINANCE_ROLES.includes(role);
}

const READ_ONLY: Capability[] = ALL_CAPABILITIES.filter((c) => c.endsWith(":read"));

// Per-role capability map. Deny-by-default: a cap not listed is denied.
export const ROLE_CAPS: Record<Role, Capability[]> = {
  // Platform owner can manage the network + everything in an agency context.
  PLATFORM_OWNER: [...ALL_CAPABILITIES, "platform:manage"],
  AGENCY_OWNER: [...ALL_CAPABILITIES],
  // Administrator runs operations but NOT finances — no billing/payroll (revenue,
  // A/R, payroll and profitability are Owner + Billing only).
  AGENCY_ADMIN: ALL_CAPABILITIES.filter((c) => !c.startsWith("billing:") && !c.startsWith("payroll:")),
  CLINICAL_DIRECTOR: [
    "patients:read", // patient create/edit/delete is Owner + Admin (admissions) only — owner may grant
    "caregivers:read", "caregivers:write",
    "scheduling:read", "scheduling:write",
    "care:read", "care:write",
    "meds:read", "meds:write",
    "clinical:read", "clinical:write",
    "incidents:read", "incidents:write",
    "compliance:read", "compliance:write",
    "documents:read", "documents:write",
    "messaging:read", "messaging:write",
    "qa:read", "qa:write",
    "analytics:read", "ai:read",
  ],
  NURSE_SUPERVISOR: [
    "patients:read", // read-only on patients (intake is Owner/Admin/Director)
    "caregivers:read",
    "scheduling:read", "scheduling:write",
    "evv:write",
    "care:read", "care:write",
    "meds:read", "meds:write",
    "clinical:read", "clinical:write",
    "incidents:read", "incidents:write",
    "compliance:read",
    "documents:read", "documents:write",
    "messaging:read", "messaging:write",
    "qa:read", "analytics:read", "ai:read",
  ],
  SCHEDULER: [
    "patients:read",
    "caregivers:read",
    "scheduling:read", "scheduling:write",
    "messaging:read", "messaging:write",
    "analytics:read",
  ],
  // Field clinicians: NO scheduling:read — they never see the agency schedule or
  // assign caregivers. They see only their own assigned shifts (My Shifts, via the
  // /api/caregiver/* endpoints) and check in/out of those (evv:write).
  // Licensed clinicians can administer medication (meds:*).
  RN: [
    "patients:read",
    "evv:write",
    "care:read", "care:write",
    "meds:read", "meds:write",
    "clinical:read", "clinical:write",
    "incidents:read", "incidents:write",
    "documents:read",
    "messaging:read", "messaging:write",
  ],
  LPN: [
    "patients:read",
    "evv:write",
    "care:read", "care:write",
    "meds:read", "meds:write",
    "clinical:read", "clinical:write",
    "incidents:read", "incidents:write",
    "documents:read",
    "messaging:read", "messaging:write",
  ],
  // Medication Technician: a non-clinical aide who IS authorized to administer
  // medication (meds:*) — the only non-licensed role that can.
  MED_TECH: [
    "patients:read",
    "evv:write",
    "care:read", "care:write",
    "meds:read", "meds:write",
    "incidents:write",
    "messaging:read", "messaging:write",
  ],
  // Non-medical aides: care-safety data only (no medication, no full clinical),
  // and no scheduling visibility — only their own assigned shifts.
  CAREGIVER: [
    "patients:read",
    "evv:write",
    "care:read", "care:write",
    "incidents:write",
    "messaging:read", "messaging:write",
  ],
  HHA: [
    "patients:read",
    "evv:write",
    "care:read", "care:write",
    "incidents:write",
    "messaging:read", "messaging:write",
  ],
  // Billing owns finances: billing + payroll (revenue, A/R, payroll, profitability).
  BILLING: [
    "patients:read",
    "billing:read", "billing:write",
    "payroll:read", "payroll:write",
    "analytics:read",
  ],
  // HR runs people ops — no payroll/financial visibility (Owner + Billing only).
  HR: [
    "caregivers:read", "caregivers:write",
    "hr:read", "hr:write",
    "compliance:read", "compliance:write",
    "documents:read", "documents:write",
    "messaging:read", "messaging:write",
  ],
  COMPLIANCE: [
    "caregivers:read",
    "patients:read",
    "compliance:read", "compliance:write",
    "documents:read", "documents:write",
    "incidents:read", "incidents:write",
    "qa:read", "qa:write",
    "audit:read",
    "analytics:read", "ai:read",
  ],
  AUDITOR: [...READ_ONLY, "audit:read"],
  // Portal roles have no staff capabilities; portal routes gate on role directly.
  PATIENT: [],
  FAMILY: [],
};

export function hasCapability(role: Role, cap: Capability): boolean {
  return ROLE_CAPS[role]?.includes(cap) ?? false;
}

// ── Owner-granted per-user permissions ───────────────────────────────────────
// Capabilities an Agency Owner may grant to individual users on top of their role
// (deny-by-default still holds; the owner explicitly enables these).
export const GRANTABLE_CAPABILITIES: { cap: Capability; label: string }[] = [
  { cap: "patients:write", label: "Create / edit / delete patients (Admissions)" },
  { cap: "scheduling:write", label: "Scheduling — assign & manage shifts" },
  { cap: "caregivers:write", label: "Manage caregiver records" },
  { cap: "clinical:write", label: "Clinical documentation" },
  { cap: "meds:write", label: "Medication administration" },
  { cap: "billing:write", label: "Billing, invoices & online payments" },
  { cap: "payroll:write", label: "Payroll" },
  { cap: "compliance:write", label: "Compliance" },
  { cap: "hr:write", label: "HR" },
  { cap: "documents:write", label: "Documents" },
  { cap: "incidents:write", label: "Incident reports" },
  { cap: "qa:write", label: "Quality assurance" },
];
const GRANTABLE_SET = new Set<Capability>(GRANTABLE_CAPABILITIES.map((g) => g.cap));

// Parse a user's granted-capabilities JSON, keeping only grantable ones (so a
// stale/forged value can never confer admin:manage, platform:manage, etc.).
export function parseGrantedCaps(json: string | null | undefined): Capability[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((c): c is Capability => typeof c === "string" && GRANTABLE_SET.has(c as Capability));
  } catch {
    return [];
  }
}

// Effective capabilities = role defaults ∪ owner-granted (with the read sibling
// auto-added for any granted :write, so the matching nav/list also appears).
export function effectiveCaps(role: Role, grantedJson: string | null | undefined): Capability[] {
  const set = new Set<Capability>(ROLE_CAPS[role] ?? []);
  for (const cap of parseGrantedCaps(grantedJson)) {
    set.add(cap);
    if (cap.endsWith(":write")) set.add(cap.replace(/:write$/, ":read") as Capability);
  }
  return [...set];
}

// ── Isolation helpers (data-isolation / role-visibility spec) ────────────────
// Roles that see all branches in their agency; everyone else is branch-bound.
const AGENCY_WIDE_BRANCH: Role[] = [
  "PLATFORM_OWNER", "AGENCY_OWNER", "AGENCY_ADMIN", "CLINICAL_DIRECTOR",
  "COMPLIANCE", "HR", "BILLING", "AUDITOR",
];
export function seesAllBranches(role: Role): boolean {
  return AGENCY_WIDE_BRANCH.includes(role);
}

// Field/clinical roles may only see patients they are assigned to (via a visit).
const PATIENT_ASSIGNED_ONLY: Role[] = ["CAREGIVER", "HHA", "MED_TECH", "RN", "LPN"];
export function patientAssignmentScoped(role: Role): boolean {
  return PATIENT_ASSIGNED_ONLY.includes(role);
}

// Messaging rule (spec): a caregiver may only message supervisors/schedulers
// (and higher), never other caregivers, patients or family. These are the roles
// field staff are allowed to start a conversation with.
const MESSAGING_SUPERVISOR: Role[] = [
  "SCHEDULER", "NURSE_SUPERVISOR", "CLINICAL_DIRECTOR", "AGENCY_ADMIN", "AGENCY_OWNER", "PLATFORM_OWNER",
];
export function isMessagingSupervisor(role: Role): boolean {
  return MESSAGING_SUPERVISOR.includes(role);
}
// Can `sender` start a conversation that includes a participant of `recipient`?
export function canMessage(sender: Role, recipient: Role): boolean {
  // Portal roles aren't reachable from the staff messaging surface.
  if (recipient === "PATIENT" || recipient === "FAMILY") return false;
  // Field staff are restricted to supervisors/schedulers; everyone else (office
  // roles) may message any staff member.
  if (patientAssignmentScoped(sender)) return isMessagingSupervisor(recipient);
  return true;
}

// ── Request context ──────────────────────────────────────────────────────────
export type Ctx = {
  userId: string;
  agencyId: string; // effective tenant (may be an impersonated one for platform owner)
  homeAgencyId: string; // the user's own agency
  role: Role;
  caps: Capability[]; // effective capabilities (role defaults ∪ owner-granted)
  email: string;
  name: string;
  branchId: string | null;
  impersonating: boolean; // platform owner is viewing another agency ("view as")
};

// Cookie the platform owner sets to "view as" a specific agency.
export const ACTING_AGENCY_COOKIE = "acting_agency";

// Resolve the session AND re-read role/active/tokenVersion from the DB every
// request, so a demoted/banned/force-logged-out user loses access immediately
// (APP_BLUEPRINT §5.1).
export async function getOptionalUser(): Promise<Ctx | null> {
  const session = await getServerSession(authOptions);
  const sid = session?.user?.id;
  if (!sid) return null;

  const user = await prisma.user.findUnique({ where: { id: sid } });
  if (!user || !user.active) return null;
  if (typeof session.user.tokenVersion === "number" && session.user.tokenVersion !== user.tokenVersion) {
    return null;
  }

  // Platform owner (super admin) may "view as" any agency: the acting-agency
  // cookie overrides the effective tenant so the whole app operates on it.
  let agencyId = user.agencyId;
  let impersonating = false;
  if (user.role === "PLATFORM_OWNER") {
    const sel = cookies().get(ACTING_AGENCY_COOKIE)?.value;
    if (sel && sel !== user.agencyId) {
      const a = await prisma.agency.findUnique({ where: { id: sel }, select: { id: true } });
      if (a) { agencyId = a.id; impersonating = true; }
    }
  }

  return {
    userId: user.id,
    agencyId,
    homeAgencyId: user.agencyId,
    role: user.role as Role,
    caps: effectiveCaps(user.role as Role, user.extraCapabilities),
    email: user.email,
    name: user.name,
    branchId: impersonating ? null : user.branchId, // agency-wide when impersonating
    impersonating,
  };
}

export async function requireUser(): Promise<Ctx> {
  const ctx = await getOptionalUser();
  if (!ctx) throw Errors.unauthorized();
  return ctx;
}

// Capability check for a resolved request context — honors owner-granted caps.
export function can(ctx: Ctx, cap: Capability): boolean {
  return ctx.caps.includes(cap);
}

export function requireCapability(ctx: Ctx, cap: Capability): void {
  if (!can(ctx, cap)) throw Errors.forbidden();
}

export async function requireCap(cap: Capability): Promise<Ctx> {
  const ctx = await requireUser();
  requireCapability(ctx, cap);
  return ctx;
}
