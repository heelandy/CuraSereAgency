// NPI authenticity check against the national NPPES registry (CMS public API —
// free, no key). Used to auto-validate a new agency's NPI at signup; the result
// informs the platform owner's manual review (it never auto-approves).

export type NpiLookup = {
  found: boolean;
  organizationName: string | null;
  enumerationType: string | null; // "NPI-1" individual | "NPI-2" organization
  status: string | null; // "A" active, "I" inactive
  matched: boolean; // org NPI found, active, and name reconciles with legalName
  summary: string; // human-readable line for the reviewer
};

const NPI_RE = /^\d{10}$/;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function fail(summary: string): NpiLookup {
  return { found: false, organizationName: null, enumerationType: null, status: null, matched: false, summary };
}

export async function lookupNpi(npi: string, legalName?: string): Promise<NpiLookup> {
  const clean = (npi ?? "").trim();
  if (!NPI_RE.test(clean)) return fail("Invalid NPI format (must be 10 digits).");

  try {
    const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${clean}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return fail(`NPPES lookup failed (HTTP ${res.status}).`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const r = data?.results?.[0];
    if (!data?.result_count || !r) return fail("No NPPES record found for this NPI.");

    const enumerationType: string | null = r.enumeration_type ?? null;
    const organizationName: string | null = r.basic?.organization_name ?? r.basic?.name ?? null;
    const status: string | null = r.basic?.status ?? null;

    const isOrg = enumerationType === "NPI-2";
    const active = (status ?? "A") !== "I";
    let nameMatch = true;
    if (legalName && organizationName) {
      const a = norm(legalName);
      const b = norm(organizationName);
      nameMatch = a.length > 0 && (b.includes(a) || a.includes(b));
    }
    const matched = isOrg && active && nameMatch;
    const summary = `NPPES: ${organizationName ?? "—"} (${enumerationType ?? "?"}${status ? `, status ${status}` : ""})`
      + (legalName ? (nameMatch ? " · name matches" : " · name MISMATCH") : "")
      + (isOrg ? "" : " · not an organization NPI");
    return { found: true, organizationName, enumerationType, status, matched, summary };
  } catch {
    return fail("NPPES lookup unavailable (network error) — verify manually.");
  }
}
