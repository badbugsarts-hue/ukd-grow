import fs from "node:fs";

const htmlPath = new URL(
  "../plan/UKD_Grow_Masterplan_2026_Interactive_Masterclass.html",
  import.meta.url,
);
const markdownPath = new URL(
  "../@Akademisch @Web was ist der beste Cannabis Wurzel.md",
  import.meta.url,
);
const html = fs.readFileSync(htmlPath, "utf8");
const markdown = fs.readFileSync(markdownPath, "utf8");

const jsonMatch = html.match(
  /<script type="application\/json" id="workbook-data">([\s\S]*?)<\/script>/,
);
if (!jsonMatch) throw new Error("Embedded workbook data not found");
const workbook = JSON.parse(jsonMatch[1]);

const scripts = [
  ...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g),
].map((match) => match[1]);
const appScript = scripts.at(-1) ?? "";
const functions = [
  ...appScript.matchAll(
    /(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g,
  ),
].map((match) => match[1] ?? match[2]);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const headings = [...markdown.matchAll(/^#{1,4}\s+(.+)$/gm)].map((match) =>
  match[1].trim(),
);
const urls = [
  ...new Set(
    [...markdown.matchAll(/https?:\/\/[^\s)>\]]+/g)].map((match) =>
      match[0].replace(/[.,;:]$/, ""),
    ),
  ),
];

const sheets = Object.entries(workbook).map(([name, sheet]) => ({
  name,
  range: sheet.range,
  rows: sheet.values?.length ?? 0,
  columns: Math.max(0, ...(sheet.values ?? []).map((row) => row.length)),
  formulas: (sheet.formulas ?? []).flat().filter(Boolean).length,
  nonEmpty: (sheet.values ?? [])
    .flat()
    .filter((value) => value !== null && value !== "").length,
}));

const summary = {
  html: {
    bytes: Buffer.byteLength(html),
    lines: html.split(/\r?\n/).length,
    embeddedWorkbookSheets: sheets.length,
    ids,
    functions: [...new Set(functions)],
    inlineHandlers: (html.match(/\son[a-z]+=/g) ?? []).length,
    ariaAttributes: (html.match(/\saria-[\w-]+=/g) ?? []).length,
    localStorageUses: (appScript.match(/localStorage/g) ?? []).length,
    sheets,
  },
  transcript: {
    bytes: Buffer.byteLength(markdown),
    lines: markdown.split(/\r?\n/).length,
    headingsCount: headings.length,
    firstHeadings: headings.slice(0, 120),
    uniqueUrls: urls.length,
    domains: [
      ...new Set(
        urls.map((url) => {
          try {
            return new URL(url.replace(/\\&/g, "&")).hostname;
          } catch {
            return "invalid";
          }
        }),
      ),
    ].sort(),
  },
};

const requestedSheet = process.argv[2];
if (requestedSheet) {
  const sheet = workbook[requestedSheet];
  if (!sheet) throw new Error(`Unknown sheet: ${requestedSheet}`);
  process.stdout.write(
    JSON.stringify({ name: requestedSheet, ...sheet }, null, 2),
  );
} else {
  process.stdout.write(JSON.stringify(summary, null, 2));
}
