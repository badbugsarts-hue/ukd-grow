import type React from "react";
import { useMemo, useState } from "react";
import type { DayPlan, ExperienceLens, RouteId, RunPackage } from "../../types";
import LensBadge from "../common/LensBadge";
import TermTooltip from "../common/TermTooltip";

// ── Types & Data Structure ──

export type GlossaryCategory =
	| "all"
	| "klima"
	| "naehrstoffe"
	| "substrat"
	| "ertrag"
	| "recht"
	| "allgemein";

export type ImportanceLevel = "critical" | "high" | "medium" | "low";

export interface TargetRangeItem {
	phase: string;
	min: number;
	max: number;
	unit: string;
}

export interface UnifiedGlossaryItem {
	id: string;
	key: string;
	acronym: string;
	germanName: string;
	category: GlossaryCategory;
	categoryLabel: string;
	beginner: string;
	advanced: string;
	expert: string;
	unit?: string;
	importance: ImportanceLevel;
	evidenceGrade?: "A" | "B" | "C" | "D" | "E";
	evidenceLabel?: string;
	scope?: string;
	uncertainty?: string;
	sourceIds?: string[];
	optimalRanges?: TargetRangeItem[];
	formula?: string;
	formulaDescription?: string;
	operatorTips?: string[];
	tags: string[];
}

export interface ContextHelpGlossaryPanelProps {
	run?: RunPackage;
	plan?: DayPlan;
	lens?: ExperienceLens;
	onUpdateRun?: (updatedRun: RunPackage) => void;
	navigate?: (route: RouteId) => void;
	initialCategory?: GlossaryCategory;
	initialSearchQuery?: string;
}

// ── Category Definitions ──

const CATEGORIES: Array<{ id: GlossaryCategory; label: string; icon: string }> =
	[
		{ id: "all", label: "Alle", icon: "🌐" },
		{ id: "klima", label: "Klima", icon: "🌡️" },
		{ id: "naehrstoffe", label: "Nährstoffe", icon: "🧪" },
		{ id: "substrat", label: "Substrat", icon: "🪴" },
		{ id: "ertrag", label: "Ertrag & Licht", icon: "💡" },
		{ id: "recht", label: "Recht & Schutz", icon: "⚖️" },
		{ id: "allgemein", label: "Allgemein", icon: "⚙️" },
	];

// ── Master Canonical Glossary Dataset ──

const UNIFIED_GLOSSARY_ITEMS: UnifiedGlossaryItem[] = [
	{
		id: "vpd",
		key: "VPD",
		acronym: "VPD",
		germanName: "Dampfdruckdefizit",
		category: "klima",
		categoryLabel: "Klima & Transpiration",
		unit: "kPa",
		importance: "critical",
		evidenceGrade: "A",
		evidenceLabel: "ASHRAE Standard / Physikalische Evidenz",
		beginner:
			"VPD zeigt, wie stark die Luft Wasser aus den Blättern zieht. Passt der Wert, transpiriert die Pflanze optimal ohne zu vertrocknen.",
		advanced:
			"Differenz zwischen Sättigungsdampfdruck und tatsächlichem Dampfdruck der Luft. Steuert die Stomata-Öffnung und den Nährstofftransport im Xylem.",
		expert:
			"Zentraler Transpirations-Treiber. Berechnet über Leaf-VPD = SVP(T_leaf) - VP(T_air, RH). Zielkorridore: Sämling 0.4–0.8 kPa, Vegi 0.8–1.1 kPa, Blüte 1.1–1.5 kPa.",
		optimalRanges: [
			{ phase: "Sämling (Tag 0–7)", min: 0.4, max: 0.8, unit: "kPa" },
			{ phase: "Vegetation (Tag 8–28)", min: 0.8, max: 1.1, unit: "kPa" },
			{ phase: "Hauptblüte (Tag 29–63)", min: 1.1, max: 1.5, unit: "kPa" },
			{ phase: "Spätblüte (Tag 64–80)", min: 1.3, max: 1.6, unit: "kPa" },
		],
		formula: "VPD = SVP(T_leaf) - VP(T_air, RH)",
		formulaDescription:
			"SVP (Sättigungsdampfdruck) bei Blatttemperatur abzüglich aktuellem Wasserdampfdruck der Raumluft.",
		operatorTips: [
			"Infrarot-Pyrometer nutzen: Unter LED liegt die Blatttemperatur meist 1–2 °C unter der Lufttemperatur.",
			"VPD > 1.6 kPa führt zu Stomata-Schluss und Wachstumsstopp zum Verdunstungsschutz.",
			"VPD < 0.4 kPa blockiert den Nährstofftransport nach oben und erhöht das Botrytis-Risiko.",
		],
		tags: ["klima", "transpiration", "stomata", "temperatur", "feuchtigkeit"],
	},
	{
		id: "dli",
		key: "DLI",
		acronym: "DLI",
		germanName: "Tägliches Lichtintegral",
		category: "ertrag",
		categoryLabel: "Ertrag & Beleuchtung",
		unit: "mol/m²/d",
		importance: "high",
		evidenceGrade: "A",
		evidenceLabel: "HortScience Review Evidenz",
		beginner:
			"DLI misst die Gesamtmenge an Licht, die eine Pflanze an einem Tag erhält – wie die tägliche 'Licht-Ration'.",
		advanced:
			"Akkumulierte Photonenmenge der photosynthetisch aktiven Strahlung (PAR) pro m² und Tag, berechnet aus PPFD und Photoperiode.",
		expert:
			"DLI = PPFD × Lichtstunden × 3600 / 1.000.000. Zielwerte: Sämling 10–15, Vegi 20–30, Blüte 35–45+ mol/m²/d.",
		optimalRanges: [
			{ phase: "Sämling", min: 10, max: 15, unit: "mol/m²/d" },
			{ phase: "Vegetation", min: 20, max: 30, unit: "mol/m²/d" },
			{ phase: "Hauptblüte", min: 35, max: 45, unit: "mol/m²/d" },
		],
		formula: "DLI = PPFD × Lichtstunden × 3600 / 1.000.000",
		formulaDescription:
			"Umrechnung von Mikromol pro Sekunde auf die Gesamtsumme Mol pro Quadratmeter am Tag.",
		operatorTips: [
			"Bei Autoflowers erlaubt eine 18h- oder 20h-Photoperiode hohe DLIs bei moderaterem PPFD (reduziert Hitzestress).",
			"Ohne zusätzliche CO₂-Anreicherung tritt bei >45 mol/m²/d Sättigung ein.",
		],
		tags: ["licht", "ppfd", "photoperiode", "par", "ertrag"],
	},
	{
		id: "ec",
		key: "EC",
		acronym: "EC",
		germanName: "Elektrische Leitfähigkeit",
		category: "naehrstoffe",
		categoryLabel: "Nährstoffe & Salze",
		unit: "mS/cm",
		importance: "critical",
		evidenceGrade: "A",
		evidenceLabel: "Physikochemischer Standard",
		beginner:
			"Der EC-Wert gibt an, wie viele Nährstoffsalze im Wasser gelöst sind. Ein zu hoher Wert verbrennt die Wurzeln.",
		advanced:
			"Maß für die Gesamtsalzkonzentration der Nährlösung in MilliSiemens pro Zentimeter (mS/cm).",
		expert:
			"Bestimmt den osmotischen Druck im Substrat. Zielwerte Coco: Sämling 0.6–0.9, Vegi 1.2–1.6, Blüte Peak 1.8–2.2 mS/cm.",
		optimalRanges: [
			{ phase: "Sämling", min: 0.6, max: 0.9, unit: "mS/cm" },
			{ phase: "Vegetation", min: 1.2, max: 1.6, unit: "mS/cm" },
			{ phase: "Blüte Peak", min: 1.8, max: 2.2, unit: "mS/cm" },
		],
		formula: "EC_total = EC_wasser + EC_duenger",
		formulaDescription:
			"Summe aus Leitungswasser-Grund-EC und hinzugefügter Düngersalz-Konzentration.",
		operatorTips: [
			"EC-Messung immer temperaturkompensiert bei 25 °C durchführen.",
			"Liegt der Ausgangs-EC des Leitungswassers über 0.4 mS/cm, mit Osmosewasser verschneiden.",
		],
		tags: ["nährstoffe", "salzgehalt", "dünger", "hesi", "ec"],
	},
	{
		id: "ph",
		key: "pH",
		acronym: "pH",
		germanName: "Säuregrad",
		category: "naehrstoffe",
		categoryLabel: "Nährstoffe & Salze",
		unit: "pH",
		importance: "critical",
		evidenceGrade: "A",
		evidenceLabel: "Chemie-Standard",
		beginner:
			"Der pH-Wert bestimmt, ob die Wurzeln Nährstoffe überhaupt aufnehmen können. Für Hydro/Kokus liegt das Fenster bei 5.8–6.2.",
		advanced:
			"Negativer dekadischer Logarithmus der H⁺-Ionen-Aktivität. Entscheidet über die Löslichkeit und Bioverfügbarkeit von N, P, K, Ca, Mg, Fe.",
		expert:
			"Hydro/Coco Optimalfenster: 5.5–6.2 (Leichter Drift fördert abwechselnde Nährstoff-Aufnahme). Erde Optimalfenster: 6.2–6.8.",
		optimalRanges: [
			{ phase: "Hydro / Coco", min: 5.5, max: 6.2, unit: "pH" },
			{ phase: "Erde", min: 6.2, max: 6.8, unit: "pH" },
		],
		formula: "pH = -log10[H+]",
		formulaDescription:
			"Logarithmische Skala der Wasserstoffionenkonzentration.",
		operatorTips: [
			"pH-Wert erst ganz zum Schluss NACH der Beigabe aller Düngerkomponenten einstellen.",
			"pH-Messgerät mindestens alle 2 bis 4 Wochen mit Pufferlösungen (pH 4.01 / 7.01) kalibrieren.",
		],
		tags: ["ph", "säuregrad", "nährstoffaufnahme", "verfügbarkeit"],
	},
	{
		id: "ppfd",
		key: "PPFD",
		acronym: "PPFD",
		germanName: "Photosynthetische Photonenflussdichte",
		category: "ertrag",
		categoryLabel: "Ertrag & Beleuchtung",
		unit: "µmol/m²/s",
		importance: "high",
		evidenceGrade: "A",
		evidenceLabel: "Frontiers in Plant Science 2021",
		beginner:
			"PPFD misst die aktuelle Lichtintensität, die auf der Blattoberfläche ankommt.",
		advanced:
			"Anzahl der verwertbaren Lichtquanten (400–700 nm PAR) pro Quadratmeter und Sekunde.",
		expert:
			"Sämling: 150–300, Vegi: 400–600, Blüte: 700–1000 µmol/m²/s. Maximale Sättigung ohne CO₂ bei ~1050 µmol/m²/s.",
		optimalRanges: [
			{ phase: "Sämling", min: 150, max: 300, unit: "µmol/m²/s" },
			{ phase: "Vegetation", min: 400, max: 600, unit: "µmol/m²/s" },
			{ phase: "Blüte Peak", min: 700, max: 1000, unit: "µmol/m²/s" },
		],
		operatorTips: [
			"PPFD an den höchsten Blütenkolben messen, nicht am Zeltboden.",
			"Auf gleichmäßige Hängehöhe der LED achten, um Ausleuchtungs-Hotspots zu vermeiden.",
		],
		tags: ["ppfd", "licht", "led", "par", "intensität"],
	},
	{
		id: "rf",
		key: "rF",
		acronym: "rF",
		germanName: "Relative Luftfeuchtigkeit",
		category: "klima",
		categoryLabel: "Klima & Transpiration",
		unit: "%",
		importance: "high",
		evidenceGrade: "A",
		evidenceLabel: "Meteorologischer Standard",
		beginner:
			"Zeigt den Feuchtigkeitsgehalt der Luft in Prozent. Zu hohe Feuchte in der Spätblüte verursacht Schimmel (Botrytis).",
		advanced:
			"Verhältnis von tatsächlichem Wasserdampfdruck zum Sättigungsdampfdruck bei der gemessenen Temperatur.",
		expert:
			"Muss stets gekoppelt mit der Temperatur (VPD) bewertet werden. Blüte-Ziel: <50 % rF zur Vermeidung von Grauschimmel.",
		optimalRanges: [
			{ phase: "Sämling", min: 65, max: 75, unit: "%" },
			{ phase: "Vegetation", min: 55, max: 70, unit: "%" },
			{ phase: "Hauptblüte", min: 40, max: 55, unit: "%" },
			{ phase: "Spätblüte", min: 38, max: 48, unit: "%" },
		],
		operatorTips: [
			"In den letzten 3 Blütewochen rF strikt unter 50 % halten.",
			"Umluft-Ventilator nie direkt auf die Blüten blasen lassen, sondern sanft durch den Bestand strömen lassen.",
		],
		tags: ["luftfeuchtigkeit", "rf", "rh", "klima", "schimmel"],
	},
	{
		id: "legal_kcang_eigenanbau",
		key: "KCanG §9",
		acronym: "KCanG §9",
		germanName: "Privater Eigenanbau (KCanG Deutschland)",
		category: "recht",
		categoryLabel: "Recht & Compliance",
		importance: "critical",
		evidenceGrade: "A",
		evidenceLabel: "KCanG Gesetzestext § 9",
		beginner:
			"Volljährige Personen dürfen in Deutschland am Wohnsitz gleichzeitig höchstens 3 Cannabispflanzen privat anbauen.",
		advanced:
			"Regelung nach KCanG § 9. Weitergabe aus privatem Eigenanbau an Dritte ist verboten. Keine kommerzielle Verwertung.",
		expert:
			"Rechtsbasis KCanG § 9 & § 10. Eigenanbau ist strikt personen- und wohnsitzgebunden. Pflanzennummerierung und Zugriffsschutz erforderlich.",
		scope: "Deutschland; privater Wohnsitz",
		uncertainty:
			"Rechtslage vor Releasing und Ernte stets erneut auf Gesetzesänderungen prüfen.",
		operatorTips: [
			"Maximal 3 lebende Pflanzen gleichzeitig pro volljähriger Person am Wohnsitz halten.",
			"Anbaufläche / Zelt vor dem Zugriff von Kindern und Dritten sichern (Abschließbarer Raum oder Schloss).",
		],
		tags: ["recht", "kcang", "eigenanbau", "gesetz", "deutschland"],
	},
	{
		id: "legal_kcang_besitz",
		key: "KCanG §3",
		acronym: "KCanG §3",
		germanName: "Erlaubter Besitz von Cannabis (KCanG)",
		category: "recht",
		categoryLabel: "Recht & Compliance",
		importance: "critical",
		evidenceGrade: "A",
		evidenceLabel: "KCanG Gesetzestext § 3 & § 10",
		beginner:
			"Am Wohnsitz sind bis zu 50 Gramm getrocknetes Cannabis erlaubt. Ernteüberschüsse müssen vernichtet werden.",
		advanced:
			"Volljährige dürfen am Wohnsitz bis zu 50 g getrocknetes Konsumcannabis besitzen. Zugriffsschutz vor Dritten ist Pflicht.",
		expert:
			"50g Trockengewicht-Grenze am Wohnsitz (§ 3 Abs. 2 KCanG). Ertragsüberschuss erfordert ein dokumentiertes Vernichtungsprotokoll.",
		operatorTips: [
			"Getrocknete Ernte wiegen und dokumentieren. Überschüsse über 50 g unverzüglich vernichten und im Logbuch protokollieren.",
		],
		tags: ["besitz", "kcang", "50g", "trockengewicht", "vernichtung"],
	},
	{
		id: "legal_medcang",
		key: "MedCanG §4",
		acronym: "MedCanG §4",
		germanName: "Medizinalcannabis & BfArM-Erlaubnis",
		category: "recht",
		categoryLabel: "Recht & Compliance",
		importance: "high",
		evidenceGrade: "A",
		evidenceLabel: "MedCanG Gesetzestext / BfArM",
		beginner:
			"Medizinalcannabis aus der Apotheke ist ein eigener Rechtsweg und verschmilzt nicht automatisch mit dem KCanG-Anbau.",
		advanced:
			"Ein Rezept berechtigt zur Abgabe über die Apotheke, erlaubt jedoch nicht den privaten Anbau eigener Pflanzen als Medizinalcannabis.",
		expert:
			"Anbau zu medizinischen Zwecken erfordert eine gewerbliche Erlaubnis nach § 4 MedCanG. Rezeptbestand und Eigenanbau getrennt bilanzieren.",
		operatorTips: [
			"Apothekenbezug laut Rezept getrennt von Eigenanbau-Mengen im Logbuch führen.",
		],
		tags: ["medcang", "rezept", "apotheke", "medizinalcannabis", "bfarm"],
	},
	{
		id: "athena_balance",
		key: "Athena Balance",
		acronym: "Athena Balance",
		germanName: "Athena Balance & Wasseraufbereitung",
		category: "naehrstoffe",
		categoryLabel: "Nährstoffe & Salze",
		importance: "medium",
		evidenceGrade: "A",
		evidenceLabel: "Hersteller-Spezifikation (Athena Ag)",
		beginner:
			"Athena Balance ist ein Wasseraufbereiter und pH-Puffer für Osmosewasser. Er wird VOR den Nährstoffen ins Wasser gegeben.",
		advanced:
			"Kaliumsilikat-Puffer für RO-Wasser. Stabilisiert die Alkalinität und den pH-Wert vor Beigabe von Hauptdüngern.",
		expert:
			"Athena empfiehlt Zugabe als ersten Mischschritt. UKD-Invariante: Unbekannte Wasserchemie erzeugt keine automatische Dosis im System.",
		operatorTips: [
			"Immer vor den A/B-Düngern ins RO-Wasser einrühren und gründlich auflösen lassen.",
		],
		tags: ["athena", "balance", "silikat", "ph-puffer", "mischreihenfolge"],
	},
	{
		id: "hesi_coco",
		key: "HESI Coco",
		acronym: "HESI Coco",
		germanName: "HESI Coco Düngerschema & Vorgaben",
		category: "naehrstoffe",
		categoryLabel: "Nährstoffe & Salze",
		importance: "medium",
		evidenceGrade: "A",
		evidenceLabel: "Hersteller-Label (HESI B.V.)",
		beginner:
			"HESI empfiehlt 50 ml pro 10 L Wasser für Coco. Das UKD-System nutzt angepasste, wissenschaftlich reduzierte Dosen.",
		advanced:
			"Herstellerangabe: 50 ml/10 L Coco bei jedem Gießen, pH 5.8–6.2. UKD-Invariante: HESI PK nicht additiv mit Fremd-Boostern stapeln.",
		expert:
			"Hersteller-Label gibt Anwendungsrahmen vor, stellt jedoch keine unabhängige Efficacy-Studie dar. UKD dosiert bedarfsorientiert.",
		operatorTips: [
			"HESI PK 13/14 nicht mit anderen Blüteboostern (z.B. Overdrive) kombinieren.",
		],
		tags: ["hesi", "coco", "düngerschema", "label", "dosierung"],
	},
	{
		id: "tropf_blumat",
		key: "Tropf-Blumat",
		acronym: "Tropf-Blumat",
		germanName: "Tropf-Blumat Bestimmungsgemäße Verwendung",
		category: "substrat",
		categoryLabel: "Substrat & Bewässerung",
		importance: "medium",
		evidenceGrade: "A",
		evidenceLabel: "Hersteller-Handbuch (Blumat)",
		beginner:
			"Tropf-Blumat ist laut Hersteller für den Außenbereich gedacht und kein UKD-Referenzsystem für Indoor.",
		advanced:
			"Hersteller-Scope-Grenze: Outdoor-Nutzung. Die Indoor-Anwendung erfolgt außerhalb der dokumentierten Zweckbestimmung.",
		expert:
			"UKD-Invariante: Tropf-Blumat ist kein Referenzsystem für kontrollierte Indoor-Substrat-Drybacks.",
		operatorTips: [
			"Beim Indoor-Einsatz von Blumat immer eine Sicherheits-Auffangwanne verwenden.",
		],
		tags: ["blumat", "bewässerung", "outdoor", "substrat", "hersteller-scope"],
	},
	{
		id: "post_harvest_aw",
		key: "a_w Wert",
		acronym: "a_w",
		germanName: "Wasseraktivität (Post-Harvest Curing)",
		category: "ertrag",
		categoryLabel: "Ertrag & Trocknung",
		importance: "high",
		evidenceGrade: "B",
		evidenceLabel: "PMC Review (Processes 2022)",
		beginner:
			"Die Wasseraktivität (a_w) misst die verfügbare Feuchtigkeit in den Blüten. Ziel im Curing-Glas ist 0.55 bis 0.65.",
		advanced:
			"Zielkorridor 0.55–0.65 a_w verhindert Schimmelpilze (Botrytis, Aspergillus) und bewahrt Terpene sowie Cannabinoide.",
		expert:
			"Wasseraktivität ist der verlässlichste mikrobiologische Stabilitätsparameter. Bei a_w < 0.65 ist kein Schimmelwachstum möglich.",
		optimalRanges: [
			{ phase: "Curing / Lagerung", min: 0.55, max: 0.65, unit: "a_w" },
		],
		operatorTips: [
			"Hygrometer im Curing-Glas platzieren: 58–62 % RLF entspricht ca. 0.58–0.62 a_w.",
		],
		tags: ["curing", "trocknung", "wasseraktivität", "post-harvest", "terpene"],
	},
	{
		id: "preharvest_flushing",
		key: "Flushing",
		acronym: "Flushing",
		germanName: "Preharvest Flushing (Spülen vor Ernte)",
		category: "naehrstoffe",
		categoryLabel: "Nährstoffe & Salze",
		importance: "medium",
		evidenceGrade: "A",
		evidenceLabel: "Saloner et al. 2024 (Industrial Crops)",
		beginner:
			"Studien zeigen, dass tagelanges Spülen mit reinem Wasser vor der Ernte kaum Einfluss auf Ertrag oder Geschmack hat.",
		advanced:
			"Kontrollierte Versuche belegen keine statistisch signifikante Steigerung von Cannabinoiden oder Terpenen durch Nährstoffentzug.",
		expert:
			"Evidenz Grade A. Spülen spart Nährstoffkosten, verändert das Mineralstoffprofil in den Blüten jedoch nur marginal.",
		operatorTips: [
			"Kein extremes Aushungern der Pflanzen über Wochen erzwingen; moderates Reduzieren des EC reicht aus.",
		],
		tags: ["flushing", "spülen", "ernte", "evidenz", "studie"],
	},
	{
		id: "autoflower_genomics",
		key: "Autoflower PRR",
		acronym: "Autoflower",
		germanName: "Autoflower Pseudo-Response Regulator Genomik",
		category: "ertrag",
		categoryLabel: "Ertrag & Beleuchtung",
		importance: "high",
		evidenceGrade: "A",
		evidenceLabel: "The Plant Journal 2024",
		beginner:
			"Autoflowers blühen automatisch nach Alter, unabhängig von der Lichtdauer. 18 Stunden Licht pro Tag sind optimal.",
		advanced:
			"Splice-Site-Mutation im PRR-Gen bewirkt den Verlust der Tageslängen-Sensitivität. 12/12-Lichtumstellung ist wirkungslos.",
		expert:
			"18/6h oder 20/4h Beleuchtung erlaubt eine hohe DLI-Akkumulation bei moderaterer PPFD, was Licht- und Hitzestress minimiert.",
		operatorTips: [
			"Autoflowers durchgehend mit 18/6h Licht beleuchten (kein 12/12-Wechsel erforderlich).",
		],
		tags: ["autoflower", "genomik", "prr-gen", "photoperiode", "18h"],
	},
	{
		id: "bt",
		key: "BT",
		acronym: "BT",
		germanName: "Blütetag",
		category: "allgemein",
		categoryLabel: "Allgemein & Phasen",
		unit: "Tage",
		importance: "medium",
		evidenceGrade: "A",
		beginner: "Zählt die Anzahl der Tage seit Beginn der Blütephase.",
		advanced:
			"Tageszahl ab Blüteinduktion. Bestimmt den Nährstoff- und Lichtbedarf laut Zuchtplan.",
		expert:
			"Phasen-Einteilung: Stretch (BT 1–21), Peak Blüte (BT 22–42), Reife & Flush (BT 43+).",
		tags: ["bt", "blüte", "tage", "phase"],
	},
	{
		id: "vt",
		key: "VT",
		acronym: "VT",
		germanName: "Vegetationstag",
		category: "allgemein",
		categoryLabel: "Allgemein & Phasen",
		unit: "Tage",
		importance: "medium",
		evidenceGrade: "A",
		beginner: "Zählt die Tage des vegetativen Wachstums.",
		advanced: "Tageszahl in der Vegetationsphase vor der Blüteeinleitung.",
		expert:
			"Fokus auf Wurzelaufbau, Strukturierung (Topping/LST) und Etablierung des Vorgelege-Klimas.",
		tags: ["vt", "vegi", "tage", "phase"],
	},
];

export const ContextHelpGlossaryPanel: React.FC<
	ContextHelpGlossaryPanelProps
> = ({
	lens = "guided",
	navigate,
	initialCategory = "all",
	initialSearchQuery = "",
}) => {
	// State Management
	const [activeCategory, setActiveCategory] =
		useState<GlossaryCategory>(initialCategory);
	const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
	const [activeLens, setActiveLens] = useState<ExperienceLens>(lens);
	const [selectedEvidenceFilter, setSelectedEvidenceFilter] =
		useState<string>("all");
	const [showMatrixQuickRef, setShowMatrixQuickRef] = useState<boolean>(true);

	// Search & Filter Pipeline
	const filteredItems = useMemo(() => {
		return UNIFIED_GLOSSARY_ITEMS.filter((item) => {
			// 1. Category Filter
			if (activeCategory !== "all" && item.category !== activeCategory) {
				return false;
			}

			// 2. Evidence Grade Filter
			if (
				selectedEvidenceFilter !== "all" &&
				item.evidenceGrade !== selectedEvidenceFilter
			) {
				return false;
			}

			// 3. Search Query Filter
			if (searchQuery.trim() !== "") {
				const q = searchQuery.toLowerCase().trim();
				const matchesKey = item.key.toLowerCase().includes(q);
				const matchesAcronym = item.acronym.toLowerCase().includes(q);
				const matchesName = item.germanName.toLowerCase().includes(q);
				const matchesCategory = item.categoryLabel.toLowerCase().includes(q);
				const matchesBeginner = item.beginner.toLowerCase().includes(q);
				const matchesAdvanced = item.advanced.toLowerCase().includes(q);
				const matchesExpert = item.expert.toLowerCase().includes(q);
				const matchesTags = item.tags.some((tag) =>
					tag.toLowerCase().includes(q),
				);
				const matchesFormula = item.formula
					? item.formula.toLowerCase().includes(q)
					: false;

				return (
					matchesKey ||
					matchesAcronym ||
					matchesName ||
					matchesCategory ||
					matchesBeginner ||
					matchesAdvanced ||
					matchesExpert ||
					matchesTags ||
					matchesFormula
				);
			}

			return true;
		});
	}, [activeCategory, selectedEvidenceFilter, searchQuery]);

	// Handler Actions
	const handleResetFilters = () => {
		setActiveCategory("all");
		setSearchQuery("");
		setSelectedEvidenceFilter("all");
	};

	const getEvidenceGradeStyle = (grade?: "A" | "B" | "C" | "D" | "E") => {
		switch (grade) {
			case "A":
				return {
					bg: "var(--green-dim)",
					color: "var(--green)",
					border: "var(--green)",
				};
			case "B":
				return {
					bg: "var(--blue-dim)",
					color: "var(--blue)",
					border: "var(--blue)",
				};
			case "C":
				return {
					bg: "var(--amber-dim)",
					color: "var(--amber)",
					border: "var(--amber)",
				};
			case "D":
				return {
					bg: "var(--purple-dim)",
					color: "var(--purple)",
					border: "var(--purple)",
				};
			default:
				return {
					bg: "var(--red-dim)",
					color: "var(--red)",
					border: "var(--red)",
				};
		}
	};

	return (
		<div
			className="panel-container context-help-glossary-panel"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "20px",
				padding: "20px",
				background: "var(--surface-1)",
				borderRadius: "var(--radius-md)",
				border: "1px solid var(--line)",
			}}
		>
			{/* ── 1. Panel Header & Lens Control ── */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "14px",
					borderBottom: "1px solid var(--line)",
					paddingBottom: "14px",
				}}
			>
				<div>
					<h2
						style={{
							margin: 0,
							fontSize: "22px",
							fontWeight: 800,
							color: "var(--text)",
							display: "flex",
							alignItems: "center",
							gap: "10px",
						}}
					>
						📚 Kontext-Hilfe & Knowledge-Glossar
					</h2>
					<p
						style={{
							margin: "4px 0 0 0",
							fontSize: "13px",
							color: "var(--muted)",
						}}
					>
						Interaktiver 2026 Master Class Katalog für Fachbegriffe,
						Evidenz-Regeln, Formeln & Praxis-Tipps
					</p>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					{/* Interactive Lens Switcher */}
					<div
						className="lens-control"
						style={{
							display: "inline-flex",
							background: "var(--surface-2)",
							borderRadius: "var(--radius-sm)",
							padding: "3px",
							border: "1px solid var(--line)",
						}}
					>
						<button
							type="button"
							onClick={() => setActiveLens("guided")}
							style={{
								padding: "6px 12px",
								fontSize: "11px",
								fontWeight: 700,
								border: 0,
								borderRadius: "var(--radius-sm)",
								background:
									activeLens === "guided" ? "var(--blue-dim)" : "transparent",
								color: activeLens === "guided" ? "var(--blue)" : "var(--muted)",
								cursor: "pointer",
							}}
						>
							🌱 GEFÜHRT
						</button>
						<button
							type="button"
							onClick={() => setActiveLens("advanced")}
							style={{
								padding: "6px 12px",
								fontSize: "11px",
								fontWeight: 700,
								border: 0,
								borderRadius: "var(--radius-sm)",
								background:
									activeLens === "advanced"
										? "var(--green-dim)"
										: "transparent",
								color:
									activeLens === "advanced" ? "var(--green)" : "var(--muted)",
								cursor: "pointer",
							}}
						>
							⚡ STANDARD
						</button>
						<button
							type="button"
							onClick={() => setActiveLens("expert")}
							style={{
								padding: "6px 12px",
								fontSize: "11px",
								fontWeight: 700,
								border: 0,
								borderRadius: "var(--radius-sm)",
								background:
									activeLens === "expert" ? "var(--purple-dim)" : "transparent",
								color:
									activeLens === "expert" ? "var(--purple)" : "var(--muted)",
								cursor: "pointer",
							}}
						>
							🔬 EXPERTE
						</button>
					</div>
				</div>
			</div>

			{/* ── 2. Live Search Bar & Multi-Filters ── */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					background: "var(--surface-2)",
					padding: "16px",
					borderRadius: "var(--radius)",
					border: "1px solid var(--line)",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "12px",
						flexWrap: "wrap",
						alignItems: "center",
					}}
				>
					{/* Text Search Input */}
					<div style={{ flex: "1 1 280px", position: "relative" }}>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="🔎 Begriff, Akronym (z.B. VPD, KCanG, EC) oder Formel suchen..."
							style={{
								width: "100%",
								padding: "10px 14px",
								fontSize: "14px",
								borderRadius: "var(--radius-sm)",
								border: "1px solid var(--line)",
								background: "var(--surface-3)",
								color: "var(--text)",
							}}
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								style={{
									position: "absolute",
									right: "10px",
									top: "50%",
									transform: "translateY(-50%)",
									border: 0,
									background: "transparent",
									color: "var(--muted)",
									fontSize: "14px",
									cursor: "pointer",
								}}
							>
								✖
							</button>
						)}
					</div>

					{/* Evidence Grade Filter Selector */}
					<div style={{ minWidth: "160px" }}>
						<select
							aria-label="Evidenz Filter"
							value={selectedEvidenceFilter}
							onChange={(e) => setSelectedEvidenceFilter(e.target.value)}
							style={{
								width: "100%",
								padding: "10px",
								fontSize: "13px",
								borderRadius: "var(--radius-sm)",
								border: "1px solid var(--line)",
								background: "var(--surface-3)",
								color: "var(--text)",
							}}
						>
							<option value="all">Evidenz: Alle Stufen</option>
							<option value="A">Grade A (Gesetz / Primärforschung)</option>
							<option value="B">Grade B (Systematic Review)</option>
							<option value="C">Grade C (Hersteller / UKD Inferenz)</option>
						</select>
					</div>

					{/* Reset Filters Action */}
					{(activeCategory !== "all" ||
						searchQuery !== "" ||
						selectedEvidenceFilter !== "all") && (
						<button
							type="button"
							onClick={handleResetFilters}
							style={{
								padding: "10px 14px",
								fontSize: "13px",
								fontWeight: 700,
								borderRadius: "var(--radius-sm)",
								border: "1px solid var(--amber)",
								background: "var(--amber-dim)",
								color: "var(--amber)",
								cursor: "pointer",
							}}
						>
							✖ Filter zurücksetzen
						</button>
					)}
				</div>

				{/* Category Tabs Bar */}
				<div
					style={{
						display: "flex",
						gap: "8px",
						overflowX: "auto",
						paddingBottom: "4px",
						borderTop: "1px solid var(--line)",
						paddingTop: "12px",
					}}
				>
					{CATEGORIES.map((cat) => {
						const isActive = activeCategory === cat.id;
						return (
							<button
								key={cat.id}
								type="button"
								onClick={() => setActiveCategory(cat.id)}
								style={{
									padding: "8px 14px",
									fontSize: "13px",
									fontWeight: 700,
									borderRadius: "var(--radius-sm)",
									border: isActive
										? "1px solid var(--green)"
										: "1px solid var(--line)",
									background: isActive
										? "var(--green-dim)"
										: "var(--surface-3)",
									color: isActive ? "var(--green)" : "var(--text-2)",
									cursor: "pointer",
									whiteSpace: "nowrap",
								}}
							>
								{cat.icon} {cat.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* ── 3. 4-Phase Target Matrix Quick Reference ── */}
			<div
				style={{
					background: "var(--surface-2)",
					borderRadius: "var(--radius)",
					border: "1px solid var(--line)",
					padding: "14px",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						cursor: "pointer",
					}}
					role="button"
					tabIndex={0}
					onClick={() => setShowMatrixQuickRef(!showMatrixQuickRef)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setShowMatrixQuickRef(!showMatrixQuickRef);
						}
					}}
				>
					<div
						style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}
					>
						📊 4-Phasen Zielkorridor Schnell-Orientierung (VPD, DLI, EC, pH, rF)
					</div>
					<span style={{ fontSize: "12px", color: "var(--muted)" }}>
						{showMatrixQuickRef ? "▼ Einklappen" : "► Ausklappen"}
					</span>
				</div>

				{showMatrixQuickRef && (
					<div
						style={{
							marginTop: "12px",
							overflowX: "auto",
							borderTop: "1px solid var(--line)",
							paddingTop: "12px",
						}}
					>
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								fontSize: "12px",
								textAlign: "left",
							}}
						>
							<thead>
								<tr
									style={{
										borderBottom: "1px solid var(--line)",
										color: "var(--muted)",
									}}
								>
									<th style={{ padding: "8px" }}>Parameter</th>
									<th style={{ padding: "8px" }}>🌱 Sämling (Tag 0–7)</th>
									<th style={{ padding: "8px" }}>🌿 Vegi (Tag 8–28)</th>
									<th style={{ padding: "8px" }}>🌸 Hauptblüte (Tag 29–63)</th>
									<th style={{ padding: "8px" }}>🍂 Spätblüte (Tag 64–80)</th>
								</tr>
							</thead>
							<tbody>
								<tr style={{ borderBottom: "1px solid var(--line)" }}>
									<td
										style={{
											padding: "8px",
											fontWeight: 700,
											color: "var(--green)",
										}}
									>
										<TermTooltip term="VPD" lens={activeLens}>
											VPD (kPa)
										</TermTooltip>
									</td>
									<td style={{ padding: "8px" }}>0.4 – 0.8</td>
									<td style={{ padding: "8px" }}>0.8 – 1.1</td>
									<td style={{ padding: "8px" }}>1.1 – 1.5</td>
									<td style={{ padding: "8px" }}>1.3 – 1.6</td>
								</tr>
								<tr style={{ borderBottom: "1px solid var(--line)" }}>
									<td
										style={{
											padding: "8px",
											fontWeight: 700,
											color: "var(--blue)",
										}}
									>
										<TermTooltip term="DLI" lens={activeLens}>
											DLI (mol/m²/d)
										</TermTooltip>
									</td>
									<td style={{ padding: "8px" }}>10 – 15</td>
									<td style={{ padding: "8px" }}>20 – 30</td>
									<td style={{ padding: "8px" }}>35 – 45</td>
									<td style={{ padding: "8px" }}>25 – 35</td>
								</tr>
								<tr style={{ borderBottom: "1px solid var(--line)" }}>
									<td
										style={{
											padding: "8px",
											fontWeight: 700,
											color: "var(--amber)",
										}}
									>
										<TermTooltip term="EC" lens={activeLens}>
											EC (mS/cm)
										</TermTooltip>
									</td>
									<td style={{ padding: "8px" }}>0.6 – 0.9</td>
									<td style={{ padding: "8px" }}>1.2 – 1.6</td>
									<td style={{ padding: "8px" }}>1.8 – 2.2</td>
									<td style={{ padding: "8px" }}>0.4 – 0.8</td>
								</tr>
								<tr style={{ borderBottom: "1px solid var(--line)" }}>
									<td
										style={{
											padding: "8px",
											fontWeight: 700,
											color: "var(--purple)",
										}}
									>
										<TermTooltip term="pH" lens={activeLens}>
											pH-Wert
										</TermTooltip>
									</td>
									<td style={{ padding: "8px" }}>5.8</td>
									<td style={{ padding: "8px" }}>6.0</td>
									<td style={{ padding: "8px" }}>6.2</td>
									<td style={{ padding: "8px" }}>6.2</td>
								</tr>
								<tr>
									<td
										style={{
											padding: "8px",
											fontWeight: 700,
											color: "var(--text)",
										}}
									>
										<TermTooltip term="rF" lens={activeLens}>
											rF (%)
										</TermTooltip>
									</td>
									<td style={{ padding: "8px" }}>65 – 75%</td>
									<td style={{ padding: "8px" }}>55 – 70%</td>
									<td style={{ padding: "8px" }}>40 – 55%</td>
									<td style={{ padding: "8px" }}>38 – 48%</td>
								</tr>
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* ── 4. Unified Glossary Cards Grid ── */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span
					style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)" }}
				>
					{filteredItems.length}{" "}
					{filteredItems.length === 1 ? "Eintrag" : "Einträge"} gefunden
				</span>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
					gap: "16px",
				}}
			>
				{filteredItems.map((item) => {
					const evStyle = getEvidenceGradeStyle(item.evidenceGrade);
					const definitionText =
						activeLens === "expert"
							? item.expert
							: activeLens === "advanced"
								? item.advanced
								: item.beginner;

					return (
						<div
							key={item.id}
							style={{
								background: "var(--surface-2)",
								borderRadius: "var(--radius)",
								border: "1px solid var(--line)",
								padding: "16px",
								display: "flex",
								flexDirection: "column",
								gap: "12px",
								boxShadow: "var(--shadow)",
							}}
						>
							{/* Card Header */}
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
									gap: "10px",
								}}
							>
								<div>
									<div
										style={{
											fontSize: "18px",
											fontWeight: 800,
											color: "var(--text)",
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										{item.acronym}
										<span
											style={{
												fontSize: "12px",
												color: "var(--muted)",
												fontWeight: 500,
											}}
										>
											({item.categoryLabel})
										</span>
									</div>
									<div
										style={{
											fontSize: "13px",
											color: "var(--green)",
											fontWeight: 600,
											marginTop: "2px",
										}}
									>
										{item.germanName}
									</div>
								</div>

								<div
									style={{
										display: "flex",
										gap: "6px",
										flexWrap: "wrap",
										justifyContent: "flex-end",
									}}
								>
									{item.evidenceGrade && (
										<span
											style={{
												padding: "3px 8px",
												fontSize: "11px",
												fontWeight: 800,
												borderRadius: "var(--radius-sm)",
												background: evStyle.bg,
												color: evStyle.color,
												border: `1px solid ${evStyle.border}`,
											}}
										>
											Evidenz {item.evidenceGrade}
										</span>
									)}
									<LensBadge lens={activeLens} />
								</div>
							</div>

							{/* Dynamic Definition */}
							<div
								style={{
									fontSize: "13px",
									lineHeight: 1.5,
									color: "var(--text-2)",
									background: "var(--surface-3)",
									padding: "10px 12px",
									borderRadius: "var(--radius-sm)",
									border: "1px solid var(--line)",
								}}
							>
								{definitionText}
							</div>

							{/* Mathematical Formula Section */}
							{item.formula && (
								<div
									style={{
										background: "var(--surface-1)",
										padding: "10px",
										borderRadius: "var(--radius-sm)",
										border: "1px dashed var(--line)",
									}}
								>
									<div
										style={{
											fontSize: "11px",
											color: "var(--muted)",
											textTransform: "uppercase",
											fontWeight: 700,
										}}
									>
										📐 Formel
									</div>
									<div
										style={{
											fontSize: "13px",
											fontWeight: 800,
											color: "var(--green)",
											fontFamily: "var(--font-mono)",
											marginTop: "4px",
										}}
									>
										{item.formula}
									</div>
									{item.formulaDescription && (
										<div
											style={{
												fontSize: "11px",
												color: "var(--muted)",
												marginTop: "4px",
											}}
										>
											{item.formulaDescription}
										</div>
									)}
								</div>
							)}

							{/* Optimal Target Ranges List */}
							{item.optimalRanges && item.optimalRanges.length > 0 && (
								<div>
									<div
										style={{
											fontSize: "11px",
											color: "var(--muted)",
											textTransform: "uppercase",
											fontWeight: 700,
											marginBottom: "6px",
										}}
									>
										🎯 Phasen-Zielwerte
									</div>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "4px",
										}}
									>
										{item.optimalRanges.map((r, idx) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: Static dictionary array
											<div
												key={idx}
												style={{
													display: "flex",
													justifyContent: "space-between",
													fontSize: "12px",
													padding: "4px 8px",
													background: "var(--surface-3)",
													borderRadius: "var(--radius-sm)",
												}}
											>
												<span style={{ color: "var(--muted)" }}>
													{r.phase}:
												</span>
												<strong
													style={{
														color: "var(--text)",
														fontFamily: "var(--font-mono)",
													}}
												>
													{r.min} – {r.max} {r.unit}
												</strong>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Actionable Operator Tips */}
							{item.operatorTips && item.operatorTips.length > 0 && (
								<div>
									<div
										style={{
											fontSize: "11px",
											color: "var(--amber)",
											textTransform: "uppercase",
											fontWeight: 700,
											marginBottom: "6px",
										}}
									>
										💡 Praxis-Tipps für Grower
									</div>
									<ul
										style={{
											margin: 0,
											paddingLeft: "18px",
											fontSize: "12px",
											color: "var(--text-2)",
										}}
									>
										{item.operatorTips.map((tip, idx) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: Static dictionary array
											<li key={idx} style={{ marginBottom: "4px" }}>
												{tip}
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Legal Scope & Caveat Footer */}
							{item.scope && (
								<div
									style={{
										fontSize: "11px",
										color: "var(--muted)",
										fontStyle: "italic",
										borderTop: "1px solid var(--line)",
										paddingTop: "8px",
									}}
								>
									<strong>Scope & Geltungsbereich:</strong> {item.scope}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default ContextHelpGlossaryPanel;
