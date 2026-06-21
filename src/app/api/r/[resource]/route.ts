import { resources, type ResourceKey } from "@/lib/resources";
import { collection } from "@/lib/resource";
import { handle, Errors } from "@/lib/http";

// Dynamic collection dispatcher. /api/r/<resource> → GET (list) / POST (create).
// Every config in the registry is tenant-scoped + capability-gated, so this one
// file safely serves all CRUD resources.

type Params = { params: { resource: string } };

function cfgOf(resource: string) {
  const cfg = resources[resource as ResourceKey];
  if (!cfg) throw Errors.notFound("Unknown resource");
  return cfg;
}

export function GET(req: Request, { params }: Params) {
  let handlers;
  try {
    handlers = collection(cfgOf(params.resource));
  } catch {
    return handle(async () => {
      throw Errors.notFound("Unknown resource");
    });
  }
  return handlers.GET(req);
}

export function POST(req: Request, { params }: Params) {
  let handlers;
  try {
    handlers = collection(cfgOf(params.resource));
  } catch {
    return handle(async () => {
      throw Errors.notFound("Unknown resource");
    });
  }
  return handlers.POST(req);
}
