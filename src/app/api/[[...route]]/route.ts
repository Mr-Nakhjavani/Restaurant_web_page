import { handle } from "hono/vercel";
import { getApp } from "@/server/api/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Hono app (and its configuration validation) is created on the first request,
// not at import time, so builds do not need runtime secrets.
let handler: ReturnType<typeof handle> | null = null;
const route = (req: Request) => {
  handler ??= handle(getApp());
  return handler(req);
};

export { route as GET, route as POST, route as PATCH, route as PUT, route as DELETE, route as OPTIONS, route as HEAD };
