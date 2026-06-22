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
  MED_TECH: "Medication Technician",
  CAREGIVER: "Companion",
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
  MED_TECH: "Medication Technician",
  MEDICAL_ASSISTANT: "Medical Assistant",
  COMPANION: "Companion",
  HOMEMAKER: "Homemaker",
  THERAPIST: "Therapist",
} as const;
export type CaregiverDiscipline = keyof typeof CAREGIVER_DISCIPLINE;

export const GENDER = { FEMALE: "Female", MALE: "Male", OTHER: "Other" } as const;

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

// ── Medication administration (Med Tech) ─────────────────────────────────────
export const MED_LOG_STATUS = {
  SCHEDULED: "Scheduled",
  GIVEN: "Given",
  MISSED: "Missed",
  REFUSED: "Refused",
  ERROR: "Error",
} as const;

// ── Care tasks ───────────────────────────────────────────────────────────────
export const TIME_OF_DAY = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  ANYTIME: "Anytime",
} as const;
export const CARE_TASK_STATUS = {
  PENDING: "Pending",
  DONE: "Done",
  SKIPPED: "Skipped",
} as const;

// ── Portal schedule requests (Phase 7) ───────────────────────────────────────
export const REQUEST_TYPE = {
  RESCHEDULE: "Reschedule visit",
  CANCEL: "Cancel visit",
  NEW_VISIT: "Request additional visit",
  CAREGIVER_CHANGE: "Request a specific caregiver",
  AVAILABILITY: "Change availability",
  QUESTION: "Question",
} as const;
export const REQUEST_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
} as const;
// Caregiver-initiated request types (shift self-management / marketplace).
export const CAREGIVER_REQUEST_TYPE = {
  CLAIM: "Open-shift claim",
  SWAP: "Shift swap",
  DECLINE: "Decline shift",
} as const;
// Combined labels for display in the staff review screen.
export const ALL_REQUEST_LABELS = { ...REQUEST_TYPE, ...CAREGIVER_REQUEST_TYPE } as const;

// Schedule-change notice windows (spec): a patient/caregiver may request a change
// only when the visit is at least MIN hours away; within NOTICE (48h) the change
// can only be applied by senior staff. Net effect: requests land in the 24–48h
// window for senior approval; inside 24h it's too late to self-serve.
export const SELF_SERVICE_MIN_NOTICE_HOURS = 24;
export const SELF_SERVICE_NOTICE_HOURS = 48;

// ── Workforce: time entries / PTO / mileage ──────────────────────────────────
export const TIME_ENTRY_TYPE = {
  VISIT: "Visit", TRAINING: "Training", OFFICE: "Office", MEETING: "Meeting", TRAVEL: "Travel",
} as const;
export const TIME_ENTRY_STATUS = {
  DRAFT: "Draft", SUBMITTED: "Submitted", PENDING: "Pending Review", APPROVED: "Approved",
  REJECTED: "Rejected", ADJUSTED: "Adjusted", LOCKED: "Locked", EXPORTED: "Exported",
} as const;
export const PTO_TYPE = {
  VACATION: "Vacation", SICK: "Sick", HOLIDAY: "Holiday", FLOATING: "Floating Holiday",
} as const;
export const PTO_STATUS = {
  REQUESTED: "Requested", APPROVED: "Approved", DENIED: "Denied", USED: "Used", EXPIRED: "Expired",
} as const;
export const MILEAGE_TYPE = {
  PATIENT_TO_PATIENT: "Patient to Patient", BRANCH_TO_PATIENT: "Branch to Patient",
  TRAINING: "Training Travel", AGENCY: "Agency Travel",
} as const;
export const MILEAGE_STATUS = {
  SUBMITTED: "Submitted", APPROVED: "Approved", REJECTED: "Rejected", PAID: "Paid",
} as const;

// ── Agency configuration / white label ───────────────────────────────────────
export const EMPLOYMENT_TYPE = { W2: "W2 Employee", CONTRACTOR_1099: "1099 Contractor" } as const;
export const PAY_PERIOD = { WEEKLY: "Weekly", BIWEEKLY: "Biweekly", SEMIMONTHLY: "Semi-Monthly", MONTHLY: "Monthly" } as const;
export const FORM_CATEGORY = {
  INTAKE: "Patient Intake", INCIDENT: "Incident Report", ASSESSMENT: "Assessment",
  EVALUATION: "Employee Evaluation", CONSENT: "Consent", OTHER: "Other",
} as const;
export const INTEGRATION_PROVIDER = {
  QUICKBOOKS: "QuickBooks", ADP: "ADP", GUSTO: "Gusto", PAYCHEX: "Paychex", STRIPE: "Stripe",
  TWILIO: "Twilio (SMS)", DOCUSIGN: "DocuSign", GOOGLE: "Google Calendar", MICROSOFT: "Microsoft 365", ZOOM: "Zoom",
} as const;

// Per-agency feature flags (toggled in the Configuration Center).
export const FEATURE_FLAGS = {
  aiScheduling: "AI Scheduling",
  openShiftMarketplace: "Open Shift Marketplace",
  familyPortal: "Family Portal",
  patientPortal: "Patient Portal",
  mileageTracking: "Mileage Tracking",
  complianceTracking: "Compliance Tracking",
  advancedAnalytics: "Advanced Analytics",
  whiteLabel: "White Label",
} as const;
export type FeatureKey = keyof typeof FEATURE_FLAGS;

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
