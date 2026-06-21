import Link from "next/link";
import type { ReactNode } from "react";
import { HeartIcon } from "./icons";

// Presentational, hook-free → usable from server components.

export function Logo({ withText = true, light = false }: { withText?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <HeartIcon width={20} height={20} />
      </span>
      {withText && (
        <span className={`text-lg font-semibold tracking-tight ${light ? "text-white" : "text-surface-900"}`}>
          Cura<span className="text-brand-600">_Sera</span>
        </span>
      )}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionCard({
  title, action, children, className = "",
}: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-surface-100 px-5 py-3.5">
          {typeof title === "string" ? <h3 className="font-semibold text-surface-900">{title}</h3> : title}
          {action}
        </div>
      )}
      <div className="card-pad">{children}</div>
    </div>
  );
}

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONE_CLASS: Record<string, string> = {
  neutral: "badge-neutral",
  green: "badge-green",
  amber: "badge-amber",
  red: "badge-red",
  blue: "badge-blue",
  violet: "badge-violet",
};

export function Badge({ tone = "neutral", children }: { tone?: string; children: ReactNode }) {
  return <span className={TONE_CLASS[tone] ?? "badge-neutral"}>{children}</span>;
}

export function StatCard({
  label, value, hint, icon, tone = "green",
}: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: string }) {
  const chip: Record<string, string> = {
    green: "bg-brand-50 text-brand-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-surface-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-surface-400">{hint}</p>}
        </div>
        {icon && <span className={`icon-chip ${chip[tone] ?? chip.green}`}>{icon}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-300 bg-surface-50 px-6 py-12 text-center">
      {icon && <span className="text-surface-400">{icon}</span>}
      <p className="font-medium text-surface-700">{title}</p>
      {hint && <p className="muted max-w-sm">{hint}</p>}
    </div>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={variant === "primary" ? "btn-primary" : "btn-secondary"}>
      {children}
    </Link>
  );
}
