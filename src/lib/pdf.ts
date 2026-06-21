// Zero-dependency text PDF generator (APP_BLUEPRINT §10). Builds a simple,
// paginated, word-wrapped Helvetica document with dynamically-computed xref
// offsets and ASCII sanitization. No heavy library.

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const FONT_SIZE = 11;
const LEADING = 15;
const MAX_CHARS = 92;

function sanitize(s: string): string {
  return s
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(line: string, max = MAX_CHARS): string[] {
  if (line.length <= max) return [line];
  const words = line.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > max) {
      if (cur) out.push(cur);
      if (w.length > max) {
        // hard-break very long tokens
        let rest = w;
        while (rest.length > max) {
          out.push(rest.slice(0, max));
          rest = rest.slice(max);
        }
        cur = rest;
      } else {
        cur = w;
      }
    } else {
      cur = candidate;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

export function buildTextPdf(rawLines: string[]): Uint8Array {
  const linesPerPage = Math.floor((PAGE_H - 2 * MARGIN) / LEADING);

  const wrapped: string[] = [];
  for (const l of rawLines) for (const w of wrap(l)) wrapped.push(w);
  if (wrapped.length === 0) wrapped.push("");

  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += linesPerPage) {
    pages.push(wrapped.slice(i, i + linesPerPage));
  }

  const offsets: number[] = [];
  let pdf = "%PDF-1.4\n";
  const addObj = (num: number, body: string) => {
    offsets[num] = pdf.length;
    pdf += `${num} 0 obj\n${body}\nendobj\n`;
  };

  // Object plan: 1 Catalog, 2 Pages, 3 Font, then per page (pageObj, contentObj).
  const pageNums = pages.map((_, i) => 4 + i * 2);
  const kids = pageNums.map((n) => `${n} 0 R`).join(" ");

  addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObj(2, `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`);
  addObj(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageLines, i) => {
    const pageNum = 4 + i * 2;
    const contentNum = pageNum + 1;
    const yTop = PAGE_H - MARGIN;
    let stream = `BT\n/F1 ${FONT_SIZE} Tf\n${MARGIN} ${yTop} Td\n${LEADING} TL\n`;
    for (const line of pageLines) {
      stream += `(${sanitize(line)}) Tj T*\n`;
    }
    stream += "ET";

    addObj(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`,
    );
    addObj(contentNum, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  const maxObj = 3 + pages.length * 2;
  const xrefOffset = pdf.length;
  let xref = `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxObj; n++) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += xref;
  pdf += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

// Domain helper: a titled report with key/value header + body lines.
export function buildReportPdf(opts: {
  title: string;
  subtitle?: string;
  meta?: Record<string, string>;
  sections?: { heading: string; lines: string[] }[];
}): Uint8Array {
  const lines: string[] = [];
  lines.push(opts.title.toUpperCase());
  if (opts.subtitle) lines.push(opts.subtitle);
  lines.push("=".repeat(60));
  if (opts.meta) {
    for (const [k, v] of Object.entries(opts.meta)) lines.push(`${k}: ${v}`);
    lines.push("");
  }
  for (const section of opts.sections ?? []) {
    lines.push("");
    lines.push(section.heading.toUpperCase());
    lines.push("-".repeat(40));
    for (const l of section.lines) lines.push(l);
  }
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()} — Cura_Sera HHCOS`);
  return buildTextPdf(lines);
}
