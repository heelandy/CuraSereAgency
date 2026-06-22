import type { ResourceConfig } from "./resource";
import * as V from "./validation";
import { prisma } from "./prisma";
import { Errors } from "./http";
import { patientAssignmentScoped, seesAllBranches } from "./authz";

// Central registry of every CRUD resource. Route files import a config by key;
// pages import the matching field/column defs from components/resource-defs.
// Adding a resource = a schema (validation.ts) + an entry here + a route file
// + a page (APP_BLUEPRINT §6).

const patientName = { select: { id: true, firstName: true, lastName: true, status: true } };
const caregiverName = { select: { id: true, firstName: true, lastName: true, discipline: true } };

export const resources = {
  // ── Tenancy / admin ──────────────────────────────────────────────────────
  branches: {
    delegate: "branch", rateScope: "branch",
    readCap: "admin:manage", writeCap: "admin:manage",
    schema: V.branchSchema, orderBy: { name: "asc" },
  },
  services: {
    delegate: "service", rateScope: "service",
    readCap: "admin:manage", writeCap: "admin:manage",
    schema: V.serviceSchema, orderBy: { name: "asc" },
  },
  forms: {
    delegate: "formTemplate", rateScope: "form",
    readCap: "admin:manage", writeCap: "admin:manage",
    schema: V.formTemplateSchema, orderBy: { name: "asc" },
  },
  "pto-balances": {
    delegate: "ptoBalance", rateScope: "ptoBalance",
    readCap: "payroll:read", writeCap: "payroll:write",
    schema: V.ptoBalanceSchema, include: { caregiver: caregiverName },
  },
  departments: {
    delegate: "department", rateScope: "department",
    readCap: "admin:manage", writeCap: "admin:manage",
    schema: V.departmentSchema, orderBy: { name: "asc" },
  },

  // ── Patients (Phase 1) ─────────────────────────────────────────────────────
  patients: {
    delegate: "patient", rateScope: "patient",
    readCap: "patients:read", writeCap: "patients:write",
    schema: V.patientSchema, orderBy: { lastName: "asc" },
    auditView: true,
    // Isolation: assignment-scoped roles see only assigned patients; other
    // branch-bound roles see only their branch; agency-wide roles see all.
    listWhere: (ctx) =>
      patientAssignmentScoped(ctx.role)
        ? { visits: { some: { caregiver: { userId: ctx.userId } } } }
        : !seesAllBranches(ctx.role) && ctx.branchId
          ? { branchId: ctx.branchId }
          : {},
  },
  "emergency-contacts": {
    delegate: "emergencyContact", rateScope: "emergencyContact",
    readCap: "patients:read", writeCap: "patients:write",
    schema: V.emergencyContactSchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },
  insurance: {
    delegate: "insurancePolicy", rateScope: "insurance",
    readCap: "billing:read", writeCap: "billing:write",
    schema: V.insurancePolicySchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
    encryptFields: ["memberId"], // PHI encrypted at rest (AES-256-GCM)
  },
  diagnoses: {
    delegate: "diagnosis", rateScope: "diagnosis",
    readCap: "clinical:read", writeCap: "clinical:write", // Level-2 clinical data
    schema: V.diagnosisSchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },
  allergies: {
    delegate: "allergy", rateScope: "allergy",
    readCap: "patients:read", writeCap: "patients:write",
    schema: V.allergySchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },
  medications: {
    delegate: "medication", rateScope: "medication",
    readCap: "clinical:read", writeCap: "clinical:write", // Level-2 clinical data
    schema: V.medicationSchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },
  physicians: {
    delegate: "physician", rateScope: "physician",
    readCap: "clinical:read", writeCap: "clinical:write", // Level-2 clinical data
    schema: V.physicianSchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },

  // ── Caregivers (Phase 1/2) ─────────────────────────────────────────────────
  caregivers: {
    delegate: "caregiver", rateScope: "caregiver",
    readCap: "caregivers:read", writeCap: "caregivers:write",
    schema: V.caregiverSchema, orderBy: { lastName: "asc" },
    branchField: "branchId", // branch-bound roles see only their branch's caregivers
  },
  certifications: {
    delegate: "certification", rateScope: "certification",
    readCap: "caregivers:read", writeCap: "caregivers:write",
    schema: V.certificationSchema,
    scope: { mode: "parent", relation: "caregiver", fkField: "caregiverId", parentDelegate: "caregiver" },
  },
  "background-checks": {
    delegate: "backgroundCheck", rateScope: "backgroundCheck",
    readCap: "caregivers:read", writeCap: "caregivers:write",
    schema: V.backgroundCheckSchema,
    scope: { mode: "parent", relation: "caregiver", fkField: "caregiverId", parentDelegate: "caregiver" },
  },
  availability: {
    delegate: "availability", rateScope: "availability",
    readCap: "caregivers:read", writeCap: "caregivers:write",
    schema: V.availabilitySchema,
    scope: { mode: "parent", relation: "caregiver", fkField: "caregiverId", parentDelegate: "caregiver" },
  },

  // ── Visits / Scheduling (Phase 1/3) ────────────────────────────────────────
  visits: {
    delegate: "visit", rateScope: "visit",
    readCap: "scheduling:read", writeCap: "scheduling:write",
    schema: V.visitSchema,
    include: { patient: patientName, caregiver: caregiverName, evv: true },
    orderBy: { scheduledStart: "desc" },
    validate: async (data, ctx, mode, existing) => {
      // Service Authorization Engine (Phase 28): block against an authorization
      // that is inactive or out of hours (only when an auth is being set).
      const authId = data.serviceAuthId;
      if (typeof authId === "string" && authId) {
        const auth = await prisma.serviceAuthorization.findFirst({ where: { id: authId, agencyId: ctx.agencyId } });
        if (!auth) throw Errors.notFound("Service authorization not found");
        if (auth.status !== "ACTIVE") throw Errors.badRequest("Authorization is not active — cannot schedule");
        if (auth.usedHours >= auth.approvedHours) throw Errors.badRequest("Authorized hours exhausted — cannot schedule");
        if (auth.endDate && new Date(auth.endDate) < new Date()) throw Errors.badRequest("Authorization expired — cannot schedule");
      }

      // 48-hour rule: within 48h of start, only senior roles may change the
      // caregiver or the time (delete still allowed via DELETE).
      if (mode === "update" && existing) {
        const start = new Date(existing.scheduledStart as string);
        const ms = start.getTime() - Date.now();
        const within48 = ms > 0 && ms < 48 * 3_600_000;
        const SENIOR = ["AGENCY_OWNER", "PLATFORM_OWNER", "AGENCY_ADMIN", "SCHEDULER"];
        const changingSchedule =
          data.caregiverId !== undefined || data.scheduledStart !== undefined || data.scheduledEnd !== undefined;
        if (within48 && changingSchedule && !SENIOR.includes(ctx.role)) {
          throw Errors.forbidden("Visits within 48 hours can only be rescheduled by a scheduler, admin or owner.");
        }
      }

      // Scope of practice: an assigned caregiver must be qualified for the service.
      const caregiverId = (data.caregiverId ?? existing?.caregiverId) as string | null | undefined;
      const serviceType = (data.serviceType ?? existing?.serviceType ?? "PERSONAL_CARE") as string;
      if (caregiverId) {
        const cg = await prisma.caregiver.findFirst({
          where: { id: caregiverId, agencyId: ctx.agencyId }, select: { discipline: true },
        });
        const REQUIRED: Record<string, string[]> = { SKILLED_NURSING: ["RN", "LPN"], THERAPY: ["THERAPIST", "RN"] };
        const allowed = REQUIRED[serviceType];
        if (cg && allowed && !allowed.includes(cg.discipline)) {
          throw Errors.badRequest(`This ${serviceType.replace(/_/g, " ").toLowerCase()} visit requires ${allowed.join(" or ")}; ${cg.discipline} is not qualified.`);
        }
      }
    },
  },

  // ── Clinical / Care plans (Phase 5/32) ─────────────────────────────────────
  "visit-notes": {
    delegate: "visitNote", rateScope: "visitNote",
    readCap: "care:read", writeCap: "care:write", // caregivers document their visits
    schema: V.visitNoteSchema,
    include: { patient: patientName },
    stamp: (ctx) => ({ authorId: ctx.userId }),
  },
  assessments: {
    delegate: "assessment", rateScope: "assessment",
    readCap: "clinical:read", writeCap: "clinical:write",
    schema: V.assessmentSchema,
    include: { patient: patientName },
  },
  "care-plans": {
    delegate: "carePlan", rateScope: "carePlan",
    readCap: "clinical:read", writeCap: "clinical:write",
    schema: V.carePlanSchema,
    include: { patient: patientName, goals: true },
  },
  "care-goals": {
    delegate: "careGoal", rateScope: "careGoal",
    readCap: "clinical:read", writeCap: "clinical:write",
    schema: V.careGoalSchema,
    scope: { mode: "parent", relation: "carePlan", fkField: "carePlanId", parentDelegate: "carePlan" },
  },

  // ── Medication administration (Med Tech module) ────────────────────────────
  "med-logs": {
    delegate: "medicationLog", rateScope: "medLog",
    readCap: "meds:read", writeCap: "meds:write", // only Med Tech / LPN / RN may administer
    schema: V.medicationLogSchema,
    include: { patient: patientName },
    orderBy: { scheduledAt: "desc" },
  },

  // ── Care tasks (patient daily task lists) ──────────────────────────────────
  "care-tasks": {
    delegate: "careTask", rateScope: "careTask",
    readCap: "care:read", writeCap: "care:write",
    schema: V.careTaskSchema,
    include: { patient: patientName },
    orderBy: { createdAt: "desc" },
  },

  // ── Incidents (Phase 30) ───────────────────────────────────────────────────
  incidents: {
    delegate: "incidentReport", rateScope: "incident",
    readCap: "incidents:read", writeCap: "incidents:write",
    schema: V.incidentSchema,
    include: { patient: patientName },
    stamp: (ctx) => ({ reportedById: ctx.userId }),
  },

  // ── Compliance (Phase 6/24) ────────────────────────────────────────────────
  compliance: {
    delegate: "complianceItem", rateScope: "compliance",
    readCap: "compliance:read", writeCap: "compliance:write",
    schema: V.complianceItemSchema,
    include: { caregiver: caregiverName },
    orderBy: { expiresAt: "asc" },
  },

  // ── Documents (Phase 17) ───────────────────────────────────────────────────
  documents: {
    delegate: "document", rateScope: "document",
    readCap: "documents:read", writeCap: "documents:write",
    schema: V.documentSchema,
    include: { patient: patientName, caregiver: caregiverName },
  },

  // ── Communication (Phase 10) ───────────────────────────────────────────────
  announcements: {
    delegate: "announcement", rateScope: "announcement",
    readCap: "messaging:read", writeCap: "messaging:write",
    schema: V.announcementSchema,
  },

  // ── Billing (Phase 11) ─────────────────────────────────────────────────────
  invoices: {
    delegate: "invoice", rateScope: "invoice",
    readCap: "billing:read", writeCap: "billing:write",
    schema: V.invoiceSchema,
    include: { patient: patientName },
  },
  payments: {
    delegate: "payment", rateScope: "payment",
    readCap: "billing:read", writeCap: "billing:write",
    schema: V.paymentSchema,
    orderBy: { paidAt: "desc" },
  },
  claims: {
    delegate: "claim", rateScope: "claim",
    readCap: "billing:read", writeCap: "billing:write",
    schema: V.claimSchema,
  },

  // ── Payroll (Phase 12) ─────────────────────────────────────────────────────
  payroll: {
    delegate: "payrollEntry", rateScope: "payroll",
    readCap: "payroll:read", writeCap: "payroll:write",
    schema: V.payrollSchema,
    include: { caregiver: caregiverName },
    orderBy: { periodStart: "desc" },
  },

  // ── Workforce: time entries / PTO / mileage (Hours/Payroll readiness) ──────
  "time-entries": {
    delegate: "timeEntry", rateScope: "timeEntry",
    readCap: "payroll:read", writeCap: "payroll:write",
    schema: V.timeEntrySchema,
    include: { caregiver: caregiverName },
    orderBy: { clockIn: "desc" },
  },
  pto: {
    delegate: "ptoRequest", rateScope: "pto",
    readCap: "payroll:read", writeCap: "payroll:write",
    schema: V.ptoRequestSchema,
    include: { caregiver: caregiverName },
    orderBy: { createdAt: "desc" },
  },
  mileage: {
    delegate: "mileageEntry", rateScope: "mileage",
    readCap: "payroll:read", writeCap: "payroll:write",
    schema: V.mileageEntrySchema,
    include: { caregiver: caregiverName },
    orderBy: { date: "desc" },
  },

  // ── HR / Onboarding (Phase 13/25) ──────────────────────────────────────────
  applicants: {
    delegate: "applicant", rateScope: "applicant",
    readCap: "hr:read", writeCap: "hr:write",
    schema: V.applicantSchema,
  },
  evaluations: {
    delegate: "evaluation", rateScope: "evaluation",
    readCap: "hr:read", writeCap: "hr:write",
    schema: V.evaluationSchema,
  },

  // ── Referrals (Phase 16/26) ────────────────────────────────────────────────
  "referral-sources": {
    delegate: "referralSource", rateScope: "referralSource",
    readCap: "referrals:read", writeCap: "referrals:write",
    schema: V.referralSourceSchema, orderBy: { name: "asc" },
  },
  referrals: {
    delegate: "referral", rateScope: "referral",
    readCap: "referrals:read", writeCap: "referrals:write",
    schema: V.referralSchema,
    include: { source: { select: { id: true, name: true, type: true } } },
    orderBy: { receivedAt: "desc" },
  },

  // ── Service Auth / Waivers (Phase 27/28) ───────────────────────────────────
  "service-auths": {
    delegate: "serviceAuthorization", rateScope: "serviceAuth",
    readCap: "clinical:read", writeCap: "clinical:write",
    schema: V.serviceAuthSchema,
    include: { patient: patientName },
  },
  waivers: {
    delegate: "medicaidWaiver", rateScope: "waiver",
    readCap: "billing:read", writeCap: "billing:write",
    schema: V.medicaidWaiverSchema,
    include: { patient: patientName },
  },

  // ── QA / Performance (Phase 14/29/33) ──────────────────────────────────────
  "quality-reviews": {
    delegate: "qualityReview", rateScope: "qa",
    readCap: "qa:read", writeCap: "qa:write",
    schema: V.qualityReviewSchema,
  },
  surveys: {
    delegate: "satisfactionSurvey", rateScope: "survey",
    readCap: "qa:read", writeCap: "qa:write",
    schema: V.satisfactionSurveySchema,
    include: { patient: patientName },
  },
  performance: {
    delegate: "performanceRecord", rateScope: "performance",
    readCap: "qa:read", writeCap: "qa:write",
    schema: V.performanceRecordSchema,
    include: { caregiver: caregiverName },
  },

  // ── Emergency (Phase 31) ───────────────────────────────────────────────────
  "emergency-events": {
    delegate: "emergencyEvent", rateScope: "emergencyEvent",
    readCap: "compliance:read", writeCap: "compliance:write",
    schema: V.emergencyEventSchema,
  },

  // ── AI insights (Phase 18/34) ──────────────────────────────────────────────
  "ai-insights": {
    delegate: "aiInsight", rateScope: "aiInsight",
    readCap: "ai:read", writeCap: "ai:read",
    schema: V.aiInsightSchema,
    orderBy: { createdAt: "desc" },
  },
} satisfies Record<string, ResourceConfig>;

export type ResourceKey = keyof typeof resources;
