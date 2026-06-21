export * from "./icons";
import { initials } from "@/lib/format";

export const initialsBadge = (name: string) => initials(name) || "U";
