import type { Capability } from "./authz";
import { NAV_FEATURE, featureEnabled, type FlagMap } from "./features";

// Navigation model (data only; icon is a string key resolved in the Sidebar so
// the filtered nav stays serializable across the server→client boundary).
export type NavItem = { label: string; href: string; icon: string; caps?: Capability[] };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { label: "Platform Console", href: "/dashboard/platform", icon: "building", caps: ["platform:manage"] },
    ],
  },
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "home" },
      { label: "Analytics", href: "/dashboard/analytics", icon: "chart", caps: ["analytics:read"] },
    ],
  },
  {
    label: "Clinical",
    items: [
      { label: "Patients", href: "/dashboard/patients", icon: "user", caps: ["patients:read"] },
      { label: "Caregivers", href: "/dashboard/caregivers", icon: "users", caps: ["caregivers:read"] },
      { label: "Scheduling", href: "/dashboard/scheduling", icon: "calendar", caps: ["scheduling:read"] },
      { label: "Visits", href: "/dashboard/visits", icon: "calendar", caps: ["scheduling:read"] },
      { label: "My Shifts", href: "/dashboard/my-shifts", icon: "calendar", caps: ["evv:write"] },
      { label: "My Time & Pay", href: "/dashboard/my-time", icon: "clock", caps: ["evv:write"] },
      { label: "Requests", href: "/dashboard/requests", icon: "bell", caps: ["scheduling:read"] },
      // EVV monitoring board (all of today's visits) is a supervisor view; field
      // staff check in/out of their own shifts from "My Shifts" instead.
      { label: "EVV", href: "/dashboard/evv", icon: "mappin", caps: ["scheduling:read"] },
      { label: "Visit Notes", href: "/dashboard/visit-notes", icon: "clipboard", caps: ["care:read"] },
      { label: "Assessments", href: "/dashboard/assessments", icon: "clipboard", caps: ["clinical:read"] },
      { label: "Care Plans", href: "/dashboard/care-plans", icon: "clipboard", caps: ["clinical:read"] },
      { label: "Care Tasks", href: "/dashboard/care-tasks", icon: "clipboard", caps: ["care:read"] },
      { label: "Medications", href: "/dashboard/med-logs", icon: "pill", caps: ["meds:read"] },
      { label: "Incidents", href: "/dashboard/incidents", icon: "shield", caps: ["incidents:read"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Compliance", href: "/dashboard/compliance", icon: "shield", caps: ["compliance:read"] },
      { label: "Documents", href: "/dashboard/documents", icon: "file", caps: ["documents:read"] },
      { label: "Service Auths", href: "/dashboard/service-auths", icon: "clipboard", caps: ["clinical:read"] },
      { label: "Medicaid Waivers", href: "/dashboard/waivers", icon: "clipboard", caps: ["billing:read"] },
      { label: "Emergency Prep", href: "/dashboard/emergency-events", icon: "shield", caps: ["compliance:read"] },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Referrals", href: "/dashboard/referrals", icon: "route", caps: ["referrals:read"] },
      { label: "Referral Sources", href: "/dashboard/referral-sources", icon: "building", caps: ["referrals:read"] },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Invoices", href: "/dashboard/invoices", icon: "dollar", caps: ["billing:read"] },
      { label: "Payments", href: "/dashboard/payments", icon: "dollar", caps: ["billing:read"] },
      { label: "Claims", href: "/dashboard/claims", icon: "dollar", caps: ["billing:read"] },
      { label: "Payroll", href: "/dashboard/payroll", icon: "dollar", caps: ["payroll:read"] },
      { label: "Time Entries", href: "/dashboard/time-entries", icon: "clock", caps: ["payroll:read"] },
      { label: "PTO", href: "/dashboard/pto", icon: "calendar", caps: ["payroll:read"] },
      { label: "Mileage", href: "/dashboard/mileage", icon: "route", caps: ["payroll:read"] },
    ],
  },
  {
    label: "Workforce",
    items: [
      { label: "Onboarding", href: "/dashboard/applicants", icon: "users", caps: ["hr:read"] },
      { label: "Evaluations", href: "/dashboard/evaluations", icon: "clipboard", caps: ["hr:read"] },
      { label: "Performance", href: "/dashboard/performance", icon: "chart", caps: ["qa:read"] },
    ],
  },
  {
    label: "Quality & Comms",
    items: [
      { label: "Quality Reviews", href: "/dashboard/quality-reviews", icon: "chart", caps: ["qa:read"] },
      { label: "Surveys", href: "/dashboard/surveys", icon: "heart", caps: ["qa:read"] },
      { label: "Messages", href: "/dashboard/messages", icon: "chat", caps: ["messaging:read"] },
      { label: "Announcements", href: "/dashboard/announcements", icon: "bell", caps: ["messaging:read"] },
    ],
  },
  {
    label: "Intelligence",
    items: [{ label: "AI Insights", href: "/dashboard/ai-insights", icon: "spark", caps: ["ai:read"] }],
  },
  {
    label: "Administration",
    items: [
      { label: "Users & Roles", href: "/dashboard/admin/users", icon: "users", caps: ["admin:manage"] },
      { label: "Configuration", href: "/dashboard/admin/config", icon: "gear", caps: ["admin:manage"] },
      { label: "Forms Builder", href: "/dashboard/forms", icon: "file", caps: ["admin:manage"] },
      { label: "Integrations", href: "/dashboard/admin/integrations", icon: "route", caps: ["admin:manage"] },
      { label: "Branches", href: "/dashboard/branches", icon: "building", caps: ["admin:manage"] },
      { label: "Departments", href: "/dashboard/departments", icon: "building", caps: ["admin:manage"] },
      { label: "Subscription", href: "/dashboard/admin/billing", icon: "dollar", caps: ["admin:manage"] },
      { label: "Reports", href: "/dashboard/admin/reports", icon: "file", caps: ["admin:manage"] },
      { label: "Audit Logs", href: "/dashboard/admin/audit", icon: "shield", caps: ["audit:read"] },
      { label: "Settings", href: "/dashboard/admin/settings", icon: "gear", caps: ["admin:manage"] },
    ],
  },
];

// Filter by the user's EFFECTIVE capabilities (role defaults ∪ owner-granted),
// so a granted permission reveals its nav item.
export function filterNav(caps: Capability[], flags?: FlagMap): NavGroup[] {
  const capSet = new Set(caps);
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const capOk = !item.caps || item.caps.some((c) => capSet.has(c));
      const feature = NAV_FEATURE[item.href];
      const featureOk = !feature || !flags || featureEnabled(flags, feature);
      return capOk && featureOk;
    }),
  })).filter((group) => group.items.length > 0);
}
