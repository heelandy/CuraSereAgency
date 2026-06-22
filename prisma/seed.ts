import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const daysFromNow = (d: number, h = 9, m = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(h, m, 0, 0);
  return date;
};

async function main() {
  console.log("Resetting…");
  await prisma.agency.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.agencyNetwork.deleteMany();

  const pw = await bcrypt.hash("password123", 12);

  const network = await prisma.agencyNetwork.create({ data: { name: "Cura_Sera Network" } });

  const agency = await prisma.agency.create({
    data: {
      name: "Cura_Sera Home Care",
      legalName: "Cura_Sera Home Care LLC",
      networkId: network.id,
      email: "care@curasera.com",
      phone: "(305) 555-0142",
      addressLine: "200 Biscayne Blvd",
      city: "Miami", state: "FL", zip: "33131",
      plan: "PROFESSIONAL", subscriptionStatus: "active",
      trialEndsAt: daysFromNow(30),
      // White-label branding (teal default)
      slug: "curasera", portalName: "Cura_Sera Home Care",
      primaryColor: "#1f775c", secondaryColor: "#e6b566",
      supportEmail: "care@curasera.com", supportPhone: "(305) 555-0142",
      pdfFooter: "Cura_Sera Home Care — Confidential",
    },
  });
  // Domains that resolve to this tenant (localhost so logged-out dev shows branding).
  await prisma.agencyDomain.createMany({
    data: [
      { agencyId: agency.id, domain: "localhost", isPrimary: true, verified: true },
      { agencyId: agency.id, domain: "curasera.localhost", verified: true },
    ],
  });

  const branch = await prisma.branch.create({
    data: { agencyId: agency.id, name: "Miami Main", city: "Miami", state: "FL", zip: "33131", phone: "(305) 555-0142" },
  });
  await prisma.department.create({ data: { agencyId: agency.id, branchId: branch.id, name: "Skilled Nursing" } });
  await prisma.department.create({ data: { agencyId: agency.id, branchId: branch.id, name: "Personal Care" } });

  // ── Users ────────────────────────────────────────────────────────────────
  // Names of the field-staff demo logins match the caregiver records they're
  // linked to below (so the greeting + My Shifts line up). "caregiver" is too
  // broad on its own — there's a discipline-specific account for RN/LPN/HHA/CNA.
  const users: [string, string, string][] = [
    ["Sam Superadmin", "superadmin@curasera.com", "PLATFORM_OWNER"],
    ["Olivia Owner", "owner@curasera.com", "AGENCY_OWNER"],
    ["Aaron Admin", "admin@curasera.com", "AGENCY_ADMIN"],
    ["Dana Director", "director@curasera.com", "CLINICAL_DIRECTOR"],
    ["Nina Nurse", "nurse@curasera.com", "NURSE_SUPERVISOR"],
    ["Sam Scheduler", "scheduler@curasera.com", "SCHEDULER"],
    ["James Okoro", "rn@curasera.com", "RN"],
    ["Mei Lin", "lpn@curasera.com", "LPN"],
    ["Tom Webb", "medtech@curasera.com", "MED_TECH"],
    ["Carla Mendez", "hha@curasera.com", "HHA"],
    ["Sofia Reyes", "cna@curasera.com", "CAREGIVER"],
    ["David Klein", "caregiver@curasera.com", "CAREGIVER"],
    ["Bill Biller", "billing@curasera.com", "BILLING"],
    ["Hana HR", "hr@curasera.com", "HR"],
    ["Cody Compliance", "compliance@curasera.com", "COMPLIANCE"],
    ["Fred Family", "family@curasera.com", "FAMILY"],
    ["Pat Patient", "patient@curasera.com", "PATIENT"],
  ];
  for (const [name, email, role] of users) {
    await prisma.user.create({
      data: { agencyId: agency.id, branchId: branch.id, name, email, role, passwordHash: pw },
    });
  }

  // ── Skills ───────────────────────────────────────────────────────────────
  const skillNames = ["Dementia Care", "Wound Care", "Hoyer Lift", "Diabetic Care", "Spanish", "Hospice"];
  const skills = await Promise.all(skillNames.map((name) => prisma.skill.create({ data: { name } })));

  // ── Caregivers ─────────────────────────────────────────────────────────────
  const caregiverSeed = [
    ["Carla", "Mendez", "HHA", "ACTIVE", "English,Spanish", 18.5, 25.9, -80.19],
    ["James", "Okoro", "RN", "ACTIVE", "English", 38.0, 25.77, -80.13],
    ["Mei", "Lin", "LPN", "ACTIVE", "English,Mandarin", 29.0, 25.82, -80.22],
    ["Tom", "Webb", "MED_TECH", "ACTIVE", "English", 21.0, 25.78, -80.2],
    ["Sofia", "Reyes", "CNA", "ACTIVE", "English,Spanish", 17.0, 25.86, -80.3],
    ["David", "Klein", "COMPANION", "ACTIVE", "English", 16.0, 25.7, -80.28],
  ] as const;
  const caregivers = [];
  for (const [first, last, disc, status, langs, rate, lat, lng] of caregiverSeed) {
    const cg = await prisma.caregiver.create({
      data: {
        agencyId: agency.id, branchId: branch.id, firstName: first, lastName: last,
        discipline: disc, status, languages: langs, hourlyRate: rate,
        email: `${first.toLowerCase()}@curasera.com`, phone: "(305) 555-02" + Math.floor(10 + Math.random() * 89),
        hireDate: daysFromNow(-200 - Math.floor(Math.random() * 300)), maxHoursPerWeek: 40,
        skillSet: "Bathing,Mobility,Medication Reminders", availableDays: "MO,TU,WE,TH,FR",
        latitude: lat, longitude: lng, city: "Miami", state: "FL",
      },
    });
    caregivers.push(cg);
    // certifications + a compliance item (some expiring)
    await prisma.certification.create({
      data: { caregiverId: cg.id, type: "CPR", name: "CPR/BLS Certification", expiresAt: daysFromNow(20 + Math.floor(Math.random() * 200)), status: "VALID" },
    });
    await prisma.backgroundCheck.create({
      data: { caregiverId: cg.id, type: "LEVEL_2", status: "PASSED", completedAt: daysFromNow(-150) },
    });
    await prisma.availability.create({ data: { caregiverId: cg.id, dayOfWeek: 1, startTime: "08:00", endTime: "17:00" } });
    await prisma.availability.create({ data: { caregiverId: cg.id, dayOfWeek: 3, startTime: "08:00", endTime: "17:00" } });
    await prisma.caregiverSkill.create({ data: { caregiverId: cg.id, skillId: skills[Math.floor(Math.random() * skills.length)].id } });
    await prisma.complianceItem.create({
      data: {
        agencyId: agency.id, caregiverId: cg.id, scope: "CAREGIVER", category: "CPR", name: "CPR Certification",
        status: Math.random() > 0.6 ? "EXPIRING" : "VALID", expiresAt: daysFromNow(15 + Math.floor(Math.random() * 120)),
      },
    });
  }

  // Agency-level compliance (AHCA)
  await prisma.complianceItem.create({ data: { agencyId: agency.id, scope: "AGENCY", category: "LICENSE", name: "AHCA Home Health License", status: "VALID", expiresAt: daysFromNow(80) } });
  await prisma.complianceItem.create({ data: { agencyId: agency.id, scope: "AGENCY", category: "INSURANCE", name: "Liability Insurance", status: "EXPIRING", expiresAt: daysFromNow(45) } });
  await prisma.complianceItem.create({ data: { agencyId: agency.id, scope: "AGENCY", category: "WORKERS_COMP", name: "Workers Compensation", status: "VALID", expiresAt: daysFromNow(160) } });

  // ── Patients ───────────────────────────────────────────────────────────────
  const patientSeed = [
    ["Margaret", "Thompson", "ACTIVE", "MEDICARE"],
    ["Robert", "Garcia", "ACTIVE", "MEDICAID"],
    ["Helen", "Wright", "ACTIVE", "WAIVER"],
    ["George", "Patel", "ACTIVE", "PRIVATE"],
    ["Dorothy", "Nguyen", "PENDING", "COMMERCIAL"],
    ["Frank", "Russo", "ON_HOLD", "MEDICARE"],
  ] as const;
  const patients = [];
  for (let i = 0; i < patientSeed.length; i++) {
    const [first, last, status, payer] = patientSeed[i];
    const p = await prisma.patient.create({
      data: {
        agencyId: agency.id, branchId: branch.id, firstName: first, lastName: last, status,
        mrn: `MRN-${1000 + i}`, dob: new Date(1940 + i, i, 12), phone: "(305) 555-03" + (10 + i),
        addressLine: `${100 + i} Coral Way`, city: "Miami", state: "FL", zip: "33134",
        admittedAt: daysFromNow(-90 - i * 10),
        neededHoursPerWeek: 10 + i * 2, availableDays: "MO,WE,FR",
      },
    });
    patients.push(p);
    await prisma.emergencyContact.create({ data: { patientId: p.id, name: `${first}'s Daughter`, relationship: "Daughter", phone: "(305) 555-09" + (10 + i), isPrimary: true } });
    await prisma.insurancePolicy.create({ data: { patientId: p.id, payerName: payer === "MEDICARE" ? "Medicare Part B" : payer === "MEDICAID" ? "FL Medicaid" : "Humana", payerType: payer, memberId: `M${100000 + i}`, isPrimary: true } });
    await prisma.diagnosis.create({ data: { patientId: p.id, code: "E11.9", description: "Type 2 diabetes mellitus", isPrimary: true } });
    await prisma.diagnosis.create({ data: { patientId: p.id, code: "I10", description: "Essential hypertension" } });
    await prisma.allergy.create({ data: { patientId: p.id, allergen: "Penicillin", reaction: "Hives", severity: "MODERATE" } });
    await prisma.medication.create({ data: { patientId: p.id, name: "Metformin", dosage: "500mg", frequency: "BID", route: "PO", active: true } });
    await prisma.physician.create({ data: { patientId: p.id, name: "Dr. Alan Cohen", specialty: "Primary Care", phone: "(305) 555-0500", isPrimary: true } });

    const cp = await prisma.carePlan.create({ data: { agencyId: agency.id, patientId: p.id, title: "Personal Care Plan", status: "ACTIVE", startDate: p.admittedAt, reviewDate: daysFromNow(30) } });
    await prisma.careGoal.create({ data: { carePlanId: cp.id, description: "Bathing assistance 3x/week", intervention: "HHA assist", status: "IN_PROGRESS", progress: 60 } });
    await prisma.careGoal.create({ data: { carePlanId: cp.id, description: "Medication reminders daily", status: "MET", progress: 100 } });

    await prisma.serviceAuthorization.create({
      data: {
        agencyId: agency.id, patientId: p.id, authNumber: `AUTH-${2000 + i}`, payerType: payer,
        serviceType: "PERSONAL_CARE", approvedHours: 40, usedHours: 12 + i, startDate: p.admittedAt, endDate: daysFromNow(120),
        status: "ACTIVE",
      },
    });
    if (payer === "WAIVER") {
      await prisma.medicaidWaiver.create({ data: { agencyId: agency.id, patientId: p.id, program: "HCBS", authNumber: `WV-${3000 + i}`, approvedHours: 60, usedHours: 20, startDate: p.admittedAt, endDate: daysFromNow(90), status: "ACTIVE" } });
    }
    await prisma.emergencyPlan.create({ data: { patientId: p.id, evacuationPlan: "Family residence (daughter)", backupCaregiver: "Agency on-call", equipmentNeeds: i % 2 ? "Oxygen concentrator" : "None", riskLevel: i % 3 === 0 ? "HIGH" : "LOW" } });
    await prisma.assessment.create({ data: { agencyId: agency.id, patientId: p.id, type: "INITIAL", summary: "Stable, independent with cues.", fallRisk: i % 3 === 0 ? "HIGH" : "LOW", riskScore: 20 + i * 8, performedAt: p.admittedAt, nextDueAt: daysFromNow(45) } });
    await prisma.satisfactionSurvey.create({ data: { agencyId: agency.id, patientId: p.id, respondent: "PATIENT", rating: 4 + (i % 2), comments: "Very caring staff." } });
  }

  // Link portal accounts to a patient so the patient/family portal shows data.
  const patientUser = await prisma.user.findFirst({ where: { agencyId: agency.id, role: "PATIENT" } });
  if (patientUser) await prisma.patient.update({ where: { id: patients[0].id }, data: { userId: patientUser.id } });
  const familyUser = await prisma.user.findFirst({ where: { agencyId: agency.id, role: "FAMILY" } });
  if (familyUser) await prisma.user.update({ where: { id: familyUser.id }, data: { familyPatientId: patients[0].id } });

  // ── Visits (past completed + upcoming) ─────────────────────────────────────
  let visitCount = 0;
  for (let day = -5; day <= 7; day++) {
    for (let n = 0; n < 3; n++) {
      const patient = patients[(visitCount + n) % patients.length];
      const assignCaregiver = !(day >= 1 && n === 2); // leave some future open shifts
      const caregiver = caregivers[(visitCount + n) % caregivers.length];
      const start = daysFromNow(day, 9 + n * 2, 0);
      const end = new Date(start.getTime() + 2 * 3600_000);
      const status = day < 0 ? "COMPLETED" : day === 0 ? "IN_PROGRESS" : assignCaregiver ? "SCHEDULED" : "OPEN";
      const visit = await prisma.visit.create({
        data: {
          agencyId: agency.id, patientId: patient.id,
          caregiverId: assignCaregiver ? caregiver.id : null,
          serviceType: n === 1 ? "SKILLED_NURSING" : "PERSONAL_CARE",
          status, scheduledStart: start, scheduledEnd: end,
          actualStart: day < 0 ? start : null, actualEnd: day < 0 ? end : null,
        },
      });
      if (day < 0) {
        await prisma.evvRecord.create({
          data: {
            visitId: visit.id, checkInAt: start, checkInLat: 25.77, checkInLng: -80.19, checkInMethod: "GPS",
            checkOutAt: end, checkOutLat: 25.77, checkOutLng: -80.19, verification: "VERIFIED", durationMinutes: 120,
          },
        });
        await prisma.visitNote.create({
          data: {
            agencyId: agency.id, visitId: visit.id, patientId: patient.id, type: "PROGRESS",
            subjective: "Patient reports feeling well.", objective: "Vitals stable.", assessment: "No acute changes.",
            plan: "Continue plan of care.", status: "SIGNED", signedAt: end,
          },
        });
      }
      visitCount++;
    }
  }

  // ── Billing / Payroll ──────────────────────────────────────────────────────
  for (let i = 0; i < patients.length; i++) {
    const inv = await prisma.invoice.create({
      data: {
        agencyId: agency.id, patientId: patients[i].id, number: `INV-${5000 + i}`, billType: "PRIVATE",
        status: i % 3 === 0 ? "PAID" : i % 3 === 1 ? "SENT" : "OVERDUE", amount: 480 + i * 60,
        amountPaid: i % 3 === 0 ? 480 + i * 60 : 0, issuedAt: daysFromNow(-20), dueAt: daysFromNow(10),
      },
    });
    await prisma.invoiceLine.create({ data: { invoiceId: inv.id, description: "Personal care visits", quantity: 8, unitPrice: 60, amount: 480 } });
    if (i % 3 === 0) await prisma.payment.create({ data: { agencyId: agency.id, invoiceId: inv.id, amount: 480 + i * 60, method: "CARD", status: "COMPLETED" } });
  }
  await prisma.claim.create({ data: { agencyId: agency.id, patientName: "Robert Garcia", payerType: "MEDICAID", status: "SUBMITTED", amount: 1240, submittedAt: daysFromNow(-7) } });
  await prisma.claim.create({ data: { agencyId: agency.id, patientName: "Margaret Thompson", payerType: "MEDICARE", status: "PAID", amount: 980, amountPaid: 980, submittedAt: daysFromNow(-30) } });

  for (const cg of caregivers) {
    await prisma.payrollEntry.create({
      data: {
        agencyId: agency.id, caregiverId: cg.id, periodStart: daysFromNow(-14), periodEnd: daysFromNow(-1),
        hoursWorked: 64 + Math.floor(Math.random() * 16), overtimeHours: Math.floor(Math.random() * 6),
        mileage: 80 + Math.floor(Math.random() * 60), grossPay: 1200 + Math.floor(Math.random() * 600), status: "APPROVED",
      },
    });
    await prisma.performanceRecord.create({
      data: {
        agencyId: agency.id, caregiverId: cg.id, period: "Q2 2026", attendanceScore: 90, documentationScore: 85,
        satisfactionScore: 92, complianceScore: 95, trainingScore: 88, overallScore: 90,
      },
    });
  }

  // ── HR / Referrals / Incidents / QA / Emergency / AI / Announcements ───────
  await prisma.applicant.create({ data: { agencyId: agency.id, firstName: "Tania", lastName: "Brooks", position: "HHA", stage: "SCREENING", recruiter: "Hana HR", email: "tania@example.com" } });
  await prisma.applicant.create({ data: { agencyId: agency.id, firstName: "Marcus", lastName: "Lee", position: "RN", stage: "DOCUMENTATION", recruiter: "Hana HR" } });

  const src1 = await prisma.referralSource.create({ data: { agencyId: agency.id, name: "Jackson Memorial Hospital", type: "HOSPITAL", contactName: "Discharge Planning", phone: "(305) 555-0700" } });
  const src2 = await prisma.referralSource.create({ data: { agencyId: agency.id, name: "Dr. Alan Cohen", type: "PHYSICIAN", phone: "(305) 555-0500" } });
  await prisma.referral.create({ data: { agencyId: agency.id, sourceId: src1.id, prospectName: "Walter Simmons", stage: "ASSESSMENT_SCHEDULED", estimatedRevenue: 4800, coordinator: "Sam Scheduler" } });
  await prisma.referral.create({ data: { agencyId: agency.id, sourceId: src2.id, prospectName: "Linda Park", stage: "ADMITTED", estimatedRevenue: 6200, admittedAt: daysFromNow(-10) } });

  await prisma.incidentReport.create({ data: { agencyId: agency.id, patientId: patients[0].id, type: "FALL", severity: "MODERATE", description: "Patient slipped in bathroom, no injury.", occurredAt: daysFromNow(-3), status: "INVESTIGATING" } });
  await prisma.incidentReport.create({ data: { agencyId: agency.id, patientId: patients[1].id, type: "MEDICATION_ERROR", severity: "HIGH", description: "Missed evening dose.", occurredAt: daysFromNow(-8), status: "RESOLVED", correctiveAction: "Re-trained caregiver", resolvedAt: daysFromNow(-6) } });

  await prisma.qualityReview.create({ data: { agencyId: agency.id, period: "Q2 2026", complianceScore: 94, satisfactionScore: 91, incidentRate: 1.2, missedVisitRate: 2.5, notes: "On target." } });
  await prisma.emergencyEvent.create({ data: { agencyId: agency.id, type: "HURRICANE", name: "Tropical Storm Watch", status: "MONITORING", startedAt: daysFromNow(-1), notes: "Monitoring 3 high-risk patients." } });

  await prisma.announcement.create({ data: { agencyId: agency.id, title: "Flu shot clinic next week", body: "All caregivers please schedule your annual flu shot by Friday.", priority: "NORMAL" } });
  await prisma.announcement.create({ data: { agencyId: agency.id, title: "Storm preparedness reminder", body: "Review patient emergency plans ahead of the weekend weather.", priority: "EMERGENCY" } });

  await prisma.aiInsight.create({ data: { agencyId: agency.id, module: "COMPLIANCE", title: "2 caregiver CPR certs expiring within 30 days", body: "Carla Mendez and Mei Lin have CPR certifications expiring soon. Schedule renewals to avoid scheduling blocks.", severity: "WARNING", entityType: "AGENCY" } });
  await prisma.aiInsight.create({ data: { agencyId: agency.id, module: "FALL_RISK", title: "Elevated fall risk: Margaret Thompson", body: "Recent assessment indicates HIGH fall risk. Recommend home safety evaluation.", severity: "CRITICAL", entityType: "PATIENT", entityId: patients[0].id } });
  await prisma.aiInsight.create({ data: { agencyId: agency.id, module: "REVENUE_FORECAST", title: "Projected revenue up 8% next month", body: "Based on current referral pipeline and authorized hours.", severity: "INFO" } });

  // ── Workforce / matching / portal demo data ────────────────────────────────
  await prisma.patient.update({ where: { id: patients[0].id }, data: { requiredSkills: "Bathing,Dementia Care", genderPreference: "FEMALE" } });
  await prisma.caregiver.update({ where: { id: caregivers[0].id }, data: { gender: "FEMALE", yearsExperience: 6 } });
  await prisma.caregiver.update({ where: { id: caregivers[1].id }, data: { gender: "MALE", yearsExperience: 9 } });
  await prisma.caregiver.update({ where: { id: caregivers[2].id }, data: { gender: "FEMALE", yearsExperience: 4 } });

  // Link each field-staff demo login to a caregiver record (enables My Shifts +
  // marketplace + EVV). One discipline-specific login per caregiver type.
  const caregiverLinks: [string, number][] = [
    ["rn@curasera.com", 1],        // James Okoro — RN
    ["lpn@curasera.com", 2],       // Mei Lin — LPN
    ["medtech@curasera.com", 3],   // Tom Webb — Med Tech (can administer meds)
    ["hha@curasera.com", 0],       // Carla Mendez — HHA
    ["cna@curasera.com", 4],       // Sofia Reyes — CNA
    ["caregiver@curasera.com", 5], // David Klein — Companion (generic caregiver)
  ];
  for (const [email, idx] of caregiverLinks) {
    const u = await prisma.user.findFirst({ where: { agencyId: agency.id, email } });
    if (u) await prisma.caregiver.update({ where: { id: caregivers[idx].id }, data: { userId: u.id } });
  }

  // Guarantee every linked caregiver has upcoming assigned shifts (so each demo
  // My Shifts has data), respecting scope of practice (RN/LPN → skilled nursing).
  for (let i = 0; i < caregivers.length; i++) {
    const cg = caregivers[i];
    const skilled = cg.discipline === "RN" || cg.discipline === "LPN";
    for (const dayOffset of [0, 2]) {
      const start = daysFromNow(dayOffset, 10 + i, 0);
      const end = new Date(start.getTime() + 2 * 3600_000);
      await prisma.visit.create({
        data: {
          agencyId: agency.id, patientId: patients[i % patients.length].id, caregiverId: cg.id,
          serviceType: skilled ? "SKILLED_NURSING" : "PERSONAL_CARE",
          status: "SCHEDULED",
          scheduledStart: start, scheduledEnd: end,
        },
      });
    }
  }

  // Recurring visit template (expand via Scheduling → "Generate recurring")
  await prisma.visit.create({
    data: {
      agencyId: agency.id, patientId: patients[0].id, caregiverId: caregivers[0].id,
      serviceType: "PERSONAL_CARE", status: "SCHEDULED",
      scheduledStart: daysFromNow(1, 9, 0), scheduledEnd: daysFromNow(1, 11, 0),
      isRecurring: true, recurrenceRule: "WEEKLY:MO,WE,FR",
    },
  });

  // Care tasks (daily task list)
  await prisma.careTask.createMany({
    data: [
      { agencyId: agency.id, patientId: patients[0].id, title: "Assist with bathing", timeOfDay: "MORNING", status: "DONE", completedAt: daysFromNow(0, 9) },
      { agencyId: agency.id, patientId: patients[0].id, title: "Medication reminder", timeOfDay: "AFTERNOON", status: "PENDING" },
      { agencyId: agency.id, patientId: patients[0].id, title: "Evening safety check", timeOfDay: "EVENING", status: "PENDING" },
    ],
  });

  // Medication administration logs (Med Tech)
  await prisma.medicationLog.createMany({
    data: [
      { agencyId: agency.id, patientId: patients[0].id, medicationName: "Metformin 500mg", status: "GIVEN", scheduledAt: daysFromNow(-1, 8), administeredAt: daysFromNow(-1, 8) },
      { agencyId: agency.id, patientId: patients[0].id, medicationName: "Lisinopril 10mg", status: "MISSED", scheduledAt: daysFromNow(-1, 20) },
      { agencyId: agency.id, patientId: patients[1].id, medicationName: "Atorvastatin 20mg", status: "SCHEDULED", scheduledAt: daysFromNow(1, 8) },
    ],
  });

  // Pending portal schedule request + owner notification
  if (patientUser) {
    await prisma.scheduleRequest.create({
      data: {
        agencyId: agency.id, patientId: patients[0].id, requestedById: patientUser.id, requestedByName: patientUser.name,
        type: "RESCHEDULE", message: "Could we move my Friday morning visit to the afternoon?", preferredDate: daysFromNow(5),
      },
    });
    const owner = await prisma.user.findFirst({ where: { agencyId: agency.id, role: "AGENCY_OWNER" } });
    if (owner) {
      await prisma.notification.create({
        data: { agencyId: agency.id, userId: owner.id, kind: "REQUEST", title: "New schedule request", body: "Margaret Thompson: reschedule visit", href: "/dashboard/requests" },
      });
    }
  }

  // Time entries + mileage per caregiver; a PTO request.
  for (const cg of caregivers) {
    await prisma.timeEntry.create({
      data: { agencyId: agency.id, caregiverId: cg.id, entryType: "VISIT", clockIn: daysFromNow(-2, 9), clockOut: daysFromNow(-2, 11), regularHours: 2, status: "APPROVED" },
    });
    await prisma.mileageEntry.create({
      data: { agencyId: agency.id, caregiverId: cg.id, date: daysFromNow(-2), miles: 14 + Math.floor(Math.random() * 20), type: "PATIENT_TO_PATIENT", status: "SUBMITTED" },
    });
  }
  await prisma.ptoRequest.create({
    data: { agencyId: agency.id, caregiverId: caregivers[0].id, type: "VACATION", hours: 16, startDate: daysFromNow(10), endDate: daysFromNow(12), status: "REQUESTED" },
  });

  // Demo employee invitation (Admin > Users & Roles shows it; link below works).
  await prisma.invitation.create({
    data: {
      agencyId: agency.id, email: "newhire@curasera.com", role: "HHA", token: "demo-invite-hha",
      invitedByName: "Aaron Admin", status: "PENDING", expiresAt: daysFromNow(14),
    },
  });

  // ── SECOND AGENCY (white-label demo) ───────────────────────────────────────
  // Same codebase, different DATA → different brand. Visit http://sunrise.localhost:3000
  // (or sunrisecare.localhost) to see Sunrise's blue theme + portal name on login.
  const sunrise = await prisma.agency.create({
    data: {
      name: "Sunrise Care", legalName: "Sunrise Care Services LLC", networkId: network.id,
      email: "hello@sunrisecare.com", phone: "(407) 555-0199",
      addressLine: "55 Orange Ave", city: "Orlando", state: "FL", zip: "32801",
      plan: "STARTER", subscriptionStatus: "active", trialEndsAt: daysFromNow(30),
      slug: "sunrise", portalName: "Sunrise Care Portal",
      primaryColor: "#2563eb", secondaryColor: "#f59e0b",
      supportEmail: "support@sunrisecare.com", supportPhone: "(407) 555-0199",
      pdfFooter: "Sunrise Care — Confidential",
    },
  });
  await prisma.agencyDomain.createMany({
    data: [
      { agencyId: sunrise.id, domain: "sunrise.localhost", isPrimary: true, verified: true },
      { agencyId: sunrise.id, domain: "sunrisecare.localhost", verified: true },
    ],
  });
  const sBranch = await prisma.branch.create({ data: { agencyId: sunrise.id, name: "Orlando Main", city: "Orlando", state: "FL", zip: "32801" } });
  for (const [name, email, role] of [
    ["Sara Sunrise", "owner@sunrisecare.com", "AGENCY_OWNER"],
    ["Steve Scheduler", "scheduler@sunrisecare.com", "SCHEDULER"],
  ] as [string, string, string][]) {
    await prisma.user.create({ data: { agencyId: sunrise.id, branchId: sBranch.id, name, email, role, passwordHash: pw } });
  }
  const sCaregivers = [];
  for (const [first, last, disc] of [["Nora", "Bell", "RN"], ["Hugo", "Diaz", "HHA"]] as [string, string, string][]) {
    sCaregivers.push(await prisma.caregiver.create({
      data: {
        agencyId: sunrise.id, branchId: sBranch.id, firstName: first, lastName: last, discipline: disc,
        status: "ACTIVE", languages: "English", hourlyRate: disc === "RN" ? 39 : 18, city: "Orlando", state: "FL", maxHoursPerWeek: 40,
        skillSet: "Bathing,Mobility", availableDays: "MO,TU,WE,TH,FR",
      },
    }));
  }
  const sPatients = [];
  for (const [first, last] of [["Arthur", "Bishop"], ["Edith", "Cole"]] as [string, string][]) {
    sPatients.push(await prisma.patient.create({
      data: {
        agencyId: sunrise.id, branchId: sBranch.id, firstName: first, lastName: last, status: "ACTIVE",
        addressLine: "12 Lake St", city: "Orlando", state: "FL", zip: "32801", admittedAt: daysFromNow(-40),
        neededHoursPerWeek: 12, availableDays: "TU,TH",
      },
    }));
  }
  for (let i = 0; i < 4; i++) {
    const cg = sCaregivers[i % sCaregivers.length];
    const start = daysFromNow(i, 9 + i, 0);
    await prisma.visit.create({
      data: {
        agencyId: sunrise.id, patientId: sPatients[i % sPatients.length].id, caregiverId: cg.id,
        serviceType: cg.discipline === "RN" ? "SKILLED_NURSING" : "PERSONAL_CARE", status: "SCHEDULED",
        scheduledStart: start, scheduledEnd: new Date(start.getTime() + 2 * 3600_000),
      },
    });
  }

  console.log("Seed complete.");
  console.log("Cura_Sera: owner@curasera.com / password123 (http://localhost:3000)");
  console.log("Sunrise (white-label): owner@sunrisecare.com / password123 (http://sunrise.localhost:3000)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
