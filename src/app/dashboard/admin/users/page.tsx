import { requireCap, GRANTABLE_CAPABILITIES } from "@/lib/authz";
import { CrudResource, type CrudConfig } from "@/components/CrudResource";
import { InviteManager } from "@/components/InviteManager";
import { UserPermissions } from "@/components/UserPermissions";
import { ROLE_LABELS, labelsToOptions } from "@/lib/enums";

export const dynamic = "force-dynamic";

const roleTone: Record<string, string> = {
  AGENCY_OWNER: "green", AGENCY_ADMIN: "green", PLATFORM_OWNER: "violet",
  CLINICAL_DIRECTOR: "blue", NURSE_SUPERVISOR: "blue", AUDITOR: "neutral",
};

const cfg: CrudConfig = {
  title: "Users & Roles",
  singular: "User",
  resource: "users",
  basePath: "/api/admin/users",
  subtitle: "Invite staff and assign role-based access",
  columns: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", type: "badge", badgeMap: roleTone, labelMap: ROLE_LABELS },
    { key: "active", label: "Active", type: "bool" },
    { key: "lastLoginAt", label: "Last login", type: "datetime" },
  ],
  fields: [
    { name: "name", label: "Full name", type: "text", required: true },
    { name: "email", label: "Email", type: "text", required: true },
    { name: "role", label: "Role", type: "select", options: labelsToOptions(ROLE_LABELS), required: true },
    { name: "branchId", label: "Branch", type: "select", optionsResource: "branches", optionLabel: "name" },
    { name: "password", label: "Password (set / reset)", type: "text", placeholder: "Min 8 characters" },
    { name: "active", label: "Active", type: "checkbox", defaultValue: true },
  ],
};

export default async function AdminUsersPage() {
  const ctx = await requireCap("admin:manage");
  const isOwner = ctx.role === "AGENCY_OWNER" || ctx.role === "PLATFORM_OWNER";
  return (
    <div>
      <InviteManager />
      {isOwner && <UserPermissions grantable={GRANTABLE_CAPABILITIES} />}
      <CrudResource {...cfg} />
    </div>
  );
}
