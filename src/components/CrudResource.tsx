"use client";

import { useCallbackRef } from "./use-callback-ref";
import { useEffect, useMemo, useState } from "react";
import { PlusIcon, SearchIcon } from "./icons";
import { fmtDate, fmtDateTime, fmtMoney, fullName as fmtFullName } from "@/lib/format";

// ── Declarative defs (plain data → serializable from server pages) ────────────
export type Column = {
  key: string;
  label: string;
  accessor?: string;
  type?: "text" | "badge" | "date" | "datetime" | "money" | "bool" | "fullName" | "number";
  badgeMap?: Record<string, string>;
  labelMap?: Record<string, string>;
};

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "datetime" | "number" | "money" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  optionsResource?: string;
  optionLabel?: "fullName" | "name" | "title" | "prospectName";
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  defaultValue?: string | number | boolean;
};

export type CrudConfig = {
  title: string;
  singular: string;
  resource: string;
  columns: Column[];
  fields: Field[];
  subtitle?: string;
  readOnly?: boolean;
  /** When false, rows can be added/edited but never deleted (e.g. clinical notes). */
  deletable?: boolean;
  /** Hidden fixed values merged into every create (e.g. patientId on a detail page). */
  fixed?: Record<string, string>;
  /** Render compact (no page header) — used when embedded in a detail page. */
  embedded?: boolean;
  /** If set, each row shows a "View" link to `${detailBase}/${row.id}`. */
  detailBase?: string;
  /** Override the API base path (defaults to `/api/r/<resource>`). */
  basePath?: string;
};

type Row = Record<string, any>;

const PAGE_SIZE = 25;

function getPath(obj: Row, path: string): any {
  if (!path) return obj; // accessor:"" → the whole row (e.g. fullName columns)
  return path.split(".").reduce<any>((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function toDateInput(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
function toDateTimeInput(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function renderCell(col: Column, row: Row) {
  const raw = getPath(row, col.accessor ?? col.key);
  switch (col.type) {
    case "badge": {
      const tone = col.badgeMap?.[raw] ?? "neutral";
      const label = col.labelMap?.[raw] ?? raw ?? "—";
      const cls: Record<string, string> = {
        neutral: "badge-neutral", green: "badge-green", amber: "badge-amber",
        red: "badge-red", blue: "badge-blue", violet: "badge-violet",
      };
      return <span className={cls[tone] ?? "badge-neutral"}>{label}</span>;
    }
    case "date": return <>{fmtDate(raw)}</>;
    case "datetime": return <>{fmtDateTime(raw)}</>;
    case "money": return <>{fmtMoney(raw)}</>;
    case "bool": return <>{raw ? "Yes" : "No"}</>;
    case "number": return <>{raw ?? 0}</>;
    case "fullName": return <>{fmtFullName(raw)}</>;
    default: {
      if (col.labelMap && raw != null) return <>{col.labelMap[raw] ?? raw}</>;
      return <>{raw == null || raw === "" ? "—" : String(raw)}</>;
    }
  }
}

export function CrudResource(cfg: CrudConfig) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [optionMap, setOptionMap] = useState<Record<string, { value: string; label: string }[]>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const base = cfg.basePath ?? `/api/r/${cfg.resource}`;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fields = useMemo(
    () => cfg.fields.filter((f) => !cfg.fixed || !(f.name in cfg.fixed)),
    [cfg.fields, cfg.fixed],
  );

  const load = useCallbackRef(async () => {
    setLoading(true);
    setError(null);
    try {
      // Server-side pagination + search + child-list (fixed FK) filtering.
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (q) params.set("q", q);
      if (cfg.fixed) for (const [k, v] of Object.entries(cfg.fixed)) params.set(k, v);
      const res = await fetch(`${base}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data: Row[] = await res.json();
      setRows(data);
      setTotal(Number(res.headers.get("X-Total-Count") ?? data.length));
    } catch (e) {
      setError("Could not load data.");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  async function openModal(row: Row | null) {
    setEditing(row);
    const initial: Record<string, any> = {};
    for (const f of fields) {
      const current = row ? getPath(row, f.name) : f.defaultValue;
      if (f.type === "date") initial[f.name] = toDateInput(current);
      else if (f.type === "datetime") initial[f.name] = toDateTimeInput(current);
      else if (f.type === "checkbox") initial[f.name] = Boolean(current);
      else initial[f.name] = current ?? "";
    }
    setForm(initial);
    setModalOpen(true);
    // fetch select options
    const toFetch = fields.filter((f) => f.optionsResource && !optionMap[f.optionsResource]);
    for (const f of toFetch) {
      try {
        const res = await fetch(`/api/r/${f.optionsResource}`);
        if (!res.ok) continue;
        const items: Row[] = await res.json();
        const opts = items.map((it) => ({
          value: it.id as string,
          label:
            f.optionLabel === "fullName" ? `${it.firstName ?? ""} ${it.lastName ?? ""}`.trim()
            : f.optionLabel === "title" ? (it.title as string)
            : f.optionLabel === "prospectName" ? (it.prospectName as string)
            : (it.name ?? it.title ?? it.number ?? it.id) as string,
        }));
        setOptionMap((m) => ({ ...m, [f.optionsResource!]: opts }));
      } catch { /* ignore */ }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, any> = { ...form, ...(cfg.fixed ?? {}) };
      // On create, drop blank fields so Zod defaults (e.g. status enums) apply
      // instead of failing on "". On edit we keep "" so values can be cleared.
      if (!editing) {
        for (const k of Object.keys(body)) if (body[k] === "") delete body[k];
      }
      const url = editing ? `${base}/${editing.id}` : base;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || j.error || "Save failed");
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!confirm(`Delete this ${cfg.singular.toLowerCase()}?`)) return;
    const res = await fetch(`${base}/${row.id}`, { method: "DELETE" });
    if (res.ok) await load();
    else setError("Delete failed");
  }

  return (
    <div>
      {!cfg.embedded && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">{cfg.title}</h1>
            {cfg.subtitle && <p className="muted mt-1">{cfg.subtitle}</p>}
          </div>
          {!cfg.readOnly && (
            <button className="btn-primary" onClick={() => openModal(null)}>
              <PlusIcon width={16} /> Add {cfg.singular}
            </button>
          )}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between gap-3 border-b border-surface-100 p-3">
          <div className="relative max-w-xs flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
              <SearchIcon width={16} />
            </span>
            <input
              className="input pl-9"
              placeholder={`Search ${cfg.title.toLowerCase()}…`}
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          {cfg.embedded && !cfg.readOnly && (
            <button className="btn-primary btn-sm" onClick={() => openModal(null)}>
              <PlusIcon width={14} /> Add {cfg.singular}
            </button>
          )}
          <span className="muted whitespace-nowrap">{total} record{total === 1 ? "" : "s"}</span>
        </div>

        {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {cfg.columns.map((c) => <th key={c.key}>{c.label}</th>)}
                {(!cfg.readOnly || cfg.detailBase) && <th className="w-px text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cfg.columns.length + 1} className="py-8 text-center text-surface-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={cfg.columns.length + 1} className="py-10 text-center text-surface-400">No records yet.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    {cfg.columns.map((c) => <td key={c.key}>{renderCell(c, row)}</td>)}
                    {(!cfg.readOnly || cfg.detailBase) && (
                      <td className="whitespace-nowrap text-right">
                        {cfg.detailBase && (
                          <a className="btn-ghost btn-sm text-brand-600" href={`${cfg.detailBase}/${row.id}`}>View</a>
                        )}
                        {!cfg.readOnly && (
                          <>
                            <button className="btn-ghost btn-sm" onClick={() => openModal(row)}>Edit</button>
                            {cfg.deletable !== false && (
                              <button className="btn-ghost btn-sm text-red-600" onClick={() => remove(row)}>Delete</button>
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
          <div className="card my-8 w-full max-w-2xl">
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-3.5">
              <h3 className="font-semibold">{editing ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}</h3>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <form onSubmit={submit} className="card-pad">
              {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((f) => {
                  const opts = f.options ?? (f.optionsResource ? optionMap[f.optionsResource] ?? [] : []);
                  return (
                    <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
                      <label className="label" htmlFor={f.name}>
                        {f.label}{f.required && <span className="text-red-500"> *</span>}
                      </label>
                      {f.type === "textarea" ? (
                        <textarea id={f.name} className="textarea" value={form[f.name] ?? ""} required={f.required}
                          placeholder={f.placeholder}
                          onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} />
                      ) : f.type === "select" ? (
                        <select id={f.name} className="select" value={form[f.name] ?? ""} required={f.required}
                          onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}>
                          <option value="">— select —</option>
                          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : f.type === "checkbox" ? (
                        <label className="flex items-center gap-2 pt-1">
                          <input type="checkbox" checked={Boolean(form[f.name])}
                            onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.checked }))} />
                          <span className="text-sm text-surface-600">Yes</span>
                        </label>
                      ) : (
                        <input id={f.name}
                          type={f.type === "money" || f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"}
                          step={f.type === "money" ? "0.01" : undefined}
                          className="input" value={form[f.name] ?? ""} required={f.required}
                          placeholder={f.placeholder}
                          onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : `Create ${cfg.singular}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
