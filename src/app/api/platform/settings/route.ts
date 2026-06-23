import { z } from "zod";
import { requireCap } from "@/lib/authz";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { stripeEnabled } from "@/lib/config";
import { STRIPE_BILLING_KEY, stripeBillingFlag, setPlatformFlag } from "@/lib/platform";

export const dynamic = "force-dynamic";

const schema = z.object({ stripeBillingEnabled: z.boolean() });

// Platform super-admin: read/toggle global platform switches.
// `configured` = Stripe keys present in the environment (cannot be changed here);
// `stripeBillingEnabled` = the super-admin kill switch (default on).
export function GET() {
  return handle(async () => {
    await requireCap("platform:manage");
    return json({ stripeConfigured: stripeEnabled, stripeBillingEnabled: await stripeBillingFlag() });
  });
}

export function PATCH(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("platform:manage");
    mutationGuard(req, "platformSettings", ctx.userId, RateLimits.write);
    const { stripeBillingEnabled: enabled } = schema.parse(await req.json().catch(() => ({})));

    await setPlatformFlag(STRIPE_BILLING_KEY, enabled);
    await logAdmin(ctx, { action: "platform.settings.update", target: STRIPE_BILLING_KEY, newValue: String(enabled) });
    return json({ stripeConfigured: stripeEnabled, stripeBillingEnabled: enabled });
  });
}
