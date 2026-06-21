import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cura_Sera — Home Health Care Agency OS",
  description:
    "Compassionate care in the comfort of home. The complete operating system for home health care agencies: patients, caregivers, scheduling, EVV, compliance, billing and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
