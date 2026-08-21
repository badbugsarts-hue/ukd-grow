import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

let sdk: NodeSDK | null = null;

export async function startTelemetry(serviceName: string): Promise<void> {
  if (process.env.OTEL_ENABLED !== "true" || sdk) return;
  const endpoint = (
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://127.0.0.1:4318"
  ).replace(/\/$/, "");
  sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
      exportIntervalMillis: 30_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });
  await Promise.resolve(sdk.start());
}

export async function stopTelemetry(): Promise<void> {
  if (!sdk) return;
  const active = sdk;
  sdk = null;
  await active.shutdown();
}
