import fs from "node:fs";

const cultivars = JSON.parse(
  fs.readFileSync("./src/data/autoflower-cockpit.json", "utf8"),
);
console.log("Total cultivars:", cultivars.length);

const ids = new Set();
const names = new Set();
let missingAttrCount = 0;

cultivars.forEach((c, idx) => {
  if (!c.id) console.error(`Entry ${idx} missing id`);
  if (!c.name) console.error(`Entry ${idx} missing name`);
  if (!c.breeder) console.error(`Entry ${idx} missing breeder`);
  if (ids.has(c.id)) console.error(`Duplicate ID: ${c.id}`);
  if (names.has(c.name)) console.error(`Duplicate Name: ${c.name}`);
  ids.add(c.id);
  names.add(c.name);

  const required = [
    "rank",
    "name",
    "shop",
    "score",
    "id",
    "breeder",
    "prov",
    "warn",
    "form",
    "gen",
    "indica",
    "sativa",
    "cross",
    "thc",
    "cbd",
    "cbn",
    "minor",
    "ester",
    "wirkung",
    "geschmack",
    "geruch",
    "terpene_src",
    "terpene",
    "reviews",
    "med",
    "med_src",
    "feed",
    "feed_note",
    "mold",
    "mold_note",
    "level",
    "level_note",
    "zeit",
    "hoehe",
    "hmin",
    "hmax",
    "ertrag_lo",
    "ertrag_hi",
    "ertrag_src",
    "urteil",
    "evidenz",
    "q",
    "kind",
    "typ",
  ];
  for (const attr of required) {
    if (c[attr] === undefined || c[attr] === null) {
      console.error(`Cultivar ${c.id} missing attribute ${attr}`);
      missingAttrCount++;
    }
  }
});

console.log("Unique IDs count:", ids.size);
console.log("Unique Names count:", names.size);
console.log("Missing attributes across all records:", missingAttrCount);
console.log(
  "Breeders represented (" +
    new Set(cultivars.map((c) => c.breeder)).size +
    "):",
  [...new Set(cultivars.map((c) => c.breeder))].sort(),
);
