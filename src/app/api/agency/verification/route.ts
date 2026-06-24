import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { agencyVerificationSchema } from "@/lib/validation";
import { lookupNpi } from "@/lib/npi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Agency owner/admin (re)submits authenticity details. NOT verification-gated (so
// a pending/rejected agency can fix and resubmit). Re-runs the NPPES check and
// returns the agency to the PENDING review queue.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "agencyVerification", ctx.userId, RateLimits.write);
    const data = agencyVerificationSchema.parse(await req.json().catch(() => ({})));

    const npi = await lookupNpi(data.npi, data.legalName);
    await prisma.agency.update({
      where: { id: ctx.agencyId },
      data: {
        legalName: data.legalName, npi: data.npi, licenseNumber: data.licenseNumber || null,
        npiVerified: npi.matched, npiLookupResult: npi.summary,
        verificationStatus: "PENDING", verificationNotes: null, verifiedAt: null, verifiedById: null,
      },
    });
    await logAdmin(ctx, { action: "agency.verification.resubmit", target: ctx.agencyId });
    return json({ ok: true, npiSummary: npi.summary });
  });
}
