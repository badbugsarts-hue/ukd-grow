import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { magicLinkRequestSchema, magicLinkVerifySchema } from "@ukd/contracts";
import type { ApiConfig } from "./config.js";
import type { DatabasePool } from "./database.js";

export interface MailTransport {
  sendMagicLink(email: string, url: string): Promise<void>;
}

export interface AuthContext {
  userId: string;
  sessionId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  pool: DatabasePool,
  config: ApiConfig,
  mail: MailTransport,
) {
  app.decorateRequest("auth", null);
  app.post<{ Body: { email: string } }>(
    "/v1/auth/magic-link/request",
    {
      schema: {
        body: magicLinkRequestSchema,
        response: {
          202: {
            type: "object",
            additionalProperties: false,
            required: ["accepted"],
            properties: { accepted: { type: "boolean" } },
          },
        },
      },
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();
      const token = randomBytes(32).toString("base64url");
      const tokenHash = sha256(token);
      const expiresAt = new Date(
        Date.now() + config.magicLinkTtlMinutes * 60_000,
      );
      const result = await pool.query<{ id: string; email: string }>(
        `INSERT INTO users (email) VALUES ($1)
				 ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
				 RETURNING id, email`,
        [email],
      );
      const user = result.rows[0];
      if (user) {
        await pool.query(
          `INSERT INTO magic_links (user_id, token_hash, expires_at)
					 VALUES ($1, $2, $3)`,
          [user.id, tokenHash, expiresAt],
        );
        await mail.sendMagicLink(
          user.email,
          `${config.publicAppUrl}/auth/verify?token=${encodeURIComponent(token)}`,
        );
      }
      return reply.code(202).send({ accepted: true });
    },
  );

  app.post<{ Body: { token: string } }>(
    "/v1/auth/magic-link/verify",
    {
      schema: {
        body: magicLinkVerifySchema,
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["authenticated"],
            properties: { authenticated: { type: "boolean" } },
          },
        },
      },
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const linkResult = await client.query<{ id: string; user_id: string }>(
          `UPDATE magic_links SET used_at = now()
					 WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
					 RETURNING id, user_id`,
          [sha256(request.body.token)],
        );
        const link = linkResult.rows[0];
        if (!link) {
          await client.query("ROLLBACK");
          return reply.code(401).send({ authenticated: false });
        }
        const rawSession = randomBytes(32).toString("base64url");
        await client.query("SELECT create_initial_workspace($1, $2)", [
          link.user_id,
          "Mein UKD Workspace",
        ]);
        await client.query(
          `INSERT INTO sessions (user_id, token_hash, expires_at)
					 VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
          [link.user_id, sha256(rawSession), config.sessionTtlDays],
        );
        await client.query("COMMIT");
        reply.setCookie(config.sessionCookieName, rawSession, {
          httpOnly: true,
          secure: config.environment === "production",
          sameSite: "lax",
          path: "/",
          maxAge: config.sessionTtlDays * 86_400,
        });
        return reply.send({ authenticated: true });
      } catch (cause) {
        await client.query("ROLLBACK");
        throw cause;
      } finally {
        client.release();
      }
    },
  );
}

export function authenticate(pool: DatabasePool, config: ApiConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies[config.sessionCookieName];
    if (!token) return reply.code(401).send({ error: "unauthorized" });
    const result = await pool.query<{ id: string; user_id: string }>(
      `UPDATE sessions SET last_seen_at = now()
			 WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
			 RETURNING id, user_id`,
      [sha256(token)],
    );
    const session = result.rows[0];
    if (!session) return reply.code(401).send({ error: "unauthorized" });
    request.auth = { userId: session.user_id, sessionId: session.id };
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
