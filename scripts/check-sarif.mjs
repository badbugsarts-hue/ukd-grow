import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = process.argv[2];

if (!root) {
  console.error("Usage: node scripts/check-sarif.mjs <directory>");
  process.exit(2);
}

async function collectSarifFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? collectSarifFiles(path)
        : Promise.resolve(extname(entry.name) === ".sarif" ? [path] : []);
    }),
  );
  return nested.flat();
}

const files = await collectSarifFiles(root);

if (files.length === 0) {
  console.error(`CodeQL gate failed: no SARIF file found below ${root}.`);
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const report = JSON.parse(await readFile(file, "utf8"));
  for (const run of report.runs ?? []) {
    for (const result of run.results ?? []) {
      findings.push({
        file,
        level: result.level ?? "warning",
        ruleId: result.ruleId ?? "unknown-rule",
        message: result.message?.text ?? "CodeQL finding without message",
      });
    }
  }
}

if (findings.length > 0) {
  console.error(`CodeQL gate failed with ${findings.length} finding(s):`);
  for (const finding of findings.slice(0, 50)) {
    console.error(
      `- [${finding.level}] ${finding.ruleId}: ${finding.message} (${finding.file})`,
    );
  }
  process.exit(1);
}

console.log(`CodeQL SARIF gate passed across ${files.length} report(s): 0 findings.`);
