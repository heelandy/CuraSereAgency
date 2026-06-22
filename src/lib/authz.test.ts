import { describe, it, expect } from "vitest";
import {
  hasCapability, ROLE_CAPS, seesAllBranches, patientAssignmentScoped, canSeeFinancials,
  effectiveCaps, parseGrantedCaps,
} from "./authz";

describe("RBAC capability map", () => {
  it("grants owners and admins full agency capabilities", () => {
    expect(hasCapability("AGENCY_OWNER", "billing:write")).toBe(true);
    expect(hasCapability("AGENCY_ADMIN", "admin:manage")).toBe(true);
  });

  it("denies caregivers billing and admin", () => {
    expect(hasCapability("CAREGIVER", "billing:write")).toBe(false);
    expect(hasCapability("CAREGIVER", "admin:manage")).toBe(false);
    expect(hasCapability("CAREGIVER", "evv:write")).toBe(true);
  });

  it("makes the auditor strictly read-only", () => {
    const caps = ROLE_CAPS.AUDITOR;
    expect(caps.every((c) => c.endsWith(":read"))).toBe(true);
    expect(hasCapability("AUDITOR", "patients:write")).toBe(false);
    expect(hasCapability("AUDITOR", "patients:read")).toBe(true);
  });

  it("gives portal roles no staff capabilities", () => {
    expect(ROLE_CAPS.PATIENT).toHaveLength(0);
    expect(ROLE_CAPS.FAMILY).toHaveLength(0);
  });
});

describe("Medical 2-level separation", () => {
  it("gives non-medical caregivers care-safety but NOT clinical access", () => {
    expect(hasCapability("HHA", "care:read")).toBe(true);
    expect(hasCapability("HHA", "care:write")).toBe(true);
    expect(hasCapability("HHA", "clinical:read")).toBe(false);
    expect(hasCapability("CAREGIVER", "clinical:read")).toBe(false);
  });

  it("gives clinical roles both care and clinical access", () => {
    for (const r of ["RN", "LPN", "NURSE_SUPERVISOR", "CLINICAL_DIRECTOR"] as const) {
      expect(hasCapability(r, "care:read")).toBe(true);
      expect(hasCapability(r, "clinical:read")).toBe(true);
    }
  });
});

describe("Medication administration (Med Tech / LPN / RN only)", () => {
  it("allows meds for med tech and licensed clinicians", () => {
    for (const r of ["MED_TECH", "LPN", "RN", "NURSE_SUPERVISOR", "CLINICAL_DIRECTOR"] as const) {
      expect(hasCapability(r, "meds:write")).toBe(true);
    }
  });
  it("denies meds to non-medical aides", () => {
    expect(hasCapability("HHA", "meds:write")).toBe(false);
    expect(hasCapability("CAREGIVER", "meds:write")).toBe(false);
  });
});

describe("Patient editing = Owner + Admin (admissions) by default", () => {
  it("permits owner and admin to write patients", () => {
    expect(hasCapability("AGENCY_OWNER", "patients:write")).toBe(true);
    expect(hasCapability("AGENCY_ADMIN", "patients:write")).toBe(true);
  });
  it("makes director, nurse supervisor and field staff read-only on patients", () => {
    for (const r of ["CLINICAL_DIRECTOR", "NURSE_SUPERVISOR", "RN", "SCHEDULER"] as const) {
      expect(hasCapability(r, "patients:write")).toBe(false);
      expect(hasCapability(r, "patients:read")).toBe(true);
    }
  });
});

describe("Owner-granted per-user permissions", () => {
  it("adds a granted capability on top of the role (with read sibling)", () => {
    const caps = effectiveCaps("SCHEDULER", JSON.stringify(["patients:write"]));
    expect(caps).toContain("patients:write");
    expect(caps).toContain("patients:read");
    // role defaults still present
    expect(caps).toContain("scheduling:write");
  });
  it("ignores non-grantable / malformed entries (no privilege escalation)", () => {
    expect(parseGrantedCaps(JSON.stringify(["admin:manage", "platform:manage", "patients:write"]))).toEqual(["patients:write"]);
    expect(parseGrantedCaps("not json")).toEqual([]);
    expect(parseGrantedCaps(null)).toEqual([]);
  });
  it("leaves the role unchanged when nothing is granted", () => {
    expect(effectiveCaps("HHA", null).sort()).toEqual([...ROLE_CAPS.HHA].sort());
  });
});

describe("Financials limited to Owner + Billing", () => {
  it("shows financials only to owner/billing/platform", () => {
    expect(canSeeFinancials("AGENCY_OWNER")).toBe(true);
    expect(canSeeFinancials("BILLING")).toBe(true);
    expect(canSeeFinancials("AGENCY_ADMIN")).toBe(false);
    expect(canSeeFinancials("HR")).toBe(false);
  });
  it("strips billing/payroll caps from admin and HR", () => {
    expect(hasCapability("AGENCY_ADMIN", "billing:write")).toBe(false);
    expect(hasCapability("AGENCY_ADMIN", "payroll:read")).toBe(false);
    expect(hasCapability("HR", "payroll:read")).toBe(false);
    expect(hasCapability("BILLING", "payroll:write")).toBe(true);
  });
});

describe("Isolation helpers", () => {
  it("treats owner/admin/director as agency-wide; supervisor/scheduler/field as branch-bound", () => {
    expect(seesAllBranches("AGENCY_OWNER")).toBe(true);
    expect(seesAllBranches("AGENCY_ADMIN")).toBe(true);
    expect(seesAllBranches("NURSE_SUPERVISOR")).toBe(false);
    expect(seesAllBranches("SCHEDULER")).toBe(false);
    expect(seesAllBranches("CAREGIVER")).toBe(false);
  });

  it("scopes field/clinical roles to assigned patients only", () => {
    expect(patientAssignmentScoped("CAREGIVER")).toBe(true);
    expect(patientAssignmentScoped("HHA")).toBe(true);
    expect(patientAssignmentScoped("RN")).toBe(true);
    expect(patientAssignmentScoped("SCHEDULER")).toBe(false);
    expect(patientAssignmentScoped("AGENCY_OWNER")).toBe(false);
  });
});
