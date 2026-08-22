import { AutoflowerStrain } from "./types";
import autoflowerData from "./data/autoflower-cockpit.json";

export interface PredictorContext {
  genetics?: string;
  startDate?: string;
  pottingDate?: string;
  emergenceDate?: string;
}

export function predictGeneticsMetadata(strainName: string) {
  if (!strainName || strainName.length < 3) return null;
  
  const normalizedInput = strainName.toLowerCase().trim();
  const catalog = autoflowerData as AutoflowerStrain[];
  
  // Try exact match first
  let match = catalog.find(s => s.name.toLowerCase() === normalizedInput);
  
  // Try fuzzy match
  if (!match) {
    match = catalog.find(s => 
      normalizedInput.includes(s.name.toLowerCase()) || 
      s.name.toLowerCase().includes(normalizedInput)
    );
  }
  
  if (match) {
    return {
      breeder: match.breeder,
      seedType: match.typ === "Autoflower" ? "autoflower" : "feminized",
      phenotypeNotes: match.urteil || match.wirkung || match.geschmack || "",
    };
  }
  
  // Heuristics if no catalog match
  const heuristics: any = {};
  if (normalizedInput.includes("auto") || normalizedInput.includes("autoflower")) {
    heuristics.seedType = "autoflower";
  }
  if (normalizedInput.includes("sensible seeds")) {
    heuristics.breeder = "Sensible Seeds";
  } else if (normalizedInput.includes("mephisto")) {
    heuristics.breeder = "Mephisto Genetics";
  } else if (normalizedInput.includes("fast buds") || normalizedInput.includes("fastbuds")) {
    heuristics.breeder = "Fast Buds";
  }
  
  return Object.keys(heuristics).length > 0 ? heuristics : null;
}

export function predictEmergenceDate(pottingDateStr: string): string | null {
  if (!pottingDateStr) return null;
  const pottingDate = new Date(pottingDateStr);
  if (isNaN(pottingDate.getTime())) return null;
  
  // Typischerweise 3-4 Tage für Keimung
  const emergenceDate = new Date(pottingDate);
  emergenceDate.setDate(emergenceDate.getDate() + 3);
  return emergenceDate.toISOString().slice(0, 10);
}
