import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { shortText, optionalShort, imageRef } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: shortText, legalName: optionalShort, npi: optionalShort, email: optionalShort,
  phone: optionalShort, addressLine: optionalShort, city: optionalShort,
  state: optionalShort, zip: optionalShort, timezone: optionalShort,
  // White-label branding (resolved at runtime by host — see lib/branding.ts).
  // logoUrl/faviconUrl accept an uploaded image as a data: URL (imageRef).
  slug: optionalShort, logoUrl: imageRef, faviconUrl: imageRef,
  primaryColor: optionalShort, secondaryColor: optionalShort, portalName: optionalShort,
  loginBannerUrl: optionalShort, customCss: z.string().trim().max(20000).nullable().optional(),
  supportEmail: optionalShort, supportPhone: optionalShort, emailFromName: optionalShort, pdfFooter: optionalShort,
  // Configuration
  payPeriod: optionalShort, mileageRate: z.coerce.number().min(0).optional(),
}).partial();

// Agency settings + white-label branding (Phase 19/22). Secrets are env-only and
// never settable here. No code changes per agency — only data.
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
    // Normalize the platform subdomain slug (lowercase, url-safe).
    if (typeof clean.slug === "string") {
      const s = clean.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
      if (!s) delete (clean as Record<string, unknown>).slug;
      else clean.slug = s;
    }

    try {
      const updated = await prisma.agency.update({
        where: { id: ctx.agencyId },
        data: clean,
        select: { id: true, name: true, slug: true, portalName: true },
      });
      await logAdmin(ctx, { action: "agency.update", target: ctx.agencyId });
      return json(updated);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw Errors.conflict("That subdomain is already taken — choose another.");
      }
      throw e;
    }
  });
}
