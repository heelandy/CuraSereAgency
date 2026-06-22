import type { CrudConfig, Field } from "./CrudResource";
import * as E from "@/lib/enums";

// Declarative column/field defs for every CRUD resource. Pages look these up by
// key; the generic [resource] route renders them. Plain data only (serializable).

const opts = (m: Record<string, string>) => E.labelsToOptions(m);

const patientField: Field = { name: "patientId", label: "Patient", type: "select", optionsResource: "patients", optionLabel: "fullName" };
const patientFieldReq: Field = { ...patientField, required: true };
const caregiverField: Field = { name: "caregiverId", label: "Caregiver", type: "select", optionsResource: "caregivers", optionLabel: "fullName" };

// Status → badge tone maps
const T = {
  patient: { ACTIVE: "green", PENDING: "amber", ON_HOLD: "amber", DISCHARGED: "neutral", DECEASED: "neutral" },
  caregiver: { ACTIVE: "green", ONBOARDING: "blue", INACTIVE: "neutral", ON_LEAVE: "amber", TERMINATED: "red" },
  visit: { SCHEDULED: "blue", OPEN: "amber", IN_PROGRESS: "violet", COMPLETED: "green", MISSED: "red", CANCELED: "neutral" },
  compliance: { VALID: "green", EXPIRING: "amber", EXPIRED: "red", MISSING: "red" },
  invoice: { DRAFT: "neutral", SENT: "blue", PARTIAL: "amber", PAID: "green", OVERDUE: "red", VOID: "neutral" },
  claim: { DRAFT: "neutral", SUBMITTED: "blue", ACCEPTED: "green", DENIED: "red", PAID: "green" },
  severity: { LOW: "neutral", MODERATE: "amber", HIGH: "red", CRITICAL: "red" },
  incident: { REPORTED: "blue", UNDER_REVIEW: "amber", INVESTIGATING: "amber", CORRECTIVE_ACTION: "violet", RESOLVED: "green" },
  referral: { LEAD: "neutral", CONTACTED: "blue", ASSESSMENT_SCHEDULED: "amber", ASSESSMENT_COMPLETED: "amber", ACCEPTED: "green", ADMITTED: "green", ACTIVE: "green", LOST: "red" },
  onboarding: { APPLICATION: "neutral", REVIEW: "blue", SCREENING: "amber", DOCUMENTATION: "amber", TRAINING: "violet", APPROVAL: "blue", HIRED: "green", REJECTED: "red" },
  auth: { ACTIVE: "green", PENDING: "amber", EXPIRING: "amber", EXPIRED: "red", EXHAUSTED: "red" },
  payroll: { DRAFT: "neutral", APPROVED: "blue", EXPORTED: "violet", PAID: "green" },
  ai: { INFO: "blue", WARNING: "amber", CRITICAL: "red" },
  emergency: { MONITORING: "amber", ACTIVE: "red", RESOLVED: "green" },
} as const;

export const resourceDefs: Record<string, CrudConfig> = {
  patients: {
    title: "Patients", singular: "Patient", resource: "patients",
    subtitle: "Demographics, status and admissions",
    columns: [
      { key: "name", label: "Name", type: "fullName", accessor: "" },
      { key: "mrn", label: "MRN" },
      { key: "phone", label: "Phone" },
      { key: "city", label: "City" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.patient, labelMap: E.PATIENT_STATUS },
      { key: "admittedAt", label: "Admitted", type: "date" },
    ],
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true },
      { name: "lastName", label: "Last name", type: "text", required: true },
      { name: "mrn", label: "MRN", type: "text" },
      { name: "dob", label: "Date of birth", type: "date" },
      { name: "gender", label: "Gender", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "status", label: "Status", type: "select", options: opts(E.PATIENT_STATUS) },
      { name: "addressLine", label: "Address", type: "text", full: true },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "zip", label: "ZIP", type: "text" },
      { name: "admittedAt", label: "Admitted date", type: "date" },
      { name: "requiredSkills", label: "Required skills (comma-sep)", type: "text", full: true },
      { name: "genderPreference", label: "Caregiver gender preference", type: "select", options: opts(E.GENDER) },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  caregivers: {
    title: "Caregivers", singular: "Caregiver", resource: "caregivers",
    subtitle: "Employees, disciplines and availability",
    columns: [
      { key: "name", label: "Name", type: "fullName", accessor: "" },
      { key: "discipline", label: "Discipline", labelMap: E.CAREGIVER_DISCIPLINE },
      { key: "phone", label: "Phone" },
      { key: "languages", label: "Languages" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.caregiver, labelMap: E.CAREGIVER_STATUS },
      { key: "hireDate", label: "Hired", type: "date" },
    ],
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true },
      { name: "lastName", label: "Last name", type: "text", required: true },
      { name: "discipline", label: "Discipline", type: "select", options: opts(E.CAREGIVER_DISCIPLINE) },
      { name: "employmentType", label: "Employment type", type: "select", options: opts(E.EMPLOYMENT_TYPE) },
      { name: "status", label: "Status", type: "select", options: opts(E.CAREGIVER_STATUS) },
      { name: "email", label: "Email", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "hourlyRate", label: "Hourly rate", type: "money" },
      { name: "maxHoursPerWeek", label: "Max hours/week", type: "number" },
      { name: "gender", label: "Gender", type: "select", options: opts(E.GENDER) },
      { name: "yearsExperience", label: "Years experience", type: "number" },
      { name: "languages", label: "Languages (comma-sep)", type: "text", full: true },
      { name: "addressLine", label: "Address", type: "text", full: true },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "zip", label: "ZIP", type: "text" },
      { name: "hireDate", label: "Hire date", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  visits: {
    title: "Visits", singular: "Visit", resource: "visits",
    subtitle: "Scheduled and completed visits",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "caregiver", label: "Caregiver", type: "fullName", accessor: "caregiver" },
      { key: "serviceType", label: "Service", labelMap: E.SERVICE_TYPE },
      { key: "scheduledStart", label: "Start", type: "datetime" },
      { key: "scheduledEnd", label: "End", type: "datetime" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.visit, labelMap: E.VISIT_STATUS },
    ],
    fields: [
      patientFieldReq,
      caregiverField,
      { name: "serviceType", label: "Service type", type: "select", options: opts(E.SERVICE_TYPE) },
      { name: "status", label: "Status", type: "select", options: opts(E.VISIT_STATUS) },
      { name: "scheduledStart", label: "Scheduled start", type: "datetime", required: true },
      { name: "scheduledEnd", label: "Scheduled end", type: "datetime", required: true },
      { name: "isRecurring", label: "Recurring", type: "checkbox" },
      { name: "recurrenceRule", label: "Recurrence (e.g. WEEKLY:MO,WE,FR)", type: "text", full: true },
    ],
  },

  "visit-notes": {
    title: "Visit Notes", singular: "Note", resource: "visit-notes",
    subtitle: "SOAP, progress and observation notes",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "type", label: "Type", labelMap: E.NOTE_TYPE },
      { key: "status", label: "Status", type: "badge", badgeMap: { DRAFT: "amber", SIGNED: "green" } },
      { key: "createdAt", label: "Created", type: "datetime" },
    ],
    fields: [
      patientFieldReq,
      { name: "type", label: "Type", type: "select", options: opts(E.NOTE_TYPE) },
      { name: "status", label: "Status", type: "select", options: [{ value: "DRAFT", label: "Draft" }, { value: "SIGNED", label: "Signed" }] },
      { name: "subjective", label: "Subjective", type: "textarea" },
      { name: "objective", label: "Objective", type: "textarea" },
      { name: "assessment", label: "Assessment", type: "textarea" },
      { name: "plan", label: "Plan", type: "textarea" },
      { name: "narrative", label: "Narrative", type: "textarea" },
      { name: "checklist", label: "Task checklist (e.g. Bathing ✓, Meal ✓)", type: "textarea" },
    ],
  },

  assessments: {
    title: "Assessments", singular: "Assessment", resource: "assessments",
    subtitle: "Initial, reassessment and risk assessments",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "type", label: "Type", labelMap: E.ASSESSMENT_TYPE },
      { key: "fallRisk", label: "Fall risk", type: "badge", badgeMap: { LOW: "green", MODERATE: "amber", HIGH: "red" } },
      { key: "performedAt", label: "Performed", type: "date" },
      { key: "nextDueAt", label: "Next due", type: "date" },
    ],
    fields: [
      patientFieldReq,
      { name: "type", label: "Type", type: "select", options: opts(E.ASSESSMENT_TYPE) },
      { name: "fallRisk", label: "Fall risk", type: "select", options: opts(E.RISK_LEVEL) },
      { name: "riskScore", label: "Risk score (0-100)", type: "number" },
      { name: "performedAt", label: "Performed at", type: "date" },
      { name: "nextDueAt", label: "Next due", type: "date" },
      { name: "summary", label: "Summary", type: "textarea" },
    ],
  },

  "care-plans": {
    title: "Care Plans", singular: "Care Plan", resource: "care-plans",
    subtitle: "Goals, interventions and reviews",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status", type: "badge", badgeMap: { ACTIVE: "green", DRAFT: "amber", ARCHIVED: "neutral" } },
      { key: "reviewDate", label: "Review", type: "date" },
    ],
    fields: [
      patientFieldReq,
      { name: "title", label: "Title", type: "text", required: true },
      { name: "status", label: "Status", type: "select", options: [{ value: "ACTIVE", label: "Active" }, { value: "DRAFT", label: "Draft" }, { value: "ARCHIVED", label: "Archived" }] },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "reviewDate", label: "Review date", type: "date" },
    ],
  },

  "med-logs": {
    title: "Medication Administration", singular: "Med Log", resource: "med-logs",
    subtitle: "Med Tech medication tasks, logs and errors",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "medicationName", label: "Medication" },
      { key: "status", label: "Status", type: "badge", badgeMap: { SCHEDULED: "blue", GIVEN: "green", MISSED: "red", REFUSED: "amber", ERROR: "red" }, labelMap: E.MED_LOG_STATUS },
      { key: "scheduledAt", label: "Scheduled", type: "datetime" },
      { key: "administeredAt", label: "Given", type: "datetime" },
    ],
    fields: [
      patientFieldReq,
      { name: "medicationName", label: "Medication", type: "text", required: true },
      { name: "status", label: "Status", type: "select", options: opts(E.MED_LOG_STATUS) },
      { name: "scheduledAt", label: "Scheduled at", type: "datetime" },
      { name: "administeredAt", label: "Administered at", type: "datetime" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  "care-tasks": {
    title: "Care Tasks", singular: "Task", resource: "care-tasks",
    subtitle: "Daily patient task lists (morning / afternoon / evening)",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "title", label: "Task" },
      { key: "timeOfDay", label: "When", labelMap: E.TIME_OF_DAY },
      { key: "status", label: "Status", type: "badge", badgeMap: { PENDING: "amber", DONE: "green", SKIPPED: "neutral" }, labelMap: E.CARE_TASK_STATUS },
    ],
    fields: [
      patientFieldReq,
      { name: "title", label: "Task", type: "text", required: true },
      { name: "timeOfDay", label: "Time of day", type: "select", options: opts(E.TIME_OF_DAY) },
      { name: "status", label: "Status", type: "select", options: opts(E.CARE_TASK_STATUS) },
    ],
  },

  incidents: {
    title: "Incident Reports", singular: "Incident", resource: "incidents",
    subtitle: "Falls, errors, injuries and emergencies",
    columns: [
      { key: "type", label: "Type", labelMap: E.INCIDENT_TYPE },
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "severity", label: "Severity", type: "badge", badgeMap: T.severity, labelMap: E.SEVERITY },
      { key: "status", label: "Status", type: "badge", badgeMap: T.incident, labelMap: E.INCIDENT_STATUS },
      { key: "occurredAt", label: "Occurred", type: "datetime" },
    ],
    fields: [
      { name: "type", label: "Type", type: "select", options: opts(E.INCIDENT_TYPE), required: true },
      patientField,
      { name: "severity", label: "Severity", type: "select", options: opts(E.SEVERITY) },
      { name: "status", label: "Status", type: "select", options: opts(E.INCIDENT_STATUS) },
      { name: "occurredAt", label: "Occurred at", type: "datetime" },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "correctiveAction", label: "Corrective action", type: "textarea" },
      { name: "resolvedAt", label: "Resolved at", type: "datetime" },
    ],
  },

  compliance: {
    title: "Compliance", singular: "Compliance Item", resource: "compliance",
    subtitle: "Licenses, certifications, training and AHCA items",
    columns: [
      { key: "name", label: "Item" },
      { key: "category", label: "Category", labelMap: E.COMPLIANCE_CATEGORY },
      { key: "scope", label: "Scope", labelMap: E.COMPLIANCE_SCOPE },
      { key: "caregiver", label: "Caregiver", type: "fullName", accessor: "caregiver" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.compliance, labelMap: E.COMPLIANCE_STATUS },
      { key: "expiresAt", label: "Expires", type: "date" },
    ],
    fields: [
      { name: "name", label: "Item name", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: opts(E.COMPLIANCE_CATEGORY), required: true },
      { name: "scope", label: "Scope", type: "select", options: opts(E.COMPLIANCE_SCOPE) },
      caregiverField,
      { name: "status", label: "Status", type: "select", options: opts(E.COMPLIANCE_STATUS) },
      { name: "issuedAt", label: "Issued", type: "date" },
      { name: "expiresAt", label: "Expires", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  documents: {
    title: "Documents", singular: "Document", resource: "documents",
    subtitle: "Versioned, signable, expiry-tracked documents",
    columns: [
      { key: "name", label: "Name" },
      { key: "category", label: "Category", labelMap: E.DOCUMENT_CATEGORY },
      { key: "version", label: "Ver", type: "number" },
      { key: "signed", label: "Signed", type: "bool" },
      { key: "expiresAt", label: "Expires", type: "date" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: opts(E.DOCUMENT_CATEGORY) },
      patientField,
      caregiverField,
      { name: "url", label: "Storage URL", type: "text", full: true },
      { name: "version", label: "Version", type: "number" },
      { name: "signed", label: "Signed", type: "checkbox" },
      { name: "signedBy", label: "Signed by", type: "text" },
      { name: "signedAt", label: "Signed at", type: "date" },
      { name: "expiresAt", label: "Expires", type: "date" },
    ],
  },

  announcements: {
    title: "Announcements", singular: "Announcement", resource: "announcements",
    subtitle: "Agency-wide announcements and emergency alerts",
    columns: [
      { key: "title", label: "Title" },
      { key: "priority", label: "Priority", type: "badge", badgeMap: { NORMAL: "neutral", EMERGENCY: "red" } },
      { key: "createdAt", label: "Posted", type: "datetime" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "priority", label: "Priority", type: "select", options: [{ value: "NORMAL", label: "Normal" }, { value: "EMERGENCY", label: "Emergency" }] },
      { name: "body", label: "Message", type: "textarea", required: true },
    ],
  },

  invoices: {
    title: "Invoices", singular: "Invoice", resource: "invoices",
    subtitle: "Private pay and insurance billing",
    columns: [
      { key: "number", label: "Number" },
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "billType", label: "Type" },
      { key: "amount", label: "Amount", type: "money" },
      { key: "amountPaid", label: "Paid", type: "money" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.invoice, labelMap: E.INVOICE_STATUS },
      { key: "dueAt", label: "Due", type: "date" },
    ],
    fields: [
      { name: "number", label: "Invoice #", type: "text" },
      patientField,
      { name: "billType", label: "Bill type", type: "select", options: [{ value: "PRIVATE", label: "Private Pay" }, { value: "MEDICARE", label: "Medicare" }, { value: "MEDICAID", label: "Medicaid" }, { value: "COMMERCIAL", label: "Commercial" }] },
      { name: "status", label: "Status", type: "select", options: opts(E.INVOICE_STATUS) },
      { name: "amount", label: "Amount", type: "money" },
      { name: "amountPaid", label: "Amount paid", type: "money" },
      { name: "issuedAt", label: "Issued", type: "date" },
      { name: "dueAt", label: "Due", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  payments: {
    title: "Payments", singular: "Payment", resource: "payments",
    subtitle: "Received payments and refunds",
    columns: [
      { key: "amount", label: "Amount", type: "money" },
      { key: "method", label: "Method", labelMap: E.PAYMENT_METHOD },
      { key: "status", label: "Status", type: "badge", badgeMap: { COMPLETED: "green", PENDING: "amber", REFUNDED: "neutral" } },
      { key: "reference", label: "Reference" },
      { key: "paidAt", label: "Paid", type: "datetime" },
    ],
    fields: [
      { name: "invoiceId", label: "Invoice", type: "select", optionsResource: "invoices", optionLabel: "name" },
      { name: "amount", label: "Amount", type: "money", required: true },
      { name: "method", label: "Method", type: "select", options: opts(E.PAYMENT_METHOD) },
      { name: "status", label: "Status", type: "select", options: [{ value: "COMPLETED", label: "Completed" }, { value: "PENDING", label: "Pending" }, { value: "REFUNDED", label: "Refunded" }] },
      { name: "reference", label: "Reference", type: "text" },
      { name: "paidAt", label: "Paid at", type: "datetime" },
    ],
  },

  claims: {
    title: "Insurance Claims", singular: "Claim", resource: "claims",
    subtitle: "Medicare, Medicaid and commercial claims",
    columns: [
      { key: "patientName", label: "Patient" },
      { key: "payerType", label: "Payer" },
      { key: "amount", label: "Amount", type: "money" },
      { key: "amountPaid", label: "Paid", type: "money" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.claim, labelMap: E.CLAIM_STATUS },
      { key: "submittedAt", label: "Submitted", type: "date" },
    ],
    fields: [
      { name: "patientName", label: "Patient name", type: "text" },
      { name: "payerType", label: "Payer", type: "select", options: [{ value: "MEDICARE", label: "Medicare" }, { value: "MEDICAID", label: "Medicaid" }, { value: "COMMERCIAL", label: "Commercial" }] },
      { name: "status", label: "Status", type: "select", options: opts(E.CLAIM_STATUS) },
      { name: "amount", label: "Amount", type: "money" },
      { name: "amountPaid", label: "Amount paid", type: "money" },
      { name: "submittedAt", label: "Submitted", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  payroll: {
    title: "Payroll", singular: "Payroll Entry", resource: "payroll",
    subtitle: "Hours, overtime, mileage and exports",
    columns: [
      { key: "caregiver", label: "Caregiver", type: "fullName", accessor: "caregiver" },
      { key: "periodStart", label: "Period start", type: "date" },
      { key: "periodEnd", label: "Period end", type: "date" },
      { key: "hoursWorked", label: "Hours", type: "number" },
      { key: "overtimeHours", label: "OT", type: "number" },
      { key: "grossPay", label: "Gross", type: "money" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.payroll, labelMap: E.PAYROLL_STATUS },
    ],
    fields: [
      { ...caregiverField, required: true },
      { name: "periodStart", label: "Period start", type: "date", required: true },
      { name: "periodEnd", label: "Period end", type: "date", required: true },
      { name: "hoursWorked", label: "Hours worked", type: "number" },
      { name: "overtimeHours", label: "Overtime hours", type: "number" },
      { name: "mileage", label: "Mileage", type: "number" },
      { name: "bonus", label: "Bonus", type: "money" },
      { name: "shiftDifferential", label: "Shift differential", type: "money" },
      { name: "grossPay", label: "Gross pay", type: "money" },
      { name: "status", label: "Status", type: "select", options: opts(E.PAYROLL_STATUS) },
    ],
  },

  "time-entries": {
    title: "Time Entries", singular: "Time Entry", resource: "time-entries",
    subtitle: "Hours worked — the source of truth for payroll",
    columns: [
      { key: "caregiver", label: "Caregiver", type: "fullName", accessor: "caregiver" },
      { key: "entryType", label: "Type", labelMap: E.TIME_ENTRY_TYPE },
      { key: "clockIn", label: "Clock in", type: "datetime" },
      { key: "clockOut", label: "Clock out", type: "datetime" },
      { key: "regularHours", label: "Reg", type: "number" },
      { key: "overtimeHours", label: "OT", type: "number" },
      { key: "status", label: "Status", type: "badge", badgeMap: { DRAFT: "neutral", SUBMITTED: "blue", PENDING: "amber", APPROVED: "green", REJECTED: "red", ADJUSTED: "violet", LOCKED: "neutral", EXPORTED: "green" }, labelMap: E.TIME_ENTRY_STATUS },
    ],
    fields: [
      { ...caregiverField, required: true },
      { name: "entryType", label: "Type", type: "select", options: opts(E.TIME_ENTRY_TYPE) },
      { name: "clockIn", label: "Clock in", type: "datetime" },
      { name: "clockOut", label: "Clock out", type: "datetime" },
      { name: "regularHours", label: "Regular hours", type: "number" },
      { name: "overtimeHours", label: "Overtime hours", type: "number" },
      { name: "status", label: "Status", type: "select", options: opts(E.TIME_ENTRY_STATUS) },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  pto: {
    title: "PTO Requests", singular: "PTO Request", resource: "pto",
    subtitle: "Vacation, sick, holiday and floating time",
    columns: [
      { key: "caregiver", label: "Caregiver", type: "fullName", accessor: "caregiver" },
      { key: "type", label: "Type", labelMap: E.PTO_TYPE },
      { key: "hours", label: "Hours", type: "number" },
      { key: "startDate", label: "Start", type: "date" },
      { key: "status", label: "Status", type: "badge", badgeMap: { REQUESTED: "amber", APPROVED: "green", DENIED: "red", USED: "neutral", EXPIRED: "neutral" }, labelMap: E.PTO_STATUS },
    ],
    fields: [
      { ...caregiverField, required: true },
      { name: "type", label: "Type", type: "select", options: opts(E.PTO_TYPE) },
      { name: "hours", label: "Hours", type: "number" },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "endDate", label: "End date", type: "date" },
      { name: "status", label: "Status", type: "select", options: opts(E.PTO_STATUS) },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  mileage: {
    title: "Mileage", singular: "Mileage Entry", resource: "mileage",
    subtitle: "GPS + manual mileage for reimbursement",
    columns: [
      { key: "caregiver", label: "Caregiver", type: "fullName", accessor: "caregiver" },
      { key: "date", label: "Date", type: "date" },
      { key: "miles", label: "Miles", type: "number" },
      { key: "type", label: "Type", labelMap: E.MILEAGE_TYPE },
      { key: "status", label: "Status", type: "badge", badgeMap: { SUBMITTED: "blue", APPROVED: "green", REJECTED: "red", PAID: "green" }, labelMap: E.MILEAGE_STATUS },
    ],
    fields: [
      { ...caregiverField, required: true },
      { name: "date", label: "Date", type: "date" },
      { name: "miles", label: "Miles", type: "number" },
      { name: "type", label: "Type", type: "select", options: opts(E.MILEAGE_TYPE) },
      { name: "status", label: "Status", type: "select", options: opts(E.MILEAGE_STATUS) },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  applicants: {
    title: "Onboarding", singular: "Applicant", resource: "applicants",
    subtitle: "Applicant-to-active caregiver pipeline",
    columns: [
      { key: "name", label: "Name", type: "fullName", accessor: "" },
      { key: "position", label: "Position" },
      { key: "stage", label: "Stage", type: "badge", badgeMap: T.onboarding, labelMap: E.ONBOARDING_STAGE },
      { key: "recruiter", label: "Recruiter" },
      { key: "createdAt", label: "Applied", type: "date" },
    ],
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true },
      { name: "lastName", label: "Last name", type: "text", required: true },
      { name: "email", label: "Email", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "position", label: "Position", type: "text" },
      { name: "stage", label: "Stage", type: "select", options: opts(E.ONBOARDING_STAGE) },
      { name: "recruiter", label: "Recruiter", type: "text" },
      { name: "experience", label: "Experience", type: "textarea" },
      { name: "resumeUrl", label: "Resume URL", type: "text", full: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  evaluations: {
    title: "Evaluations", singular: "Evaluation", resource: "evaluations",
    subtitle: "Performance reviews and KPIs",
    columns: [
      { key: "reviewer", label: "Reviewer" },
      { key: "period", label: "Period" },
      { key: "score", label: "Score", type: "number" },
      { key: "status", label: "Status", type: "badge", badgeMap: { DRAFT: "amber", FINALIZED: "green" } },
    ],
    fields: [
      caregiverField,
      { name: "reviewer", label: "Reviewer", type: "text" },
      { name: "period", label: "Period", type: "text" },
      { name: "score", label: "Score (0-100)", type: "number" },
      { name: "status", label: "Status", type: "select", options: [{ value: "DRAFT", label: "Draft" }, { value: "FINALIZED", label: "Finalized" }] },
      { name: "strengths", label: "Strengths", type: "textarea" },
      { name: "improvements", label: "Areas to improve", type: "textarea" },
    ],
  },

  "referral-sources": {
    title: "Referral Sources", singular: "Source", resource: "referral-sources",
    subtitle: "Hospitals, physicians and facilities",
    columns: [
      { key: "name", label: "Name" },
      { key: "type", label: "Type", labelMap: E.REFERRAL_SOURCE_TYPE },
      { key: "contactName", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "active", label: "Active", type: "bool" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "type", label: "Type", type: "select", options: opts(E.REFERRAL_SOURCE_TYPE) },
      { name: "contactName", label: "Contact name", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },

  referrals: {
    title: "Referrals", singular: "Referral", resource: "referrals",
    subtitle: "Lead-to-admission pipeline",
    columns: [
      { key: "prospectName", label: "Prospect" },
      { key: "source", label: "Source", accessor: "source.name" },
      { key: "stage", label: "Stage", type: "badge", badgeMap: T.referral, labelMap: E.REFERRAL_STAGE },
      { key: "estimatedRevenue", label: "Est. revenue", type: "money" },
      { key: "receivedAt", label: "Received", type: "date" },
    ],
    fields: [
      { name: "prospectName", label: "Prospect name", type: "text", required: true },
      { name: "sourceId", label: "Source", type: "select", optionsResource: "referral-sources", optionLabel: "name" },
      { name: "stage", label: "Stage", type: "select", options: opts(E.REFERRAL_STAGE) },
      { name: "coordinator", label: "Coordinator", type: "text" },
      { name: "estimatedRevenue", label: "Estimated revenue", type: "money" },
      { name: "receivedAt", label: "Received", type: "date" },
      { name: "admittedAt", label: "Admitted", type: "date" },
    ],
  },

  "service-auths": {
    title: "Service Authorizations", singular: "Authorization", resource: "service-auths",
    subtitle: "Approved services and hours (blocks unauthorized visits)",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "authNumber", label: "Auth #" },
      { key: "payerType", label: "Payer", labelMap: E.PAYER_TYPE },
      { key: "approvedHours", label: "Approved", type: "number" },
      { key: "usedHours", label: "Used", type: "number" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.auth, labelMap: E.AUTH_STATUS },
      { key: "endDate", label: "Ends", type: "date" },
    ],
    fields: [
      patientFieldReq,
      { name: "authNumber", label: "Authorization #", type: "text" },
      { name: "payerType", label: "Payer", type: "select", options: opts(E.PAYER_TYPE) },
      { name: "serviceType", label: "Service type", type: "select", options: opts(E.SERVICE_TYPE) },
      { name: "approvedHours", label: "Approved hours", type: "number" },
      { name: "usedHours", label: "Used hours", type: "number" },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "endDate", label: "End date", type: "date" },
      { name: "status", label: "Status", type: "select", options: opts(E.AUTH_STATUS) },
    ],
  },

  waivers: {
    title: "Medicaid Waivers", singular: "Waiver", resource: "waivers",
    subtitle: "HCBS and long-term care waiver clients",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "program", label: "Program", labelMap: E.WAIVER_PROGRAM },
      { key: "authNumber", label: "Auth #" },
      { key: "approvedHours", label: "Approved", type: "number" },
      { key: "usedHours", label: "Used", type: "number" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.auth, labelMap: E.AUTH_STATUS },
    ],
    fields: [
      patientFieldReq,
      { name: "program", label: "Program", type: "select", options: opts(E.WAIVER_PROGRAM) },
      { name: "authNumber", label: "Authorization #", type: "text" },
      { name: "approvedHours", label: "Approved hours", type: "number" },
      { name: "usedHours", label: "Used hours", type: "number" },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "endDate", label: "End date", type: "date" },
      { name: "status", label: "Status", type: "select", options: opts(E.AUTH_STATUS) },
    ],
  },

  "quality-reviews": {
    title: "Quality Reviews", singular: "Review", resource: "quality-reviews",
    subtitle: "Agency quality scorecards",
    columns: [
      { key: "period", label: "Period" },
      { key: "complianceScore", label: "Compliance %", type: "number" },
      { key: "satisfactionScore", label: "Satisfaction %", type: "number" },
      { key: "incidentRate", label: "Incident rate", type: "number" },
      { key: "missedVisitRate", label: "Missed %", type: "number" },
    ],
    fields: [
      { name: "period", label: "Period", type: "text" },
      { name: "complianceScore", label: "Compliance %", type: "number" },
      { name: "satisfactionScore", label: "Satisfaction %", type: "number" },
      { name: "incidentRate", label: "Incident rate", type: "number" },
      { name: "missedVisitRate", label: "Missed visit rate %", type: "number" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  surveys: {
    title: "Satisfaction Surveys", singular: "Survey", resource: "surveys",
    subtitle: "Patient and family satisfaction",
    columns: [
      { key: "patient", label: "Patient", type: "fullName", accessor: "patient" },
      { key: "respondent", label: "Respondent" },
      { key: "rating", label: "Rating", type: "number" },
      { key: "createdAt", label: "Date", type: "date" },
    ],
    fields: [
      patientField,
      { name: "respondent", label: "Respondent", type: "select", options: [{ value: "PATIENT", label: "Patient" }, { value: "FAMILY", label: "Family" }] },
      { name: "rating", label: "Rating (1-5)", type: "number", required: true },
      { name: "comments", label: "Comments", type: "textarea" },
    ],
  },

  performance: {
    title: "Caregiver Performance", singular: "Record", resource: "performance",
    subtitle: "100-point composite performance scores",
    columns: [
      { key: "caregiver", label: "Caregiver", type: "fullName", accessor: "caregiver" },
      { key: "period", label: "Period" },
      { key: "overallScore", label: "Overall", type: "number" },
      { key: "attendanceScore", label: "Attendance", type: "number" },
      { key: "documentationScore", label: "Docs", type: "number" },
    ],
    fields: [
      { ...caregiverField, required: true },
      { name: "period", label: "Period", type: "text" },
      { name: "attendanceScore", label: "Attendance", type: "number" },
      { name: "documentationScore", label: "Documentation", type: "number" },
      { name: "satisfactionScore", label: "Patient satisfaction", type: "number" },
      { name: "complianceScore", label: "Compliance", type: "number" },
      { name: "trainingScore", label: "Training", type: "number" },
      { name: "overallScore", label: "Overall (0-100)", type: "number" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  "emergency-events": {
    title: "Emergency Preparedness", singular: "Event", resource: "emergency-events",
    subtitle: "Hurricanes, outages and facility closures",
    columns: [
      { key: "name", label: "Event" },
      { key: "type", label: "Type", labelMap: E.EMERGENCY_TYPE },
      { key: "status", label: "Status", type: "badge", badgeMap: T.emergency },
      { key: "startedAt", label: "Started", type: "datetime" },
    ],
    fields: [
      { name: "name", label: "Event name", type: "text", required: true },
      { name: "type", label: "Type", type: "select", options: opts(E.EMERGENCY_TYPE), required: true },
      { name: "status", label: "Status", type: "select", options: [{ value: "MONITORING", label: "Monitoring" }, { value: "ACTIVE", label: "Active" }, { value: "RESOLVED", label: "Resolved" }] },
      { name: "startedAt", label: "Started at", type: "datetime" },
      { name: "resolvedAt", label: "Resolved at", type: "datetime" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },

  "ai-insights": {
    title: "AI Insights", singular: "Insight", resource: "ai-insights",
    subtitle: "Generated by the AI automation layer",
    readOnly: true,
    columns: [
      { key: "module", label: "Module", labelMap: E.AI_MODULE },
      { key: "title", label: "Insight" },
      { key: "severity", label: "Severity", type: "badge", badgeMap: T.ai },
      { key: "createdAt", label: "Generated", type: "datetime" },
    ],
    fields: [],
  },

  branches: {
    title: "Branches", singular: "Branch", resource: "branches",
    subtitle: "Multi-location agency offices",
    columns: [
      { key: "name", label: "Name" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "phone", label: "Phone" },
      { key: "active", label: "Active", type: "bool" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "addressLine", label: "Address", type: "text", full: true },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "zip", label: "ZIP", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },

  services: {
    title: "Service Catalog", singular: "Service", resource: "services",
    subtitle: "Services your agency offers (drives matching + billing)",
    columns: [
      { key: "name", label: "Service" },
      { key: "price", label: "Price", type: "money" },
      { key: "durationMins", label: "Duration (min)", type: "number" },
      { key: "requiredSkill", label: "Required skill" },
      { key: "active", label: "Active", type: "bool" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "price", label: "Price ($/hr)", type: "money" },
      { name: "durationMins", label: "Duration (minutes)", type: "number" },
      { name: "requiredSkill", label: "Required skill", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },

  forms: {
    title: "Forms Builder", singular: "Form", resource: "forms",
    subtitle: "No-code agency forms (intake, incident, assessment…)",
    columns: [
      { key: "name", label: "Form" },
      { key: "category", label: "Category", labelMap: E.FORM_CATEGORY },
      { key: "active", label: "Active", type: "bool" },
    ],
    fields: [
      { name: "name", label: "Form name", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: opts(E.FORM_CATEGORY) },
      { name: "fields", label: "Fields — one per line as Label|type (text/dropdown/checkbox/date/signature/file)", type: "textarea" },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },

  "pto-balances": {
    title: "PTO Balances", singular: "PTO Balance", resource: "pto-balances",
    subtitle: "Accrued time-off balances per caregiver",
    columns: [
      { key: "caregiver", label: "Caregiver", type: "fullName", accessor: "caregiver" },
      { key: "vacationHours", label: "Vacation", type: "number" },
      { key: "sickHours", label: "Sick", type: "number" },
      { key: "holidayHours", label: "Holiday", type: "number" },
      { key: "floatingHours", label: "Floating", type: "number" },
      { key: "usedHours", label: "Used", type: "number" },
    ],
    fields: [
      { ...caregiverField, required: true },
      { name: "vacationHours", label: "Vacation hours", type: "number" },
      { name: "sickHours", label: "Sick hours", type: "number" },
      { name: "holidayHours", label: "Holiday hours", type: "number" },
      { name: "floatingHours", label: "Floating hours", type: "number" },
      { name: "usedHours", label: "Used hours", type: "number" },
    ],
  },

  departments: {
    title: "Departments", singular: "Department", resource: "departments",
    columns: [
      { key: "name", label: "Name" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "branchId", label: "Branch", type: "select", optionsResource: "branches", optionLabel: "name" },
    ],
  },
};

// Child resource defs (scoped to a parent via `fixed`) — used on detail pages.
export const childDefs = {
  "emergency-contacts": {
    title: "Emergency Contacts", singular: "Contact", resource: "emergency-contacts",
    columns: [
      { key: "name", label: "Name" }, { key: "relationship", label: "Relationship" },
      { key: "phone", label: "Phone" }, { key: "isPrimary", label: "Primary", type: "bool" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "relationship", label: "Relationship", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "isPrimary", label: "Primary contact", type: "checkbox" },
    ],
  },
  insurance: {
    title: "Insurance", singular: "Policy", resource: "insurance",
    columns: [
      { key: "payerName", label: "Payer" }, { key: "payerType", label: "Type", labelMap: E.PAYER_TYPE },
      { key: "memberId", label: "Member ID" }, { key: "isPrimary", label: "Primary", type: "bool" },
    ],
    fields: [
      { name: "payerName", label: "Payer name", type: "text", required: true },
      { name: "payerType", label: "Payer type", type: "select", options: opts(E.PAYER_TYPE) },
      { name: "memberId", label: "Member ID", type: "text" },
      { name: "groupNumber", label: "Group #", type: "text" },
      { name: "isPrimary", label: "Primary", type: "checkbox", defaultValue: true },
      { name: "effectiveDate", label: "Effective", type: "date" },
      { name: "expiryDate", label: "Expires", type: "date" },
    ],
  },
  diagnoses: {
    title: "Diagnoses", singular: "Diagnosis", resource: "diagnoses",
    columns: [
      { key: "code", label: "ICD-10" }, { key: "description", label: "Description" },
      { key: "isPrimary", label: "Primary", type: "bool" },
    ],
    fields: [
      { name: "code", label: "ICD-10 code", type: "text" },
      { name: "description", label: "Description", type: "text", required: true },
      { name: "isPrimary", label: "Primary", type: "checkbox" },
      { name: "diagnosedAt", label: "Diagnosed", type: "date" },
    ],
  },
  allergies: {
    title: "Allergies", singular: "Allergy", resource: "allergies",
    columns: [
      { key: "allergen", label: "Allergen" }, { key: "reaction", label: "Reaction" },
      { key: "severity", label: "Severity", type: "badge", badgeMap: { LOW: "neutral", MODERATE: "amber", HIGH: "red" } },
    ],
    fields: [
      { name: "allergen", label: "Allergen", type: "text", required: true },
      { name: "reaction", label: "Reaction", type: "text" },
      { name: "severity", label: "Severity", type: "select", options: opts(E.RISK_LEVEL) },
    ],
  },
  medications: {
    title: "Medications", singular: "Medication", resource: "medications",
    columns: [
      { key: "name", label: "Name" }, { key: "dosage", label: "Dosage" },
      { key: "frequency", label: "Frequency" }, { key: "active", label: "Active", type: "bool" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "dosage", label: "Dosage", type: "text" },
      { name: "frequency", label: "Frequency", type: "text" },
      { name: "route", label: "Route", type: "text" },
      { name: "prescriber", label: "Prescriber", type: "text" },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },
  physicians: {
    title: "Physicians", singular: "Physician", resource: "physicians",
    columns: [
      { key: "name", label: "Name" }, { key: "specialty", label: "Specialty" },
      { key: "phone", label: "Phone" }, { key: "isPrimary", label: "Primary", type: "bool" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "npi", label: "NPI", type: "text" },
      { name: "specialty", label: "Specialty", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "fax", label: "Fax", type: "text" },
      { name: "isPrimary", label: "Primary", type: "checkbox" },
    ],
  },
  certifications: {
    title: "Certifications & Licenses", singular: "Certification", resource: "certifications",
    columns: [
      { key: "name", label: "Name" }, { key: "type", label: "Type" },
      { key: "status", label: "Status", type: "badge", badgeMap: T.compliance, labelMap: E.COMPLIANCE_STATUS },
      { key: "expiresAt", label: "Expires", type: "date" },
    ],
    fields: [
      { name: "type", label: "Type", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "number", label: "Number", type: "text" },
      { name: "issuedAt", label: "Issued", type: "date" },
      { name: "expiresAt", label: "Expires", type: "date" },
      { name: "status", label: "Status", type: "select", options: opts(E.COMPLIANCE_STATUS) },
    ],
  },
  "background-checks": {
    title: "Background Checks", singular: "Check", resource: "background-checks",
    columns: [
      { key: "type", label: "Type" },
      { key: "status", label: "Status", type: "badge", badgeMap: { PENDING: "amber", PASSED: "green", FAILED: "red", EXPIRED: "red" } },
      { key: "completedAt", label: "Completed", type: "date" },
    ],
    fields: [
      { name: "type", label: "Type", type: "text", required: true },
      { name: "status", label: "Status", type: "select", options: [{ value: "PENDING", label: "Pending" }, { value: "PASSED", label: "Passed" }, { value: "FAILED", label: "Failed" }, { value: "EXPIRED", label: "Expired" }] },
      { name: "completedAt", label: "Completed", type: "date" },
      { name: "expiresAt", label: "Expires", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  availability: {
    title: "Availability", singular: "Slot", resource: "availability",
    columns: [
      { key: "dayOfWeek", label: "Day", labelMap: { "0": "Sunday", "1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday", "5": "Friday", "6": "Saturday" } },
      { key: "startTime", label: "Start" }, { key: "endTime", label: "End" },
    ],
    fields: [
      { name: "dayOfWeek", label: "Day of week", type: "select", options: [
        { value: "0", label: "Sunday" }, { value: "1", label: "Monday" }, { value: "2", label: "Tuesday" },
        { value: "3", label: "Wednesday" }, { value: "4", label: "Thursday" }, { value: "5", label: "Friday" }, { value: "6", label: "Saturday" },
      ], required: true },
      { name: "startTime", label: "Start (HH:MM)", type: "text", required: true },
      { name: "endTime", label: "End (HH:MM)", type: "text", required: true },
    ],
  },
  "care-goals": {
    title: "Goals", singular: "Goal", resource: "care-goals",
    columns: [
      { key: "description", label: "Goal" },
      { key: "status", label: "Status", type: "badge", badgeMap: { NOT_STARTED: "neutral", IN_PROGRESS: "blue", MET: "green", NOT_MET: "red", DISCONTINUED: "neutral" }, labelMap: E.GOAL_STATUS },
      { key: "progress", label: "Progress %", type: "number" },
    ],
    fields: [
      { name: "description", label: "Goal", type: "text", required: true },
      { name: "intervention", label: "Intervention", type: "text" },
      { name: "status", label: "Status", type: "select", options: opts(E.GOAL_STATUS) },
      { name: "progress", label: "Progress %", type: "number" },
      { name: "targetDate", label: "Target date", type: "date" },
    ],
  },
} satisfies Record<string, CrudConfig>;
