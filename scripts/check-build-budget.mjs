import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const budgetBytes = 450 * 1024;
const html = await readFile(resolve("dist/index.html"), "utf8");
const moduleScript = html.match(
  /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/
);

if (!moduleScript) {
  throw new Error("Kein initiales Modulskript in dist/index.html gefunden.");
}

const relativeAsset = moduleScript[1].replace(/^\.\//, "").replace(/^\//, "");
const assetPath = resolve("dist", relativeAsset);
const { size } = await stat(assetPath);
const sizeKb = size / 1024;

if (size > budgetBytes) {
  throw new Error(
    `Initialer JS-Chunk ${relativeAsset} ist ${sizeKb.toFixed(1)} kB groß und überschreitet das 450-kB-Budget.`
  );
}

console.log(
  `Build-Budget bestanden: ${relativeAsset} = ${sizeKb.toFixed(1)} kB / 450,0 kB minifiziert.`
);
