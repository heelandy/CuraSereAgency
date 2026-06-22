import { brandingCss, type Branding } from "@/lib/branding";

// Injects per-agency branding at runtime: re-themed brand palette (from one
// primary color), accent vars, optional custom CSS, and a per-agency favicon.
// Server component — no client JS. Renders nothing visible.
export function BrandStyle({ branding }: { branding: Branding }) {
  const css = brandingCss(branding);
  return (
    <>
      {branding.faviconUrl && <link rel="icon" href={branding.faviconUrl} />}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
    </>
  );
}
