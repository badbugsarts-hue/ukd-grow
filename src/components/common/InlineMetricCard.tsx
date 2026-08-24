import { type CSSProperties, useState } from "react";
import type { ExperienceLens } from "../../types";
import type {
  PredictionContext,
  PredictionSuggestion,
} from "../../prediction-engine";
import { TermTooltip } from "./TermTooltip";
import { InlineEditable } from "./InlineEditable";

export interface InlineMetricCardProps {
  label: string;
  targetValue: number | string;
  measuredValue?: number | string | null;
  unit: string;
  tone?: "neutral" | "blue" | "amber" | "green" | "purple";
  note?: string;
  lens?: ExperienceLens;
  fieldKey?: string;
  context?: PredictionContext;
  editable?: boolean;
  isOverrideMode?: boolean;
  onSaveMeasurement?: (
    newValue: number | string,
    meta?: { reason?: string; isOverride?: boolean },
  ) => void | Promise<void>;
  onSaveTarget?: (
    newValue: number | string,
    meta?: { reason?: string; isOverride?: boolean },
  ) => void | Promise<void>;
  validator?: (val: number | string) => boolean | string;
  getSuggestions?: (query: string) => PredictionSuggestion[];
  className?: string;
  style?: CSSProperties;
  type?: "number" | "text";
}

export function InlineMetricCard({
  label,
  targetValue,
  measuredValue,
  unit,
  tone = "blue",
  note,
  lens,
  fieldKey,
  context,
  editable = true,
  isOverrideMode = false,
  onSaveMeasurement,
  onSaveTarget,
  validator,
  getSuggestions,
  className = "",
  style = {},
  type = "number",
}: InlineMetricCardProps) {
  const [activeTab, setActiveTab] = useState<"measurement" | "target">(
    onSaveMeasurement ? "measurement" : "target",
  );

  const isTerm = ["PPFD", "DLI", "Leaf-VPD", "VPD", "EC", "pH"].includes(label);
  const termKey = label === "Leaf-VPD" ? "VPD" : label;

  const hasMeasurement =
    measuredValue !== undefined &&
    measuredValue !== null &&
    measuredValue !== "";

  return (
    <article
      className={`metric tone-${tone} inline-metric-card ${className}`}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "130px",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          width: "100%",
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "12px",
            color: "var(--muted, #82958e)",
          }}
        >
          {isTerm ? (
            <TermTooltip term={termKey} lens={lens}>
              {label}
            </TermTooltip>
          ) : (
            label
          )}
        </span>

        {/* Tab or mode indicator if both measurement and target handlers are supplied */}
        {editable && onSaveMeasurement && onSaveTarget && (
          <div
            style={{
              display: "flex",
              gap: "2px",
              background: "var(--surface-2, #152521)",
              borderRadius: "4px",
              padding: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("measurement")}
              aria-label={`Messung für ${label}`}
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                background:
                  activeTab === "measurement"
                    ? "var(--green-dim, #174d3f)"
                    : "transparent",
                color:
                  activeTab === "measurement"
                    ? "var(--green, #67d6ae)"
                    : "var(--muted, #82958e)",
              }}
            >
              Ist
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("target")}
              aria-label={`Sollwert für ${label}`}
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                background:
                  activeTab === "target"
                    ? "var(--blue-dim, #163958)"
                    : "transparent",
                color:
                  activeTab === "target"
                    ? "var(--blue, #62a8ff)"
                    : "var(--muted, #82958e)",
              }}
            >
              Soll
            </button>
          </div>
        )}
      </div>

      {/* Main Metric Value display or In-Place Edit */}
      <div
        style={{
          margin: "6px 0",
          minHeight: "44px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {editable && (onSaveMeasurement || onSaveTarget) ? (
          <InlineEditable
            value={
              activeTab === "measurement"
                ? (measuredValue ?? targetValue)
                : targetValue
            }
            displayValue={
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "6px" }}
              >
                <strong style={{ fontSize: "24px", letterSpacing: "-0.02em" }}>
                  {activeTab === "measurement"
                    ? hasMeasurement
                      ? measuredValue
                      : targetValue
                    : targetValue}
                </strong>
                <b
                  style={{
                    fontSize: "12px",
                    color: "var(--text-2, #b6c7c1)",
                    fontWeight: 500,
                  }}
                >
                  {unit}
                </b>
              </div>
            }
            label={label}
            unit={unit}
            type={type}
            fieldKey={fieldKey || label}
            context={context}
            isOverrideMode={isOverrideMode || activeTab === "target"}
            validator={validator}
            getSuggestions={getSuggestions}
            onSave={async (val, meta) => {
              if (activeTab === "measurement" && onSaveMeasurement) {
                await onSaveMeasurement(val, meta);
              } else if (onSaveTarget) {
                await onSaveTarget(val, meta);
              }
            }}
            tone={tone}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <strong style={{ fontSize: "24px", letterSpacing: "-0.02em" }}>
              {targetValue}
            </strong>
            <b
              style={{
                fontSize: "12px",
                color: "var(--text-2, #b6c7c1)",
                fontWeight: 500,
              }}
            >
              {unit}
            </b>
          </div>
        )}
      </div>

      {/* Footer / Sub-info: Target vs Measured status and note */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          color: "var(--muted, #82958e)",
        }}
      >
        <span>
          {note ||
            (hasMeasurement ? `Soll: ${targetValue} ${unit}` : "Planwert")}
        </span>
        {hasMeasurement && (
          <span
            style={{
              padding: "1px 5px",
              borderRadius: "3px",
              fontSize: "10px",
              fontWeight: 700,
              background: "var(--green-dim, #174d3f)",
              color: "var(--green, #67d6ae)",
            }}
          >
            IST-WERT
          </span>
        )}
      </div>
    </article>
  );
}
