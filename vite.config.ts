import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "vendor";
          }
          if (
            id.includes("autoflower-cockpit.json") ||
            id.includes("AutoflowerCockpitPanel")
          ) {
            return "autoflower-cockpit";
          }
          if (id.includes("prediction-engine")) {
            return "prediction-engine";
          }
          if (
            id.includes("ScientificOperationsWorkspace") ||
            id.includes("OperationsWorkspace")
          ) {
            return "operations-workspaces";
          }
          if (id.includes("knowledge-base.json")) {
            return "knowledge-base";
          }
          if (id.includes("legacy-audit.json")) {
            return "legacy-audit";
          }
          if (id.includes("ai-context.json")) {
            return "ai-context";
          }
          if (id.includes("skills.json")) {
            return "skills";
          }
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Several files deliberately run large synchronous fuzz/SSR matrices. Running
    // those files in parallel makes their individual 5 s watchdogs depend on host
    // CPU contention and produced false failures on the local Windows release gate.
    fileParallelism: true,
    maxWorkers: 2,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
