import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const html = fs.readFileSync(
  path.join(__dirname, "../../plan/Autoflower-Cockpit-v3.html"),
  "utf8",
);

const dataStart = html.indexOf("const DATA = ");
const dataEnd = html.indexOf(";\nconst MAXY", dataStart);
const dataStr = html.substring(dataStart + "const DATA = ".length, dataEnd);
const DATA = JSON.parse(dataStr);

console.log("=== DATA SUMMARY ===");
console.log("Total entries:", DATA.length);

const jp = DATA.filter((d) => d.kind === "jungpflanze");
const sm = DATA.filter((d) => d.kind === "samen");

console.log("Jungpflanzen (Top 50):", jp.length);
console.log("Saatgut (Top 11):", sm.length);

console.log("\n=== JUNGPFLANZEN LIST ===");
jp.forEach((d) => {
  console.log(
    `[Rank ${d.rank}] ${d.name} (${d.breeder}) | Score: ${d.score} | Prov: ${d.prov} | Yield: ${d.ertrag_lo}-${d.ertrag_hi}g (q=${d.q}) | Height: ${d.hmin ?? "?"}-${d.hmax ?? "?"}cm | Level: ${d.level} | Mold: ${d.mold} | Feed: ${d.feed}`,
  );
});

console.log("\n=== SAATGUT LIST ===");
sm.forEach((d) => {
  console.log(
    `[Rank ${d.rank}] ${d.name} (${d.breeder}) | Type: ${d.typ} | Score: ${d.score} | Prov: ${d.prov} | Yield: ${d.ertrag_lo}-${d.ertrag_hi}g (q=${d.q}) | Height: ${d.hmin ?? "?"}-${d.hmax ?? "?"}cm | Level: ${d.level} | Mold: ${d.mold} | Feed: ${d.feed}`,
  );
});

// Let's also output distinct facets
console.log("\n=== FACET VALUES ===");
console.log("Breeder Count:", new Set(DATA.map((d) => d.breeder)).size);
console.log("Breeders:", [...new Set(DATA.map((d) => d.breeder))]);
console.log("Shops:", [...new Set(DATA.map((d) => d.shop))]);
console.log("Provenienz:", [...new Set(DATA.map((d) => d.prov))]);
console.log("Levels:", [...new Set(DATA.map((d) => d.level))]);
console.log("Molds:", [...new Set(DATA.map((d) => d.mold))]);
console.log("Feeds:", [...new Set(DATA.map((d) => d.feed))]);
console.log("Types:", [...new Set(DATA.map((d) => d.typ))]);
console.log("Kinds:", [...new Set(DATA.map((d) => d.kind))]);

// Save formatted JSON for export
fs.writeFileSync(
  path.join(__dirname, "extracted_plant_data.json"),
  JSON.stringify(DATA, null, 2),
);
console.log("\nSaved full JSON to extracted_plant_data.json");
