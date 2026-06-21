import type { Plan } from "./enums";

// Plan catalogue + feature gating live in code (source of truth, tamper-proof);
// only Stripe Price IDs come from env (APP_BLUEPRINT §9).
export type PlanDef = {
  key: Plan;
  name: string;
  price: string;
  blurb: string;
  features: string[];
  limits: { patients: number | null; caregivers: number | null; branches: number | null };
};

export const PLAN_CATALOG: PlanDef[] = [
  {
    key: "STARTER", name: "Starter", price: "$149/mo",
    blurb: "For new agencies getting organized.",
    features: ["Patient & caregiver management", "Scheduling + EVV", "Visit notes", "Email support"],
    limits: { patients: 50, caregivers: 25, branches: 1 },
  },
  {
    key: "PROFESSIONAL", name: "Professional", price: "$399/mo",
    blurb: "For growing agencies running full operations.",
    features: ["Everything in Starter", "Billing & payroll exports", "Compliance & AHCA tracking", "Family & patient portals", "Messaging"],
    limits: { patients: 250, caregivers: 150, branches: 3 },
  },
  {
    key: "GROWTH", name: "Growth", price: "$799/mo",
    blurb: "For multi-location agencies scaling up.",
    features: ["Everything in Professional", "Referral & HR management", "Quality assurance program", "AI automation insights", "Priority support"],
    limits: { patients: 1000, caregivers: 600, branches: 10 },
  },
  {
    key: "ENTERPRISE", name: "Enterprise", price: "Custom",
    blurb: "Multi-agency networks and white-label.",
    features: ["Everything in Growth", "Multi-agency / network controls", "SSO & API access", "Custom workflows & forms", "Dedicated success manager"],
    limits: { patients: null, caregivers: null, branches: null },
  },
];

export function planDef(plan: string): PlanDef {
  return PLAN_CATALOG.find((p) => p.key === plan) ?? PLAN_CATALOG[0];
}
