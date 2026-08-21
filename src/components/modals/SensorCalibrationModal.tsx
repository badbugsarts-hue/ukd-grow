import type React from "react";
import { useState } from "react";
import type { CalibrationRecord, ExperienceLens, MeasurementMetric, RunPackage } from "../../types";

export interface SensorCalibrationModalProps {
	run: RunPackage;
	lens: ExperienceLens;
	initialMetric?: "water.ph" | "water.ec";
	onClose: () => void;
	onSave: (updatedRun: RunPackage) => void;
}

export const SensorCalibrationModal: React.FC<SensorCalibrationModalProps> = ({
	run,
	lens: _lens,
	initialMetric = "water.ph",
	onClose,
	onSave,
}) => {
	const initialDeviceId =
		run.devices.find((device) =>
			device.capabilities.some((capability) => capability.metric === initialMetric),
		)?.id ??
		run.calibrations.find((record) => record.metric === initialMetric)?.deviceId ??
		"";
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [metric, setMetric] = useState<MeasurementMetric>(initialMetric);
	const [deviceId, setDeviceId] = useState<string>(initialDeviceId);
	const [bufferStandard, setBufferStandard] = useState<string>("");
	const [uncertainty, setUncertainty] = useState<number>(0);
	const [resultStatus, setResultStatus] = useState<"passed" | "failed" | "limited">("passed");
	const [validityDays, setValidityDays] = useState<number>(0);

	const handleMetricChange = (newMetric: MeasurementMetric) => {
		setMetric(newMetric);
		setDeviceId(
			run.devices.find((device) =>
				device.capabilities.some((capability) => capability.metric === newMetric),
			)?.id ??
				run.calibrations.find((record) => record.metric === newMetric)?.deviceId ??
				"",
		);
		setBufferStandard("");
		setUncertainty(0);
		setValidityDays(0);
	};

	const handleSave = () => {
		if (!deviceId.trim() || !bufferStandard.trim() || validityDays < 1) return;
		const now = new Date();
		const validUntilDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

		const record: CalibrationRecord = {
			id: crypto.randomUUID(),
			deviceId: deviceId.trim(),
			metric,
			performedAt: now.toISOString(),
			validUntil: validUntilDate.toISOString(),
			method: metric === "water.ph" ? "2-Punkt Puffer-Kalibrierung" : "Standard-Leitfähigkeitslösung",
			referenceStandard: bufferStandard.trim(),
			uncertainty,
			unit: metric === "water.ph" ? "pH" : "mS/cm",
			result: resultStatus,
		};

		const occurredAt = now.toISOString();
		const updatedRun: RunPackage = {
			...run,
			updatedAt: occurredAt,
			calibrations: [record, ...run.calibrations],
			auditEvents: [
				{
					id: crypto.randomUUID(),
					occurredAt,
					action: "sensor-calibrated",
					entityType: "sensor",
					entityId: record.id,
					detail: `Sensor-Kalibrierung für ${metric} (${resultStatus}). Gültig bis ${validUntilDate.toLocaleDateString("de-DE")}.`,
				},
				...run.auditEvents,
			],
		};

		onSave(updatedRun);
	};

	return (
		<div
			className="palette-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="calib-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			style={{ zIndex: 100 }}
		>
			<div
				className="command-palette"
				style={{
					width: "min(620px, calc(100vw - 24px))",
					maxHeight: "90vh",
					overflowY: "auto",
					padding: "24px",
					background: "var(--surface-0)",
					border: "1px solid var(--line-strong)",
					borderRadius: "var(--radius)",
					boxShadow: "var(--shadow)",
				}}
			>
				{/* Modal Header */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
					<div>
						<span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 800, textTransform: "uppercase" }}>
							SCHRITT {step} VON 3
						</span>
						<h3 id="calib-modal-title" style={{ margin: "2px 0 0 0", fontSize: "18px", color: "var(--text)" }}>
							🧪 Messgerät-Kalibrierungs-Assistent
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Schließen"
						style={{
							minHeight: "44px",
							minWidth: "44px",
							background: "transparent",
							border: "none",
							color: "var(--muted)",
							fontSize: "20px",
							cursor: "pointer",
						}}
					>
						✕
					</button>
				</div>

				{/* Step 1: Metric Selection */}
				{step === 1 && (
					<div>
						<label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>
							1. Messgerät & Messgröße wählen
						</label>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
							<button
								type="button"
								onClick={() => handleMetricChange("water.ph")}
								style={{
									minHeight: "54px",
									padding: "12px",
									background: metric === "water.ph" ? "var(--green-dim)" : "var(--surface-2)",
									border: metric === "water.ph" ? "2px solid var(--green)" : "1px solid var(--line)",
									borderRadius: "var(--radius-sm)",
									color: metric === "water.ph" ? "var(--green)" : "var(--text)",
									fontWeight: 700,
									textAlign: "center",
									cursor: "pointer",
								}}
							>
								pH-Messgerät
							</button>
							<button
								type="button"
								onClick={() => handleMetricChange("water.ec")}
								style={{
									minHeight: "54px",
									padding: "12px",
									background: metric === "water.ec" ? "var(--green-dim)" : "var(--surface-2)",
									border: metric === "water.ec" ? "2px solid var(--green)" : "1px solid var(--line)",
									borderRadius: "var(--radius-sm)",
									color: metric === "water.ec" ? "var(--green)" : "var(--text)",
									fontWeight: 700,
									textAlign: "center",
									cursor: "pointer",
								}}
							>
								EC-Messgerät
							</button>
						</div>

						<div style={{ marginBottom: "16px" }}>
							<label htmlFor="calibration-device-id" style={{ display: "block", fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
								Geräte-ID / Asset-ID
							</label>
							<input
								id="calibration-device-id"
								type="text"
								value={deviceId}
								onChange={(e) => setDeviceId(e.target.value)}
								placeholder="Vom Gerät oder Inventar übernehmen"
								required
								style={{ width: "100%", minHeight: "44px", padding: "8px 12px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", color: "var(--text)" }}
							/>
						</div>

						<div style={{ marginBottom: "20px" }}>
							<label htmlFor="calibration-reference-standard" style={{ display: "block", fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
								Referenz-Kalibrierlösung (Standard)
							</label>
							<input
								id="calibration-reference-standard"
								type="text"
								value={bufferStandard}
								onChange={(e) => setBufferStandard(e.target.value)}
								placeholder="Exakte Lösung/Charge laut Etikett"
								required
								style={{
									width: "100%",
									minHeight: "44px",
									padding: "8px 12px",
									background: "var(--surface-2)",
									border: "1px solid var(--line)",
									borderRadius: "var(--radius-sm)",
									color: "var(--text)",
								}}
							/>
						</div>

						<div style={{ display: "flex", justifyContent: "flex-end" }}>
							<button
								type="button"
								onClick={() => setStep(2)}
								disabled={!deviceId.trim() || !bufferStandard.trim()}
								style={{
									minHeight: "44px",
									padding: "0 22px",
									background: "var(--green)",
									color: "var(--on-green)",
									border: "none",
									borderRadius: "var(--radius-sm)",
									fontWeight: 700,
									cursor: "pointer",
								}}
							>
								Weiter zu Schritt 2 →
							</button>
						</div>
					</div>
				)}

				{/* Step 2: Reading & Calibration Result */}
				{step === 2 && (
					<div>
						<label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>
							2. Messwert & Abweichung prüfen
						</label>
						<div style={{ marginBottom: "16px" }}>
							<div>
								<label htmlFor="calibration-uncertainty" style={{ display: "block", fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
									Messunsicherheit (±)
								</label>
								<input
									id="calibration-uncertainty"
									type="number"
									step="0.01"
									value={uncertainty}
									onChange={(e) => setUncertainty(parseFloat(e.target.value) || 0)}
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "8px 12px",
										background: "var(--surface-2)",
										border: "1px solid var(--line)",
										borderRadius: "var(--radius-sm)",
										color: "var(--text)",
									}}
								/>
							</div>
						</div>

						<div style={{ marginBottom: "20px" }}>
							<div id="calibration-result-label" style={{ display: "block", fontSize: "12px", color: "var(--text-2)", marginBottom: "8px" }}>
								Kalibrierungsergebnis
							</div>
							<div role="group" aria-labelledby="calibration-result-label" style={{ display: "flex", gap: "12px" }}>
								{(["passed", "failed", "limited"] as const).map((status) => (
									<button
										key={status}
										type="button"
									onClick={() => setResultStatus(status)}
									aria-pressed={resultStatus === status}
										style={{
											flex: 1,
											minHeight: "44px",
											background: resultStatus === status ? "var(--surface-3)" : "var(--surface-2)",
											border: resultStatus === status ? "2px solid var(--green)" : "1px solid var(--line)",
											color: "var(--text)",
											borderRadius: "var(--radius-sm)",
											fontWeight: resultStatus === status ? 700 : 400,
											cursor: "pointer",
										}}
									>
										{status === "passed" ? "✓ Erfolgreich" : status === "failed" ? "❌ Fehlgeschlagen" : "⚠️ Eingeschränkt"}
									</button>
								))}
							</div>
						</div>

						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<button
								type="button"
								onClick={() => setStep(1)}
								style={{
									minHeight: "44px",
									padding: "0 18px",
									background: "transparent",
									border: "1px solid var(--line)",
									borderRadius: "var(--radius-sm)",
									color: "var(--text-2)",
									cursor: "pointer",
								}}
							>
								← Zurück
							</button>
							<button
								type="button"
								onClick={() => setStep(3)}
								style={{
									minHeight: "44px",
									padding: "0 22px",
									background: "var(--green)",
									color: "var(--on-green)",
									border: "none",
									borderRadius: "var(--radius-sm)",
									fontWeight: 700,
									cursor: "pointer",
								}}
							>
								Weiter zu Schritt 3 →
							</button>
						</div>
					</div>
				)}

				{/* Step 3: Validity Window & Confirmation */}
				{step === 3 && (
					<div>
						<label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>
							3. Gültigkeitsfenster & Bestätigung
						</label>
						<div style={{ marginBottom: "16px" }}>
							<label htmlFor="calibration-validity-days" style={{ display: "block", fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
								Gültigkeit laut Hersteller-/Laborvorgabe (Tage)
							</label>
							<input
								id="calibration-validity-days"
								type="number"
								min="1"
								value={validityDays || ""}
								onChange={(event) => setValidityDays(Number(event.target.value))}
								required
								style={{ width: "100%", minHeight: "44px", padding: "8px 12px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", color: "var(--text)" }}
							/>
						</div>

						<div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "16px", marginBottom: "20px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>Messgerät:</span>
								<strong style={{ fontSize: "13px", color: "var(--text)" }}>{deviceId}</strong>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>Standard:</span>
								<strong style={{ fontSize: "13px", color: "var(--text)" }}>{bufferStandard}</strong>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>Ergebnis:</span>
								<strong style={{ fontSize: "13px", color: resultStatus === "passed" ? "var(--green)" : "var(--red)" }}>
									{resultStatus.toUpperCase()}
								</strong>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>Gültigkeitsfenster:</span>
								<strong style={{ fontSize: "13px", color: "var(--text)" }}>{validityDays} Tage</strong>
							</div>
						</div>

						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<button
								type="button"
								onClick={() => setStep(2)}
								style={{
									minHeight: "44px",
									padding: "0 18px",
									background: "transparent",
									border: "1px solid var(--line)",
									borderRadius: "var(--radius-sm)",
									color: "var(--text-2)",
									cursor: "pointer",
								}}
							>
								← Zurück
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={validityDays < 1}
								style={{
									minHeight: "44px",
									padding: "0 24px",
									background: "var(--green)",
									color: "var(--on-green)",
									border: "none",
									borderRadius: "var(--radius-sm)",
									fontWeight: 700,
									cursor: "pointer",
								}}
							>
								Kalibrierung Abschließen
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default SensorCalibrationModal;
