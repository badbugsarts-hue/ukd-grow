import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const budgetBytes = 450 * 1024;
const asyncChunkBudgetBytes = 950 * 1024;
const totalJavaScriptBudgetBytes = 2800 * 1024;
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

const assetsDirectory = resolve("dist", "assets");
const javascriptAssets = (await readdir(assetsDirectory))
  .filter((name) => name.endsWith(".js"))
  .map((name) => resolve(assetsDirectory, name));
const javascriptSizes = await Promise.all(
  javascriptAssets.map(async (file) => ({ file, size: (await stat(file)).size })),
);
const oversizedAsyncChunks = javascriptSizes.filter(
  ({ file, size: chunkSize }) => file !== assetPath && chunkSize > asyncChunkBudgetBytes,
);
if (oversizedAsyncChunks.length > 0) {
  throw new Error(
    `Lazy JS-Chunk-Budget überschritten: ${oversizedAsyncChunks
      .map(({ file, size: chunkSize }) => `${file.split(/[\\/]/).at(-1)} ${(chunkSize / 1024).toFixed(1)} kB`)
      .join(", ")} / 950,0 kB.`,
  );
}
const totalJavaScriptBytes = javascriptSizes.reduce(
  (sum, entry) => sum + entry.size,
  0,
);
if (totalJavaScriptBytes > totalJavaScriptBudgetBytes) {
  throw new Error(
    `Gesamtes JS ${ (totalJavaScriptBytes / 1024).toFixed(1) } kB überschreitet das ${(totalJavaScriptBudgetBytes / 1024).toFixed(1)}-kB-Budget.`,
  );
}

console.log(
  `Build-Budget bestanden: initial ${relativeAsset} = ${sizeKb.toFixed(1)} / 450,0 kB; größter Lazy-Chunk ${(Math.max(...javascriptSizes.filter(({ file }) => file !== assetPath).map(({ size: chunkSize }) => chunkSize)) / 1024).toFixed(1)} / 950,0 kB; gesamt ${(totalJavaScriptBytes / 1024).toFixed(1)} / ${(totalJavaScriptBudgetBytes / 1024).toFixed(1)} kB minifiziert.`
);
