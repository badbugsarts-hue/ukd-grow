import type React from "react";
import { useState } from "react";
import type { ExperienceLens, RouteId, RunPackage } from "../../types";
import { getSensorCalibrationStatus } from "../../scientific-core";
import LensBadge from "../common/LensBadge";
import TermTooltip from "../common/TermTooltip";
import { PpfdMappingModal } from "../modals/PpfdMappingModal";
import { SensorCalibrationModal } from "../modals/SensorCalibrationModal";

export interface EquipmentManagerPanelProps {
	run: RunPackage;
	lens: ExperienceLens;
	onUpdateRun: (updatedRun: RunPackage) => void;
	navigate?: (route: RouteId) => void;
}

export const EquipmentManagerPanel: React.FC<EquipmentManagerPanelProps> = ({
	run,
	lens,
	onUpdateRun,
	navigate: _navigate,
}) => {
	const [showPpfdModal, setShowPpfdModal] = useState(false);
	const [showCalibModal, setShowCalibModal] = useState(false);
	const [activeCalibMetric, setActiveCalibMetric] = useState<"water.ph" | "water.ec">("water.ph");

	const lightConfig = run.config.light;
	const ppfdMaps = lightConfig?.ppfdMaps || [];
	const latestMap = ppfdMaps.length > 0 ? ppfdMaps[0] : null;

	const phDeviceId = run.calibrations.find((record) => record.metric === "water.ph")?.deviceId ?? "";
	const ecDeviceId = run.calibrations.find((record) => record.metric === "water.ec")?.deviceId ?? "";
	const phStatus = phDeviceId ? getSensorCalibrationStatus(phDeviceId, "water.ph", run.calibrations) : "UNKNOWN";
	const ecStatus = ecDeviceId ? getSensorCalibrationStatus(ecDeviceId, "water.ec", run.calibrations) : "UNKNOWN";

	const renderStatusBadge = (status: string) => {
		switch (status) {
			case "VALID":
				return <span className="status-badge badge-valid" style={{ background: "var(--green-dim)", color: "var(--green)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "12px" }}>✓ Gültig</span>;
			case "CALIBRATION_DUE":
				return <span className="status-badge badge-danger" style={{ background: "var(--red-dim)", color: "var(--red)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "12px" }}>❌ Abgelaufen</span>;
			case "FAILED":
			case "INVALID_TIMESTAMP":
				return <span className="status-badge badge-danger" style={{ background: "var(--red-dim)", color: "var(--red)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "12px" }}>⚠️ Fehlgeschlagen</span>;
			case "DUE_SOON":
				return <span className="status-badge badge-warning" style={{ background: "var(--amber-dim)", color: "var(--amber)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "12px" }}>⚠️ Bald fällig</span>;
			default:
				return <span className="status-badge badge-warning" style={{ background: "var(--amber-dim)", color: "var(--amber)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "12px" }}>⚠️ Nicht erfasst</span>;
		}
	};

	return (
		<div className="equipment-manager-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
			{/* Panel Header */}
			<div className="panel-card" style={{ background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "20px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
					<div>
						<span style={{ fontSize: "11px", letterSpacing: "1px", color: "var(--green)", fontWeight: 800, textTransform: "uppercase" }}>
							GERÄTE, KALIBRIERUNG & LIGHT MAPPING
						</span>
						<h2 style={{ margin: "4px 0 8px 0", fontSize: "22px", color: "var(--text)" }}>
							Equipment & Wartungs-Manager
						</h2>
						<p style={{ margin: 0, color: "var(--text-2)", fontSize: "13px", maxWidth: "680px" }}>
							Prüfe das erfasste Lichtprofil, Kalibrierungen deiner Messgeräte für{" "}
							<TermTooltip term="pH" lens={lens} /> & <TermTooltip term="EC" lens={lens} /> und führe präzise 9-Punkt-{" "}
							<TermTooltip term="PPFD" lens={lens} /> Rastermessungen durch. Ein vollständiges Hardware-Inventar ist noch nicht implementiert.
						</p>
					</div>
					<LensBadge lens={lens} />
				</div>
			</div>

			{/* Hardware Inventory Card */}
			<div className="panel-card" style={{ background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "20px" }}>
				<h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
					<span>💡</span> Beleuchtungs-Hardware (LED Fixture)
				</h3>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
					<div style={{ background: "var(--surface-2)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
						<span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Hersteller & Modell</span>
						<strong style={{ fontSize: "15px", color: "var(--text)" }}>
							{lightConfig
								? `${lightConfig.manufacturer || "Hersteller unbekannt"} ${lightConfig.model || "Modell unbekannt"}`
								: "Nicht erfasst"}
						</strong>
					</div>
					<div style={{ background: "var(--surface-2)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
						<span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Maximalleistung (Watt)</span>
						<strong style={{ fontSize: "15px", color: "var(--green)" }}>
							{run.config.ledMaxW || lightConfig?.ratedPowerW || "Nicht erfasst"}{" "}
							{run.config.ledMaxW || lightConfig?.ratedPowerW ? "W" : ""}
						</strong>
					</div>
					<div style={{ background: "var(--surface-2)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
						<span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Dimmer-Stufen</span>
						<strong style={{ fontSize: "13px", color: "var(--text-2)" }}>
							{lightConfig?.dimmerLevels.length
								? `${lightConfig.dimmerLevels.join("%, ")}%`
								: "Nicht erfasst"}
						</strong>
					</div>
					<div style={{ background: "var(--surface-2)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
						<span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Spektrum & Maße</span>
						<strong style={{ fontSize: "13px", color: "var(--text-2)" }}>
							{lightConfig
								? `${lightConfig.spectrumType || "Spektrum unbekannt"} · ${lightConfig.fixtureDimensions || "Maße unbekannt"}`
								: "Nicht erfasst"}
						</strong>
					</div>
				</div>
			</div>

			{/* Sensor Calibration Overview Card */}
			<div className="panel-card" style={{ background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "20px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
					<h3 style={{ margin: 0, fontSize: "16px", color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
						<span>🧪</span> Messgerät-Kalibrierungsstatus (Data Lineage)
					</h3>
					<button
						type="button"
						className="primary-button"
						onClick={() => {
							setActiveCalibMetric("water.ph");
							setShowCalibModal(true);
						}}
						style={{
							minHeight: "44px",
							padding: "0 18px",
							background: "var(--green)",
							color: "var(--on-green)",
							border: "none",
							borderRadius: "var(--radius-sm)",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px"
						}}
					>
						+ Messgerät kalibrieren
					</button>
				</div>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
					{/* pH Sensor Card */}
					<div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
							<strong style={{ fontSize: "14px", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
								<TermTooltip term="pH" lens={lens} /> Messgerät (Nährlösung)
							</strong>
							{renderStatusBadge(phStatus)}
						</div>
						<p style={{ fontSize: "12px", color: "var(--text-2)", margin: "0 0 12px 0" }}>
							Software-Fallback: 30 Tage. Hersteller-, Labor- und dokumentierte Gerätevorgaben haben Vorrang.
						</p>
						<button
							type="button"
							onClick={() => {
								setActiveCalibMetric("water.ph");
								setShowCalibModal(true);
							}}
							style={{
								minHeight: "44px",
								width: "100%",
								background: "var(--surface-3)",
								border: "1px solid var(--line-strong)",
								color: "var(--text)",
								borderRadius: "var(--radius-sm)",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							pH-Messgerät kalibrieren
						</button>
					</div>

					{/* EC Sensor Card */}
					<div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
							<strong style={{ fontSize: "14px", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
								<TermTooltip term="EC" lens={lens} /> Messgerät (Leitfähigkeit)
							</strong>
							{renderStatusBadge(ecStatus)}
						</div>
						<p style={{ fontSize: "12px", color: "var(--text-2)", margin: "0 0 12px 0" }}>
							Software-Fallback: 60 Tage. Hersteller-, Labor- und dokumentierte Gerätevorgaben haben Vorrang.
						</p>
						<button
							type="button"
							onClick={() => {
								setActiveCalibMetric("water.ec");
								setShowCalibModal(true);
							}}
							style={{
								minHeight: "44px",
								width: "100%",
								background: "var(--surface-3)",
								border: "1px solid var(--line-strong)",
								color: "var(--text)",
								borderRadius: "var(--radius-sm)",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							EC-Messgerät kalibrieren
						</button>
					</div>
				</div>
			</div>

			{/* PPFD Mapping Overview Card */}
			<div className="panel-card" style={{ background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "20px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
					<h3 style={{ margin: 0, fontSize: "16px", color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
						<span>🗺️</span> 9-Punkt PPFD Lichtverteilung
					</h3>
					<button
						type="button"
						className="primary-button"
						onClick={() => setShowPpfdModal(true)}
						style={{
							minHeight: "44px",
							padding: "0 18px",
							background: "var(--green)",
							color: "var(--on-green)",
							border: "none",
							borderRadius: "var(--radius-sm)",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px"
						}}
					>
						+ Neues PPFD-Grid erfassen
					</button>
				</div>

				{latestMap ? (
					<div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
							<span style={{ fontSize: "13px", color: "var(--green)", fontWeight: 700 }}>
								Aktuelles Mapping ({new Date(latestMap.measuredAt).toLocaleDateString("de-DE")})
							</span>
							<span style={{ fontSize: "12px", color: "var(--muted)" }}>
								Höhe: {latestMap.fixtureHeightCm} cm · Dimmer: {latestMap.dimmerPercent ?? 100}%
							</span>
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
							<div style={{ background: "var(--surface-1)", padding: "10px", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
								<span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Mittelwert (<TermTooltip term="PPFD" lens={lens} />)</span>
								<strong style={{ fontSize: "16px", color: "var(--text)" }}>{latestMap.mean} µmol</strong>
							</div>
							<div style={{ background: "var(--surface-1)", padding: "10px", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
								<span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Min / Max</span>
								<strong style={{ fontSize: "14px", color: "var(--text-2)" }}>{latestMap.min} / {latestMap.max}</strong>
							</div>
							<div style={{ background: "var(--surface-1)", padding: "10px", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
								<span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
									<TermTooltip term="Uniformität" customText="Verhältnis von minimaler zu mittlerer Lichtintensität (Min / Mean)." lens={lens}>Uniformität</TermTooltip>
								</span>
								<strong style={{ fontSize: "16px", color: latestMap.uniformity >= 0.8 ? "var(--green)" : "var(--amber)" }}>
									{(latestMap.uniformity * 100).toFixed(1)}%
								</strong>
							</div>
						</div>
					</div>
				) : (
					<div style={{ background: "var(--surface-2)", border: "1px dashed var(--line-strong)", borderRadius: "var(--radius-sm)", padding: "24px", textAlign: "center" }}>
						<p style={{ margin: "0 0 12px 0", color: "var(--text-2)", fontSize: "14px" }}>
							Noch kein 9-Punkt PPFD-Grid für deinen aktuellen Run erfasst. Erfasse Messpunkte zur Lichtoptimierung.
						</p>
						<button
							type="button"
							onClick={() => setShowPpfdModal(true)}
							style={{
								minHeight: "44px",
								padding: "0 20px",
								background: "var(--surface-3)",
								border: "1px solid var(--line-strong)",
								color: "var(--text)",
								borderRadius: "var(--radius-sm)",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							Jetzt PPFD-Mapping starten
						</button>
					</div>
				)}
			</div>

			{/* Overlay Modals */}
			{showPpfdModal && (
				<PpfdMappingModal
					run={run}
					lens={lens}
					onClose={() => setShowPpfdModal(false)}
					onSave={(updatedRun) => {
						onUpdateRun(updatedRun);
						setShowPpfdModal(false);
					}}
				/>
			)}

			{showCalibModal && (
				<SensorCalibrationModal
					run={run}
					lens={lens}
					initialMetric={activeCalibMetric}
					onClose={() => setShowCalibModal(false)}
					onSave={(updatedRun) => {
						onUpdateRun(updatedRun);
						setShowCalibModal(false);
					}}
				/>
			)}
		</div>
	);
};

export default EquipmentManagerPanel;
