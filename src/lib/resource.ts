import { z } from "zod";
import { prisma } from "./prisma";
import { handle, json, Errors } from "./http";
import { requireUser, requireCapability, type Capability, type Ctx } from "./authz";
import { mutationGuard, RateLimits } from "./rate-limit";
import { logAdmin } from "./audit";

// Generic CRUD factory (APP_BLUEPRINT §6). A config becomes REST handlers that
// are ALWAYS tenant-scoped (IDOR-safe), capability-gated, Zod-validated, and
// audited. Child resources are scoped through their (agency-owned) parent.

type AgencyScope = { mode: "agency" };
type ParentScope = {
  mode: "parent";
  relation: string; // prisma relation field on the child (e.g. "patient")
  fkField: string; // scalar FK in the request body (e.g. "patientId")
  parentDelegate: string; // prisma model key of the parent (e.g. "patient")
};
export type ResourceScope = AgencyScope | ParentScope;

export interface ResourceConfig {
  /** Prisma model key, e.g. "patient". */
  delegate: string;
  /** Rate-limit scope key. */
  rateScope: string;
  readCap: Capability;
  writeCap: Capability;
  schema: z.ZodObject<z.ZodRawShape>;
  scope?: ResourceScope; // default agency
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  /** Optional per-agency row cap (plan limit). */
  limit?: number;
  /** Inject author/creator columns on create. */
  stamp?: (ctx: Ctx) => Record<string, unknown>;
  /** Extra list filters (e.g. hide sensitive rows from limited roles). */
  listWhere?: (ctx: Ctx) => Record<string, unknown>;
  /** Derive computed fields on create/edit. */
  transform?: (data: Record<string, unknown>, ctx: Ctx) => Record<string, unknown>;
  /** Async business-rule guard run before create/update (e.g. service-auth engine). */
  validate?: (data: Record<string, unknown>, ctx: Ctx, mode: "create" | "update") => Promise<void>;
}

type IdParams = { params: { id: string } };

function model(delegate: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[delegate];
}

function baseWhere(cfg: ResourceConfig, ctx: Ctx, extra: Record<string, unknown> = {}) {
  const scope = cfg.scope ?? { mode: "agency" };
  const listWhere = cfg.listWhere?.(ctx) ?? {};
  if (scope.mode === "agency") {
    return { agencyId: ctx.agencyId, ...listWhere, ...extra };
  }
  // parent mode: scope via the parent's agencyId
  return { [scope.relation]: { agencyId: ctx.agencyId }, ...listWhere, ...extra };
}

async function assertParentOwned(scope: ParentScope, ctx: Ctx, data: Record<string, unknown>) {
  const fk = data[scope.fkField];
  if (!fk || typeof fk !== "string") throw Errors.badRequest(`${scope.fkField} is required`);
  const parent = await model(scope.parentDelegate).findFirst({
    where: { id: fk, agencyId: ctx.agencyId },
    select: { id: true },
  });
  if (!parent) throw Errors.notFound("Referenced record not found");
}

// Validate any optional cross-tenant FK present in the body belongs to this agency.
async function assertOptionalFks(cfg: ResourceConfig, ctx: Ctx, data: Record<string, unknown>) {
  const fkToDelegate: Record<string, string> = {
    patientId: "patient",
    caregiverId: "caregiver",
    branchId: "branch",
    sourceId: "referralSource",
    serviceAuthId: "serviceAuthorization",
    invoiceId: "invoice",
  };
  for (const [fk, delegate] of Object.entries(fkToDelegate)) {
    const val = data[fk];
    if (typeof val === "string" && val.length > 0) {
      const found = await model(delegate).findFirst({
        where: { id: val, agencyId: ctx.agencyId },
        select: { id: true },
      });
      if (!found) throw Errors.notFound(`Referenced ${fk} not found`);
    }
  }
}

export function collection(cfg: ResourceConfig) {
  return {
    GET: (req: Request) =>
      handle(async () => {
        const ctx = await requireUser();
        requireCapability(ctx, cfg.readCap);
        const url = new URL(req.url);
        const q = url.searchParams.get("q")?.trim();
        const extra: Record<string, unknown> = {};
        // simple search passthrough if model has firstName/lastName/name
        const where = baseWhere(cfg, ctx, extra);
        let rows = await model(cfg.delegate).findMany({
          where,
          include: cfg.include,
          orderBy: cfg.orderBy ?? { createdAt: "desc" },
          take: 500,
        });
        if (q) {
          const needle = q.toLowerCase();
          rows = rows.filter((r: Record<string, unknown>) =>
            JSON.stringify(r).toLowerCase().includes(needle),
          );
        }
        return json(rows);
      }),

    POST: (req: Request) =>
      handle(async () => {
        const ctx = await requireUser();
        requireCapability(ctx, cfg.writeCap);
        mutationGuard(req, cfg.rateScope, ctx.userId, RateLimits.write);

        const body = await req.json().catch(() => ({}));
        let data = cfg.schema.parse(body) as Record<string, unknown>;

        const scope = cfg.scope ?? { mode: "agency" };
        if (scope.mode === "agency") {
          data.agencyId = ctx.agencyId;
          if (cfg.limit) {
            const count = await model(cfg.delegate).count({ where: { agencyId: ctx.agencyId } });
            if (count >= cfg.limit) throw Errors.payment("Plan limit reached for this resource");
          }
        } else {
          await assertParentOwned(scope, ctx, data);
        }
        await assertOptionalFks(cfg, ctx, data);

        if (cfg.stamp) data = { ...data, ...cfg.stamp(ctx) };
        if (cfg.transform) data = cfg.transform(data, ctx);
        if (cfg.validate) await cfg.validate(data, ctx, "create");

        const created = await model(cfg.delegate).create({ data });
        await logAdmin(ctx, { action: `${cfg.delegate}.create`, target: created.id });
        return json(created, 201);
      }),
  };
}

export function item(cfg: ResourceConfig) {
  async function findOwned(ctx: Ctx, id: string) {
    const row = await model(cfg.delegate).findFirst({ where: baseWhere(cfg, ctx, { id }) });
    if (!row) throw Errors.notFound();
    return row;
  }

  return {
    GET: (_req: Request, { params }: IdParams) =>
      handle(async () => {
        const ctx = await requireUser();
        requireCapability(ctx, cfg.readCap);
        const row = await model(cfg.delegate).findFirst({
          where: baseWhere(cfg, ctx, { id: params.id }),
          include: cfg.include,
        });
        if (!row) throw Errors.notFound();
        return json(row);
      }),

    PATCH: (req: Request, { params }: IdParams) =>
      handle(async () => {
        const ctx = await requireUser();
        requireCapability(ctx, cfg.writeCap);
        mutationGuard(req, cfg.rateScope, ctx.userId, RateLimits.write);
        await findOwned(ctx, params.id);

        const body = await req.json().catch(() => ({}));
        let data = cfg.schema.partial().parse(body) as Record<string, unknown>;
        // never allow re-tenanting via PATCH
        delete data.agencyId;
        await assertOptionalFks(cfg, ctx, data);
        if (cfg.transform) data = cfg.transform(data, ctx);
        if (cfg.validate) await cfg.validate(data, ctx, "update");

        const updated = await model(cfg.delegate).update({ where: { id: params.id }, data });
        await logAdmin(ctx, { action: `${cfg.delegate}.update`, target: params.id });
        return json(updated);
      }),

    DELETE: (req: Request, { params }: IdParams) =>
      handle(async () => {
        const ctx = await requireUser();
        requireCapability(ctx, cfg.writeCap);
        mutationGuard(req, cfg.rateScope, ctx.userId, RateLimits.write);
        await findOwned(ctx, params.id);
        await model(cfg.delegate).delete({ where: { id: params.id } });
        await logAdmin(ctx, { action: `${cfg.delegate}.delete`, target: params.id });
        return json({ ok: true });
      }),
  };
}
