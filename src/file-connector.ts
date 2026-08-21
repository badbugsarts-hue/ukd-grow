import type {
	ColumnMapping,
	ConnectorManifest,
	ImportBatch,
	ImportFinding,
	ImportRecord,
	MeasurementMetric,
	ScientificUnit,
} from "./types";

export const FILE_CONNECTOR_MANIFEST: ConnectorManifest = {
	id: "ukd.file-import",
	name: "UKD CSV/JSON File Connector",
	version: "1.0.0",
	readOnly: true,
	formats: ["csv", "json"],
	requiredFields: ["timestamp", "metric", "unit", "deviceId", "source"],
};

const metrics = new Set<MeasurementMetric>([
	"temperature.air.max", "temperature.air.min", "temperature.leaf",
	"humidity.relative.max", "humidity.relative.min", "light.ppfd", "water.ph",
	"water.ec", "drain.ph", "drain.ec", "water.volume", "drain.volume",
	"pot.mass", "rootzone.moisture", "plant.height", "plant.stress",
]);

const metricUnits: Partial<Record<MeasurementMetric, ScientificUnit[]>> = {
	"temperature.air.max": ["°C"],
	"temperature.air.min": ["°C"],
	"temperature.leaf": ["°C"],
	"humidity.relative.max": ["%"],
	"humidity.relative.min": ["%"],
	"light.ppfd": ["µmol/m²/s"],
	"water.ph": ["pH"],
	"drain.ph": ["pH"],
	"water.ec": ["mS/cm"],
	"drain.ec": ["mS/cm"],
	"water.volume": ["L"],
	"drain.volume": ["L"],
	"pot.mass": ["g"],
	"plant.height": ["cm"],
	"rootzone.moisture": ["%"],
};

export interface ProbeResult {
	format: "csv" | "json";
	columns: string[];
	rows: Record<string, unknown>[];
	fileSha256: string;
}

export async function probeFile(file: File): Promise<ProbeResult> {
	const bytes = await file.arrayBuffer();
	const fileSha256 = await sha256(bytes);
	const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	if (file.name.toLowerCase().endsWith(".json")) {
		const value = JSON.parse(text) as unknown;
		if (!Array.isArray(value) || !value.every(isRecord))
			throw new Error("JSON-Import benötigt ein Array aus Objekten.");
		return {
			format: "json",
			columns: [...new Set(value.flatMap((entry) => Object.keys(entry)))],
			rows: value,
			fileSha256,
		};
	}
	const matrix = parseCsv(text);
	const columns = matrix[0] ?? [];
	if (columns.length === 0) throw new Error("CSV-Kopfzeile fehlt.");
	return {
		format: "csv",
		columns,
		rows: matrix.slice(1).map((row) =>
			Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""])),
		),
		fileSha256,
	};
}

export function mapAndValidate(
	probe: ProbeResult,
	fileName: string,
	mapping: ColumnMapping,
	knownHashes: Set<string> = new Set(),
): ImportBatch {
	const findings: ImportFinding[] = [];
	if (knownHashes.has(probe.fileSha256))
		findings.push({ row: 0, severity: "error", code: "duplicate-file", message: "Datei wurde bereits importiert." });
	const records: ImportRecord[] = [];
	const rowKeys = new Set<string>();
	probe.rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const timestamp = stringValue(row[mapping.timestamp]);
		const metricText = stringValue(row[mapping.metric]);
		const unit = stringValue(row[mapping.unit]) as ScientificUnit;
		const deviceId = stringValue(row[mapping.deviceId]);
		const source = stringValue(row[mapping.source]);
		const rawValue = stringValue(row[mapping.value]);
		if (!timestamp || !metricText || !unit || !deviceId || !source || !rawValue) {
			findings.push({ row: rowNumber, severity: "error", code: "missing-field", message: "Zeitstempel, Metrik, Wert, Einheit, Gerät und Quelle sind Pflichtfelder." });
			return;
		}
		if (!Number.isFinite(Date.parse(timestamp))) {
			findings.push({ row: rowNumber, severity: "error", code: "invalid-timestamp", message: "Zeitstempel ist ungültig oder ohne interpretierbare Zeitzone." });
			return;
		}
		if (!metrics.has(metricText as MeasurementMetric)) {
			findings.push({ row: rowNumber, severity: "error", code: "unknown-metric", message: `Metrik ${metricText} ist nicht freigegeben.` });
			return;
		}
		const value = parseLocaleNumber(rawValue);
		if (value === null) {
			findings.push({ row: rowNumber, severity: "error", code: "invalid-number", message: `Wert ${rawValue} ist nicht eindeutig numerisch.` });
			return;
		}
		const metric = metricText as MeasurementMetric;
		const allowedUnits = metricUnits[metric];
		if (allowedUnits && !allowedUnits.includes(unit)) {
			findings.push({ row: rowNumber, severity: "error", code: "unit-mismatch", message: `${metric} benötigt ${allowedUnits.join(" oder ")}, nicht ${unit}.` });
			return;
		}
		const key = `${timestamp}|${metric}|${deviceId}`;
		if (rowKeys.has(key)) {
			findings.push({ row: rowNumber, severity: "error", code: "duplicate-row", message: "Messung ist innerhalb der Datei doppelt." });
			return;
		}
		rowKeys.add(key);
		records.push({ timestamp: new Date(timestamp).toISOString(), metric, value, unit, deviceId, source });
	});
	return {
		id: crypto.randomUUID(),
		connectorId: FILE_CONNECTOR_MANIFEST.id,
		fileName,
		fileSha256: probe.fileSha256,
		createdAt: new Date().toISOString(),
		mapping,
		records,
		findings,
		status: findings.some((entry) => entry.severity === "error") ? "blocked" : "validated",
	};
}

export function parseLocaleNumber(value: string): number | null {
	const normalized = value.trim().replace(/\s/g, "");
	if (!normalized) return null;
	const comma = normalized.lastIndexOf(",");
	const dot = normalized.lastIndexOf(".");
	if (comma >= 0 && dot >= 0) {
		const decimal = comma > dot ? "," : ".";
		const thousands = decimal === "," ? /\./g : /,/g;
		const parsed = Number(normalized.replace(thousands, "").replace(decimal, "."));
		return Number.isFinite(parsed) ? parsed : null;
	}
	const parsed = Number(normalized.replace(",", "."));
	return Number.isFinite(parsed) ? parsed : null;
}

function parseCsv(input: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];
		if (character === '"') {
			if (quoted && input[index + 1] === '"') { field += '"'; index += 1; }
			else quoted = !quoted;
		} else if ((character === "," || character === ";") && !quoted) {
			row.push(field); field = "";
		} else if ((character === "\n" || character === "\r") && !quoted) {
			if (character === "\r" && input[index + 1] === "\n") index += 1;
			row.push(field); field = "";
			if (row.some((entry) => entry !== "")) rows.push(row);
			row = [];
		} else field += character;
	}
	row.push(field);
	if (row.some((entry) => entry !== "")) rows.push(row);
	return rows;
}

function stringValue(value: unknown): string {
	return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function sha256(value: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", value);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}
