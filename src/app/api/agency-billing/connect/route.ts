import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { config } from "@/lib/config";
import { stripeBillingEnabled } from "@/lib/platform";
import { startOnboarding, refreshConnectStatus, connectAgencySelect } from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Status of THIS agency's Stripe Connect account (for collecting from patients).
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("billing:read");
    const platformEnabled = await stripeBillingEnabled();
    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: connectAgencySelect });
    if (!agency) throw Errors.notFound();

    let chargesEnabled = agency.stripeConnectChargesEnabled;
    let detailsSubmitted = agency.stripeConnectDetailsSubmitted;
    // Re-sync the live readiness from Stripe when possible (e.g. just returned
    // from onboarding); fall back to cached flags if the call fails.
    if (platformEnabled && agency.stripeConnectId) {
      try {
        const s = await refreshConnectStatus(agency);
        chargesEnabled = s.chargesEnabled;
        detailsSubmitted = s.detailsSubmitted;
      } catch { /* keep cached values */ }
    }
    return json({
      platformEnabled,
      connected: Boolean(agency.stripeConnectId),
      chargesEnabled,
      detailsSubmitted,
    });
  });
}

// Start (or resume) hosted Stripe onboarding; returns a URL to redirect to.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("billing:write");
    mutationGuard(req, "connect", ctx.userId, RateLimits.write);
    if (!(await stripeBillingEnabled())) throw Errors.badRequest("Stripe is disabled by the platform administrator.");
    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: connectAgencySelect });
    if (!agency) throw Errors.notFound();
    const url = await startOnboarding(agency, config.nextAuthUrl);
    await logAdmin(ctx, { action: "agency.stripe.connect", target: ctx.agencyId });
    return json({ url });
  });
}
