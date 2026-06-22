"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { NavGroup } from "@/lib/nav";
import { Logo } from "./ui";
import {
  HomeIcon, ChartIcon, UserIcon, UsersIcon, CalendarIcon, MapPinIcon,
  ClipboardIcon, ShieldIcon, FileIcon, RouteIcon, BuildingIcon, DollarIcon,
  HeartIcon, ChatIcon, BellIcon, SparkIcon, GearIcon, LogoutIcon, PillIcon, ClockIcon, initialsBadge,
} from "./icon-map";

const ICONS: Record<string, (p: { width?: number; height?: number }) => JSX.Element> = {
  home: HomeIcon, chart: ChartIcon, user: UserIcon, users: UsersIcon,
  calendar: CalendarIcon, mappin: MapPinIcon, clipboard: ClipboardIcon,
  shield: ShieldIcon, file: FileIcon, route: RouteIcon, building: BuildingIcon,
  dollar: DollarIcon, heart: HeartIcon, chat: ChatIcon, bell: BellIcon,
  spark: SparkIcon, gear: GearIcon, pill: PillIcon, clock: ClockIcon,
};

export function Sidebar({
  groups, user, brand,
}: {
  groups: NavGroup[];
  user: { name: string; roleLabel: string; agencyName: string };
  brand?: { name: string; logoUrl: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const logo = <Logo name={brand?.name} logoUrl={brand?.logoUrl ?? null} />;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-surface-200 bg-white px-4 py-3 md:hidden">
        {logo}
        <button className="btn-secondary btn-sm" onClick={() => setOpen((v) => !v)}>Menu</button>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-surface-200 bg-white transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-surface-200 px-4 py-4">
          <Link href="/dashboard" onClick={() => setOpen(false)}>{logo}</Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? HomeIcon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}
                    >
                      <Icon width={18} height={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-surface-200 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initialsBadge(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-surface-900">{user.name}</p>
              <p className="truncate text-xs text-surface-500">{user.roleLabel}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="nav-link mt-1 w-full text-surface-600"
          >
            <LogoutIcon width={18} height={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
