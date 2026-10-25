import { createV1, openApiConfig } from "./app";

/** The OpenAPI 3.1 document for /api/v1, generated from the same route definitions that validate requests. */
export function generateOpenApi(baseUrl?: string) {
  return createV1().getOpenAPI31Document(openApiConfig(baseUrl) as Parameters<ReturnType<typeof createV1>["getOpenAPI31Document"]>[0]);
}
