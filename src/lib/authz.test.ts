import { describe, it, expect } from "vitest";
import { hasCapability, ROLE_CAPS, seesAllBranches, patientAssignmentScoped } from "./authz";

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
