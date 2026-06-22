import { z } from "zod";
import {
  PATIENT_STATUS, PAYER_TYPE, CAREGIVER_DISCIPLINE, CAREGIVER_STATUS,
  VISIT_STATUS, SERVICE_TYPE, NOTE_TYPE, ASSESSMENT_TYPE, GOAL_STATUS,
  RISK_LEVEL, INCIDENT_TYPE, INCIDENT_STATUS, SEVERITY, COMPLIANCE_CATEGORY,
  COMPLIANCE_STATUS, COMPLIANCE_SCOPE, DOCUMENT_CATEGORY, INVOICE_STATUS,
  CLAIM_STATUS, PAYMENT_METHOD, PAYROLL_STATUS, ONBOARDING_STAGE,
  REFERRAL_SOURCE_TYPE, REFERRAL_STAGE, AUTH_STATUS, WAIVER_PROGRAM,
  EMERGENCY_TYPE, AI_MODULE, ROLE_LABELS, EVV_METHOD, EVV_VERIFICATION,
  GENDER, MED_LOG_STATUS, TIME_OF_DAY, CARE_TASK_STATUS, REQUEST_TYPE,
  TIME_ENTRY_TYPE, TIME_ENTRY_STATUS, PTO_TYPE, PTO_STATUS, MILEAGE_TYPE, MILEAGE_STATUS,
  EMPLOYMENT_TYPE, FORM_CATEGORY,
} from "./enums";

// ── Helpers (APP_BLUEPRINT §8) ───────────────────────────────────────────────
const emptyToNull = (v: unknown) => (v === "" ? null : v);

export const shortText = z.string().trim().min(1, "Required").max(200);
export const optionalShort = z.preprocess(emptyToNull, z.string().trim().max(200).nullable().optional());
export const requiredLong = z.string().trim().min(1, "Required").max(20000);
export const longText = z.preprocess(emptyToNull, z.string().trim().max(20000).nullable().optional());
export const optionalDate = z.preprocess(emptyToNull, z.coerce.date().nullable().optional());
export const requiredDate = z.coerce.date();
export const optionalNum = z.preprocess(emptyToNull, z.coerce.number().nullable().optional());
export const money = z.coerce.number().min(0).default(0);
export const optionalMoney = z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional());
export const id = z.string().min(1);
export const optionalId = z.preprocess(emptyToNull, z.string().nullable().optional());
export const email = z.preprocess(emptyToNull, z.string().email().nullable().optional());

// Boolean coercion footgun guard (APP_BLUEPRINT §8): z.coerce.boolean('false')===true.
export const bool = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((v) => v === "true"),
]);
export const optionalBool = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((v) => v === "true"),
]).optional();

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
export const enumOf = <T extends Record<string, string>>(o: T) => z.enum(keys(o));

// ── Tenancy / admin ──────────────────────────────────────────────────────────
export const branchSchema = z.object({
  name: shortText,
  addressLine: optionalShort,
  city: optionalShort,
  state: optionalShort,
  zip: optionalShort,
  phone: optionalShort,
  active: optionalBool,
});

export const departmentSchema = z.object({
  name: shortText,
  branchId: optionalId,
});

export const userSchema = z.object({
  name: shortText,
  email: z.string().email(),
  role: z.enum(keys(ROLE_LABELS)),
  branchId: optionalId,
  active: optionalBool,
  // password only on create; handled by route (hashed), not stored raw
  password: z.preprocess(emptyToNull, z.string().min(8).max(200).nullable().optional()),
});

// ── Patient + sub-records (Phase 1) ──────────────────────────────────────────
export const patientSchema = z.object({
  firstName: shortText,
  lastName: shortText,
  mrn: optionalShort,
  dob: optionalDate,
  gender: optionalShort,
  phone: optionalShort,
  email: email,
  addressLine: optionalShort,
  city: optionalShort,
  state: optionalShort,
  zip: optionalShort,
  status: enumOf(PATIENT_STATUS).default("ACTIVE"),
  branchId: optionalId,
  admittedAt: optionalDate,
  dischargedAt: optionalDate,
  requiredSkills: optionalShort,
  genderPreference: z.preprocess(emptyToNull, enumOf(GENDER).nullable().optional()),
  notes: longText,
});

export const emergencyContactSchema = z.object({
  patientId: id,
  name: shortText,
  relationship: optionalShort,
  phone: optionalShort,
  email: email,
  isPrimary: optionalBool,
});

export const insurancePolicySchema = z.object({
  patientId: id,
  payerName: shortText,
  payerType: enumOf(PAYER_TYPE).default("PRIVATE"),
  memberId: optionalShort,
  groupNumber: optionalShort,
  isPrimary: optionalBool,
  effectiveDate: optionalDate,
  expiryDate: optionalDate,
});

export const diagnosisSchema = z.object({
  patientId: id,
  code: optionalShort,
  description: shortText,
  isPrimary: optionalBool,
  diagnosedAt: optionalDate,
});

export const allergySchema = z.object({
  patientId: id,
  allergen: shortText,
  reaction: optionalShort,
  severity: z.preprocess(emptyToNull, enumOf(RISK_LEVEL).nullable().optional()),
});

export const medicationSchema = z.object({
  patientId: id,
  name: shortText,
  dosage: optionalShort,
  frequency: optionalShort,
  route: optionalShort,
  prescriber: optionalShort,
  active: optionalBool,
  startDate: optionalDate,
  endDate: optionalDate,
});

export const physicianSchema = z.object({
  patientId: id,
  name: shortText,
  npi: optionalShort,
  specialty: optionalShort,
  phone: optionalShort,
  fax: optionalShort,
  isPrimary: optionalBool,
});

// ── Caregiver + sub-records (Phase 1/2) ──────────────────────────────────────
export const caregiverSchema = z.object({
  firstName: shortText,
  lastName: shortText,
  email: email,
  phone: optionalShort,
  addressLine: optionalShort,
  city: optionalShort,
  state: optionalShort,
  zip: optionalShort,
  discipline: enumOf(CAREGIVER_DISCIPLINE).default("HHA"),
  employmentType: enumOf(EMPLOYMENT_TYPE).default("W2"),
  status: enumOf(CAREGIVER_STATUS).default("ACTIVE"),
  branchId: optionalId,
  hireDate: optionalDate,
  hourlyRate: optionalMoney,
  languages: optionalShort,
  gender: z.preprocess(emptyToNull, enumOf(GENDER).nullable().optional()),
  yearsExperience: optionalNum,
  maxHoursPerWeek: optionalNum,
  latitude: optionalNum,
  longitude: optionalNum,
  notes: longText,
});

export const certificationSchema = z.object({
  caregiverId: id,
  type: shortText,
  name: shortText,
  number: optionalShort,
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  status: enumOf(COMPLIANCE_STATUS).default("VALID"),
});

export const backgroundCheckSchema = z.object({
  caregiverId: id,
  type: shortText,
  status: z.enum(["PENDING", "PASSED", "FAILED", "EXPIRED"]).default("PENDING"),
  completedAt: optionalDate,
  expiresAt: optionalDate,
  notes: longText,
});

export const availabilitySchema = z.object({
  caregiverId: id,
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: shortText,
  endTime: shortText,
});

// ── Visits / Scheduling / EVV (Phase 1/3/4) ──────────────────────────────────
export const visitSchema = z.object({
  patientId: id,
  caregiverId: optionalId,
  serviceAuthId: optionalId,
  serviceType: enumOf(SERVICE_TYPE).default("PERSONAL_CARE"),
  status: enumOf(VISIT_STATUS).default("SCHEDULED"),
  scheduledStart: requiredDate,
  scheduledEnd: requiredDate,
  actualStart: optionalDate,
  actualEnd: optionalDate,
  isRecurring: optionalBool,
  recurrenceRule: optionalShort,
  cancelReason: optionalShort,
});

export const evvSchema = z.object({
  checkInAt: optionalDate,
  checkInLat: optionalNum,
  checkInLng: optionalNum,
  checkInMethod: z.preprocess(emptyToNull, enumOf(EVV_METHOD).nullable().optional()),
  checkOutAt: optionalDate,
  checkOutLat: optionalNum,
  checkOutLng: optionalNum,
  verification: enumOf(EVV_VERIFICATION).optional(),
  durationMinutes: optionalNum,
  notes: longText,
});

// ── Clinical / Care plans (Phase 5/32) ───────────────────────────────────────
export const visitNoteSchema = z.object({
  patientId: id,
  visitId: optionalId,
  type: enumOf(NOTE_TYPE).default("PROGRESS"),
  subjective: longText,
  objective: longText,
  assessment: longText,
  plan: longText,
  narrative: longText,
  checklist: longText, // structured task checklist (JSON or free text)
  status: z.enum(["DRAFT", "SIGNED"]).default("DRAFT"),
});

export const assessmentSchema = z.object({
  patientId: id,
  type: enumOf(ASSESSMENT_TYPE).default("INITIAL"),
  summary: longText,
  riskScore: optionalNum,
  fallRisk: z.preprocess(emptyToNull, enumOf(RISK_LEVEL).nullable().optional()),
  performedAt: optionalDate,
  nextDueAt: optionalDate,
});

export const carePlanSchema = z.object({
  patientId: id,
  title: shortText.default("Care Plan"),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
  startDate: optionalDate,
  reviewDate: optionalDate,
});

export const careGoalSchema = z.object({
  carePlanId: id,
  description: shortText,
  intervention: optionalShort,
  status: enumOf(GOAL_STATUS).default("IN_PROGRESS"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  targetDate: optionalDate,
});

// ── Incidents (Phase 30) ─────────────────────────────────────────────────────
export const incidentSchema = z.object({
  patientId: optionalId,
  type: enumOf(INCIDENT_TYPE),
  severity: enumOf(SEVERITY).default("LOW"),
  description: requiredLong,
  occurredAt: optionalDate,
  status: enumOf(INCIDENT_STATUS).default("REPORTED"),
  correctiveAction: longText,
  resolvedAt: optionalDate,
});

// ── Compliance (Phase 6/24) ──────────────────────────────────────────────────
export const complianceItemSchema = z.object({
  caregiverId: optionalId,
  scope: enumOf(COMPLIANCE_SCOPE).default("CAREGIVER"),
  category: enumOf(COMPLIANCE_CATEGORY),
  name: shortText,
  status: enumOf(COMPLIANCE_STATUS).default("VALID"),
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  notes: longText,
});

// ── Documents (Phase 17) ─────────────────────────────────────────────────────
export const documentSchema = z.object({
  name: shortText,
  category: enumOf(DOCUMENT_CATEGORY).default("OTHER"),
  patientId: optionalId,
  caregiverId: optionalId,
  url: optionalShort,
  version: optionalNum,
  signed: optionalBool,
  signedBy: optionalShort,
  signedAt: optionalDate,
  expiresAt: optionalDate,
});

// ── Communication (Phase 10) ─────────────────────────────────────────────────
export const announcementSchema = z.object({
  title: shortText,
  body: requiredLong,
  priority: z.enum(["NORMAL", "EMERGENCY"]).default("NORMAL"),
});

export const conversationSchema = z.object({
  subject: optionalShort,
  kind: z.enum(["DIRECT", "GROUP"]).default("DIRECT"),
  participantIds: z.array(id).min(1, "Pick at least one recipient").max(20),
});

export const messageSchema = z.object({
  conversationId: id,
  body: requiredLong,
  attachmentUrl: optionalShort,
});

// ── Billing (Phase 11) ───────────────────────────────────────────────────────
export const invoiceSchema = z.object({
  patientId: optionalId,
  number: optionalShort,
  billType: z.enum(["PRIVATE", "MEDICARE", "MEDICAID", "COMMERCIAL"]).default("PRIVATE"),
  status: enumOf(INVOICE_STATUS).default("DRAFT"),
  amount: money,
  amountPaid: money,
  issuedAt: optionalDate,
  dueAt: optionalDate,
  notes: longText,
});

export const paymentSchema = z.object({
  invoiceId: optionalId,
  amount: z.coerce.number(),
  method: enumOf(PAYMENT_METHOD).default("CASH"),
  status: z.enum(["COMPLETED", "PENDING", "REFUNDED"]).default("COMPLETED"),
  reference: optionalShort,
  paidAt: optionalDate,
});

export const claimSchema = z.object({
  patientName: optionalShort,
  payerType: z.enum(["MEDICARE", "MEDICAID", "COMMERCIAL"]).default("MEDICAID"),
  status: enumOf(CLAIM_STATUS).default("DRAFT"),
  amount: money,
  amountPaid: money,
  submittedAt: optionalDate,
  notes: longText,
});

// ── Payroll (Phase 12) ───────────────────────────────────────────────────────
export const payrollSchema = z.object({
  caregiverId: id,
  periodStart: requiredDate,
  periodEnd: requiredDate,
  hoursWorked: money,
  overtimeHours: money,
  mileage: money,
  bonus: money,
  shiftDifferential: money,
  grossPay: money,
  status: enumOf(PAYROLL_STATUS).default("DRAFT"),
});

// ── HR / Onboarding (Phase 13/25) ────────────────────────────────────────────
export const applicantSchema = z.object({
  firstName: shortText,
  lastName: shortText,
  email: email,
  phone: optionalShort,
  position: optionalShort,
  experience: longText,
  resumeUrl: optionalShort,
  stage: enumOf(ONBOARDING_STAGE).default("APPLICATION"),
  recruiter: optionalShort,
  notes: longText,
});

export const evaluationSchema = z.object({
  caregiverId: optionalId,
  reviewer: optionalShort,
  period: optionalShort,
  score: optionalNum,
  strengths: longText,
  improvements: longText,
  status: z.enum(["DRAFT", "FINALIZED"]).default("DRAFT"),
});

// ── Referrals (Phase 16/26) ──────────────────────────────────────────────────
export const referralSourceSchema = z.object({
  name: shortText,
  type: enumOf(REFERRAL_SOURCE_TYPE).default("HOSPITAL"),
  contactName: optionalShort,
  phone: optionalShort,
  email: email,
  active: optionalBool,
});

export const referralSchema = z.object({
  prospectName: shortText,
  sourceId: optionalId,
  patientId: optionalId,
  coordinator: optionalShort,
  stage: enumOf(REFERRAL_STAGE).default("LEAD"),
  estimatedRevenue: money,
  receivedAt: optionalDate,
  admittedAt: optionalDate,
});

// ── Service Auth / Waivers (Phase 27/28) ─────────────────────────────────────
export const serviceAuthSchema = z.object({
  patientId: id,
  authNumber: optionalShort,
  payerType: enumOf(PAYER_TYPE).default("MEDICAID"),
  serviceType: enumOf(SERVICE_TYPE).default("PERSONAL_CARE"),
  approvedHours: money,
  usedHours: money,
  startDate: optionalDate,
  endDate: optionalDate,
  status: enumOf(AUTH_STATUS).default("ACTIVE"),
});

export const medicaidWaiverSchema = z.object({
  patientId: id,
  program: enumOf(WAIVER_PROGRAM).default("HCBS"),
  authNumber: optionalShort,
  approvedHours: money,
  usedHours: money,
  startDate: optionalDate,
  endDate: optionalDate,
  status: enumOf(AUTH_STATUS).default("ACTIVE"),
});

// ── QA / Performance (Phase 14/29/33) ────────────────────────────────────────
export const qualityReviewSchema = z.object({
  period: optionalShort,
  complianceScore: optionalNum,
  satisfactionScore: optionalNum,
  incidentRate: optionalNum,
  missedVisitRate: optionalNum,
  notes: longText,
});

export const satisfactionSurveySchema = z.object({
  patientId: optionalId,
  respondent: z.enum(["PATIENT", "FAMILY"]).default("PATIENT"),
  rating: z.coerce.number().int().min(1).max(5),
  comments: longText,
});

export const performanceRecordSchema = z.object({
  caregiverId: id,
  period: optionalShort,
  attendanceScore: optionalNum,
  documentationScore: optionalNum,
  satisfactionScore: optionalNum,
  complianceScore: optionalNum,
  trainingScore: optionalNum,
  overallScore: optionalNum,
  notes: longText,
});

// ── Emergency (Phase 31) ─────────────────────────────────────────────────────
export const emergencyPlanSchema = z.object({
  patientId: id,
  evacuationPlan: longText,
  backupCaregiver: optionalShort,
  equipmentNeeds: longText,
  riskLevel: enumOf(RISK_LEVEL).default("LOW"),
});

export const emergencyEventSchema = z.object({
  type: enumOf(EMERGENCY_TYPE),
  name: shortText,
  status: z.enum(["MONITORING", "ACTIVE", "RESOLVED"]).default("MONITORING"),
  startedAt: optionalDate,
  resolvedAt: optionalDate,
  notes: longText,
});

// ── AI insights (Phase 18/34) ────────────────────────────────────────────────
export const aiInsightSchema = z.object({
  module: enumOf(AI_MODULE),
  title: shortText,
  body: requiredLong,
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("INFO"),
  entityType: optionalShort,
  entityId: optionalId,
});

// ── Medication administration (Med Tech) ─────────────────────────────────────
export const medicationLogSchema = z.object({
  patientId: id,
  medicationName: shortText,
  medicationId: optionalId,
  caregiverId: optionalId,
  visitId: optionalId,
  scheduledAt: optionalDate,
  administeredAt: optionalDate,
  status: enumOf(MED_LOG_STATUS).default("SCHEDULED"),
  notes: longText,
});

// ── Care tasks ───────────────────────────────────────────────────────────────
export const careTaskSchema = z.object({
  patientId: id,
  visitId: optionalId,
  title: shortText,
  timeOfDay: enumOf(TIME_OF_DAY).default("MORNING"),
  status: enumOf(CARE_TASK_STATUS).default("PENDING"),
  completedAt: optionalDate,
});

// ── Portal schedule requests (Phase 7) ───────────────────────────────────────
export const portalRequestSchema = z.object({
  type: enumOf(REQUEST_TYPE).default("RESCHEDULE"),
  message: requiredLong,
  visitId: optionalId,
  preferredDate: optionalDate,
  preferredCaregiver: optionalShort,
  preferredCaregiverId: optionalId,
});

export const scheduleRequestReviewSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "DECLINED"]),
  reviewNote: longText,
});

// ── Self-serve signup (creates a new agency + its Agency Owner) ───────────────
export const signupSchema = z.object({
  agencyName: shortText,
  name: shortText,
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

// ── Workforce: time / PTO / mileage ──────────────────────────────────────────
export const timeEntrySchema = z.object({
  caregiverId: id,
  entryType: enumOf(TIME_ENTRY_TYPE).default("VISIT"),
  clockIn: optionalDate,
  clockOut: optionalDate,
  regularHours: money,
  overtimeHours: money,
  status: enumOf(TIME_ENTRY_STATUS).default("SUBMITTED"),
  notes: longText,
});

export const ptoRequestSchema = z.object({
  caregiverId: id,
  type: enumOf(PTO_TYPE).default("VACATION"),
  hours: money,
  startDate: optionalDate,
  endDate: optionalDate,
  status: enumOf(PTO_STATUS).default("REQUESTED"),
  notes: longText,
});

export const mileageEntrySchema = z.object({
  caregiverId: id,
  date: optionalDate,
  miles: money,
  type: enumOf(MILEAGE_TYPE).default("PATIENT_TO_PATIENT"),
  status: enumOf(MILEAGE_STATUS).default("SUBMITTED"),
  notes: longText,
});

// ── Agency configuration center ──────────────────────────────────────────────
export const serviceSchema = z.object({
  name: shortText,
  description: longText,
  price: money,
  durationMins: optionalNum,
  requiredSkill: optionalShort,
  active: optionalBool,
});

export const formTemplateSchema = z.object({
  name: shortText,
  category: enumOf(FORM_CATEGORY).default("INTAKE"),
  fields: z.preprocess(emptyToNull, z.string().max(20000).nullable().optional()),
  active: optionalBool,
});

export const ptoBalanceSchema = z.object({
  caregiverId: id,
  vacationHours: money,
  sickHours: money,
  holidayHours: money,
  floatingHours: money,
  usedHours: money,
});
