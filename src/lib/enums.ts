// String-backed enums (SQLite-friendly). Each is a TS union + a label map for
// UI + an options array for selects. Zod schemas (validation.ts) reuse these.

export function labelsToOptions<T extends string>(map: Record<T, string>) {
  return (Object.entries(map) as [T, string][]).map(([value, label]) => ({ value, label }));
}

// ── Roles (Phase 2) ──────────────────────────────────────────────────────────
export const ROLE_LABELS = {
  PLATFORM_OWNER: "Platform Owner",
  AGENCY_OWNER: "Agency Owner",
  AGENCY_ADMIN: "Agency Administrator",
  CLINICAL_DIRECTOR: "Clinical Director",
  NURSE_SUPERVISOR: "Nurse Supervisor",
  SCHEDULER: "Scheduler",
  RN: "Registered Nurse",
  LPN: "Licensed Practical Nurse",
  CAREGIVER: "Caregiver",
  HHA: "Home Health Aide",
  BILLING: "Billing Staff",
  HR: "HR Staff",
  COMPLIANCE: "Compliance Officer",
  AUDITOR: "Read-Only Auditor",
  PATIENT: "Patient",
  FAMILY: "Family Member",
} as const;
export type Role = keyof typeof ROLE_LABELS;
export const ROLES = Object.keys(ROLE_LABELS) as Role[];

// Roles that get the staff dashboard vs. the portals.
export const PORTAL_ROLES: Role[] = ["PATIENT", "FAMILY"];

// ── Patient ──────────────────────────────────────────────────────────────────
export const PATIENT_STATUS = {
  ACTIVE: "Active",
  PENDING: "Pending",
  ON_HOLD: "On Hold",
  DISCHARGED: "Discharged",
  DECEASED: "Deceased",
} as const;
export type PatientStatus = keyof typeof PATIENT_STATUS;

export const PAYER_TYPE = {
  MEDICARE: "Medicare",
  MEDICAID: "Medicaid",
  COMMERCIAL: "Commercial",
  WAIVER: "Medicaid Waiver",
  PRIVATE: "Private Pay",
} as const;
export type PayerType = keyof typeof PAYER_TYPE;

// ── Caregiver ────────────────────────────────────────────────────────────────
export const CAREGIVER_DISCIPLINE = {
  RN: "Registered Nurse",
  LPN: "Licensed Practical Nurse",
  CNA: "Certified Nursing Assistant",
  HHA: "Home Health Aide",
  COMPANION: "Companion",
  THERAPIST: "Therapist",
} as const;
export type CaregiverDiscipline = keyof typeof CAREGIVER_DISCIPLINE;

export const CAREGIVER_STATUS = {
  ACTIVE: "Active",
  ONBOARDING: "Onboarding",
  INACTIVE: "Inactive",
  ON_LEAVE: "On Leave",
  TERMINATED: "Terminated",
} as const;
export type CaregiverStatus = keyof typeof CAREGIVER_STATUS;

// ── Visits / Scheduling (Phase 1/3) ──────────────────────────────────────────
export const VISIT_STATUS = {
  SCHEDULED: "Scheduled",
  OPEN: "Open Shift",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  MISSED: "Missed",
  CANCELED: "Canceled",
} as const;
export type VisitStatus = keyof typeof VISIT_STATUS;

export const SERVICE_TYPE = {
  PERSONAL_CARE: "Personal Care",
  SKILLED_NURSING: "Skilled Nursing",
  COMPANION: "Companion Care",
  THERAPY: "Therapy",
} as const;
export type ServiceType = keyof typeof SERVICE_TYPE;

// ── EVV (Phase 4) ────────────────────────────────────────────────────────────
export const EVV_METHOD = {
  GPS: "GPS",
  MOBILE: "Mobile",
  QR: "QR Code",
  MANUAL: "Manual",
} as const;
export const EVV_VERIFICATION = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  FAILED: "Failed",
  MANUAL_OVERRIDE: "Manual Override",
} as const;

// ── Clinical (Phase 5/32) ────────────────────────────────────────────────────
export const NOTE_TYPE = {
  SOAP: "SOAP Note",
  PROGRESS: "Progress Note",
  OBSERVATION: "Observation Note",
} as const;
export const ASSESSMENT_TYPE = {
  INITIAL: "Initial Assessment",
  REASSESSMENT: "Reassessment",
  RISK: "Risk Assessment",
} as const;
export const GOAL_STATUS = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  MET: "Met",
  NOT_MET: "Not Met",
  DISCONTINUED: "Discontinued",
} as const;
export const RISK_LEVEL = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
} as const;

// ── Incidents (Phase 30) ─────────────────────────────────────────────────────
export const INCIDENT_TYPE = {
  FALL: "Fall",
  INJURY: "Injury",
  ABUSE_ALLEGATION: "Abuse Allegation",
  MEDICATION_ERROR: "Medication Error",
  PROPERTY_DAMAGE: "Property Damage",
  MISSING_PATIENT: "Missing Patient",
  EMERGENCY_CALL: "Emergency Services Call",
} as const;
export const INCIDENT_STATUS = {
  REPORTED: "Reported",
  UNDER_REVIEW: "Under Review",
  INVESTIGATING: "Investigating",
  CORRECTIVE_ACTION: "Corrective Action",
  RESOLVED: "Resolved",
} as const;
export const SEVERITY = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  CRITICAL: "Critical",
} as const;

// ── Compliance (Phase 6/24) ──────────────────────────────────────────────────
export const COMPLIANCE_CATEGORY = {
  LICENSE: "License",
  CERTIFICATION: "Certification",
  CPR: "CPR",
  CEU: "CEU",
  BACKGROUND: "Background Check",
  INSURANCE: "Insurance",
  TRAINING: "Training",
  WORKERS_COMP: "Workers Compensation",
  POLICY: "Policy & Procedure",
  EMERGENCY_PLAN: "Emergency Plan",
} as const;
export const COMPLIANCE_STATUS = {
  VALID: "Valid",
  EXPIRING: "Expiring Soon",
  EXPIRED: "Expired",
  MISSING: "Missing",
} as const;
export const COMPLIANCE_SCOPE = {
  AGENCY: "Agency",
  CAREGIVER: "Caregiver",
} as const;

// ── Documents (Phase 17) ─────────────────────────────────────────────────────
export const DOCUMENT_CATEGORY = {
  LICENSE: "License",
  INSURANCE: "Insurance",
  CARE_PLAN: "Care Plan",
  CONTRACT: "Contract",
  CONSENT: "Consent",
  ASSESSMENT: "Assessment",
  POLICY: "Policy",
  OTHER: "Other",
} as const;

// ── Billing / Payroll (Phase 11/12) ──────────────────────────────────────────
export const INVOICE_STATUS = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIAL: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
} as const;
export const CLAIM_STATUS = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ACCEPTED: "Accepted",
  DENIED: "Denied",
  PAID: "Paid",
} as const;
export const PAYMENT_METHOD = {
  CASH: "Cash",
  CARD: "Card",
  CHECK: "Check",
  ACH: "ACH",
  INSURANCE: "Insurance",
} as const;
export const PAYROLL_STATUS = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  EXPORTED: "Exported",
  PAID: "Paid",
} as const;

// ── HR / Onboarding (Phase 13/25) ────────────────────────────────────────────
export const ONBOARDING_STAGE = {
  APPLICATION: "Application Submitted",
  REVIEW: "Recruitment Review",
  SCREENING: "Background Screening",
  DOCUMENTATION: "Documentation",
  TRAINING: "Training",
  APPROVAL: "Approval",
  HIRED: "Hired / Active",
  REJECTED: "Rejected",
} as const;

// ── Referrals (Phase 16/26) ──────────────────────────────────────────────────
export const REFERRAL_SOURCE_TYPE = {
  HOSPITAL: "Hospital",
  PHYSICIAN: "Physician",
  SOCIAL_WORKER: "Social Worker",
  REHAB: "Rehabilitation Center",
  NURSING_HOME: "Nursing Home",
  ALF: "Assisted Living Facility",
  EXISTING_CLIENT: "Existing Client",
  MARKETING: "Marketing Campaign",
} as const;
export const REFERRAL_STAGE = {
  LEAD: "Lead",
  CONTACTED: "Contacted",
  ASSESSMENT_SCHEDULED: "Assessment Scheduled",
  ASSESSMENT_COMPLETED: "Assessment Completed",
  ACCEPTED: "Accepted",
  ADMITTED: "Admitted",
  ACTIVE: "Active Services",
  LOST: "Lost",
} as const;

// ── Service Auth / Waivers (Phase 27/28) ─────────────────────────────────────
export const AUTH_STATUS = {
  ACTIVE: "Active",
  PENDING: "Pending",
  EXPIRING: "Expiring",
  EXPIRED: "Expired",
  EXHAUSTED: "Hours Exhausted",
} as const;
export const WAIVER_PROGRAM = {
  HCBS: "HCBS Waiver",
  LTC: "Long-Term Care Waiver",
  COMMUNITY: "Community Program",
} as const;

// ── Subscription (Phase 21) ──────────────────────────────────────────────────
export const PLAN = {
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  GROWTH: "Growth",
  ENTERPRISE: "Enterprise",
} as const;
export type Plan = keyof typeof PLAN;

// ── Emergency (Phase 31) ─────────────────────────────────────────────────────
export const EMERGENCY_TYPE = {
  HURRICANE: "Hurricane",
  FLOOD: "Flood",
  POWER_OUTAGE: "Power Outage",
  FACILITY_CLOSURE: "Facility Closure",
  PUBLIC_HEALTH: "Public Health Emergency",
} as const;

// ── AI modules (Phase 18/34) ─────────────────────────────────────────────────
export const AI_MODULE = {
  SCHEDULER: "AI Scheduler",
  ROUTE: "AI Route Optimization",
  STAFFING: "AI Staffing Predictor",
  CLINICAL_SUMMARY: "AI Clinical Summary",
  RISK: "AI Risk Engine",
  FALL_RISK: "AI Fall Risk Alerts",
  HOSPITALIZATION: "AI Hospitalization Risk",
  COMPLIANCE: "AI Compliance Monitor",
  REVENUE_FORECAST: "AI Revenue Forecasting",
  REFERRAL: "AI Referral Analytics",
} as const;
