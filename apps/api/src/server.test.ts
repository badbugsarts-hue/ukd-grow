import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";

describe("UKD API contracts", () => {
  let app: FastifyInstance | null = null;
  afterEach(async () => {
    await app?.close();
    app = null;
  });

  it("returns the minimal serialized health response", async () => {
    app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("rejects unknown auth fields before database access", async () => {
    app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/request",
      payload: { email: "operator@example.test", patientData: "forbidden" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects malformed sync payloads before authentication logic", async () => {
    app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/sync/push",
      payload: { workspaceId: "not-a-uuid", operations: [] },
    });
    expect(response.statusCode).toBe(400);
  });
});
