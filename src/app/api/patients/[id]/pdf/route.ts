import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildReportPdf } from "@/lib/pdf";
import { handle, Errors } from "@/lib/http";
import { fullName, fmtDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("patients:read");
    const p = await prisma.patient.findFirst({
      where: { id: params.id, agencyId: ctx.agencyId },
      include: {
        diagnoses: true, allergies: true, medications: true,
        emergencyContacts: true, physicians: true, insurancePolicies: true,
        carePlans: { include: { goals: true } },
      },
    });
    if (!p) throw Errors.notFound();

    const pdf = buildReportPdf({
      title: `Patient Summary — ${fullName(p)}`,
      subtitle: p.mrn ? `MRN ${p.mrn}` : undefined,
      meta: {
        Status: p.status,
        "Date of birth": fmtDate(p.dob),
        Phone: p.phone ?? "—",
        Address: [p.addressLine, p.city, p.state, p.zip].filter(Boolean).join(", ") || "—",
      },
      sections: [
        { heading: "Diagnoses", lines: p.diagnoses.length ? p.diagnoses.map((d) => `- ${d.code ? `[${d.code}] ` : ""}${d.description}${d.isPrimary ? " (primary)" : ""}`) : ["None recorded"] },
        { heading: "Allergies", lines: p.allergies.length ? p.allergies.map((a) => `- ${a.allergen}${a.reaction ? ` — ${a.reaction}` : ""}`) : ["None recorded"] },
        { heading: "Medications", lines: p.medications.length ? p.medications.map((m) => `- ${m.name} ${m.dosage ?? ""} ${m.frequency ?? ""}`.trim()) : ["None recorded"] },
        { heading: "Physicians", lines: p.physicians.length ? p.physicians.map((d) => `- ${d.name}${d.specialty ? ` (${d.specialty})` : ""}`) : ["None recorded"] },
        { heading: "Emergency Contacts", lines: p.emergencyContacts.length ? p.emergencyContacts.map((c) => `- ${c.name}${c.relationship ? ` (${c.relationship})` : ""} ${c.phone ?? ""}`.trim()) : ["None recorded"] },
        { heading: "Care Plan Goals", lines: p.carePlans.flatMap((cp) => cp.goals.map((g) => `- ${g.description} [${g.status}, ${g.progress}%]`)).length ? p.carePlans.flatMap((cp) => cp.goals.map((g) => `- ${g.description} [${g.status}, ${g.progress}%]`)) : ["None recorded"] },
      ],
    });

    return new Response(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="patient-${p.id}.pdf"`,
      },
    });
  });
}
