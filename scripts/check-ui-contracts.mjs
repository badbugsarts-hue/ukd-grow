import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const src = join(root, "src");
const css = readFileSync(join(src, "styles.css"), "utf8");
const allowUnstyled = new Set([
  // Semantic markers styled through a parent/attribute selector.
  "active",
  "primary",
]);

function filesBelow(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

const missingClasses = [];
for (const file of filesBelow(src).filter((path) => path.endsWith(".tsx"))) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/className\s*=\s*"([^"]+)"/g)) {
    for (const className of match[1].trim().split(/\s+/)) {
      if (!className || allowUnstyled.has(className)) continue;
      const selector = new RegExp(`\\.${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![-_a-zA-Z0-9])`);
      if (!selector.test(css)) {
        missingClasses.push(`${relative(root, file)}: .${className}`);
      }
    }
  }
}

const guidance = readFileSync(join(src, "ui-guidance.ts"), "utf8");
const actionBlock = guidance.match(/export const GLOBAL_ACTION_REGISTRY = \{([\s\S]*?)\n\} as const;/)?.[1] ?? "";
const actionEntries = [...actionBlock.matchAll(/^\s*"([^"]+)":\s*\{([\s\S]*?)^\s*\},?$/gm)];
const incompleteActions = actionEntries
  .filter(([, , body]) => !/label:\s*"/.test(body) || !/concept:\s*"/.test(body) || !/help:\s*"/.test(body))
  .map(([, id]) => id);

if (missingClasses.length || incompleteActions.length) {
  if (missingClasses.length) {
    console.error("Statische UI-Klassen ohne CSS-Vertrag:\n" + [...new Set(missingClasses)].join("\n"));
  }
  if (incompleteActions.length) {
    console.error("Globale Aktionen ohne Label, Concept oder Hilfe:\n" + incompleteActions.join("\n"));
  }
  process.exit(1);
}

console.log(`UI-Verträge gültig: statische Klassen abgedeckt, ${actionEntries.length} globale Aktionen dokumentiert.`);
