import type {
	CalibrationRecord,
	Measurement,
	MeasurementDevice,
	MeasurementMetric,
	MeasurementTrustStatus,
} from "./types";

export interface ProviderHealth {
	state: "ready" | "degraded" | "offline" | "error";
	checkedAt: string;
	detail: string;
}

export interface MeasurementProvider {
	readonly id: string;
	discover(): Promise<MeasurementDevice[]>;
	capabilities(): Promise<MeasurementMetric[]>;
	health(): Promise<ProviderHealth>;
	read(): Promise<Measurement[]>;
}

export interface TrustPolicy {
	freshnessMs: number;
	conflictTolerance: number;
	plausibleMin?: number;
	plausibleMax?: number;
	calibrationRequired: boolean;
}

export interface TrustAssessment {
	status: MeasurementTrustStatus;
	reasons: string[];
	interpretationAllowed: boolean;
}

export type SensorCalibrationStatus = "VALID" | "DUE_SOON" | "CALIBRATION_DUE" | "FAILED" | "UNKNOWN" | "INVALID_TIMESTAMP";

export function getSensorCalibrationStatus(
	deviceId: string,
	metric: MeasurementMetric,
	calibrations: CalibrationRecord[],
	now = new Date(),
): SensorCalibrationStatus {
	const matching = calibrations
		.filter((c) => c.deviceId === deviceId && c.metric === metric)
		.sort((a, b) => {
			const timeA = new Date(a.performedAt).getTime();
			const timeB = new Date(b.performedAt).getTime();
			// Sort descending (newest first)
			return timeB - timeA;
		});

	if (matching.length === 0) {
		return "UNKNOWN";
	}

	const latest = matching.find(c => {
		const time = new Date(c.performedAt).getTime();
		return !Number.isNaN(time) && time <= now.getTime();
	});

	if (!latest) {
		const first = matching[0];
		if (first && Number.isNaN(new Date(first.performedAt).getTime())) {
			return "INVALID_TIMESTAMP";
		}
		// If all matching records are in the future, we still consider it unknown
		return "UNKNOWN";
	}

	if (latest.result === "failed") {
		return "FAILED";
	}

	let expiryTime: number;
	if (latest.validUntil) {
		const parsedExpiry = new Date(latest.validUntil).getTime();
		if (Number.isNaN(parsedExpiry)) return "INVALID_TIMESTAMP";
		expiryTime = parsedExpiry;
	} else {
		// Enforce metric windows: pH = 30 days, EC = 60 days, default = 30 days
		const validityDays =
			metric === "water.ph" || metric === "drain.ph"
				? 30
				: metric === "water.ec" || metric === "drain.ec"
					? 60
					: 30;
		expiryTime = new Date(latest.performedAt).getTime() + validityDays * 24 * 60 * 60 * 1000;
	}

	const dueSoonTime = expiryTime - 7 * 24 * 60 * 60 * 1000; // 7 days before expiry

	if (now.getTime() > expiryTime) {
		return "CALIBRATION_DUE";
	}
	if (now.getTime() > dueSoonTime) {
		return "DUE_SOON";
	}

	return "VALID";
}

export function assessMeasurementTrust(
	measurement: Measurement,
	device: MeasurementDevice | undefined,
	calibrations: CalibrationRecord[],
	peers: Measurement[],
	policy: TrustPolicy,
	now = new Date(),
): TrustAssessment {
	const reasons: string[] = [];
	const value = measurement.reading.value;
	if (value === null || !Number.isFinite(value)) {
		return blocked("missing", "Kein endlicher Messwert vorhanden.");
	}
	if (!device || device.health === "unknown")
		reasons.push("Geräteidentität oder Gerätezustand ist nicht verifiziert.");
	if (device?.health === "offline" || device?.health === "degraded")
		return blocked("suspect", `Gerätezustand ist ${device.health}.`);
	const ageMs = now.getTime() - new Date(measurement.measuredAt).getTime();
	if (!Number.isFinite(ageMs) || ageMs > policy.freshnessMs)
		return blocked("stale", "Messwert liegt außerhalb des Frischefensters.");
	if (
		(policy.plausibleMin !== undefined && value < policy.plausibleMin) ||
		(policy.plausibleMax !== undefined && value > policy.plausibleMax)
	)
		return blocked(
			"outlier",
			"Messwert liegt außerhalb der Plausibilitätsgrenze.",
		);
	if (measurement.deviceId) {
		const calStatus = getSensorCalibrationStatus(
			measurement.deviceId,
			measurement.metric,
			calibrations,
			now,
		);

		if (calStatus === "FAILED" || calStatus === "INVALID_TIMESTAMP") {
			return blocked("suspect", "Sensorkalibrierung ist fehlgeschlagen oder ungültig.");
		}
		if (calStatus === "UNKNOWN" && policy.calibrationRequired) {
			return blocked("unverified", "Erforderliche Kalibrierung fehlt.");
		}
		if (calStatus === "CALIBRATION_DUE") {
			reasons.push("Kalibrierungsintervall ist abgelaufen. Messwert mit reduzierter Sicherheit.");
		}
		if (calStatus === "DUE_SOON") {
			reasons.push("Kalibrierung ist demnächst fällig.");
		}
	} else if (policy.calibrationRequired) {
		return blocked("unverified", "Erforderliche Kalibrierung fehlt.");
	}
	const conflict = peers.some(
		(peer) =>
			peer.id !== measurement.id &&
			peer.metric === measurement.metric &&
			peer.reading.value !== null &&
			Math.abs(peer.reading.value - value) > policy.conflictTolerance,
	);
	if (conflict)
		return blocked(
			"conflicting",
			"Parallelmessungen widersprechen sich; Interpretation ist ausgesetzt.",
		);
	if (reasons.length > 0) {
		const isOnlyCalibrationWarning = reasons.every(r => r.includes("Kalibrierung"));
		if (isOnlyCalibrationWarning) {
			return { status: "calibration-due", reasons, interpretationAllowed: true };
		}
		return { status: "unverified", reasons, interpretationAllowed: false };
	}
	return { status: "valid", reasons: [], interpretationAllowed: true };
}

export function negotiatedCapabilities(
	devices: MeasurementDevice[],
): MeasurementMetric[] {
	return [
		...new Set(
			devices.flatMap((device) =>
				device.health === "offline"
					? []
					: device.capabilities.map((capability) => capability.metric),
			),
		),
	].sort();
}

function blocked(
	status: MeasurementTrustStatus,
	reason: string,
): TrustAssessment {
	return { status, reasons: [reason], interpretationAllowed: false };
}
