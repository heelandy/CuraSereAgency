import { headers } from "next/headers";
import { prisma } from "./prisma";

// ── White-label runtime architecture (spec: "customize DATA, not code") ───────
// Tenant + branding are resolved at request time from the host, never hardcoded.
// One codebase → many agencies, each appearing to have its own software.

export type Branding = {
  agencyId: string | null;
  name: string;
  portalName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  customCss: string | null;
  loginBannerUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
};

// Platform default branding — used when no agency resolves from the host.
export const PLATFORM_DEFAULT: Branding = {
  agencyId: null,
  name: "Cura_Sera",
  portalName: "Cura_Sera",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: null,
  secondaryColor: null,
  customCss: null,
  loginBannerUrl: null,
  supportEmail: null,
  supportPhone: null,
};

type AgencyBrandRow = {
  id: string; name: string; portalName: string | null; logoUrl: string | null;
  faviconUrl: string | null; primaryColor: string | null; secondaryColor: string | null;
  customCss: string | null; loginBannerUrl: string | null; supportEmail: string | null; supportPhone: string | null;
};

const BRAND_SELECT = {
  id: true, name: true, portalName: true, logoUrl: true, faviconUrl: true,
  primaryColor: true, secondaryColor: true, customCss: true, loginBannerUrl: true,
  supportEmail: true, supportPhone: true,
} as const;

function toBranding(a: AgencyBrandRow): Branding {
  return {
    agencyId: a.id,
    name: a.name,
    portalName: a.portalName || a.name,
    logoUrl: a.logoUrl,
    faviconUrl: a.faviconUrl,
    primaryColor: a.primaryColor,
    secondaryColor: a.secondaryColor,
    customCss: a.customCss,
    loginBannerUrl: a.loginBannerUrl,
    supportEmail: a.supportEmail,
    supportPhone: a.supportPhone,
  };
}

// Normalize a Host header → lowercase hostname without port.
export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().trim().split(":")[0];
}

// Extract a platform subdomain slug from a host, if any.
// abc.localhost → "abc"; abc.yourplatform.com → "abc" (when root matches).
function subdomainSlug(host: string): string | null {
  if (!host) return null;
  const root = (process.env.PLATFORM_ROOT_DOMAIN ?? "").toLowerCase().trim();
  const parts = host.split(".");
  // <slug>.localhost
  if (parts.length === 2 && parts[1] === "localhost") return parts[0];
  // <slug>.<root> where root may itself contain dots (e.g. yourplatform.com)
  if (root && host.endsWith(`.${root}`)) {
    const sub = host.slice(0, host.length - root.length - 1);
    if (sub && !sub.includes(".")) return sub;
  }
  return null;
}

// Resolve an agency id from the request host: custom domain → platform subdomain.
export async function resolveAgencyIdByHost(host: string): Promise<string | null> {
  const h = normalizeHost(host);
  if (!h) return null;

  // 1. Custom domain (exact match in agency_domains).
  const domain = await prisma.agencyDomain.findUnique({ where: { domain: h }, select: { agencyId: true } });
  if (domain) return domain.agencyId;

  // 2. Platform subdomain (Agency.slug).
  const slug = subdomainSlug(h);
  if (slug) {
    const bySlug = await prisma.agency.findUnique({ where: { slug }, select: { id: true } });
    if (bySlug) return bySlug.id;
  }
  return null;
}

// Branding for an authenticated shell — always the logged-in user's own agency
// (the user is scoped to one tenant; their data + visuals must match).
export async function getAgencyBranding(agencyId: string): Promise<Branding> {
  const a = await prisma.agency.findUnique({ where: { id: agencyId }, select: BRAND_SELECT });
  return a ? toBranding(a) : PLATFORM_DEFAULT;
}

// Branding for a public page (login/signup) — resolved purely from the host
// (custom domain → platform subdomain), falling back to the platform default.
export async function getPublicBranding(): Promise<Branding> {
  const host = headers().get("host");
  const agencyId = await resolveAgencyIdByHost(host ?? "");
  if (agencyId) return getAgencyBranding(agencyId);
  return PLATFORM_DEFAULT;
}

// ── Brand palette generation ──────────────────────────────────────────────────
// Derive a full 50–950 ramp from a single primary hex so every brand-* utility
// re-themes from one color. Returns RGB channel strings ("R G B").
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const mixWhite = (c: number, t: number) => clamp(c + (255 - c) * t);
const mixBlack = (c: number, t: number) => clamp(c * (1 - t));

// shade → mix instruction; positive = lighten toward white, negative = darken.
const RAMP: Record<string, number> = {
  "50": 0.90, "100": 0.80, "200": 0.62, "300": 0.42, "400": 0.22, "500": 0.10,
  "600": 0, "700": -0.14, "800": -0.28, "900": -0.40, "950": -0.58,
};

export function brandScaleChannels(primaryHex: string): Record<string, string> | null {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return null;
  const out: Record<string, string> = {};
  for (const [shade, t] of Object.entries(RAMP)) {
    const ch = rgb.map((c) => (t >= 0 ? mixWhite(c, t) : mixBlack(c, -t)));
    out[shade] = ch.join(" ");
  }
  return out;
}

// Build the :root override CSS for an agency's branding (palette + accent vars).
export function brandingCss(b: Branding): string {
  let css = "";
  const scale = b.primaryColor ? brandScaleChannels(b.primaryColor) : null;
  if (scale) {
    const vars = Object.entries(scale).map(([s, ch]) => `--brand-${s}:${ch};`).join("");
    css += `:root{${vars}}`;
  }
  const accent = b.primaryColor ? `--agency-accent:${b.primaryColor};` : "";
  const accent2 = b.secondaryColor ? `--agency-accent-2:${b.secondaryColor};` : "";
  if (accent || accent2) css += `:root{${accent}${accent2}}`;
  if (b.customCss) css += b.customCss;
  return css;
}
