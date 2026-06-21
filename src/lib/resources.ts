import type { ResourceConfig } from "./resource";
import * as V from "./validation";
import { prisma } from "./prisma";
import { Errors } from "./http";

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
  },
  "emergency-contacts": {
    delegate: "emergencyContact", rateScope: "emergencyContact",
    readCap: "patients:read", writeCap: "patients:write",
    schema: V.emergencyContactSchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },
  insurance: {
    delegate: "insurancePolicy", rateScope: "insurance",
    readCap: "patients:read", writeCap: "patients:write",
    schema: V.insurancePolicySchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },
  diagnoses: {
    delegate: "diagnosis", rateScope: "diagnosis",
    readCap: "patients:read", writeCap: "patients:write",
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
    readCap: "patients:read", writeCap: "patients:write",
    schema: V.medicationSchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },
  physicians: {
    delegate: "physician", rateScope: "physician",
    readCap: "patients:read", writeCap: "patients:write",
    schema: V.physicianSchema,
    scope: { mode: "parent", relation: "patient", fkField: "patientId", parentDelegate: "patient" },
  },

  // ── Caregivers (Phase 1/2) ─────────────────────────────────────────────────
  caregivers: {
    delegate: "caregiver", rateScope: "caregiver",
    readCap: "caregivers:read", writeCap: "caregivers:write",
    schema: V.caregiverSchema, orderBy: { lastName: "asc" },
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
    include: { patient: patientName, caregiver: caregiverName },
    orderBy: { scheduledStart: "desc" },
    // Service Authorization Engine (Phase 28): block visits against an
    // authorization that is inactive or out of hours.
    validate: async (data, ctx) => {
      const authId = data.serviceAuthId;
      if (typeof authId !== "string" || !authId) return;
      const auth = await prisma.serviceAuthorization.findFirst({
        where: { id: authId, agencyId: ctx.agencyId },
      });
      if (!auth) throw Errors.notFound("Service authorization not found");
      if (auth.status !== "ACTIVE") throw Errors.badRequest("Authorization is not active — cannot schedule");
      if (auth.usedHours >= auth.approvedHours) throw Errors.badRequest("Authorized hours exhausted — cannot schedule");
      if (auth.endDate && new Date(auth.endDate) < new Date()) throw Errors.badRequest("Authorization expired — cannot schedule");
    },
  },

  // ── Clinical / Care plans (Phase 5/32) ─────────────────────────────────────
  "visit-notes": {
    delegate: "visitNote", rateScope: "visitNote",
    readCap: "clinical:read", writeCap: "clinical:write",
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
