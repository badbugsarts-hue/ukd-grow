import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const readJson = async (relativePath) =>
  JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));
const sha256 = async (relativePath) =>
  createHash("sha256")
    .update(await fs.readFile(path.join(root, relativePath)))
    .digest("hex")
    .toUpperCase();
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const [workbook, audit, knowledge, aiContext, skills, manifest] =
  await Promise.all([
    readJson("public/data/evidence-guarded-workbook-v6.json"),
    readJson("src/data/legacy-audit.json"),
    readJson("src/data/knowledge-base.json"),
    readJson("src/data/ai-context.json"),
    readJson("src/data/skills.json"),
    readJson("public/data/data-manifest.json"),
  ]);

assert(Object.keys(workbook).length === 27, "Workbook must contain 27 sheets");
assert(
  workbook["02_Daily_Master"]?.values?.length === 82,
  "Daily Master must contain header plus 81 days",
);
assert(
  workbook["02_Daily_Master"]?.values?.[0]?.length === 45,
  "Daily Master must contain 45 canonical columns",
);
assert(audit.rows?.length === 55, "Audit must contain 55 findings");
assert(
  audit.rows?.every(
    (row, index) => row.id === `A${String(index + 1).padStart(2, "0")}`,
  ),
  "Audit IDs must be contiguous A01-A55",
);
assert(
  audit.rows?.every((row) => row.status === "FIXED"),
  "Every imported v6 finding must retain FIXED status",
);

const sources = new Map(knowledge.sources.map((source) => [source.id, source]));
for (const claim of knowledge.claims) {
  assert(Boolean(claim.scope), `Claim ${claim.id} is missing scope`);
  assert(
    Boolean(claim.uncertainty),
    `Claim ${claim.id} is missing uncertainty`,
  );
  assert(
    claim.sourceIds.length > 0 || claim.evidence === "C",
    `Claim ${claim.id} needs a source or bounded C-class heuristic status`,
  );
  for (const sourceId of claim.sourceIds) {
    assert(
      sources.has(sourceId),
      `Claim ${claim.id} references unknown source ${sourceId}`,
    );
  }
}
for (const source of knowledge.sources) {
  assert(/^https:\/\//.test(source.url), `Source ${source.id} must use HTTPS`);
  assert(
    !Number.isNaN(Date.parse(source.checkedAt)),
    `Source ${source.id} has invalid checkedAt`,
  );
}

assert(
  aiContext.canonicalData.operational.includes(
    "evidence-guarded-workbook-v6.json",
  ),
  "AI context must reference the v6 workbook",
);
assert(skills.skills.length >= 7, "Research and legal gates must be present");
assert(
  skills.skills.some((skill) => skill.id === "research-import-gate"),
  "research-import-gate is missing",
);
assert(
  skills.skills.some((skill) => skill.id === "legal-release-gate"),
  "legal-release-gate is missing",
);

assert(
  manifest.canonicalWorkbook.sha256 ===
    (await sha256("public/data/evidence-guarded-workbook-v6.json")),
  "Canonical workbook hash does not match manifest",
);
assert(
  manifest.audit.sha256 === (await sha256("src/data/legacy-audit.json")),
  "Audit hash does not match manifest",
);
for (const artifact of manifest.sourceArtifacts) {
  assert(
    artifact.sha256 === (await sha256(artifact.path)),
    `Source artifact hash does not match: ${artifact.path}`,
  );
}

const badCellValues = Object.entries(workbook).flatMap(([sheetName, sheet]) =>
  sheet.values.flatMap((row, rowIndex) =>
    row
      .map((value, columnIndex) => ({
        value,
        sheetName,
        rowIndex,
        columnIndex,
      }))
      .filter(({ value }) =>
        /#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A|#NUM!|#SPILL!/.test(
          String(value ?? ""),
        ),
      ),
  ),
);
assert(
  badCellValues.length === 0,
  "Workbook contains visible formula error values",
);

if (failures.length > 0) {
  process.stderr.write(`${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Content gate passed: ${knowledge.claims.length} claims, ${knowledge.sources.length} sources, ${audit.rows.length} findings, ${skills.skills.length} skills.\n`,
  );
}
