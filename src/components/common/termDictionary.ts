import knowledgeBase from "../../data/knowledge-base.json";
import type {
	ExperienceLens,
	KnowledgeGlossaryEntry,
	ScientificUnit,
} from "../../types";

export interface OptimalRange {
	phase: string;
	min: number;
	max: number;
	unit: ScientificUnit | string;
}

export interface TermDefinition extends KnowledgeGlossaryEntry {
	optimalRanges?: OptimalRange[];
}

const entries = knowledgeBase.glossary as TermDefinition[];

export const DICTIONARY: Record<string, TermDefinition> = Object.fromEntries(
	entries.map((entry) => [entry.key, entry]),
);

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
	const matchedKey = ALIAS_MAP[term.trim().toLowerCase()];
	return matchedKey ? DICTIONARY[matchedKey] : undefined;
}

export function getTermDescription(
	term: string,
	lens: ExperienceLens = "guided",
): string {
	const definition = getTermDefinition(term);
	if (!definition) return `Fachbegriff "${term}"`;
	return lens === "expert"
		? definition.expert
		: lens === "advanced"
			? definition.advanced
			: definition.beginner;
}

export function searchTerms(query: string): TermDefinition[] {
	if (!query.trim()) return entries;
	const normalized = query.toLowerCase().trim();
	return entries.filter((entry) =>
		[
			entry.key,
			entry.acronym,
			entry.germanName,
			entry.beginner,
			entry.advanced,
			entry.expert,
		].some((value) => value.toLowerCase().includes(normalized)),
	);
}

export function getAllTerms(): TermDefinition[] {
	return entries;
}
