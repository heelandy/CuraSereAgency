import type { SVGProps } from "react";

// Minimal stroke icon set (no icon dependency, no emoji in UI).
type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const HeartIcon = (p: P) => (
  <svg {...base(p)}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
);
export const HomeIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></svg>
);
export const UsersIcon = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6" /><path d="M21 20a5.5 5.5 0 0 0-4-5.3" /></svg>
);
export const UserIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
);
export const CalendarIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
);
export const ClipboardIcon = (p: P) => (
  <svg {...base(p)}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h6M9 18h4" /></svg>
);
export const ShieldIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const PillIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" /><path d="m8.5 8.5 7 7" /></svg>
);
export const DollarIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 2v20" /><path d="M17 6.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3" /></svg>
);
export const ChartIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 4v16h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>
);
export const MapPinIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const ChatIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9h8M8 12h5" /></svg>
);
export const BellIcon = (p: P) => (
  <svg {...base(p)}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const FileIcon = (p: P) => (
  <svg {...base(p)}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h6M10 17h6" /></svg>
);
export const SparkIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
);
export const GearIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
);
export const StethoscopeIcon = (p: P) => (
  <svg {...base(p)}><path d="M5 3v5a4 4 0 0 0 8 0V3" /><path d="M9 16a5 5 0 0 0 10 0v-2" /><circle cx="19" cy="11" r="2" /></svg>
);
export const HandHeartIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 7.5a2.4 2.4 0 0 1 3.4 3.4L12 14l-3.4-3.1A2.4 2.4 0 0 1 12 7.5Z" /><path d="M3 14l4 4 5 1 8-3" /><path d="M3 14v6" /></svg>
);
export const ClockIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}><path d="m5 12 4 4L19 6" /></svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const SearchIcon = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const LogoutIcon = (p: P) => (
  <svg {...base(p)}><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 12H3M6 8l-3 4 3 4" /></svg>
);
export const RouteIcon = (p: P) => (
  <svg {...base(p)}><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 17.5 15 9c1.5-2 3-2 3-2" /><path d="M6 15.5V12a3 3 0 0 1 3-3h2" /></svg>
);
export const BuildingIcon = (p: P) => (
  <svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" /></svg>
);
