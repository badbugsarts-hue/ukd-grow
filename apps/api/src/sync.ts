import type { FastifyInstance } from "fastify";
import type {
  PullResponse,
  PushRequest,
  PushResponse,
  SyncOperation,
  SyncConflict,
} from "@ukd/contracts";
import { pushRequestSchema } from "@ukd/contracts";
import type { ApiConfig } from "./config.js";
import { authenticate } from "./auth.js";
import { inWorkspaceTransaction, type DatabasePool } from "./database.js";

export async function registerSyncRoutes(
  app: FastifyInstance,
  pool: DatabasePool,
  config: ApiConfig,
) {
  const auth = authenticate(pool, config);
  app.post<{ Body: PushRequest }>(
    "/v1/sync/push",
    { preHandler: auth, schema: { body: pushRequestSchema } },
    async (request): Promise<PushResponse> => {
      const authContext = request.auth;
      if (!authContext) throw new Error("Authentication invariant failed");
      return inWorkspaceTransaction(
        pool,
        authContext.userId,
        request.body.workspaceId,
        async (client) => {
          const accepted: string[] = [];
          const conflicts: SyncConflict[] = [];
          for (const operation of request.body.operations) {
            const current = await client.query<{
              operation_id: string;
              entity_revision: number;
            }>(
              `SELECT operation_id, entity_revision FROM sync_operations
							 WHERE workspace_id = $1 AND entity_type = $2 AND entity_id = $3
							 ORDER BY cursor DESC LIMIT 1`,
              [operation.workspaceId, operation.entityType, operation.entityId],
            );
            const currentEntity = current.rows[0];
            if (
              operation.operation !== "append" &&
              currentEntity &&
              operation.baseRevision !== currentEntity.entity_revision
            ) {
              const conflictResult = await client.query<{ id: string }>(
                `INSERT INTO sync_conflicts
								 (workspace_id, entity_type, entity_id, local_operation_id,
								  remote_operation_id, reason)
								 VALUES ($1,$2,$3,$4,$5,'revision-mismatch') RETURNING id`,
                [
                  operation.workspaceId,
                  operation.entityType,
                  operation.entityId,
                  operation.id,
                  currentEntity.operation_id,
                ],
              );
              const conflictId = conflictResult.rows[0]?.id;
              if (conflictId)
                conflicts.push({
                  id: conflictId,
                  workspaceId: operation.workspaceId,
                  entityType: operation.entityType,
                  entityId: operation.entityId,
                  localOperationId: operation.id,
                  remoteOperationId: currentEntity.operation_id,
                  reason: "revision-mismatch",
                  status: "open",
                });
              continue;
            }
            const nextRevision = (currentEntity?.entity_revision ?? 0) + 1;
            const inserted = await client.query<{ operation_id: string }>(
              `INSERT INTO sync_operations
							 (operation_id, workspace_id, device_id, entity_type, entity_id,
							  base_revision, entity_revision, operation, payload, client_created_at)
							 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
							 ON CONFLICT (operation_id) DO NOTHING
							 RETURNING operation_id`,
              [
                operation.id,
                operation.workspaceId,
                operation.deviceId,
                operation.entityType,
                operation.entityId,
                operation.baseRevision,
                nextRevision,
                operation.operation,
                operation.payload,
                operation.createdAt,
              ],
            );
            if (inserted.rowCount) accepted.push(operation.id);
          }
          const cursorResult = await client.query<{ cursor: string }>(
            "SELECT COALESCE(max(cursor), 0)::text AS cursor FROM sync_operations WHERE workspace_id = $1",
            [request.body.workspaceId],
          );
          return {
            acceptedOperationIds: accepted,
            conflicts,
            cursor: {
              workspaceId: request.body.workspaceId,
              position: cursorResult.rows[0]?.cursor ?? "0",
            },
          };
        },
      );
    },
  );

  app.get<{ Querystring: { workspaceId: string; cursor?: string } }>(
    "/v1/sync/pull",
    { preHandler: auth },
    async (request): Promise<PullResponse> => {
      const authContext = request.auth;
      if (!authContext) throw new Error("Authentication invariant failed");
      const position = BigInt(request.query.cursor ?? "0");
      return inWorkspaceTransaction(
        pool,
        authContext.userId,
        request.query.workspaceId,
        async (client) => {
          const result = await client.query<{
            cursor: string;
            operation_id: string;
            workspace_id: string;
            device_id: string;
            entity_type: string;
            entity_id: string;
            base_revision: number | null;
            operation: SyncOperation["operation"];
            payload: unknown;
            client_created_at: Date;
          }>(
            `SELECT * FROM sync_operations
						 WHERE workspace_id = $1 AND cursor > $2
						 ORDER BY cursor ASC LIMIT 1000`,
            [request.query.workspaceId, position.toString()],
          );
          const operations: SyncOperation[] = result.rows.map((row) => ({
            id: row.operation_id,
            workspaceId: row.workspace_id,
            deviceId: row.device_id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            baseRevision: row.base_revision,
            operation: row.operation,
            payload: row.payload,
            createdAt: row.client_created_at.toISOString(),
          }));
          return {
            operations,
            conflicts: [],
            cursor: {
              workspaceId: request.query.workspaceId,
              position: result.rows.at(-1)?.cursor ?? position.toString(),
            },
          };
        },
      );
    },
  );
}
