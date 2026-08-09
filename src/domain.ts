import type { CellValue, Workbook, WorkbookSheet } from "./types";

export const DAILY_SHEET = "02_Daily_Master";

export const DAILY_COLUMNS = {
  day: 0,
  date: 1,
  week: 2,
  phase: 4,
  goal: 5,
  lightHours: 6,
  watts: 7,
  ppfd: 8,
  dli: 9,
  distance: 10,
  tempLight: 11,
  tempDark: 12,
  humidity: 13,
  leafVpd: 14,
  ec: 15,
  ph: 16,
  waterMin: 17,
  waterMax: 18,
  irrigation: 19,
  base: 20,
  baseDose: 21,
  rootDose: 22,
  powerZyme: 23,
  superVit: 24,
  hesilicio: 25,
  boost: 26,
  pk: 27,
  voodoo: 28,
  anOption: 29,
  training: 30,
  qa: 31,
  stop: 32,
  evidence: 33,
  athena: 34,
  gmPhase: 35,
  gmRecommendation: 36,
  bloomDay: 37,
  bloomWeek: 38,
  airVpd: 39,
  lightKwh: 40,
  cumulativeKwh: 41,
  calMag: 42,
  athenaDose: 43,
  phDown: 44,
} as const;

export interface DayPlan {
  day: number;
  raw: CellValue[];
  formulaRow: string[];
}

export function getDailySheet(workbook: Workbook): WorkbookSheet {
  const sheet = workbook[DAILY_SHEET];
  if (!sheet) throw new Error(`Missing canonical sheet ${DAILY_SHEET}`);
  return sheet;
}

export function getDayPlan(workbook: Workbook, day: number): DayPlan {
  const sheet = getDailySheet(workbook);
  const safeDay = Number.isFinite(day) ? Math.round(day) : 0;
  const rowIndex = Math.max(0, Math.min(80, safeDay)) + 1;
  const row = sheet.values[rowIndex];
  if (!row) throw new Error(`No day row ${day}`);
  return {
    day: Number(row[DAILY_COLUMNS.day] ?? day),
    raw: row,
    formulaRow: sheet.formulas[rowIndex] ?? [],
  };
}

export function numberAt(plan: DayPlan, column: number): number {
  const value = plan.raw[column];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function textAt(plan: DayPlan, column: number): string {
  const value = plan.raw[column];
  return value === null || value === undefined ? "—" : String(value);
}

export function calculateDli(ppfd: number, hours: number): number {
  return (ppfd * hours * 3600) / 1_000_000;
}

function saturationPressure(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

export function calculateLeafVpd(
  airTempC: number,
  relativeHumidity: number,
  leafDeltaC: number,
): number {
  const leafTemp = airTempC + leafDeltaC;
  return (
    saturationPressure(leafTemp) -
    (relativeHumidity / 100) * saturationPressure(airTempC)
  );
}

export function excelSerialToDate(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
}

export function formatExcelDate(value: CellValue): string {
  if (typeof value !== "number") return String(value ?? "—");
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(excelSerialToDate(value));
}

export interface MixItem {
  name: string;
  dose: number;
  amount: number;
  role: string;
  warning?: string;
}

export function calculateMix(plan: DayPlan, batchLiters: number): MixItem[] {
  const volume = Number.isFinite(batchLiters) ? Math.max(0, batchLiters) : 0;
  const items: Array<[string, number, string, string?]> = [
    [
      "Athena Balance",
      DAILY_COLUMNS.athenaDose,
      "Wasser zuerst",
      "Nur nach Wasserchemie/Endmix titrieren",
    ],
    [textAt(plan, DAILY_COLUMNS.base), DAILY_COLUMNS.baseDose, "Basis"],
    ["CalMag", DAILY_COLUMNS.calMag, "Nur nach Bedarf"],
    ["Wurzel Complex", DAILY_COLUMNS.rootDose, "Definierte Frühgabe"],
    [
      "PowerZyme",
      DAILY_COLUMNS.powerZyme,
      "Support",
      "Nicht zusätzlich Sensizym im Referenzplan",
    ],
    ["SuperVit", DAILY_COLUMNS.superVit, "Mikrodosis"],
    ["HESI Boost", DAILY_COLUMNS.boost, "Blüte-Support"],
    [
      "PK13/14",
      DAILY_COLUMNS.pk,
      "PK-Modul",
      "Nicht mit Big Bud/Overdrive stapeln",
    ],
    ["Voodoo Juice", DAILY_COLUMNS.voodoo, "Frisch/manuell"],
    [
      "pH Down",
      DAILY_COLUMNS.phDown,
      "Ganz zum Schluss",
      "Nur nach finaler Endmix-Messung",
    ],
  ];
  return items
    .map(([name, column, role, warning]) => {
      const dose = numberAt(plan, column);
      return { name, dose, amount: dose * volume, role, warning };
    })
    .filter(
      (item) =>
        item.dose > 0 ||
        item.name === "Athena Balance" ||
        item.name === "pH Down",
    );
}

export function normalizedRows(sheet: WorkbookSheet): string[] {
  return sheet.values
    .map((row) =>
      row.filter((cell) => cell !== null && cell !== "").join(" · "),
    )
    .filter(Boolean);
}
