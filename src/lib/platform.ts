// Platform-owner (super-admin) global switches. These live in PlatformSetting
// (a non-tenant key/value table) so the platform owner can flip them at runtime
// without redeploying. Booleans are stored as the strings "true"/"false".
import { prisma } from "./prisma";
import { stripeEnabled } from "./config";

// Stripe billing kill switch. Default ON: existing platforms keep working until
// the super-admin explicitly disables it.
export const STRIPE_BILLING_KEY = "stripeBillingEnabled";

export async function getPlatformFlag(key: string, fallback: boolean): Promise<boolean> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value === "true";
}

export async function setPlatformFlag(key: string, value: boolean): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: String(value) },
    update: { value: String(value) },
  });
}

// Raw super-admin toggle (independent of whether keys exist in the environment).
export function stripeBillingFlag(): Promise<boolean> {
  return getPlatformFlag(STRIPE_BILLING_KEY, true);
}

// Effective state used by checkout/billing/integrations: Stripe is usable only
// when it's configured in the environment AND the super-admin hasn't disabled it.
export async function stripeBillingEnabled(): Promise<boolean> {
  if (!stripeEnabled) return false;
  return stripeBillingFlag();
}
