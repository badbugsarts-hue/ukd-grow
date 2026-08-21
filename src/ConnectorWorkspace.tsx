import { useMemo, useState } from "react";
import { FILE_CONNECTOR_MANIFEST, mapAndValidate, probeFile, type ProbeResult } from "./file-connector";
import { applyRunCommand } from "./run-commands";
import type { ColumnMapping, ExperienceLens, ImportBatch, RunPackage } from "./types";

const fields: Array<{ key: keyof ColumnMapping; label: string }> = [
	{ key: "timestamp", label: "Zeitstempel" },
	{ key: "metric", label: "Metrik" },
	{ key: "value", label: "Wert" },
	{ key: "unit", label: "Einheit" },
	{ key: "deviceId", label: "Geräte-ID" },
	{ key: "source", label: "Quelle" },
];

export function ConnectorWorkspace({ run, lens, onChange }: { run: RunPackage; lens: ExperienceLens; onChange: (run: RunPackage) => void }) {
	const [fileName, setFileName] = useState("");
	const [probe, setProbe] = useState<ProbeResult | null>(null);
	const [mapping, setMapping] = useState<ColumnMapping | null>(null);
	const [batch, setBatch] = useState<ImportBatch | null>(null);
	const [message, setMessage] = useState("");
	const knownHashes = useMemo(() => new Set(run.measurements.flatMap((entry) => {
		const match = entry.reading.source.reference.match(/[A-F0-9]{64}/i);
		return match ? [match[0].toUpperCase()] : [];
	})), [run.measurements]);

	async function selectFile(file: File | undefined) {
		if (!file) return;
		setMessage(""); setBatch(null);
		try {
			const next = await probeFile(file);
			setFileName(file.name); setProbe(next); setMapping(autoMap(next.columns));
		} catch (error) {
			setProbe(null); setMapping(null); setMessage(error instanceof Error ? error.message : "Datei konnte nicht gelesen werden.");
		}
	}

	function validate() {
		if (!probe || !mapping) return;
		const next = mapAndValidate(probe, fileName, mapping, knownHashes);
		setBatch(next);
		setMessage(next.status === "validated" ? `${next.records.length} Zeilen sind bereit zur Vorschau.` : "Import blockiert. Findings prüfen.");
	}

	function commit() {
		if (!batch) return;
		const result = applyRunCommand(run, { kind: "measurements.import", batch });
		if (!result.ok) { setMessage(result.errors.map((entry) => entry.message).join(" ")); return; }
		onChange(result.value); setBatch({ ...batch, status: "committed" });
		setMessage(`${batch.records.length} Messwerte wurden als unverified übernommen.`);
	}

	return <section className="page-stack" aria-labelledby="connector-title">
		<header className="section-heading"><div><p className="eyebrow">Read-only Connector</p><h2 id="connector-title">CSV/JSON-Dateiimport</h2></div><span className="status-pill">{FILE_CONNECTOR_MANIFEST.version}</span></header>
		<div className="callout info"><strong>Trust Gate:</strong> Importierte Werte werden niemals automatisch als vertrauenswürdig interpretiert. Zeit, Metrik, Einheit, Gerät und Quelle sind Pflicht.</div>
		<div className="card page-stack">
			<label>Datei (.csv oder .json)<input type="file" accept=".csv,.json,application/json,text/csv" onChange={(event) => void selectFile(event.target.files?.[0])} /></label>
			{probe && mapping ? <>
				<p><strong>{fileName}</strong> · {probe.rows.length} Datenzeilen · SHA-256 {lens === "expert" ? probe.fileSha256 : `${probe.fileSha256.slice(0, 12)}…`}</p>
				<div className="form-grid">{fields.map(({ key, label }) => <label key={key}>{label}<select value={mapping[key]} onChange={(event) => { setMapping({ ...mapping, [key]: event.target.value }); setBatch(null); }}><option value="">Spalte wählen</option>{probe.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}</div>
				<button type="button" className="primary" onClick={validate}>Validieren & Vorschau</button>
			</> : null}
			{message ? <p role="status">{message}</p> : null}
		</div>
		{batch ? <div className="card page-stack"><h3>Import-Vorschau</h3>
			{batch.findings.length ? <ul className="record-list">{batch.findings.map((finding, index) => <li key={`${finding.row}-${finding.code}-${index}`}><strong>Zeile {finding.row}: {finding.code}</strong><span>{finding.message}</span></li>)}</ul> : <p className="status-line success">Schema- und Einheitenprüfung bestanden.</p>}
			<div className="table-scroll"><table><thead><tr><th>Zeit</th><th>Metrik</th><th>Wert</th><th>Gerät</th><th>Quelle</th></tr></thead><tbody>{batch.records.slice(0, 20).map((record) => <tr key={`${record.timestamp}-${record.metric}-${record.deviceId}`}><td>{record.timestamp}</td><td>{record.metric}</td><td>{record.value} {record.unit}</td><td>{record.deviceId}</td><td>{record.source}</td></tr>)}</tbody></table></div>
			<button type="button" className="primary" disabled={batch.status !== "validated"} onClick={commit}>{batch.status === "committed" ? "Übernommen" : "Validierten Batch übernehmen"}</button>
		</div> : null}
	</section>;
}

function autoMap(columns: string[]): ColumnMapping {
	const lookup = (aliases: string[]) => columns.find((column) => aliases.includes(column.trim().toLowerCase())) ?? "";
	return {
		timestamp: lookup(["timestamp", "time", "zeit", "zeitstempel"]), metric: lookup(["metric", "metrik"]),
		value: lookup(["value", "wert"]), unit: lookup(["unit", "einheit"]),
		deviceId: lookup(["deviceid", "device_id", "gerät", "geraet"]), source: lookup(["source", "quelle"]),
	};
}
