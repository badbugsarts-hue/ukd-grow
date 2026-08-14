import type React from "react";
import { useState } from "react";
import { activateRun, updateRunConfig } from "../../run-state";
import type {
	ExperienceLens,
	RouteId,
	RunConfig,
	RunPackage,
	WaterProfile,
} from "../../types";
import LensBadge from "../common/LensBadge";
import TermTooltip from "../common/TermTooltip";

export interface RunConfigPanelProps {
	run: RunPackage;
	lens: ExperienceLens;
	onUpdateRun: (updatedRun: RunPackage) => void;
	navigate?: (route: RouteId) => void;
}

export function calculateReadinessScore(config: RunConfig): {
	score: number;
	missingItems: string[];
	isReady: boolean;
} {
	const missingItems: string[] = [];

	// Category 1: Substrate & Pot (20%)
	let cat1 = true;
	if (!config.medium?.trim()) {
		cat1 = false;
		missingItems.push("Substrat-Typ nicht ausgewählt");
	}
	if (!config.pot.nominalVolumeLiters || config.pot.nominalVolumeLiters <= 0) {
		cat1 = false;
		missingItems.push("Topfvolumen (L) unvollständig oder 0");
	}

	// Category 2: Light Setup (20%)
	let cat2 = true;
	if (!config.ledMaxW || config.ledMaxW <= 0) {
		cat2 = false;
		missingItems.push("Lampenleistung (W) unvollständig oder 0");
	}
	if (!config.lightHours || config.lightHours <= 0) {
		cat2 = false;
		missingItems.push("Photoperiode (h/d) nicht definiert");
	}

	// Category 3: Tent Setup (20%)
	let cat3 = true;
	if (
		!config.tentWidthCm ||
		!config.tentDepthCm ||
		!config.tentHeightCm ||
		config.tentWidthCm <= 0 ||
		config.tentDepthCm <= 0 ||
		config.tentHeightCm <= 0
	) {
		cat3 = false;
		missingItems.push("Zelt-Abmessungen (Breite, Tiefe, Höhe) unvollständig");
	}

	// Category 4: Water Analysis (20%) - Invariant 4 Fail-Closed Gate
	let cat4 = true;
	const w = config.water;
	if (w.sourcePh === null || Number.isNaN(w.sourcePh)) {
		cat4 = false;
		missingItems.push("Wasser-pH fehlt");
	}
	if (w.sourceEc === null || Number.isNaN(w.sourceEc)) {
		cat4 = false;
		missingItems.push("Wasser-EC fehlt");
	}
	if (w.calciumMgL === null || Number.isNaN(w.calciumMgL)) {
		cat4 = false;
		missingItems.push("Calcium (mg/L) fehlt");
	}
	if (w.magnesiumMgL === null || Number.isNaN(w.magnesiumMgL)) {
		cat4 = false;
		missingItems.push("Magnesium (mg/L) fehlt");
	}

	// Category 5: Equipment & Genetics Profile (20%)
	let cat5 = true;
	if (!config.name || !config.genetics) {
		cat5 = false;
		missingItems.push("Run-Bezeichnung oder Genetik-Name fehlt");
	}

	const score =
		(cat1 ? 20 : 0) +
		(cat2 ? 20 : 0) +
		(cat3 ? 20 : 0) +
		(cat4 ? 20 : 0) +
		(cat5 ? 20 : 0);

	return {
		score,
		missingItems,
		isReady: score === 100,
	};
}

export const RunConfigPanel: React.FC<RunConfigPanelProps> = ({
	run,
	lens,
	onUpdateRun,
	navigate,
}) => {
	const config = run.config;
	const readiness = calculateReadinessScore(config);

	const [exhaustM3h, setExhaustM3h] = useState<number>(220);

	// Tent volumetric calculations
	const tentAreaM2 =
		((config.tentWidthCm || 0) * (config.tentDepthCm || 0)) / 10000;
	const tentVolumeM3 = (tentAreaM2 * (config.tentHeightCm || 0)) / 100;

	// Water Ca:Mg Ratio
	const ca = config.water.calciumMgL ?? 0;
	const mg = config.water.magnesiumMgL ?? 0;
	const caMgRatio = mg > 0 ? (ca / mg).toFixed(1) : ca > 0 ? `${ca}:0` : "—";

	const handleConfigChange = (field: string, value: unknown) => {
		const updatedConfig: RunConfig = {
			...config,
			[field]: value,
		};
		const updatedRun = updateRunConfig(run, updatedConfig);
		onUpdateRun(updatedRun);
	};

	const handleWaterChange = (field: keyof WaterProfile, value: unknown) => {
		const updatedWater: WaterProfile = {
			...config.water,
			[field]: value,
		};
		const updatedConfig: RunConfig = {
			...config,
			water: updatedWater,
		};
		const updatedRun = updateRunConfig(run, updatedConfig);
		onUpdateRun(updatedRun);
	};

	const handleActivateRun = () => {
		if (!readiness.isReady) return;
		const activated = activateRun(run);
		onUpdateRun(activated);
	};

	return (
		<div
			className="panel-container run-config-panel"
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
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "12px",
					borderBottom: "1px solid var(--line)",
					paddingBottom: "12px",
				}}
			>
				<div>
					<h2
						style={{
							margin: 0,
							fontSize: "20px",
							fontWeight: 700,
							color: "var(--text)",
							display: "flex",
							alignItems: "center",
							gap: "10px",
						}}
					>
						⚙️ Run Konfiguration & Readiness Gate
					</h2>
					<p
						style={{
							margin: "4px 0 0 0",
							fontSize: "13px",
							color: "var(--muted)",
						}}
					>
						System-Setup, Zeltabmessungen, Beleuchtung und Wasseranalyse
						(Status: {run.status.toUpperCase()})
					</p>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<LensBadge lens={lens} />
					{navigate && (
						<button
							type="button"
							onClick={() => navigate("setup")}
							style={{
								padding: "6px 12px",
								background: "var(--surface-2)",
								border: "1px solid var(--line)",
								borderRadius: "var(--radius-sm)",
								color: "var(--text)",
								fontSize: "12px",
								cursor: "pointer",
							}}
						>
							🛠️ Setup-Übersicht
						</button>
					)}
				</div>
			</div>

			{/* Fail-Closed Readiness Gate Box */}
			<div
				role="region"
				aria-label="Run Readiness Gate Status"
				style={{
					padding: "16px",
					background: readiness.isReady ? "var(--green-dim)" : "var(--red-dim)",
					border: `2px solid ${readiness.isReady ? "var(--green)" : "var(--red)"}`,
					borderRadius: "var(--radius-sm)",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "8px",
					}}
				>
					<strong
						style={{
							fontSize: "15px",
							color: readiness.isReady ? "var(--green)" : "var(--red)",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
						}}
					>
						{readiness.isReady
							? "RUN READINESS: BEREIT (Score: 100%)"
							: `RUN READINESS: UNVOLLSTÄNDIG (Score: ${readiness.score}%)`}
					</strong>
					<span
						style={{ fontSize: "12px", color: "var(--text)", fontWeight: 700 }}
					>
						{readiness.isReady
							? "✓ Alle 5 Kategorien konfiguriert"
							: "⚠️ Aktivierung gesperrt"}
					</span>
				</div>

				{!readiness.isReady && (
					<div>
						<div
							style={{
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--red)",
								marginBottom: "4px",
							}}
						>
							Erforderliche Schritte zur Freigabe:
						</div>
						<ul
							style={{
								margin: 0,
								paddingLeft: "20px",
								fontSize: "12px",
								color: "var(--text)",
							}}
						>
							{readiness.missingItems.map((item, idx) => (
								<li key={idx}>{item}</li>
							))}
						</ul>
					</div>
				)}

				<div style={{ marginTop: "6px" }}>
					{run.status === "draft" ? (
						<button
							type="button"
							onClick={handleActivateRun}
							disabled={!readiness.isReady}
							style={{
								padding: "10px 18px",
								background: readiness.isReady ? "var(--green)" : "var(--muted)",
								border: "none",
								borderRadius: "var(--radius-sm)",
								color: readiness.isReady ? "var(--on-green)" : "var(--surface-1)",
								fontWeight: 700,
								fontSize: "13px",
								cursor: readiness.isReady ? "pointer" : "not-allowed",
							}}
						>
							{readiness.isReady
								? "🚀 Run Aktivieren (Immutable Snapshot erzeugen)"
								: "🔒 Sperre aktiv - bitte Konfiguration vervollständigen"}
						</button>
					) : (
						<span
							style={{
								fontSize: "12px",
								color: "var(--green)",
								fontWeight: 700,
							}}
						>
							✓ Run bereits aktiv (Immutable Snapshot v
							{run.configurationSnapshot.version})
						</span>
					)}
				</div>
			</div>

			{/* 5 Category Configuration Cards */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
					gap: "16px",
				}}
			>
				{/* Category 1: General & Substrate */}
				<div
					style={{
						padding: "14px",
						background: "var(--surface-2)",
						border: "1px solid var(--line)",
						borderRadius: "var(--radius-sm)",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
						1. Run-Stammdaten & Substrat
					</h3>

					<div>
						<label htmlFor="rcp-input-1" style={{ fontSize: "12px", color: "var(--muted)" }}>Run Name:</label>
						<input id="rcp-input-1"
							type="text"
							value={config.name}
							onChange={(e) => handleConfigChange("name", e.target.value)}
							style={{
								width: "100%",
								padding: "6px",
								background: "var(--surface-1)",
								border: "1px solid var(--line)",
								borderRadius: "4px",
								color: "var(--text)",
								fontSize: "12px",
							}}
						/>
					</div>

					<div>
						<label htmlFor="rcp-input-2" style={{ fontSize: "12px", color: "var(--muted)" }}>Genetik / Strain:</label>
						<input id="rcp-input-2"
							type="text"
							value={config.genetics}
							onChange={(e) => handleConfigChange("genetics", e.target.value)}
							style={{
								width: "100%",
								padding: "6px",
								background: "var(--surface-1)",
								border: "1px solid var(--line)",
								borderRadius: "4px",
								color: "var(--text)",
								fontSize: "12px",
							}}
						/>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "8px",
						}}
					>
						<div>
							<label htmlFor="rcp-input-3" style={{ fontSize: "12px", color: "var(--muted)" }}>Medium:</label>
						<select id="rcp-input-3"
								value={config.medium}
								onChange={(e) => handleConfigChange("medium", e.target.value)}
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							>
								<option value="Erde">Erde</option>
								<option value="Coco">Coco</option>
								<option value="Hydro">Hydro</option>
							</select>
						</div>

						<div>
							<label htmlFor="rcp-input-4" style={{ fontSize: "12px", color: "var(--muted)" }}>Topfvolumen (L):</label>
						<input id="rcp-input-4"
								type="number"
								value={config.pot.nominalVolumeLiters}
								onChange={(e) =>
									handleConfigChange("pot", {
										...config.pot,
										nominalVolumeLiters: parseFloat(e.target.value) || 0,
									})
								}
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							/>
						</div>
					</div>
				</div>

				{/* Category 2: Light Setup */}
				<div
					style={{
						padding: "14px",
						background: "var(--surface-2)",
						border: "1px solid var(--line)",
						borderRadius: "var(--radius-sm)",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
						2. Beleuchtung & Photoperiode
					</h3>

					<div>
						<label htmlFor="rcp-input-5" style={{ fontSize: "12px", color: "var(--muted)" }}>Max. Lampenleistung (W):</label>
						<input id="rcp-input-5"
							type="number"
							value={config.ledMaxW}
							onChange={(e) =>
								handleConfigChange("ledMaxW", parseInt(e.target.value, 10) || 0)
							}
							style={{
								width: "100%",
								padding: "6px",
								background: "var(--surface-1)",
								border: "1px solid var(--line)",
								borderRadius: "4px",
								color: "var(--text)",
								fontSize: "12px",
							}}
						/>
					</div>

					<div>
						<label htmlFor="rcp-input-6" style={{ fontSize: "12px", color: "var(--muted)" }}>Photoperiode (Stunden/Tag):</label>
						<input id="rcp-input-6"
							type="number"
							min={12}
							max={24}
							value={config.lightHours}
							onChange={(e) =>
								handleConfigChange(
									"lightHours",
									parseInt(e.target.value, 10) || 18,
								)
							}
							style={{
								width: "100%",
								padding: "6px",
								background: "var(--surface-1)",
								border: "1px solid var(--line)",
								borderRadius: "4px",
								color: "var(--text)",
								fontSize: "12px",
							}}
						/>
					</div>
				</div>

				{/* Category 3: Tent Setup */}
				<div
					style={{
						padding: "14px",
						background: "var(--surface-2)",
						border: "1px solid var(--line)",
						borderRadius: "var(--radius-sm)",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
						3. Zelt-Abmessungen & Volumen
					</h3>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr 1fr",
							gap: "6px",
						}}
					>
						<div>
							<label htmlFor="rcp-input-7" style={{ fontSize: "11px", color: "var(--muted)" }}>Breite (cm):</label>
						<input id="rcp-input-7"
								type="number"
								value={config.tentWidthCm}
								onChange={(e) =>
									handleConfigChange(
										"tentWidthCm",
										parseInt(e.target.value, 10) || 0,
									)
								}
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							/>
						</div>
						<div>
							<label htmlFor="rcp-input-8" style={{ fontSize: "11px", color: "var(--muted)" }}>Tiefe (cm):</label>
						<input id="rcp-input-8"
								type="number"
								value={config.tentDepthCm}
								onChange={(e) =>
									handleConfigChange(
										"tentDepthCm",
										parseInt(e.target.value, 10) || 0,
									)
								}
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							/>
						</div>
						<div>
							<label htmlFor="rcp-input-9" style={{ fontSize: "11px", color: "var(--muted)" }}>Höhe (cm):</label>
						<input id="rcp-input-9"
								type="number"
								value={config.tentHeightCm}
								onChange={(e) =>
									handleConfigChange(
										"tentHeightCm",
										parseInt(e.target.value, 10) || 0,
									)
								}
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							/>
						</div>
					</div>

					<div
						style={{
							fontSize: "12px",
							color: "var(--muted)",
							paddingTop: "4px",
						}}
					>
						Grundfläche: <strong>{tentAreaM2.toFixed(2)} m²</strong> |
						Raumvolumen: <strong>{tentVolumeM3.toFixed(2)} m³</strong>
					</div>
				</div>

				{/* Category 4: Water Analysis */}
				<div
					style={{
						padding: "14px",
						background: "var(--surface-2)",
						border: "1px solid var(--line)",
						borderRadius: "var(--radius-sm)",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
						4. Wasseranalyse (<TermTooltip term="EC" lens={lens} /> /{" "}
						<TermTooltip term="pH" lens={lens} />)
					</h3>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "8px",
						}}
					>
						<div>
							<label htmlFor="rcp-input-10" style={{ fontSize: "11px", color: "var(--muted)" }}>Quell-EC (mS/cm):</label>
						<input id="rcp-input-10"
								type="number"
								step="0.05"
								value={config.water.sourceEc ?? ""}
								onChange={(e) =>
									handleWaterChange(
										"sourceEc",
										e.target.value ? parseFloat(e.target.value) : null,
									)
								}
								placeholder="z.B. 0.4"
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							/>
						</div>

						<div>
							<label htmlFor="rcp-input-11" style={{ fontSize: "11px", color: "var(--muted)" }}>Quell-pH:</label>
						<input id="rcp-input-11"
								type="number"
								step="0.1"
								value={config.water.sourcePh ?? ""}
								onChange={(e) =>
									handleWaterChange(
										"sourcePh",
										e.target.value ? parseFloat(e.target.value) : null,
									)
								}
								placeholder="z.B. 7.2"
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							/>
						</div>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "8px",
						}}
					>
						<div>
							<label htmlFor="rcp-input-12" style={{ fontSize: "11px", color: "var(--muted)" }}>Calcium (mg/L):</label>
						<input id="rcp-input-12"
								type="number"
								value={config.water.calciumMgL ?? ""}
								onChange={(e) =>
									handleWaterChange(
										"calciumMgL",
										e.target.value ? parseFloat(e.target.value) : null,
									)
								}
								placeholder="z.B. 60"
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							/>
						</div>

						<div>
							<label htmlFor="rcp-input-13" style={{ fontSize: "11px", color: "var(--muted)" }}>Magnesium (mg/L):</label>
						<input id="rcp-input-13"
								type="number"
								value={config.water.magnesiumMgL ?? ""}
								onChange={(e) =>
									handleWaterChange(
										"magnesiumMgL",
										e.target.value ? parseFloat(e.target.value) : null,
									)
								}
								placeholder="z.B. 15"
								style={{
									width: "100%",
									padding: "6px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									fontSize: "12px",
								}}
							/>
						</div>
					</div>

					<div style={{ fontSize: "12px", color: "var(--muted)" }}>
						Berechnetes Ca:Mg Verhältnis:{" "}
						<strong style={{ color: "var(--text)" }}>{caMgRatio}</strong> (Ziel:
						3:1)
					</div>
				</div>

				{/* Category 5: Ventilation & AKF Check */}
				<div
					style={{
						padding: "14px",
						background: "var(--surface-2)",
						border: "1px solid var(--line)",
						borderRadius: "var(--radius-sm)",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
						5. Lüftung & AKF Profil
					</h3>

					<div>
						<label htmlFor="rcp-input-14" style={{ fontSize: "12px", color: "var(--muted)" }}>Abluftkapazität (m³/h):</label>
						<input id="rcp-input-14"
							type="number"
							value={exhaustM3h}
							onChange={(e) => setExhaustM3h(parseInt(e.target.value, 10) || 0)}
							style={{
								width: "100%",
								padding: "6px",
								background: "var(--surface-1)",
								border: "1px solid var(--line)",
								borderRadius: "4px",
								color: "var(--text)",
								fontSize: "12px",
							}}
						/>
					</div>

					<div style={{ fontSize: "12px", lineHeight: "1.5" }}>
						{tentVolumeM3 > 0 && exhaustM3h >= tentVolumeM3 * 60 ? (
							<span style={{ color: "var(--green)", fontWeight: 600 }}>
								✓ Ausreichender Luftwechsel (&ge; 60x/h für{" "}
								{tentVolumeM3.toFixed(2)} m³ Zelt)
							</span>
						) : (
							<span style={{ color: "var(--amber)", fontWeight: 600 }}>
								⚠️ Empfohlene Abluftleistung: mindestens{" "}
								{(tentVolumeM3 * 60).toFixed(0)} m³/h
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default RunConfigPanel;
