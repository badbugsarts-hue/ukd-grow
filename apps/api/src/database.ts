import pg from "pg";
import type { ApiConfig } from "./config.js";

const { Pool } = pg;

export function createPool(config: ApiConfig) {
  return new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    ssl:
      config.environment === "production"
        ? { rejectUnauthorized: true }
        : false,
  });
}

export type DatabasePool = ReturnType<typeof createPool>;

export async function inWorkspaceTransaction<T>(
  pool: DatabasePool,
  userId: string,
  workspaceId: string,
  operation: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    await client.query("SELECT set_config('app.workspace_id', $1, true)", [
      workspaceId,
    ]);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (cause) {
    await client.query("ROLLBACK");
    throw cause;
  } finally {
    client.release();
  }
}
