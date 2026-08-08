import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "tmp", "spreadsheets");
await fs.mkdir(outputDir, { recursive: true });

const names = (await fs.readdir(root))
  .filter((name) => name.toLowerCase().endsWith(".xlsx"))
  .sort();
const summaries = [];

for (const name of names) {
  const workbook = await SpreadsheetFile.importXlsx(
    await FileBlob.load(path.join(root, name)),
  );
  const overview = await workbook.inspect({
    kind: "workbook,sheet,table,definedName,drawing",
    maxChars: 12000,
    tableMaxRows: 3,
    tableMaxCols: 8,
    tableMaxCellChars: 80,
  });
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    maxChars: 6000,
    summary: "formula error scan",
  });
  summaries.push({ name, overview: overview.ndjson, errors: errors.ndjson });

  if (name.includes("FORENSIC_AUDIT_FINAL")) {
    for (const sheetName of [
      "00_Dashboard",
      "01_Run_Config",
      "02_Daily_Master",
      "22_Sources",
      "26_Audit_Report",
    ]) {
      const preview = await workbook.render({
        sheetName,
        autoCrop: "all",
        scale: 1,
        format: "png",
      });
      await fs.writeFile(
        path.join(outputDir, `${sheetName}.png`),
        new Uint8Array(await preview.arrayBuffer()),
      );
    }
  }
}

process.stdout.write(JSON.stringify(summaries, null, 2));
