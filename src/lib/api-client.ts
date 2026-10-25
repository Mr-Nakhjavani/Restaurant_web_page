/** Browser-side helper for calling the restaurant API from client components. */

export interface ApiErrorBody {
  code: string;
  message: string;
  status: number;
  category: string;
  retryable: boolean;
  requestId: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  constructor(public readonly body: ApiErrorBody) {
    super(body.message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(headers ?? {}) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError({ code: "NETWORK_ERROR", message: "We could not reach the restaurant. Check your connection and try again.", status: 0, category: "server", retryable: true, requestId: "" });
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiClientError(body.error ?? { code: "INTERNAL_ERROR", message: "Something went wrong.", status: res.status, category: "server", retryable: true, requestId: "" });
  }
  return body as T;
}

export function newIdempotencyKey(prefix: string) {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}
