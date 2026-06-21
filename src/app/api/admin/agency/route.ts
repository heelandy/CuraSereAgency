import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { shortText, optionalShort } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: shortText, legalName: optionalShort, npi: optionalShort, email: optionalShort,
  phone: optionalShort, addressLine: optionalShort, city: optionalShort,
  state: optionalShort, zip: optionalShort, timezone: optionalShort,
}).partial();

// Agency settings (Phase 19/22). Secrets are env-only and never settable here.
export function PATCH(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "agency", ctx.userId, RateLimits.write);
    const data = schema.parse(await req.json().catch(() => ({})));
    // Drop null/undefined so we never null out non-nullable columns.
    const clean: Prisma.AgencyUpdateInput = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && v !== undefined) (clean as Record<string, unknown>)[k] = v;
    }
    const updated = await prisma.agency.update({
      where: { id: ctx.agencyId },
      data: clean,
      select: { id: true, name: true, legalName: true, npi: true, email: true, phone: true, addressLine: true, city: true, state: true, zip: true, timezone: true },
    });
    await logAdmin(ctx, { action: "agency.update", target: ctx.agencyId });
    return json(updated);
  });
}
