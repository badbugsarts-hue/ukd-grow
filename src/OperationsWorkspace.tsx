import { type FormEvent, useState } from "react";
import { applyRunCommand, type RunCommand } from "./run-commands";
import type {
	ExperienceLens,
	IncidentCategory,
	IncidentStatus,
	IpmSeverity,
	MaintenanceEventType,
	RunPackage,
} from "./types";

interface OperationsProps {
	run: RunPackage;
	lens: ExperienceLens;
	onChange: (run: RunPackage) => void;
}

function useCommand(run: RunPackage, onChange: (run: RunPackage) => void) {
	const [message, setMessage] = useState("");
	const dispatch = (command: RunCommand) => {
		const result = applyRunCommand(run, command);
		if (!result.ok) {
			setMessage(result.errors.map((entry) => entry.message).join(" "));
			return false;
		}
		onChange(result.value);
		setMessage("✓ Aktion, Auditspur und Timeline wurden atomar gespeichert.");
		return true;
	};
	return { dispatch, message };
}

export function IpmWorkspace({ run, lens, onChange }: OperationsProps) {
	const { dispatch, message } = useCommand(run, onChange);
	const [finding, setFinding] = useState("");
	const [location, setLocation] = useState("Canopy");
	const [severity, setSeverity] = useState<IpmSeverity>("low");
	const [day, setDay] = useState(0);
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (
			dispatch({
				kind: "ipm.record",
				inspection: {
					plantId: null,
					inspectedAt: new Date().toISOString(),
					day,
					finding,
					location,
					severity,
					suspectedOrganism: null,
					confirmed: false,
					photoIds: [],
					action: "",
					followUpDate: null,
				},
			})
		)
			setFinding("");
	};
	const advance = (id: string, status: string) => {
		const next =
			status === "open"
				? "monitoring"
				: status === "monitoring"
					? "treated"
					: status === "treated"
						? "resolved"
						: "closed";
		dispatch({
			kind: "ipm.transition",
			inspectionId: id,
			status: next,
			reason: "Operativer Statuswechsel in der IPM-Arbeitsfläche",
			action: next === "treated" ? "Behandlung dokumentiert" : undefined,
			outcome:
				next === "resolved" || next === "closed"
					? "Follow-up ohne fortbestehenden kritischen Befund"
					: undefined,
			followUpCompleted: next === "closed",
		});
	};
	return (
		<div className="page-stack">
			<section className="workspace-banner">
				<div>
					<small>PLANT HEALTH · {lens.toUpperCase()}</small>
					<h2>IPM-Inspektionen</h2>
					<p>Befund, Schweregrad, Maßnahmen, Follow-up und Ergebnis bleiben als Zustandsverlauf erhalten.</p>
				</div>
			</section>
			<form className="panel form-panel" onSubmit={submit}>
				<header><div><small>NEUER BEFUND</small><h2>Inspektion erfassen</h2></div></header>
				<div className="form-grid">
					<label><span>Befund</span><input value={finding} onChange={(event) => setFinding(event.target.value)} required /></label>
					<label><span>Ort</span><input value={location} onChange={(event) => setLocation(event.target.value)} required /></label>
					<label><span>Schweregrad</span><select value={severity} onChange={(event) => setSeverity(event.target.value as IpmSeverity)}>{["none", "trace", "low", "moderate", "severe", "critical"].map((value) => <option key={value}>{value}</option>)}</select></label>
					<label><span>Run-Tag</span><input type="number" min="0" step="1" value={day} onChange={(event) => setDay(Number(event.target.value))} /></label>
				</div>
				<button className="primary-button" type="submit">Inspektion speichern</button>
			</form>
			{message && <p className={message.startsWith("✓") ? "save-state" : "inline-error"} role="status">{message}</p>}
			<section className="panel"><header><div><small>STATE MACHINE</small><h2>Offene und abgeschlossene Befunde</h2></div></header>
				<div className="record-list">
					{run.ipmInspections.length === 0 ? <p>Noch keine IPM-Inspektion.</p> : run.ipmInspections.map((entry) => <article className="record-card" key={entry.id}><div><small>TAG {entry.day} · {(entry.status ?? "open").toUpperCase()}</small><h3>{entry.finding}</h3><p>{entry.location} · {entry.severity} · Revision {entry.revision ?? 1}</p></div>{entry.status !== "closed" && <button type="button" onClick={() => advance(entry.id, entry.status ?? "open")}>Nächsten Status bestätigen</button>}</article>)}
				</div>
			</section>
		</div>
	);
}

export function IncidentWorkspace({ run, lens, onChange }: OperationsProps) {
	const { dispatch, message } = useCommand(run, onChange);
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState<IncidentCategory>("other");
	const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (dispatch({ kind: "incident.create", incident: { category, detectedAt: new Date().toISOString(), detectedDay: 0, severity, description, affectedEquipmentIds: [], affectedPlantIds: [], planSuperseded: severity === "high" || severity === "critical" } })) setDescription("");
	};
	const advance = (id: string, status: IncidentStatus) => {
		const next: IncidentStatus = status === "open" ? "mitigating" : status === "mitigating" ? "recovering" : status === "recovering" ? "resolved" : "closed";
		dispatch({ kind: "incident.transition", incidentId: id, status: next, reason: "Operativer Recovery-Checkpoint bestätigt", action: next === "mitigating" ? { action: "Sofortmaßnahme eingeleitet", result: "Recovery läuft" } : undefined, rootCause: next === "closed" ? "Root Cause im Recovery-Review bestätigt" : undefined, lessonsLearned: next === "closed" ? "Präventionsmaßnahme in Wartung und Run-Review übernommen" : undefined });
	};
	return <div className="page-stack">
		<section className="workspace-banner"><div><small>FAILURE UX · {lens.toUpperCase()}</small><h2>Incidents & Recovery</h2><p>Kritische Incidents superseden den Tagesplan, bis der Recovery-Workflow abgeschlossen ist.</p></div></section>
		<form className="panel form-panel" onSubmit={submit}><header><div><small>NEUER INCIDENT</small><h2>Störfall eröffnen</h2></div></header><div className="form-grid">
			<label><span>Beschreibung</span><input value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
			<label><span>Kategorie</span><select value={category} onChange={(event) => setCategory(event.target.value as IncidentCategory)}>{["sensor-failure", "lamp-failure", "water-leak", "fan-failure", "high-rh-event", "unexpected-ec", "root-zone-saturation", "suspected-pathogen", "power-interruption", "other"].map((value) => <option key={value}>{value}</option>)}</select></label>
			<label><span>Schweregrad</span><select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}>{["low", "medium", "high", "critical"].map((value) => <option key={value}>{value}</option>)}</select></label>
		</div><button className="primary-button" type="submit">Incident eröffnen</button></form>
		{message && <p className={message.startsWith("✓") ? "save-state" : "inline-error"} role="status">{message}</p>}
		<section className="panel"><header><div><small>RECOVERY STATE MACHINE</small><h2>Incident-Verlauf</h2></div></header><div className="record-list">{run.incidents.length === 0 ? <p>Keine Incidents.</p> : run.incidents.map((entry) => <article className="record-card" key={entry.id}><div><small>{entry.category} · {entry.status.toUpperCase()}</small><h3>{entry.description}</h3><p>Severity {entry.severity} · Plan superseded: {entry.planSuperseded ? "JA" : "NEIN"}</p></div>{entry.status !== "closed" && <button type="button" onClick={() => advance(entry.id, entry.status)}>Nächsten Recovery-Status</button>}</article>)}</div></section>
	</div>;
}

export function EquipmentOperationsWorkspace({ run, lens, onChange }: OperationsProps) {
	const { dispatch, message } = useCommand(run, onChange);
	const [manufacturer, setManufacturer] = useState("");
	const [model, setModel] = useState("");
	const [maintenanceEquipmentId, setMaintenanceEquipmentId] = useState("");
	const add = (event: FormEvent) => { event.preventDefault(); if (dispatch({ kind: "equipment.add", equipment: { category: "other", manufacturer, model, serialOrAssetId: null, ratedPowerW: null, installedAt: null, position: "", notes: "" } })) { setManufacturer(""); setModel(""); } };
	const maintain = () => maintenanceEquipmentId && dispatch({ kind: "maintenance.record", maintenance: { equipmentId: maintenanceEquipmentId, type: "inspection" as MaintenanceEventType, performedAt: new Date().toISOString(), performedBy: "Local operator", nextDueAt: null, result: "passed", notes: "Operative Sichtprüfung", cost: null, currency: "EUR" } });
	return <section className="panel form-panel"><header><div><small>ASSET HISTORY · {lens.toUpperCase()}</small><h2>Equipment- und Wartungshistorie</h2></div></header><form onSubmit={add}><div className="form-grid"><label><span>Hersteller</span><input required value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} /></label><label><span>Modell</span><input required value={model} onChange={(event) => setModel(event.target.value)} /></label></div><button className="primary-button" type="submit">Asset hinzufügen</button></form>{run.equipment.length > 0 && <div className="form-grid"><label><span>Asset für Sichtprüfung</span><select value={maintenanceEquipmentId} onChange={(event) => setMaintenanceEquipmentId(event.target.value)}><option value="">Auswählen</option>{run.equipment.map((entry) => <option key={entry.id} value={entry.id}>{entry.manufacturer} {entry.model}</option>)}</select></label><button type="button" onClick={maintain} disabled={!maintenanceEquipmentId}>Wartung protokollieren</button></div>}{message && <p className={message.startsWith("✓") ? "save-state" : "inline-error"}>{message}</p>}<div className="record-list">{run.equipment.map((entry) => <article className="record-card" key={entry.id}><div><small>{entry.category} · {(entry.status ?? "active").toUpperCase()}</small><h3>{entry.manufacturer} {entry.model}</h3><p>Revision {entry.revision ?? 1} · Wartungen {run.maintenanceEvents.filter((event) => event.equipmentId === entry.id).length}</p></div></article>)}</div></section>;
}

export function ProductInventoryWorkspace({ run, lens, onChange }: OperationsProps) {
	const { dispatch, message } = useCommand(run, onChange);
	const [productName, setProductName] = useState("");
	const [containerSize, setContainerSize] = useState("");
	const submit = (event: FormEvent) => { event.preventDefault(); if (dispatch({ kind: "product-inventory.adjust", item: { productName, productCatalogId: null, owned: true, containerSize, remainingEstimate: null, lot: null, openedAt: null, expiresAt: null, pricePaid: null, currency: "EUR", notes: "" } })) { setProductName(""); setContainerSize(""); } };
	return <div className="page-stack"><section className="workspace-banner"><div><small>MY INVENTORY · {lens.toUpperCase()}</small><h2>Produktinventar</h2><p>Persönlicher Bestand bleibt vom kanonischen Knowledge Catalog getrennt.</p></div></section><form className="panel form-panel" onSubmit={submit}><div className="form-grid"><label><span>Produkt</span><input required value={productName} onChange={(event) => setProductName(event.target.value)} /></label><label><span>Gebindegröße</span><input required value={containerSize} onChange={(event) => setContainerSize(event.target.value)} /></label></div><button className="primary-button" type="submit">Bestand hinzufügen</button></form>{message && <p className={message.startsWith("✓") ? "save-state" : "inline-error"}>{message}</p>}<section className="panel"><div className="record-list">{run.productInventory.length === 0 ? <p>Noch kein persönlicher Produktbestand.</p> : run.productInventory.map((entry) => <article className="record-card" key={entry.id}><div><small>{entry.owned ? "VORHANDEN" : "NICHT VORHANDEN"} · REV {entry.revision ?? 1}</small><h3>{entry.productName}</h3><p>{entry.containerSize} · Rest {entry.remainingEstimate ?? "nicht erfasst"}</p></div></article>)}</div></section></div>;
}
