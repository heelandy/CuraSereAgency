import { getServerSession } from "next-auth";
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

const READ_ONLY: Capability[] = ALL_CAPABILITIES.filter((c) => c.endsWith(":read"));

// Per-role capability map. Deny-by-default: a cap not listed is denied.
export const ROLE_CAPS: Record<Role, Capability[]> = {
  // Platform owner can manage the network + everything in an agency context.
  PLATFORM_OWNER: [...ALL_CAPABILITIES, "platform:manage"],
  AGENCY_OWNER: [...ALL_CAPABILITIES],
  AGENCY_ADMIN: [...ALL_CAPABILITIES],
  CLINICAL_DIRECTOR: [
    "patients:read", "patients:write",
    "caregivers:read", "caregivers:write",
    "scheduling:read", "scheduling:write",
    "clinical:read", "clinical:write",
    "incidents:read", "incidents:write",
    "compliance:read", "compliance:write",
    "documents:read", "documents:write",
    "messaging:read", "messaging:write",
    "qa:read", "qa:write",
    "analytics:read", "ai:read",
  ],
  NURSE_SUPERVISOR: [
    "patients:read", "patients:write",
    "caregivers:read",
    "scheduling:read", "scheduling:write",
    "evv:write",
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
  RN: [
    "patients:read",
    "scheduling:read",
    "evv:write",
    "clinical:read", "clinical:write",
    "incidents:read", "incidents:write",
    "documents:read",
    "messaging:read", "messaging:write",
  ],
  LPN: [
    "patients:read",
    "scheduling:read",
    "evv:write",
    "clinical:read", "clinical:write",
    "incidents:read", "incidents:write",
    "documents:read",
    "messaging:read", "messaging:write",
  ],
  CAREGIVER: [
    "patients:read",
    "scheduling:read",
    "evv:write",
    "clinical:read", "clinical:write",
    "incidents:write",
    "messaging:read", "messaging:write",
  ],
  HHA: [
    "patients:read",
    "scheduling:read",
    "evv:write",
    "clinical:read", "clinical:write",
    "incidents:write",
    "messaging:read", "messaging:write",
  ],
  BILLING: [
    "patients:read",
    "billing:read", "billing:write",
    "payroll:read",
    "analytics:read",
  ],
  HR: [
    "caregivers:read", "caregivers:write",
    "hr:read", "hr:write",
    "compliance:read", "compliance:write",
    "documents:read", "documents:write",
    "payroll:read", "payroll:write",
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

// ── Request context ──────────────────────────────────────────────────────────
export type Ctx = {
  userId: string;
  agencyId: string;
  role: Role;
  email: string;
  name: string;
  branchId: string | null;
};

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

  return {
    userId: user.id,
    agencyId: user.agencyId,
    role: user.role as Role,
    email: user.email,
    name: user.name,
    branchId: user.branchId,
  };
}

export async function requireUser(): Promise<Ctx> {
  const ctx = await getOptionalUser();
  if (!ctx) throw Errors.unauthorized();
  return ctx;
}

export function requireCapability(ctx: Ctx, cap: Capability): void {
  if (!hasCapability(ctx.role, cap)) throw Errors.forbidden();
}

export async function requireCap(cap: Capability): Promise<Ctx> {
  const ctx = await requireUser();
  requireCapability(ctx, cap);
  return ctx;
}
