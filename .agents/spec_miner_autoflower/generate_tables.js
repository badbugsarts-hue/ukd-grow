import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_plant_data.json'), 'utf8'));

let jpTable = '| # | ID | Name | Breeder | Shop | Prov | Score | Genetik | Yield (g) | Height (cm) | Level | Mold | Feed | THC / Chemotyp | Terpene / Aroma |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';

data.filter(d => d.kind === 'jungpflanze').forEach(d => {
  const genStr = d.indica !== null && d.indica !== undefined ? `${d.indica}% Ind / ${d.sativa}% Sat` : (d.gen ? d.gen.substring(0, 25) + '...' : 'unbekannt');
  const hStr = d.hmin !== null && d.hmin !== undefined ? `${d.hmin}–${d.hmax}` : 'unbekannt';
  const thcShort = d.thc.length > 30 ? d.thc.substring(0, 27) + '...' : d.thc;
  const terpShort = d.terpene.length > 35 ? d.terpene.substring(0, 32) + '...' : d.terpene;
  jpTable += `| ${d.rank} | ${d.id} | ${d.name} | ${d.breeder} | ${d.shop} | ${d.prov} | ${d.score} | ${genStr} | ${d.ertrag_lo}–${d.ertrag_hi} (q=${d.q}) | ${hStr} | ${d.level} | ${d.mold} | ${d.feed} | ${thcShort} | ${terpShort} |\n`;
});

let smTable = '| # | ID | Name | Breeder | Bezugsquelle | Typ | Prov | Score | Genetik | Yield (g) | Height (cm) | Level | Mold | Feed | THC / Chemotyp | Terpene / Aroma |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';

data.filter(d => d.kind === 'samen').forEach(d => {
  const genStr = d.indica !== null && d.indica !== undefined ? `${d.indica}% Ind / ${d.sativa}% Sat` : (d.gen ? (d.gen.length > 25 ? d.gen.substring(0, 22) + '...' : d.gen) : 'unbekannt');
  const hStr = d.hmin !== null && d.hmin !== undefined ? `${d.hmin}–${d.hmax}` : 'unbekannt';
  const thcShort = d.thc.length > 30 ? d.thc.substring(0, 27) + '...' : d.thc;
  const terpShort = d.terpene.length > 35 ? d.terpene.substring(0, 32) + '...' : d.terpene;
  smTable += `| ${d.rank} | ${d.id} | ${d.name} | ${d.breeder} | ${d.shop} | ${d.typ} | ${d.prov} | ${d.score} | ${genStr} | ${d.ertrag_lo}–${d.ertrag_hi} (q=${d.q}) | ${hStr} | ${d.level} | ${d.mold} | ${d.feed} | ${thcShort} | ${terpShort} |\n`;
});

fs.writeFileSync(path.join(__dirname, 'jp_table.md'), jpTable);
fs.writeFileSync(path.join(__dirname, 'sm_table.md'), smTable);
console.log('Tables regenerated successfully.');
