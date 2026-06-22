import { requireCap, canMessage, patientAssignmentScoped, isMessagingSupervisor } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { ROLE_LABELS, type Role } from "@/lib/enums";

export const dynamic = "force-dynamic";

// Who the current user is allowed to start a conversation with. Field staff get
// supervisors/schedulers only; office roles get all staff (no portal users).
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("messaging:write");

    const roleCondition = patientAssignmentScoped(ctx.role)
      ? { in: (Object.keys(ROLE_LABELS) as Role[]).filter(isMessagingSupervisor) }
      : { notIn: ["PATIENT", "FAMILY"] as Role[] };

    const users = await prisma.user.findMany({
      where: {
        agencyId: ctx.agencyId, active: true, id: { not: ctx.userId },
        role: roleCondition,
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    const recipients = users
      .filter((u) => canMessage(ctx.role, u.role as Role))
      .map((u) => ({ id: u.id, name: u.name, roleLabel: ROLE_LABELS[u.role as Role] ?? u.role }));
    return json(recipients);
  });
}
