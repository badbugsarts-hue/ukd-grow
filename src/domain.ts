import type {
	CellValue,
	DayZeroAnchor,
	EnergyReading,
	GrowthEvent,
	IrrigationEvent,
	PotProfile,
	PpfdMapPoint,
	RunEnergySummary,
	Workbook,
	WorkbookSheet,
} from "./types";

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
	if (value === null || value === undefined) return "—";

	let dateObj: Date;
	if (typeof value === "number") {
		dateObj = excelSerialToDate(value);
	} else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
		dateObj = new Date(value);
	} else {
		return String(value);
	}

	return new Intl.DateTimeFormat("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "UTC",
	}).format(dateObj);
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

export function calculateRunEnergySummary(
	energyReadings: EnergyReading[],
	costPerKwh: number,
	finalDryGrams: number | null,
): RunEnergySummary {
	const lightingKwh = energyReadings
		.filter((r) => r.category === "lighting")
		.reduce((sum, r) => sum + r.kwhEstimate, 0);
	const climateKwh = energyReadings
		.filter((r) =>
			[
				"exhaust",
				"circulation",
				"dehumidification",
				"humidification",
				"heating",
			].includes(r.category),
		)
		.reduce((sum, r) => sum + r.kwhEstimate, 0);
	const irrigationKwh = energyReadings
		.filter((r) => r.category === "pumps")
		.reduce((sum, r) => sum + r.kwhEstimate, 0);
	const totalKwh = energyReadings.reduce((sum, r) => sum + r.kwhEstimate, 0);
	return {
		lightingKwh,
		climateKwh,
		irrigationKwh,
		totalKwh,
		costPerKwh,
		totalCost: totalKwh * costPerKwh,
		gramsPerKwh:
			finalDryGrams !== null && totalKwh > 0 ? finalDryGrams / totalKwh : null,
	};
}

export function calculateDrybackRate(events: IrrigationEvent[]): {
	avgDrybackGramsPerHour: number | null;
	trend: "stable" | "increasing" | "decreasing";
} {
	const pairs = events
		.filter(
			(e) =>
				e.potMassBeforeGrams !== null &&
				e.potMassAfterGrams !== null &&
				e.timeSinceLastIrrigationMin !== null &&
				e.timeSinceLastIrrigationMin > 0,
		)
		.map((e) => ({
			dryback:
				e.potMassAfterGrams! - e.potMassBeforeGrams! > 0
					? e.potMassAfterGrams! - e.potMassBeforeGrams!
					: 0,
			hoursElapsed: e.timeSinceLastIrrigationMin! / 60,
			massLost:
				e.potMassAfterGrams !== null && e.potMassBeforeGrams !== null
					? Math.abs(e.potMassAfterGrams - e.potMassBeforeGrams)
					: 0,
		}));
	if (pairs.length === 0)
		return { avgDrybackGramsPerHour: null, trend: "stable" };
	const rates = pairs.map((p) => p.massLost / p.hoursElapsed);
	const avg = rates.reduce((s, r) => s + r, 0) / rates.length;
	let trend: "stable" | "increasing" | "decreasing" = "stable";
	if (rates.length >= 3) {
		const recent = rates.slice(-3).reduce((s, r) => s + r, 0) / 3;
		if (recent > avg * 1.15) trend = "increasing";
		else if (recent < avg * 0.85) trend = "decreasing";
	}
	return { avgDrybackGramsPerHour: Math.round(avg * 10) / 10, trend };
}

export interface PpfdMapSummary {
	mean: number;
	min: number;
	max: number;
	uniformity: number; // min / mean
}

export function calculatePpfdMapSummary(
	points: PpfdMapPoint[],
	fixtureHeightCm: number,
	dimmerPercent: number,
): PpfdMapSummary {
	if (!Array.isArray(points) || points.length === 0) {
		return { mean: 0, min: 0, max: 0, uniformity: 0 };
	}

	const safeDimmer = Number.isFinite(dimmerPercent)
		? Math.max(0, Math.min(100, dimmerPercent)) / 100
		: 1;

	const validValues = points
		.map((p) => (p && typeof p.ppfd === "number" && Number.isFinite(p.ppfd) ? p.ppfd * safeDimmer : null))
		.filter((v): v is number => v !== null && v >= 0);

	if (validValues.length === 0) {
		return { mean: 0, min: 0, max: 0, uniformity: 0 };
	}

	const sum = validValues.reduce((acc, val) => acc + val, 0);
	const mean = Math.round((sum / validValues.length) * 10) / 10;
	const min = Math.round(Math.min(...validValues) * 10) / 10;
	const max = Math.round(Math.max(...validValues) * 10) / 10;
	const uniformity = mean > 0 ? Math.round((min / mean) * 1000) / 1000 : 0;

	return { mean, min, max, uniformity };
}

export function calculateBiologicalPlantAge(
	dayZeroAnchor: DayZeroAnchor,
	growthEvents: GrowthEvent[],
	now = new Date(),
): {
	biologicalAgeDays: number;
	operationalAgeDays: number;
	anchorDateString: string;
	germinationDays?: number;
} {
	const safeEvents = Array.isArray(growthEvents)
		? growthEvents.filter((e): e is GrowthEvent => Boolean(e && typeof e === "object" && typeof e.kind === "string" && typeof e.occurredAt === "string"))
		: [];

	// Find operational start event
	const opEvent = safeEvents.find(
		(e) => e.kind === "run-operational-start" || e.kind === "seed-started" || e.kind === "seed-planted",
	);

	const sortedEvents = [...safeEvents].sort(
		(a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
	);
	const earliestEvent = sortedEvents[0];

	const opDate = opEvent
		? new Date(opEvent.occurredAt)
		: earliestEvent
			? new Date(earliestEvent.occurredAt)
			: now;

	const isOpDateValid = !Number.isNaN(opDate.getTime());
	const operationalAgeDays = isOpDateValid
		? Math.max(0, Math.floor((now.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24)))
		: 0;

	// Derive germination duration if both seed event and emergence event exist
	const seedEvent = safeEvents.find(
		(e) => e.kind === "seed-planted" || e.kind === "seed-started",
	);
	const emergenceEv = safeEvents.find((e) => e.kind === "emergence");
	let germinationDays: number | undefined;
	if (seedEvent && emergenceEv) {
		const sTime = new Date(seedEvent.occurredAt).getTime();
		const eTime = new Date(emergenceEv.occurredAt).getTime();
		if (!Number.isNaN(sTime) && !Number.isNaN(eTime)) {
			germinationDays = Math.max(0, Math.floor((eTime - sTime) / (1000 * 60 * 60 * 24)));
		}
	}

	// Find anchor event
	const anchorEvent = safeEvents.find((e) => e.kind === dayZeroAnchor);

	if (!anchorEvent) {
		const fallbackAnchorString = isOpDateValid
			? opDate.toISOString()
			: opEvent
				? opEvent.occurredAt
				: earliestEvent
					? earliestEvent.occurredAt
					: !Number.isNaN(now.getTime())
						? now.toISOString()
						: new Date().toISOString();

		return {
			biologicalAgeDays: operationalAgeDays,
			operationalAgeDays,
			anchorDateString: fallbackAnchorString,
			...(germinationDays !== undefined ? { germinationDays } : {}),
		};
	}

	const anchorDate = new Date(anchorEvent.occurredAt);
	const isAnchorDateValid = !Number.isNaN(anchorDate.getTime());
	const biologicalAgeDays = isAnchorDateValid
		? Math.max(0, Math.floor((now.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)))
		: 0;

	return {
		biologicalAgeDays,
		operationalAgeDays,
		anchorDateString: anchorEvent.occurredAt,
		...(germinationDays !== undefined ? { germinationDays } : {}),
	};
}

export interface SubstrateHydration {
	state: "VALID" | "UNKNOWN" | "INSUFFICIENT_DATA";
	hydrationPercent: number | null;
	depletionPercent: number | null;
	availableWaterGrams: number | null;
	category: "dry" | "light" | "medium" | "heavy" | "saturated" | "unknown";
	drybackRateGramsPerHour?: number;
	reason?: string;
}

export function calculateSubstrateHydration(
	currentMassGrams: number,
	potProfile: PotProfile,
): SubstrateHydration {
	const emptyMass = potProfile.emptyMassGrams;

	if (emptyMass === undefined || emptyMass === null) {
		return {
			state: "INSUFFICIENT_DATA",
			hydrationPercent: null,
			depletionPercent: null,
			availableWaterGrams: null,
			category: "unknown",
			reason: "EMPTY_MASS_MISSING",
		};
	}

	if (!Number.isFinite(currentMassGrams) || Number.isNaN(currentMassGrams)) {
		return {
			state: "UNKNOWN",
			hydrationPercent: null,
			depletionPercent: null,
			availableWaterGrams: null,
			category: "unknown",
			reason: "INVALID_CURRENT_MASS",
		};
	}

	if (currentMassGrams < emptyMass) {
		return {
			state: "UNKNOWN",
			hydrationPercent: null,
			depletionPercent: null,
			availableWaterGrams: null,
			category: "unknown",
			reason: "MASS_BELOW_TARE",
		};
	}

	const satMass = potProfile.saturatedMassGrams;

	if (satMass === undefined || satMass === null || satMass <= emptyMass) {
		return {
			state: "INSUFFICIENT_DATA",
			hydrationPercent: null,
			depletionPercent: null,
			availableWaterGrams: null,
			category: "unknown",
			reason: "SATURATION_REFERENCE_MISSING",
		};
	}

	if (currentMassGrams > satMass * 1.05) {
		return {
			state: "UNKNOWN",
			hydrationPercent: null,
			depletionPercent: null,
			availableWaterGrams: null,
			category: "unknown",
			reason: "MASS_EXCEEDS_SATURATION",
		};
	}

	const availableWaterCapacity = satMass - emptyMass;
	const currentWaterGrams = currentMassGrams - emptyMass;

	const hydrationPercent = Math.min(
		100,
		Math.max(0, Math.round((currentWaterGrams / availableWaterCapacity) * 100)),
	);

	const depletionPercent = 100 - hydrationPercent;
	const availableWaterGrams = Math.round(currentWaterGrams);

	let category: "dry" | "light" | "medium" | "heavy" | "saturated" | "unknown";
	if (hydrationPercent < 20) category = "dry";
	else if (hydrationPercent < 40) category = "light";
	else if (hydrationPercent < 70) category = "medium";
	else if (hydrationPercent < 90) category = "heavy";
	else category = "saturated";

	return {
		state: "VALID",
		hydrationPercent,
		depletionPercent,
		availableWaterGrams,
		category,

	};
}

