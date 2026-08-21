import { useEffect, useState } from "react";
import type { RunConfig, RunPackage } from "../../types";
import { updateRunConfig, addRunOverride } from "../../run-state";
import { validateRunConfig, type ValidationIssue } from "../../compatibility-engine";
import productDatabase from "../../data/product-presets.json";
import { WarningIcon, WrenchIcon, BeakerIcon, SproutIcon, DropletIcon } from "../common/Icons";

interface GlobalPlanEditorPanelProps {
	run: RunPackage;
	onUpdate: (updated: RunPackage) => void;
}

export function GlobalPlanEditorPanel({ run, onUpdate }: GlobalPlanEditorPanelProps) {
	const [config, setConfig] = useState<RunConfig>(run.config);
	const [issues, setIssues] = useState<ValidationIssue[]>([]);
	const [editMode, setEditMode] = useState(false);
	const [changeReason, setChangeReason] = useState("");

	useEffect(() => {
		setConfig(run.config);
	}, [run.config]);

	useEffect(() => {
		setIssues(validateRunConfig(config));
	}, [config]);

	const handleChange = <K extends keyof RunConfig>(field: K, value: RunConfig[K]) => {
		setConfig(prev => ({ ...prev, [field]: value }));
	};

	const handleSave = () => {
		const reason = changeReason.trim();
		if (reason) {
			let updatedRun = updateRunConfig(run, config);
			
			// Also register an override if we are not just correcting a draft
			if (run.status !== "draft") {
				updatedRun = addRunOverride(updatedRun, {
					id: crypto.randomUUID(),
					createdAt: new Date().toISOString(),
					field: "Global Plan Config",
					reason: reason,
					canonicalValue: run.config,
					overrideValue: config,
					evidenceConflict: issues.map(i => i.message).join("; "),
					reversible: true,
				});
			}
			
			onUpdate(updatedRun);
			setEditMode(false);
			setChangeReason("");
		}
	};

	const applyPreset = (type: "substrate" | "irrigation", presetId: string) => {
		if (type === "substrate") {
			const preset = productDatabase.substrates.find(s => s.id === presetId);
			if (preset) {
				handleChange("mediumProduct", preset.name);
				handleChange("medium", preset.category);
			}
		} else if (type === "irrigation") {
			const preset = productDatabase.irrigation.find(i => i.id === presetId);
			if (preset) handleChange("irrigationSystem", preset.id);
		}
	};

	const nullableNumber = (value: string): number | null =>
		value.trim() === "" ? null : Number(value);

	const issueColor = (level: string) => {
		switch(level) {
			case "danger": return "var(--red)";
			case "warning": return "var(--amber)";
			case "info": return "var(--blue)";
			default: return "var(--text)";
		}
	};

	return (
		<div className="panel global-plan-editor">
			<header className="panel-header">
				<h2>🌍 Run-Kontext & Dependency Checker</h2>
				<p>Bearbeitet Metadaten des aktiven Runs. Der kanonische v8-Tagesplan und seine Formeln werden hier nicht neu berechnet.</p>
				<button
					type="button"
					onClick={() => editMode ? handleSave() : setEditMode(true)}
					disabled={editMode && !changeReason.trim()}
					style={{ background: editMode ? "var(--green)" : "var(--surface-3)" }}
				>
					{editMode ? "💾 Plan aktualisieren" : "✏️ Plan bearbeiten"}
				</button>
				{editMode && (
					<div style={{ marginTop: "1rem", maxWidth: "44rem" }}>
						<label htmlFor="plan-change-reason" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>
							Änderungsgrund (Pflichtfeld für Audit und Override)
						</label>
						<input
							id="plan-change-reason"
							type="text"
							value={changeReason}
							onChange={(event) => setChangeReason(event.target.value)}
							placeholder="z. B. Messung vom 16.08.2026"
							required
							style={{ width: "100%", minHeight: "44px", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
						/>
						<button
							type="button"
							onClick={() => {
								setConfig(run.config);
								setChangeReason("");
								setEditMode(false);
							}}
							style={{ marginTop: "0.5rem" }}
						>
							Bearbeitung abbrechen
						</button>
					</div>
				)}
			</header>

			{issues.length > 0 && (
				<div className="validation-summary" style={{ padding: "1rem", background: "rgba(255,0,0,0.1)", borderLeft: "4px solid var(--red)", marginBottom: "2rem", marginTop: "1rem", borderRadius: "4px" }}>
					<h3 style={{ color: "var(--red)", marginTop: 0, display: "flex", alignItems: "center", gap: "8px" }}>
						<WarningIcon animated size={20} /> Kompatibilitäts-Warnungen
					</h3>
					<ul style={{ paddingLeft: "1.5rem" }}>
						{issues.map((issue, idx) => (
							<li key={idx} style={{ color: issueColor(issue.level), marginBottom: "0.5rem" }}>
								<div>
									<strong>[{issue.level.toUpperCase()}]</strong> {issue.message} 
											<span style={{ fontSize: "0.8em", color: "var(--muted)", marginLeft: "1rem" }}>(Betrifft: {issue.relatedFields.join(", ")})</span>
								</div>
								{issue.suggestedFix && (
									<button
										type="button"
										onClick={() => {
											if (!editMode) setEditMode(true);
											const action = issue.suggestedFix?.action;
											if (action) setConfig((current) => ({ ...current, ...action }));
										}}
										style={{ 
											marginTop: "0.5rem", 
											background: "var(--surface-2)", 
											border: "1px solid var(--line)", 
											padding: "0.3rem 0.6rem", 
											borderRadius: "4px",
											cursor: "pointer",
											color: "var(--text)",
											display: "flex",
											alignItems: "center",
											gap: "6px"
										}}
									>
										<WrenchIcon size={16} /> {issue.suggestedFix.label}
									</button>
								)}
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="plan-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
				
				{/* Nutrients */}
				<section className="plan-section" style={{ background: "var(--surface-1)", padding: "1rem", borderRadius: "8px" }}>
					<h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<BeakerIcon size={20} /> Dünger & Nährstoffe
					</h3>
					<div className="field-group" style={{ marginBottom: "1rem" }}>
						<span style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>Kanonisches System:</span>
						<strong style={{ fontSize: "1.2rem", color: "var(--green)" }}>{config.nutrientSystem}</strong>
						<p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Ein Systemwechsel ist gesperrt, bis eine vollständige, getestete Multi-Stack-Engine vorliegt. Ein Namenswechsel allein darf keine HESI-Berechnung vortäuschen.</p>
					</div>
				</section>

				{/* Medium */}
				<section className="plan-section" style={{ background: "var(--surface-1)", padding: "1rem", borderRadius: "8px" }}>
					<h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<SproutIcon size={20} /> Substrat & Medium
					</h3>
					<div className="field-group" style={{ marginBottom: "1rem" }}>
						<label htmlFor="plan-medium-category" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>Kategorie:</label>
						{editMode ? (
							<input 
								type="text" 
								id="plan-medium-category"
								value={config.medium} 
								onChange={(e) => handleChange("medium", e.target.value)} 
								style={{ width: "100%", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
							/>
						) : (
							<strong>{config.medium}</strong>
						)}
					</div>
					<div className="field-group" style={{ marginBottom: "1rem" }}>
						<label htmlFor="plan-medium-product" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>Produktname:</label>
						{editMode ? (
							<input 
								type="text" 
								id="plan-medium-product"
								value={config.mediumProduct} 
								onChange={(e) => handleChange("mediumProduct", e.target.value)} 
								style={{ width: "100%", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
							/>
						) : (
							<strong style={{ fontSize: "1.2rem", color: "var(--green)" }}>{config.mediumProduct}</strong>
						)}
					</div>
					{editMode && (
						<div className="presets" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
							<label htmlFor="plan-medium-preset" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>Metadaten-Preset laden:</label>
							<select 
								id="plan-medium-preset"
								onChange={(e) => applyPreset("substrate", e.target.value)} 
								defaultValue=""
								style={{ width: "100%", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
							>
								<option value="" disabled>Substrat wählen...</option>
								{productDatabase.substrates.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
							</select>
						</div>
					)}
				</section>

				{/* Irrigation */}
				<section className="plan-section" style={{ background: "var(--surface-1)", padding: "1rem", borderRadius: "8px" }}>
					<h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<DropletIcon size={20} /> Bewässerungstechnik
					</h3>
					<div className="field-group" style={{ marginBottom: "1rem" }}>
						<label htmlFor="plan-irrigation-system" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>System:</label>
						{editMode ? (
							<input 
								type="text" 
								id="plan-irrigation-system"
								value={config.irrigationSystem} 
								onChange={(e) => handleChange("irrigationSystem", e.target.value)} 
								style={{ width: "100%", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
							/>
						) : (
							<strong style={{ fontSize: "1.2rem", color: "var(--green)" }}>{config.irrigationSystem}</strong>
						)}
					</div>
					{editMode && (
						<div className="presets" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
							<label htmlFor="plan-irrigation-preset" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>Metadaten-Preset laden:</label>
							<select 
								id="plan-irrigation-preset"
								onChange={(e) => applyPreset("irrigation", e.target.value)} 
								defaultValue=""
								style={{ width: "100%", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
							>
								<option value="" disabled>Technik wählen...</option>
								{productDatabase.irrigation.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
							</select>
						</div>
					)}
				</section>

				{/* Water Quality */}
				<section className="plan-section" style={{ background: "var(--surface-1)", padding: "1rem", borderRadius: "8px" }}>
					<h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<DropletIcon size={20} /> Wasserqualität
					</h3>
					<div className="field-group" style={{ marginBottom: "1rem" }}>
						<label htmlFor="plan-water-alkalinity" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>Alkalinität (mg/L CaCO3):</label>
						{editMode ? (
							<input 
								type="number" 
								id="plan-water-alkalinity"
								value={config.water.alkalinityMgL ?? ""} 
								onChange={(e) => handleChange("water", { ...config.water, alkalinityMgL: nullableNumber(e.target.value) })} 
								style={{ width: "100%", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
							/>
						) : (
							<strong>{config.water.alkalinityMgL ?? "Unbekannt"}</strong>
						)}
					</div>
					<div className="field-group" style={{ marginBottom: "1rem" }}>
						<label htmlFor="plan-water-calcium" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>Calcium (mg/L):</label>
						{editMode ? (
							<input 
								type="number" 
								id="plan-water-calcium"
								value={config.water.calciumMgL ?? ""} 
								onChange={(e) => handleChange("water", { ...config.water, calciumMgL: nullableNumber(e.target.value) })} 
								style={{ width: "100%", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
							/>
						) : (
							<strong>{config.water.calciumMgL ?? "Unbekannt"}</strong>
						)}
					</div>
					<div className="field-group" style={{ marginBottom: "1rem" }}>
						<label htmlFor="plan-water-magnesium" style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>Magnesium (mg/L):</label>
						{editMode ? (
							<input 
								type="number" 
								id="plan-water-magnesium"
								value={config.water.magnesiumMgL ?? ""} 
								onChange={(e) => handleChange("water", { ...config.water, magnesiumMgL: nullableNumber(e.target.value) })} 
								style={{ width: "100%", padding: "0.5rem", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
							/>
						) : (
							<strong>{config.water.magnesiumMgL ?? "Unbekannt"}</strong>
						)}
					</div>
					{editMode && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Keine Stadt-Presets: Wasserwerte müssen aus der konkreten Analyse oder Messung stammen. Leere Felder bleiben bewusst unbekannt.</p>}
				</section>
			</div>
		</div>
	);
}
