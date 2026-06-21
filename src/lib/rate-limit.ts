import { Errors } from "./http";

// In-memory fixed-window rate limiter. Swap for Redis in multi-instance prod
// (APP_BLUEPRINT §12). Keyed by `${scope}:${subject}`.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type Limit = { limit: number; windowMs: number };

export const RateLimits = {
  read: { limit: 300, windowMs: 60_000 } as Limit,
  write: { limit: 90, windowMs: 60_000 } as Limit,
  auth: { limit: 12, windowMs: 60_000 } as Limit,
  heavy: { limit: 20, windowMs: 60_000 } as Limit,
};

export function rateLimit(key: string, opts: Limit): { ok: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1 };
  }
  if (b.count >= opts.limit) return { ok: false, remaining: 0 };
  b.count += 1;
  return { ok: true, remaining: opts.limit - b.count };
}

// CSRF: reject cross-origin mutations. We block when an Origin is present and
// its host doesn't match the request host. Missing Origin (server-to-server,
// tests) is allowed — browsers always send Origin on cross-origin requests.
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw Errors.forbidden("Invalid origin");
  }
  if (originHost !== host) throw Errors.forbidden("Cross-origin request blocked");
}

// Combined guard for state-changing routes (APP_BLUEPRINT §7).
export function mutationGuard(req: Request, scope: string, subject: string, limit: Limit): void {
  assertSameOrigin(req);
  const { ok } = rateLimit(`${scope}:${subject}`, limit);
  if (!ok) throw Errors.rateLimited();
}
