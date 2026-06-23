import type Stripe from "stripe";
import { stripe } from "./stripe";
import { prisma } from "./prisma";
import { Errors } from "./http";

// ── Stripe Connect: each AGENCY collects payments from its OWN patients via its
// OWN Stripe account. We are the Connect *platform* (Standard accounts, direct
// charges); we take no application fee — the agency receives the full amount.
// All money-moving calls run "on behalf of" the connected account via the
// { stripeAccount } request option. Account create/retrieve/link are
// platform-level calls (no stripeAccount).

type Agency = {
  id: string;
  name: string;
  email: string | null;
  stripeConnectId: string | null;
  stripeConnectChargesEnabled: boolean;
  stripeConnectDetailsSubmitted: boolean;
};

// Prisma select that yields exactly the Agency shape the helpers above need.
export const connectAgencySelect = {
  id: true, name: true, email: true,
  stripeConnectId: true, stripeConnectChargesEnabled: true, stripeConnectDetailsSubmitted: true,
} as const;

// Narrow the lazily-configured client to non-null, or fail with a clear message.
export function requireStripe(): Stripe {
  if (!stripe) throw Errors.badRequest("Stripe is not configured on this platform.");
  return stripe;
}

// The connected account is ready to accept charges.
export function connectReady(a: Pick<Agency, "stripeConnectId" | "stripeConnectChargesEnabled">): boolean {
  return Boolean(a.stripeConnectId && a.stripeConnectChargesEnabled);
}

function requireConnectedAccount(a: Agency): string {
  if (!a.stripeConnectId || !a.stripeConnectChargesEnabled) {
    throw Errors.badRequest("This agency hasn't finished connecting Stripe yet.");
  }
  return a.stripeConnectId;
}

const cents = (dollars: number) => Math.round(dollars * 100);

// ── Onboarding ────────────────────────────────────────────────────────────────
// Create the connected account on first use, then return a hosted onboarding URL.
export async function startOnboarding(agency: Agency, baseUrl: string): Promise<string> {
  const s = requireStripe();
  let accountId = agency.stripeConnectId;
  if (!accountId) {
    const account = await s.accounts.create({
      type: "standard",
      email: agency.email ?? undefined,
      metadata: { agencyId: agency.id },
    });
    accountId = account.id;
    await prisma.agency.update({ where: { id: agency.id }, data: { stripeConnectId: accountId } });
  }
  const link = await s.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/dashboard/admin/payments?connect=refresh`,
    return_url: `${baseUrl}/dashboard/admin/payments?connect=return`,
    type: "account_onboarding",
  });
  return link.url;
}

// Pull the live account state from Stripe and persist the readiness flags.
export async function refreshConnectStatus(agency: Agency): Promise<{
  connected: boolean; chargesEnabled: boolean; detailsSubmitted: boolean;
}> {
  if (!agency.stripeConnectId) return { connected: false, chargesEnabled: false, detailsSubmitted: false };
  const s = requireStripe();
  const acct = await s.accounts.retrieve(agency.stripeConnectId);
  const chargesEnabled = Boolean(acct.charges_enabled);
  const detailsSubmitted = Boolean(acct.details_submitted);
  await prisma.agency.update({
    where: { id: agency.id },
    data: { stripeConnectChargesEnabled: chargesEnabled, stripeConnectDetailsSubmitted: detailsSubmitted },
  });
  return { connected: true, chargesEnabled, detailsSubmitted };
}

// ── One-time payments (invoices + ad-hoc) ────────────────────────────────────
// A reusable hosted Payment Link on the agency's account. Metadata flows to the
// resulting Checkout Session + PaymentIntent so the webhook can reconcile.
async function createPaymentLink(
  agency: Agency,
  args: { amount: number; productName: string; metadata: Record<string, string> },
): Promise<string> {
  const s = requireStripe();
  const stripeAccount = requireConnectedAccount(agency);
  if (args.amount <= 0) throw Errors.badRequest("Amount must be greater than zero.");

  const price = await s.prices.create(
    { currency: "usd", unit_amount: cents(args.amount), product_data: { name: args.productName } },
    { stripeAccount },
  );
  const link = await s.paymentLinks.create(
    {
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: args.metadata,
      payment_intent_data: { metadata: args.metadata },
      after_completion: { type: "hosted_confirmation" },
    },
    { stripeAccount },
  );
  return link.url;
}

// Build (or rebuild) a payment link for an invoice's outstanding balance and
// store it on the invoice.
export async function createInvoicePaymentLink(
  agency: Agency,
  invoice: { id: string; number: string | null; amount: number; amountPaid: number },
): Promise<string> {
  const outstanding = invoice.amount - invoice.amountPaid;
  if (outstanding <= 0) throw Errors.badRequest("This invoice has no outstanding balance.");
  const url = await createPaymentLink(agency, {
    amount: outstanding,
    productName: `Invoice ${invoice.number ?? invoice.id} — ${agency.name}`,
    metadata: { kind: "invoice", agencyId: agency.id, invoiceId: invoice.id },
  });
  const link = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripePaymentLinkUrl: url },
    select: { stripePaymentLinkUrl: true },
  });
  return link.stripePaymentLinkUrl ?? url;
}

export async function createOneOffPaymentLink(
  agency: Agency,
  args: { amount: number; description: string },
): Promise<string> {
  return createPaymentLink(agency, {
    amount: args.amount,
    productName: args.description,
    metadata: { kind: "oneoff", agencyId: agency.id, description: args.description.slice(0, 200) },
  });
}

// ── Recurring (subscriptions) ────────────────────────────────────────────────
// A subscription Checkout Session on the agency's account that captures the
// patient's card and starts auto-billing. The webhook flips the plan to ACTIVE.
export async function createRecurringCheckout(
  agency: Agency,
  plan: { id: string; description: string; amount: number; interval: string },
  baseUrl: string,
): Promise<string> {
  const s = requireStripe();
  const stripeAccount = requireConnectedAccount(agency);
  if (plan.amount <= 0) throw Errors.badRequest("Amount must be greater than zero.");
  const interval = plan.interval === "week" ? "week" : "month";

  const price = await s.prices.create(
    {
      currency: "usd",
      unit_amount: cents(plan.amount),
      recurring: { interval },
      product_data: { name: plan.description },
    },
    { stripeAccount },
  );
  const session = await s.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/admin/payments?status=recurring_success`,
      cancel_url: `${baseUrl}/dashboard/admin/payments?status=cancel`,
      metadata: { kind: "recurring", agencyId: agency.id, recurringPlanId: plan.id },
      subscription_data: { metadata: { kind: "recurring", agencyId: agency.id, recurringPlanId: plan.id } },
    },
    { stripeAccount },
  );
  if (!session.url) throw Errors.badRequest("Could not start recurring checkout.");
  await prisma.recurringPlan.update({ where: { id: plan.id }, data: { stripeCheckoutUrl: session.url } });
  return session.url;
}
