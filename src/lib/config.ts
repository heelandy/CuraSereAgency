// Central config. Resolve from env with sane fallbacks. Secrets are env-only
// and never returned to clients (APP_BLUEPRINT §12).

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  appName: env("APP_NAME", "Cura_Sera"),
  nextAuthSecret: env("NEXTAUTH_SECRET", "dev-insecure-secret"),
  nextAuthUrl: env("NEXTAUTH_URL", "http://localhost:3000"),
  mail: {
    // Resend transactional email. Set RESEND_API_KEY + MAIL_FROM in prod.
    resendApiKey: env("RESEND_API_KEY"),
    from: env("MAIL_FROM", "Cura_Sera <onboarding@resend.dev>"),
  },
  stripe: {
    secretKey: env("STRIPE_SECRET_KEY"),
    webhookSecret: env("STRIPE_WEBHOOK_SECRET"),
    prices: {
      STARTER: env("STRIPE_PRICE_STARTER"),
      PROFESSIONAL: env("STRIPE_PRICE_PROFESSIONAL"),
      GROWTH: env("STRIPE_PRICE_GROWTH"),
      ENTERPRISE: env("STRIPE_PRICE_ENTERPRISE"),
    },
  },
  isProd: process.env.NODE_ENV === "production",
};

export const stripeEnabled = Boolean(config.stripe.secretKey);
