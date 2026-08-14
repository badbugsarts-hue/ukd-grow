import type React from "react";
import type { ExperienceLens, ScientificUnit } from "../../types";

export type GaugeStatus =
	| "optimal"
	| "warning"
	| "alert-low"
	| "alert-high"
	| "missing";

export interface GaugeStatusResult {
	status: GaugeStatus;
	colorVar: string;
	dimColorVar: string;
	icon: string;
	labelGerman: string;
	percentage: number;
}

export function calculateGaugeStatus(
	value: number | null | undefined,
	min: number,
	max: number,
	optimalMin: number,
	optimalMax: number,
	warnMin?: number,
	warnMax?: number,
): GaugeStatusResult {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return {
			status: "missing",
			colorVar: "var(--muted)",
			dimColorVar: "var(--surface-2)",
			icon: "?",
			labelGerman: "Kein Wert",
			percentage: 0,
		};
	}

	const range = max - min;
	const rawPercentage = range > 0 ? ((value - min) / range) * 100 : 0;
	const percentage = Math.max(0, Math.min(100, rawPercentage));

	if (value >= optimalMin && value <= optimalMax) {
		return {
			status: "optimal",
			colorVar: "var(--green)",
			dimColorVar: "var(--green-dim)",
			icon: "✓",
			labelGerman: "Optimal",
			percentage,
		};
	}

	const effectiveWarnMin = warnMin ?? optimalMin;
	const effectiveWarnMax = warnMax ?? optimalMax;

	if (value < optimalMin && value >= effectiveWarnMin) {
		return {
			status: "warning",
			colorVar: "var(--amber)",
			dimColorVar: "var(--amber-dim)",
			icon: "⚠",
			labelGerman: "Warnung",
			percentage,
		};
	}

	if (value > optimalMax && value <= effectiveWarnMax) {
		return {
			status: "warning",
			colorVar: "var(--amber)",
			dimColorVar: "var(--amber-dim)",
			icon: "⚠",
			labelGerman: "Warnung",
			percentage,
		};
	}

	if (value < effectiveWarnMin) {
		return {
			status: "alert-low",
			colorVar: "var(--blue)",
			dimColorVar: "var(--blue-dim)",
			icon: "↓",
			labelGerman: "Zu niedrig",
			percentage,
		};
	}

	return {
		status: "alert-high",
		colorVar: "var(--red)",
		dimColorVar: "var(--red-dim)",
		icon: "↑",
		labelGerman: "Zu hoch",
		percentage,
	};
}

export interface MetricGaugeProps {
	value: number | null | undefined;
	min: number;
	max: number;
	unit?: ScientificUnit | string;
	optimalMin: number;
	optimalMax: number;
	warnMin?: number;
	warnMax?: number;
	label?: string;
	tooltipTerm?: string;
	lens?: ExperienceLens;
	showMarker?: boolean;
	className?: string;
}

export const MetricGauge: React.FC<MetricGaugeProps> = ({
	value,
	min,
	max,
	unit = "",
	optimalMin,
	optimalMax,
	warnMin,
	warnMax,
	label,
	lens = "guided",
	showMarker = true,
	className = "",
}) => {
	const result = calculateGaugeStatus(
		value,
		min,
		max,
		optimalMin,
		optimalMax,
		warnMin,
		warnMax,
	);

	const range = max - min;
	const optMinPct =
		range > 0
			? Math.max(0, Math.min(100, ((optimalMin - min) / range) * 100))
			: 0;
	const optMaxPct =
		range > 0
			? Math.max(0, Math.min(100, ((optimalMax - min) / range) * 100))
			: 100;
	const optWidthPct = optMaxPct - optMinPct;

	const displayVal =
		value !== null && value !== undefined && !Number.isNaN(value)
			? `${value} ${unit}`.trim()
			: "—";

	return (
		// biome-ignore lint/a11y/useSemanticElements: Custom styled gauge
		<div
			className={`metric-gauge ${className}`.trim()}
			role={value !== null && value !== undefined && !Number.isNaN(value) ? "meter" : "group"}
			aria-label={label ? `${label} Messanzeige` : "Messanzeige"}
			{...(value !== null && value !== undefined && !Number.isNaN(value) ? {
				"aria-valuenow": value,
				"aria-valuemin": min,
				"aria-valuemax": max,
				"aria-valuetext": `${label ? `${label}: ` : ""}${displayVal} (${result.labelGerman})`
			} : {})}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				padding: "10px 14px",
				background: "var(--surface-1)",
				border: "1px solid var(--line)",
				borderRadius: "var(--radius-sm)",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "12px",
				}}
			>
				{label && <strong style={{ color: "var(--text)" }}>{label}</strong>}
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "3px",
							padding: "2px 6px",
							borderRadius: "4px",
							background: result.dimColorVar,
							color: result.colorVar,
							fontWeight: 800,
							fontSize: "10px",
							textTransform: "uppercase",
						}}
					>
						<span aria-hidden="true">{result.icon}</span> {result.labelGerman}
					</span>
					<span
						style={{
							fontFamily: "var(--font-mono)",
							fontWeight: 700,
							color: "var(--text)",
						}}
					>
						{displayVal}
					</span>
				</div>
			</div>

			<div
				style={{
					position: "relative",
					height: "10px",
					width: "100%",
					background: "var(--surface-2)",
					borderRadius: "5px",
					overflow: "hidden",
				}}
			>
				{showMarker && (
					<div
						style={{
							position: "absolute",
							left: `${optMinPct}%`,
							width: `${optWidthPct}%`,
							top: 0,
							bottom: 0,
							background: "color-mix(in srgb, var(--green) 25%, transparent)",
							borderLeft: "1px solid var(--green)",
							borderRight: "1px solid var(--green)",
						}}
						title={`Zielbereich: ${optimalMin} - ${optimalMax} ${unit}`}
					/>
				)}

				{value !== null && value !== undefined && !Number.isNaN(value) && (
					<div
						style={{
							height: "100%",
							width: `${result.percentage}%`,
							background: result.colorVar,
							borderRadius: "5px",
							transition: "width 0.3s ease",
						}}
					/>
				)}
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: "10px",
					color: "var(--muted)",
					fontFamily: "var(--font-mono)",
				}}
			>
				<span>
					{min} {unit}
				</span>
				<span>
					Ziel: {optimalMin}–{optimalMax} {unit}
				</span>
				<span>
					{max} {unit}
				</span>
			</div>
		</div>
	);
};

export default MetricGauge;
