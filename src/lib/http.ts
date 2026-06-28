import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// Typed HTTP error. `handle()` converts these into safe JSON responses and
// never leaks internal messages or stack traces (APP_BLUEPRINT §7).
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "HttpError";
  }
}

export const Errors = {
  unauthorized: (m = "Authentication required") => new HttpError(401, "unauthorized", m),
  forbidden: (m = "You don't have permission to do that") => new HttpError(403, "forbidden", m),
  notFound: (m = "Not found") => new HttpError(404, "not_found", m),
  badRequest: (m = "Bad request") => new HttpError(400, "bad_request", m),
  rateLimited: (m = "Too many requests") => new HttpError(429, "rate_limited", m),
  payment: (m = "Payment required") => new HttpError(402, "payment_required", m),
  conflict: (m = "Conflict") => new HttpError(409, "conflict", m),
};

export function json(data: unknown, status = 200): Response {
  return Response.json(data as object, { status });
}

// Wrap every route handler. Thrown HttpError/ZodError become safe responses;
// anything else becomes a generic 500.
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.code, message: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      return Response.json(
        { error: "validation", issues: err.flatten() },
        { status: 400 },
      );
    }
    // Known Prisma errors → friendly responses instead of a generic 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // Unique constraint violation (duplicate). Name the field(s) when known.
        const target = err.meta?.target;
        const fields = Array.isArray(target) ? target.join(", ") : typeof target === "string" ? target : "";
        return Response.json(
          { error: "conflict", message: fields ? `That ${fields} is already in use.` : "That record already exists." },
          { status: 409 },
        );
      }
      if (err.code === "P2025") {
        return Response.json({ error: "not_found", message: "Not found." }, { status: 404 });
      }
    }
    // Unexpected — log server-side, return generic to the client.
    console.error("[unhandled]", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
