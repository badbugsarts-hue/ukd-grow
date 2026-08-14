import type { ExperienceLens, ScientificUnit } from "../../types";

export interface OptimalRange {
	phase: string;
	min: number;
	max: number;
	unit: ScientificUnit | string;
}

export interface TermDefinition {
	key: string;
	acronym: string;
	germanName: string;
	unit: ScientificUnit | string;
	category: "climate" | "light" | "nutrients" | "phase" | "plant";
	beginner: string;
	advanced: string;
	expert: string;
	optimalRanges?: OptimalRange[];
}

export const DICTIONARY: Record<string, TermDefinition> = {
	VPD: {
		key: "VPD",
		acronym: "VPD",
		germanName: "Dampfdruckdefizit",
		unit: "kPa",
		category: "climate",
		beginner:
			"VPD zeigt, wie stark die Luft Wasser aus den Blättern zieht. Passt der Wert, transpiriert die Pflanze optimal ohne zu vertrocknen.",
		advanced:
			"Differenz zwischen Sättigungsdampfdruck und tatsächlichem Dampfdruck der Luft. Steuert Transpiration und Nährstofftransport.",
		expert:
			"Zentraler Klimatreiber für Stomata-Leitfähigkeit. Zielwerte: Sämlinge 0.4–0.8 kPa, Vegi 0.8–1.1 kPa, Blüte 1.1–1.5 kPa, Spätblüte 1.3–1.6 kPa.",
		optimalRanges: [
			{ phase: "Sämling", min: 0.4, max: 0.8, unit: "kPa" },
			{ phase: "Vegetation", min: 0.8, max: 1.1, unit: "kPa" },
			{ phase: "Blüte", min: 1.1, max: 1.5, unit: "kPa" },
		],
	},
	DLI: {
		key: "DLI",
		acronym: "DLI",
		germanName: "Tägliches Lichtintegral",
		unit: "mol/m²/d",
		category: "light",
		beginner:
			"DLI misst die Gesamtmenge an Licht, die eine Pflanze an einem Tag erhält – wie die tägliche 'Licht-Ration'.",
		advanced:
			"Akkumulierte Photonenmenge (PAR) pro Quadratmeter und Tag, berechnet aus PPFD und Photoperiode.",
		expert:
			"DLI = PPFD × Lichtstunden × 3600 / 1.000.000. Zielwerte: Sämling 10–15, Vegi 20–30, Blüte 35–45+ mol/m²/d.",
		optimalRanges: [
			{ phase: "Sämling", min: 10, max: 15, unit: "mol/m²/d" },
			{ phase: "Vegetation", min: 20, max: 30, unit: "mol/m²/d" },
			{ phase: "Blüte", min: 35, max: 45, unit: "mol/m²/d" },
		],
	},
	EC: {
		key: "EC",
		acronym: "EC",
		germanName: "Elektrische Leitfähigkeit",
		unit: "mS/cm",
		category: "nutrients",
		beginner:
			"Der EC-Wert gibt an, wie viele Nährstoffsalze im Wasser gelöst sind. Ein zu hoher Wert verbrennt die Wurzeln.",
		advanced:
			"Maß für die Gesamtsalzkonzentration der Nährlösung in MilliSiemens pro Zentimeter.",
		expert:
			"Korreliert mit osmotischem Druck im Root-Zone. Zielwerte: Sämling 0.6–0.9, Vegi 1.2–1.6, Blüte Peak 1.8–2.2 mS/cm.",
		optimalRanges: [
			{ phase: "Sämling", min: 0.6, max: 0.9, unit: "mS/cm" },
			{ phase: "Vegetation", min: 1.2, max: 1.6, unit: "mS/cm" },
			{ phase: "Blüte", min: 1.8, max: 2.2, unit: "mS/cm" },
		],
	},
	pH: {
		key: "pH",
		acronym: "pH",
		germanName: "Säuregrad",
		unit: "pH",
		category: "nutrients",
		beginner:
			"Der pH-Wert bestimmt, ob die Wurzeln Nährstoffe überhaupt aufnehmen können. Optimal für Hydro/Erde liegt meist bei 5.8–6.5.",
		advanced:
			"Negativer dekadischer Logarithmus der Wasserstoffionen-Aktivität. Entscheidet über Löslichkeit von Ca, Mg, P, Fe.",
		expert:
			"Hydro/Kokus Optimalfenster: 5.5–6.2 (Drift erlaubt für maximale Mikronährstoffaufnahme). Erde Optimalfenster: 6.2–6.8.",
		optimalRanges: [
			{ phase: "Hydro/Kokus", min: 5.5, max: 6.2, unit: "pH" },
			{ phase: "Erde", min: 6.2, max: 6.8, unit: "pH" },
		],
	},
	PPFD: {
		key: "PPFD",
		acronym: "PPFD",
		germanName: "Photosynthetische Photonenflussdichte",
		unit: "µmol/m²/s",
		category: "light",
		beginner: "PPFD misst die aktuelle Lichtintensität auf Höhe der Blätter.",
		advanced:
			"Anzahl der verwertbaren Lichtquanten (400–700 nm) pro Quadratmeter und Sekunde.",
		expert:
			"Sämling: 150–300, Vegi: 400–600, Blüte: 700–1000+ µmol/m²/s (ohne CO2-Anreicherung Sättigung bei ~1050 µmol/m²/s).",
		optimalRanges: [
			{ phase: "Sämling", min: 150, max: 300, unit: "µmol/m²/s" },
			{ phase: "Vegetation", min: 400, max: 600, unit: "µmol/m²/s" },
			{ phase: "Blüte", min: 700, max: 1000, unit: "µmol/m²/s" },
		],
	},
	rF: {
		key: "rF",
		acronym: "rF",
		germanName: "Relative Luftfeuchtigkeit",
		unit: "%",
		category: "climate",
		beginner:
			"Zeigt den Feuchtigkeitsgehalt der Luft in Prozent. Zu hohe Feuchte in der Spätblüte fördert Schimmel (Botrytis).",
		advanced:
			"Verhältnis von tatsächlichem Wasserdampfdruck zum Sättigungsdampfdruck bei aktueller Temperatur.",
		expert:
			"Muss immer in Kombination mit Raumtemperatur betrachtet werden, um den Ziel-VPD einzustellen. Blüte-Ziel: <50-55% rF.",
		optimalRanges: [
			{ phase: "Sämling", min: 65, max: 75, unit: "%" },
			{ phase: "Vegetation", min: 55, max: 70, unit: "%" },
			{ phase: "Blüte", min: 40, max: 55, unit: "%" },
		],
	},
	"Leaf-VPD": {
		key: "Leaf-VPD",
		acronym: "Leaf-VPD",
		germanName: "Blattoberflächen-VPD",
		unit: "kPa",
		category: "climate",
		beginner:
			"Das echte VPD direkt an der Blattoberfläche unter Berücksichtigung der Blatt-Temperatur (meist 1–2°C kühler als die Luft).",
		advanced:
			"Präzisere VPD-Berechnung basierend auf gemessener Blatttemperatur (T_leaf) statt reiner Lufttemperatur (T_air).",
		expert:
			"UKD-Modell nutzt T_leaf = T_air + offset (Standard -1°C unter LED Transpiration). Vermeidet Messfehler bei hoher LED-Strahlung.",
		optimalRanges: [
			{ phase: "Vegetation", min: 0.8, max: 1.1, unit: "kPa" },
			{ phase: "Blüte", min: 1.1, max: 1.4, unit: "kPa" },
		],
	},
	BT: {
		key: "BT",
		acronym: "BT",
		germanName: "Blütetag",
		unit: "Tage",
		category: "phase",
		beginner:
			"Zählt die Anzahl der Tage seit der Umstellung der Photoperiode auf 12/12 Licht (oder ersten Blütenanzeichen).",
		advanced:
			"Tageszahl ab Blüteinduktion. Bestimmt den Nährstoff- und Lichtbedarf laut Zuchtplan.",
		expert:
			"Phasen-Einteilung: Stretch (BT 1–21), Peak Blüte (BT 22–42), Reife & Flush (BT 43+).",
	},
	BW: {
		key: "BW",
		acronym: "BW",
		germanName: "Blütewoche",
		unit: "Wochen",
		category: "phase",
		beginner: "Gibt die aktuelle Blütewoche an (z.B. BW 3 = Blütetag 15–21).",
		advanced:
			"Wochenabschnitt der generativen Phase zur Zuordnung im Düngeschema.",
		expert: "Berechnet als Math.floor((BT - 1) / 7) + 1.",
	},
	VT: {
		key: "VT",
		acronym: "VT",
		germanName: "Vegetationstag",
		unit: "Tage",
		category: "phase",
		beginner:
			"Zählt die Tage des vegetativen Wachstums (18/6 Licht) ab den ersten echten Blättern.",
		advanced: "Tageszahl in der Vegetationsphase vor der Blüteeinleitung.",
		expert:
			"Fokus auf Wurzelaufbau, Strukturierung (Topping/LST) und Etablierung des Vorgelege-Klimas.",
	},
	VW: {
		key: "VW",
		acronym: "VW",
		germanName: "Vegetationswoche",
		unit: "Wochen",
		category: "phase",
		beginner: "Gibt die vegetative Woche an.",
		advanced: "Wochenabschnitt der Vegetationsphase.",
		expert: "Berechnet als Math.floor((VT - 1) / 7) + 1.",
	},
	"Drain-EC": {
		key: "Drain-EC",
		acronym: "Drain-EC",
		germanName: "Drain-Leitfähigkeit",
		unit: "mS/cm",
		category: "nutrients",
		beginner:
			"Der EC-Wert des auslaufenden Wassers. Ist er viel höher als der Giess-EC, sammeln sich Salze im Topf an.",
		advanced:
			"EC-Wert des Ablaufwassers (Runoff). Zeigt Versalzung oder Nährstoffmangel im Substrat an.",
		expert:
			"Ziel: Drain-EC sollte maximal 0.2–0.4 mS/cm über Input-EC liegen. Bei Delta > 0.6 mS/cm Spülung/Dryback anpassen.",
	},
	"Drain-pH": {
		key: "Drain-pH",
		acronym: "Drain-pH",
		germanName: "Drain-Säuregrad",
		unit: "pH",
		category: "nutrients",
		beginner:
			"Der pH-Wert des auslaufenden Wassers. Er verrät, wie sich der pH-Wert in der Wurzelzone verändert hat.",
		advanced: "pH-Wert des Ablaufwassers zur Diagnose der Wurzelzonen-Chemie.",
		expert:
			"Sinkender Drain-pH deutet auf Kationenaustausch / Ammonium-Aufnahme hin; steigender Drain-pH auf Nitrat-Aufnahme.",
	},
	"Substrat-EC": {
		key: "Substrat-EC",
		acronym: "Substrat-EC",
		germanName: "Wurzelzonen-EC",
		unit: "mS/cm",
		category: "nutrients",
		beginner: "Die tatsächliche Salzkonzentration direkt im Wurzelbereich.",
		advanced: "Effektiver EC im Porenwasser des Substrats (Pore Water EC).",
		expert:
			"Abschätzung über 1:2 Extrakt oder WGT (Pore Water = 2-3x Bulk EC bei Sättigung).",
	},
};

const ALIAS_MAP: Record<string, string> = {
	vpd: "VPD",
	dli: "DLI",
	ec: "EC",
	ph: "pH",
	ppfd: "PPFD",
	rf: "rF",
	rh: "rF",
	"leaf-vpd": "Leaf-VPD",
	leaf_vpd: "Leaf-VPD",
	leafvpd: "Leaf-VPD",
	blattvpd: "Leaf-VPD",
	"blatt-vpd": "Leaf-VPD",
	bt: "BT",
	bw: "BW",
	vt: "VT",
	vw: "VW",
	"drained-ec": "Drain-EC",
	"drain-ec": "Drain-EC",
	drainec: "Drain-EC",
	"drain-ph": "Drain-pH",
	drainph: "Drain-pH",
	"substrat-ec": "Substrat-EC",
	substratec: "Substrat-EC",
};

export function getTermDefinition(term: string): TermDefinition | undefined {
	if (!term) return undefined;
	if (DICTIONARY[term]) return DICTIONARY[term];
	const normalized = term.trim().toLowerCase();
	const matchedKey = ALIAS_MAP[normalized];
	if (matchedKey && DICTIONARY[matchedKey]) {
		return DICTIONARY[matchedKey];
	}
	return undefined;
}

export function getTermDescription(
	term: string,
	lens: ExperienceLens = "guided",
): string {
	const def = getTermDefinition(term);
	if (!def) return `Fachbegriff "${term}"`;
	switch (lens) {
		case "expert":
			return def.expert;
		case "advanced":
			return def.advanced;
		default:
			return def.beginner;
	}
}

export function searchTerms(query: string): TermDefinition[] {
	if (!query?.trim()) return Object.values(DICTIONARY);
	const q = query.toLowerCase().trim();
	return Object.values(DICTIONARY).filter(
		(item) =>
			item.key.toLowerCase().includes(q) ||
			item.acronym.toLowerCase().includes(q) ||
			item.germanName.toLowerCase().includes(q) ||
			item.beginner.toLowerCase().includes(q) ||
			item.advanced.toLowerCase().includes(q) ||
			item.expert.toLowerCase().includes(q),
	);
}

export function getAllTerms(): TermDefinition[] {
	return Object.values(DICTIONARY);
}
