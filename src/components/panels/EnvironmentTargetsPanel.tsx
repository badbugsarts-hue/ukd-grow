import type React from "react";
import { useState } from "react";
import { calculateDli, calculateLeafVpd } from "../../domain";
import { addObservation, createObservation } from "../../run-state";
import type { DayPlan, ExperienceLens, RouteId, RunPackage } from "../../types";
import LensBadge from "../common/LensBadge";
import MetricGauge from "../common/MetricGauge";
import TermTooltip from "../common/TermTooltip";

export interface EnvironmentTargetsPanelProps {
	run: RunPackage;
	plan?: DayPlan;
	lens: ExperienceLens;
	onUpdateRun: (updatedRun: RunPackage) => void;
	navigate?: (route: RouteId) => void;
}

export const EnvironmentTargetsPanel: React.FC<
	EnvironmentTargetsPanelProps
> = ({ run, plan, lens, onUpdateRun, navigate }) => {
	const currentDay = plan?.day ?? 0;

	// Local state for microclimate inputs
	const [tempAir, setTempAir] = useState<number>(24.0);
	const [humidity, setHumidity] = useState<number>(60.0);
	const [ppfd, setPpfd] = useState<number>(500);
	const [lightHours, setLightHours] = useState<number>(18);
	const [leafDelta, setLeafDelta] = useState<number>(-1.0);
	const [notes, setNotes] = useState<string>("");
	const [saveStatus, setSaveStatus] = useState<string | null>(null);

	// Pure calculations
	const leafVpd = calculateLeafVpd(tempAir, humidity, leafDelta);
	const airVpd = calculateLeafVpd(tempAir, humidity, 0);
	const dli = calculateDli(ppfd, lightHours);

	// Growth phase targets fallback matrix based on day
	const getPhaseTarget = (day: number) => {
		if (day <= 7) {
			return {
				name: "Keimung / Sämling (Tag 0-7)",
				tempMin: 22,
				tempMax: 26,
				rhMin: 65,
				rhMax: 75,
				vpdMin: 0.4,
				vpdMax: 0.8,
				ppfdMin: 150,
				ppfdMax: 300,
				dliMin: 10,
				dliMax: 15,
			};
		}
		if (day <= 28) {
			return {
				name: "Vegetation (Tag 8-28)",
				tempMin: 23,
				tempMax: 27,
				rhMin: 55,
				rhMax: 70,
				vpdMin: 0.8,
				vpdMax: 1.1,
				ppfdMin: 400,
				ppfdMax: 600,
				dliMin: 20,
				dliMax: 30,
			};
		}
		if (day <= 63) {
			return {
				name: "Hauptblüte (Tag 29-63)",
				tempMin: 21,
				tempMax: 25,
				rhMin: 40,
				rhMax: 55,
				vpdMin: 1.1,
				vpdMax: 1.5,
				ppfdMin: 700,
				ppfdMax: 1000,
				dliMin: 35,
				dliMax: 45,
			};
		}
		return {
			name: "Spätblüte (Tag 64+)",
			tempMin: 19,
			tempMax: 23,
			rhMin: 38,
			rhMax: 48,
			vpdMin: 1.3,
			vpdMax: 1.6,
			ppfdMin: 600,
			ppfdMax: 900,
			dliMin: 30,
			dliMax: 40,
		};
	};

	const phaseTarget = getPhaseTarget(currentDay);

	const applyPreset = (preset: "seedling" | "veg" | "bloom" | "lateBloom") => {
		switch (preset) {
			case "seedling":
				setTempAir(24.0);
				setHumidity(70.0);
				setPpfd(200);
				setLightHours(18);
				setLeafDelta(-1.0);
				break;
			case "veg":
				setTempAir(25.0);
				setHumidity(60.0);
				setPpfd(500);
				setLightHours(18);
				setLeafDelta(-1.0);
				break;
			case "bloom":
				setTempAir(23.0);
				setHumidity(45.0);
				setPpfd(850);
				setLightHours(12);
				setLeafDelta(-1.5);
				break;
			case "lateBloom":
				setTempAir(21.0);
				setHumidity(40.0);
				setPpfd(750);
				setLightHours(12);
				setLeafDelta(-1.5);
				break;
		}
	};

	const handleSaveObservation = () => {
		const obs = createObservation(currentDay);
		obs.values.tempMax = tempAir;
		obs.values.humidityMax = humidity;
		obs.values.ppfd = ppfd;
		obs.values.leafTemp = Math.round((tempAir + leafDelta) * 10) / 10;
		obs.notes = notes.trim();

		const updatedRun = addObservation(run, obs);
		onUpdateRun(updatedRun);

		setSaveStatus(`Messwert für Tag ${currentDay} erfolgreich gespeichert.`);
		setTimeout(() => setSaveStatus(null), 4000);
	};

	return (
		<div
			className="panel-container environment-targets-panel"
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
						🌡️ Klima & Umwelt Zielwerte
					</h2>
					<p
						style={{
							margin: "4px 0 0 0",
							fontSize: "13px",
							color: "var(--muted)",
						}}
					>
						Echtzeit-Optimierung von <TermTooltip term="VPD" lens={lens} />,{" "}
						<TermTooltip term="DLI" lens={lens} /> und Mikroklima für Tag{" "}
						{currentDay} ({phaseTarget.name})
					</p>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<LensBadge lens={lens} />
					{navigate && (
						<button
							type="button"
							onClick={() => navigate("climate")}
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
							📊 Klima-Details
						</button>
					)}
				</div>
			</div>

			{/* Main 2-Column Grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
					gap: "20px",
				}}
			>
				{/* Left Column: Interactive Inputs & Presets */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "16px",
						background: "var(--surface-2)",
						padding: "16px",
						borderRadius: "var(--radius-sm)",
						border: "1px solid var(--line)",
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: "15px",
							fontWeight: 600,
							color: "var(--text)",
						}}
					>
						⚙️ Messwerte & Parameter
					</h3>

					{/* Quick Presets */}
					<div>
						<div
							style={{
								fontSize: "11px",
								fontWeight: 700,
								color: "var(--muted)",
								textTransform: "uppercase",
								display: "block",
								marginBottom: "6px",
							}}
						>
							Schnell-Presets
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "6px",
							}}
						>
							<button
								type="button"
								onClick={() => applyPreset("seedling")}
								style={{
									padding: "6px 8px",
									fontSize: "11px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									cursor: "pointer",
								}}
							>
								🌱 Sämling (24°/70%)
							</button>
							<button
								type="button"
								onClick={() => applyPreset("veg")}
								style={{
									padding: "6px 8px",
									fontSize: "11px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									cursor: "pointer",
								}}
							>
								🌿 Vegi (25°/60%)
							</button>
							<button
								type="button"
								onClick={() => applyPreset("bloom")}
								style={{
									padding: "6px 8px",
									fontSize: "11px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									cursor: "pointer",
								}}
							>
								🌸 Blüte (23°/45%)
							</button>
							<button
								type="button"
								onClick={() => applyPreset("lateBloom")}
								style={{
									padding: "6px 8px",
									fontSize: "11px",
									background: "var(--surface-1)",
									border: "1px solid var(--line)",
									borderRadius: "4px",
									color: "var(--text)",
									cursor: "pointer",
								}}
							>
								🍂 Spätblüte (21°/40%)
							</button>
						</div>
					</div>

					{/* Air Temp Input */}
					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: "13px",
							}}
						>
							<span>Lufttemperatur (°C):</span>
							<strong style={{ fontFamily: "var(--font-mono)" }}>
								{tempAir.toFixed(1)} °C
							</strong>
						</div>
						<input
							type="range"
							min={15.0}
							max={35.0}
							step={0.5}
							value={tempAir}
							onChange={(e) => setTempAir(parseFloat(e.target.value))}
							aria-label="Lufttemperatur in °C"
							style={{ width: "100%", accentColor: "var(--green)" }}
						/>
					</div>

					{/* Relative Humidity Input */}
					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: "13px",
							}}
						>
							<span>
								<TermTooltip term="rF" lens={lens} /> (%):
							</span>
							<strong style={{ fontFamily: "var(--font-mono)" }}>
								{humidity.toFixed(1)} %
							</strong>
						</div>
						<input
							type="range"
							min={30.0}
							max={90.0}
							step={1.0}
							value={humidity}
							onChange={(e) => setHumidity(parseFloat(e.target.value))}
							aria-label="Relative Luftfeuchtigkeit in Prozent"
							style={{ width: "100%", accentColor: "var(--green)" }}
						/>
					</div>

					{/* PPFD Input */}
					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: "13px",
							}}
						>
							<span>
								<TermTooltip term="PPFD" lens={lens} /> (µmol/m²/s):
							</span>
							<strong style={{ fontFamily: "var(--font-mono)" }}>
								{ppfd} µmol/m²/s
							</strong>
						</div>
						<input
							type="range"
							min={50}
							max={1200}
							step={10}
							value={ppfd}
							onChange={(e) => setPpfd(parseInt(e.target.value, 10))}
							aria-label="PPFD in Mikromol pro Quadratmeter und Sekunde"
							style={{ width: "100%", accentColor: "var(--green)" }}
						/>
					</div>

					{/* Light Hours Input */}
					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: "13px",
							}}
						>
							<span>Photoperiode (Stunden/Tag):</span>
							<strong style={{ fontFamily: "var(--font-mono)" }}>
								{lightHours} h/d
							</strong>
						</div>
						<input
							type="range"
							min={12}
							max={24}
							step={1}
							value={lightHours}
							onChange={(e) => setLightHours(parseInt(e.target.value, 10))}
							aria-label="Photoperiode in Stunden pro Tag"
							style={{ width: "100%", accentColor: "var(--green)" }}
						/>
					</div>

					{/* Leaf Temp Offset Input */}
					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: "13px",
							}}
						>
							<span>Blatt-Temperatur Offset (°C):</span>
							<strong style={{ fontFamily: "var(--font-mono)" }}>
								{leafDelta > 0
									? `+${leafDelta.toFixed(1)}`
									: leafDelta.toFixed(1)}{" "}
								°C
							</strong>
						</div>
						<input
							type="range"
							min={-4.0}
							max={2.0}
							step={0.5}
							value={leafDelta}
							onChange={(e) => setLeafDelta(parseFloat(e.target.value))}
							aria-label="Blatt-Temperatur Offset in °C"
							style={{ width: "100%", accentColor: "var(--green)" }}
						/>
					</div>

					{/* Observation Notes */}
					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						<label style={{ fontSize: "12px", color: "var(--muted)" }}>
							Notizen zur Messung (optional):
						</label>
						<input
							type="text"
							placeholder="z.B. Nach Gießen gemessen, Lampenhöhe 40cm"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							style={{
								padding: "8px",
								background: "var(--surface-1)",
								border: "1px solid var(--line)",
								borderRadius: "var(--radius-sm)",
								color: "var(--text)",
								fontSize: "12px",
							}}
						/>
					</div>

					{/* Save Action */}
					<button
						type="button"
						onClick={handleSaveObservation}
						style={{
							marginTop: "8px",
							padding: "10px 16px",
							background: "var(--green)",
							border: "none",
							borderRadius: "var(--radius-sm)",
							color: "var(--on-green)",
							fontWeight: 700,
							fontSize: "13px",
							cursor: "pointer",
						}}
					>
						💾 Messung als Tagesbeobachtung speichern
					</button>

					{saveStatus && (
						<div
							style={{
								padding: "8px 12px",
								background: "var(--green-dim)",
								border: "1px solid var(--green)",
								borderRadius: "var(--radius-sm)",
								color: "var(--green)",
								fontSize: "12px",
							}}
						>
							{saveStatus}
						</div>
					)}
				</div>

				{/* Right Column: Live Metric Gauges & Targets */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: "15px",
							fontWeight: 600,
							color: "var(--text)",
						}}
					>
						📊 Live-Berechnungen & Zielkorridor
					</h3>

					{/* Leaf VPD Gauge */}
					<MetricGauge
						value={Math.round(leafVpd * 100) / 100}
						min={0.2}
						max={2.0}
						unit="kPa"
						optimalMin={phaseTarget.vpdMin}
						optimalMax={phaseTarget.vpdMax}
						warnMin={Math.max(0.2, phaseTarget.vpdMin - 0.2)}
						warnMax={phaseTarget.vpdMax + 0.2}
						label="Leaf-VPD"
						lens={lens}
					/>

					{/* DLI Gauge */}
					<MetricGauge
						value={Math.round(dli * 10) / 10}
						min={5}
						max={50}
						unit="mol/m²/d"
						optimalMin={phaseTarget.dliMin}
						optimalMax={phaseTarget.dliMax}
						warnMin={Math.max(5, phaseTarget.dliMin - 5)}
						warnMax={phaseTarget.dliMax + 5}
						label="DLI (Daily Light Integral)"
						lens={lens}
					/>

					{/* Secondary Metric Info Card */}
					<div
						style={{
							padding: "12px 14px",
							background: "var(--surface-2)",
							border: "1px solid var(--line)",
							borderRadius: "var(--radius-sm)",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							fontSize: "13px",
						}}
					>
						<div>
							<span style={{ color: "var(--muted)" }}>
								Air VPD (ohne Leaf-Offset):
							</span>
							<div
								style={{
									fontSize: "16px",
									fontWeight: 700,
									fontFamily: "var(--font-mono)",
									color: "var(--text)",
								}}
							>
								{(Math.round(airVpd * 100) / 100).toFixed(2)} kPa
							</div>
						</div>
						<div
							style={{
								textAlign: "right",
								fontSize: "11px",
								color: "var(--muted)",
							}}
						>
							Blatt-Temp: <strong>{(tempAir + leafDelta).toFixed(1)} °C</strong>
						</div>
					</div>

					{/* Phase Guidance Summary Card */}
					<div
						style={{
							padding: "14px",
							background: "var(--surface-2)",
							border: "1px solid var(--line)",
							borderRadius: "var(--radius-sm)",
							fontSize: "12px",
							lineHeight: "1.5",
							color: "var(--text)",
						}}
					>
						<strong
							style={{
								color: "var(--green)",
								display: "block",
								marginBottom: "4px",
							}}
						>
							💡 Phasen-Leitfaden: {phaseTarget.name}
						</strong>
						<div>
							• Ziel-VPD: {phaseTarget.vpdMin}–{phaseTarget.vpdMax} kPa <br />•
							Ziel-DLI: {phaseTarget.dliMin}–{phaseTarget.dliMax} mol/m²/d{" "}
							<br />• Ziel-PPFD: {phaseTarget.ppfdMin}–{phaseTarget.ppfdMax}{" "}
							µmol/m²/s <br />• Empf. RLF: {phaseTarget.rhMin}%–
							{phaseTarget.rhMax}%
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EnvironmentTargetsPanel;
