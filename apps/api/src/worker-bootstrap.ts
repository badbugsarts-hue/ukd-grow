import { startTelemetry, stopTelemetry } from "./telemetry.js";

await startTelemetry("ukd-worker");
await import("./worker.js");
await stopTelemetry();
