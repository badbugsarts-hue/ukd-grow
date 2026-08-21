import { setTimeout as wait } from "node:timers/promises";
import { loadConfig } from "./config.js";
import { createPool } from "./database.js";

const config = loadConfig();
const pool = createPool(config);
let stopping = false;

process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});

while (!stopping) {
  await pool.query(
    "DELETE FROM magic_links WHERE expires_at < now() - interval '7 days'",
  );
  await pool.query(
    "DELETE FROM sessions WHERE expires_at < now() - interval '30 days' OR revoked_at < now() - interval '30 days'",
  );
  await wait(60 * 60 * 1000);
}

await pool.end();
