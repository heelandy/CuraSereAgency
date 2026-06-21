import { resources, type ResourceKey } from "@/lib/resources";
import { item } from "@/lib/resource";
import { handle, Errors } from "@/lib/http";

// Dynamic item dispatcher. /api/r/<resource>/<id> → GET / PATCH / DELETE.

type Params = { params: { resource: string; id: string } };

function handlersOf(resource: string) {
  const cfg = resources[resource as ResourceKey];
  if (!cfg) return null;
  return item(cfg);
}

export function GET(req: Request, { params }: Params) {
  const h = handlersOf(params.resource);
  if (!h) return handle(async () => { throw Errors.notFound("Unknown resource"); });
  return h.GET(req, { params: { id: params.id } });
}

export function PATCH(req: Request, { params }: Params) {
  const h = handlersOf(params.resource);
  if (!h) return handle(async () => { throw Errors.notFound("Unknown resource"); });
  return h.PATCH(req, { params: { id: params.id } });
}

export function DELETE(req: Request, { params }: Params) {
  const h = handlersOf(params.resource);
  if (!h) return handle(async () => { throw Errors.notFound("Unknown resource"); });
  return h.DELETE(req, { params: { id: params.id } });
}
