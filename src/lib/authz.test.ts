import { describe, it, expect } from "vitest";
import { hasCapability, ROLE_CAPS } from "./authz";

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
