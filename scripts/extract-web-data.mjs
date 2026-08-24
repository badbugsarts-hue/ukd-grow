import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(
  path.join(
    root,
    "plan",
    "UKD_Grow_Masterplan_2026_Interactive_Masterclass.html",
  ),
  "utf8",
);
const match = source.match(
  /<script type="application\/json" id="workbook-data">([\s\S]*?)<\/script>/,
);
if (!match) throw new Error("Embedded workbook data not found");

const outputDir = path.join(root, "src", "data");
const publicDataDir = path.join(root, "public", "data");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(publicDataDir, { recursive: true });
const workbook = JSON.parse(match[1]);
fs.writeFileSync(
  path.join(publicDataDir, "legacy-workbook.json"),
  `${JSON.stringify(workbook)}\n`,
);

const auditRows = workbook["26_Audit_Report"].values
  .slice(3)
  .filter((row) => row[0])
  .map((row) => ({
    id: row[0],
    severity: row[1],
    area: row[2],
    finding: row[3],
    risk: row[4],
    correction: row[5],
    evidence: row[6],
    status: row[7],
    uncertainty: row[8],
    priority: row[9],
  }));
fs.writeFileSync(
  path.join(outputDir, "legacy-audit.json"),
  `${JSON.stringify({ schemaVersion: "1.0.0", source: "UKD v5 forensic workbook", rows: auditRows }, null, 2)}\n`,
);

console.log(
  `Extracted ${Object.keys(workbook).length} sheets and ${auditRows.length} audit findings.`,
);
