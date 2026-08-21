import { useEffect, useMemo, useState } from "react";
import { createDefaultRunPackage } from "./run-state";
import { loadWorkspacePackage, saveWorkspacePackage } from "./run-storage";
import { createWorkspacePackage, resolveRunConfiguration, upsertRunTemplate, upsertSetupProfile } from "./workspace";
import type { ExperienceLens, RunPackage, WorkspacePackage } from "./types";

export function ProfilesWorkspace({ run, lens, onChange }: { run: RunPackage; lens: ExperienceLens; onChange: (run: RunPackage) => void }) {
	const [workspace, setWorkspace] = useState<WorkspacePackage | null>(null);
	const [name, setName] = useState("Mein Setup");
	const [templateName, setTemplateName] = useState("Neuer Run");
	const [selectedProfileId, setSelectedProfileId] = useState("");
	const [message, setMessage] = useState("");
	useEffect(() => { void loadWorkspacePackage().then((value) => setWorkspace(value ?? createWorkspacePackage())); }, []);
	const selected = useMemo(() => workspace?.setupProfiles.find((entry) => entry.id === selectedProfileId) ?? null, [workspace, selectedProfileId]);

	async function persist(next: WorkspacePackage, status: string) {
		await saveWorkspacePackage(next); setWorkspace(next); setMessage(status);
	}

	async function addProfile() {
		if (!workspace || !name.trim()) return;
		const next = upsertSetupProfile(workspace, {
			id: crypto.randomUUID(), name: name.trim(), config: structuredClone(run.configurationSnapshot.config),
			equipmentIds: run.equipment.map((entry) => entry.id), nutrientSystemId: run.nutrientSystems.find((entry) => entry.status === "operational")?.id ?? null,
			evidenceVersion: run.configurationSnapshot.evidenceVersion,
		});
		await persist(next, "Setup-Profil versioniert gespeichert.");
		setSelectedProfileId(next.setupProfiles[0]?.id ?? "");
	}

	async function addTemplate() {
		if (!workspace || !templateName.trim()) return;
		const next = upsertRunTemplate(workspace, {
			id: crypto.randomUUID(), name: templateName.trim(), setupProfileId: selectedProfileId || null,
			configOverrides: {}, taskTemplateIds: [], evidenceVersion: run.configurationSnapshot.evidenceVersion,
		});
		await persist(next, "Run-Template gespeichert; der aktive Snapshot blieb unverändert.");
	}

	function createFromTemplate(templateId: string) {
		if (!workspace) return;
		const template = workspace.runTemplates.find((entry) => entry.id === templateId);
		if (!template) return;
		const profile = workspace.setupProfiles.find((entry) => entry.id === template.setupProfileId) ?? null;
		const next = createDefaultRunPackage();
		const config = resolveRunConfiguration(next.config, {}, profile, template);
		const configured: RunPackage = { ...next, config, configurationSnapshot: { ...next.configurationSnapshot, config: structuredClone(config), evidenceVersion: template.evidenceVersion } };
		onChange(configured); setMessage(`Neuer Entwurf „${template.name}“ erstellt. Der vorherige Run bleibt in der Historie.`);
	}

	if (!workspace) return <p role="status">Workspace wird geladen…</p>;
	return <section className="page-stack" aria-labelledby="profiles-title">
		<header className="section-heading"><div><p className="eyebrow">Workspace-Vererbung</p><h2 id="profiles-title">Profile & Templates</h2></div><span className="status-pill">lokal</span></header>
		<div className="callout info">Kanonische Defaults → Workspace → Setup-Profil → Run-Template → unveränderlicher Run-Snapshot. Profile verändern einen aktiven Run niemals rückwirkend.</div>
		<div className="card page-stack"><h3>Setup aus aktivem Snapshot versionieren</h3><label>Profilname<input value={name} onChange={(event) => setName(event.target.value)} /></label><button type="button" className="primary" onClick={() => void addProfile()}>Setup-Profil speichern</button></div>
		<div className="card page-stack"><h3>Run-Template</h3><div className="form-grid"><label>Templatename<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></label><label>Setup-Profil<select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}><option value="">Kanonische Defaults</option>{workspace.setupProfiles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · v{entry.version}</option>)}</select></label></div><button type="button" className="primary" onClick={() => void addTemplate()}>Template speichern</button></div>
		{message ? <p role="status" className="status-line success">{message}</p> : null}
		<div className="card"><h3>Versionierte Vorlagen</h3>{workspace.runTemplates.length === 0 ? <p>Noch keine Templates.</p> : <ul className="record-list">{workspace.runTemplates.map((entry) => <li key={entry.id}><span><strong>{entry.name}</strong><br />v{entry.version} · {entry.setupProfileId ? workspace.setupProfiles.find((profile) => profile.id === entry.setupProfileId)?.name : "Defaults"}{lens === "expert" ? ` · Evidence ${entry.evidenceVersion}` : ""}</span><button type="button" onClick={() => createFromTemplate(entry.id)}>Neuen Run-Entwurf erstellen</button></li>)}</ul>}</div>
		{selected && lens !== "guided" ? <details><summary>Profil-Lineage</summary><pre>{JSON.stringify(selected, null, 2)}</pre></details> : null}
	</section>;
}
