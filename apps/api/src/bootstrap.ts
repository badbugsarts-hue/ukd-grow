import { startTelemetry, stopTelemetry } from "./telemetry.js";

await startTelemetry("ukd-api");
const [{ buildServer }, { loadConfig }] = await Promise.all([
  import("./server.js"),
  import("./config.js"),
]);
const config = loadConfig();
const app = await buildServer();

async function stop() {
  await app.close();
  await stopTelemetry();
}

process.once("SIGTERM", () => void stop());
process.once("SIGINT", () => void stop());
await app.listen({ host: config.host, port: config.port });
