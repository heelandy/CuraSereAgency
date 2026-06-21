// CSV export with formula-injection neutralization (APP_BLUEPRINT §12):
// prefix cells starting with = + - @ with a single quote so spreadsheets don't
// execute them.

function cell(v: unknown): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return columns ? columns.join(",") + "\n" : "";
  const cols = columns ?? Object.keys(rows[0]);
  const header = cols.map(cell).join(",");
  const body = rows.map((r) => cols.map((c) => cell(r[c])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}
