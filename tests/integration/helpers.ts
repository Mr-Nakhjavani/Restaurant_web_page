import { createApp } from "@/server/api/app";
import { prisma } from "@/server/db";
import { generateApiKey } from "@/server/auth/api-keys";

export const app = createApp();
export const AGENT_KEY = "bg_test_agent_key_0123456789";
/** Monday 26 October 2026, 10:00 in Dubai — the fixed "now" for most tests. */
export const MONDAY_10 = "2026-10-26T10:00:00+04:00";

export interface CallResult<T = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  status: number;
  body: T;
  headers: Headers;
}

export async function call<T = any>( // eslint-disable-line @typescript-eslint/no-explicit-any
  method: string,
  path: string,
  opts: { body?: unknown; headers?: Record<string, string>; now?: string; raw?: string } = {},
): Promise<CallResult<T>> {
  const headers: Record<string, string> = { ...(opts.body !== undefined || opts.raw ? { "content-type": "application/json" } : {}), ...(opts.headers ?? {}) };
  if (opts.now) headers["x-test-now"] = opts.now;
  const res = await app.request(`/api/v1${path}`, { method, headers, body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined) });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON (markdown) */
  }
  return { status: res.status, body: body as T, headers: res.headers };
}

const keys = new Map<string, string>();
/** Create (once per test file) an API key with the given scopes. */
export async function apiKey(scopes: ("agent" | "staff" | "admin")[]): Promise<string> {
  const id = scopes.join(",");
  if (keys.has(id)) return keys.get(id)!;
  const { key, prefix, hash } = generateApiKey();
  await prisma.apiKey.create({ data: { name: `test ${id}`, prefix, keyHash: hash, scopes } });
  keys.set(id, key);
  return key;
}

export const bearer = (key: string) => ({ authorization: `Bearer ${key}` });

export const customer = (n = 1) => ({ name: `Test Guest ${n}`, phone: `050 100 ${String(1000 + n).padStart(4, "0")}` });
