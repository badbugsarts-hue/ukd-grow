import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { registerAuthRoutes, type MailTransport } from "./auth.js";
import { loadConfig } from "./config.js";
import { createPool } from "./database.js";
import { registerSyncRoutes } from "./sync.js";
import {
  OpenAiResponsesProvider,
  registerCopilotRoute,
  type CopilotContextResolver,
} from "./copilot.js";

export async function buildServer(mail?: MailTransport) {
  const config = loadConfig();
  const app = Fastify({
    logger: config.environment !== "test",
    bodyLimit: 1_048_576,
    ajv: { customOptions: { removeAdditional: false } },
  });
  const pool = createPool(config);
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  const transport: MailTransport =
    mail ??
    ({
      async sendMagicLink() {
        if (config.environment === "production")
          throw new Error("Production SMTP transport is not configured");
      },
    } satisfies MailTransport);
  await registerAuthRoutes(app, pool, config, transport);
  await registerSyncRoutes(app, pool, config);
  const resolver: CopilotContextResolver = {
    async resolve() {
      return { facts: [], rules: [], claims: [] };
    },
  };
  await registerCopilotRoute(
    app,
    pool,
    config,
    resolver,
    process.env.OPENAI_API_KEY
      ? new OpenAiResponsesProvider(process.env.OPENAI_API_KEY)
      : null,
  );
  app.get(
    "/v1/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["status"],
            properties: { status: { const: "ok" } },
          },
        },
      },
    },
    async () => ({ status: "ok" as const }),
  );
  app.addHook("onClose", async () => pool.end());
  return app;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  const config = loadConfig();
  const app = await buildServer();
  await app.listen({ host: config.host, port: config.port });
}
