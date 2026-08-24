import type React from "react";
import { useState } from "react";
import type {
  ExperienceLens,
  PpfdMapPoint,
  PpfdMapPosition,
  RunPackage,
} from "../../types";
import { calculatePpfdMapSummary } from "../../domain";
import TermTooltip from "../common/TermTooltip";

export interface PpfdMappingModalProps {
  run: RunPackage;
  lens: ExperienceLens;
  onClose: () => void;
  onSave: (updatedRun: RunPackage) => void;
}

const DEFAULT_POSITIONS: Array<{ pos: PpfdMapPosition; label: string }> = [
  { pos: "NW", label: "Nord-West" },
  { pos: "N", label: "Nord" },
  { pos: "NE", label: "Nord-Ost" },
  { pos: "W", label: "West" },
  { pos: "C", label: "Zentrum" },
  { pos: "E", label: "Ost" },
  { pos: "SW", label: "Süd-West" },
  { pos: "S", label: "Süd" },
  { pos: "SE", label: "Süd-Ost" },
];

export const PpfdMappingModal: React.FC<PpfdMappingModalProps> = ({
  run,
  lens,
  onClose,
  onSave,
}) => {
  const [fixtureHeightCm, setFixtureHeightCm] = useState<number>(0);
  const [dimmerPercent, setDimmerPercent] = useState<number>(100);
  const [measurementDevice, setMeasurementDevice] = useState<string>("");
  const [gridValues, setGridValues] = useState<Record<PpfdMapPosition, number>>(
    {
      NW: 0,
      N: 0,
      NE: 0,
      W: 0,
      C: 0,
      E: 0,
      SW: 0,
      S: 0,
      SE: 0,
    },
  );

  const points: PpfdMapPoint[] = DEFAULT_POSITIONS.map(({ pos }) => ({
    position: pos,
    ppfd: gridValues[pos] ?? 0,
  }));

  // The entered points are direct measurements taken at the selected dimmer level.
  // Dimmer is provenance metadata here and must not scale an observed value a second time.
  const summary = calculatePpfdMapSummary(points, fixtureHeightCm, 100);

  const handleValueChange = (pos: PpfdMapPosition, valueStr: string) => {
    const val = Math.max(0, parseFloat(valueStr) || 0);
    setGridValues((prev) => ({ ...prev, [pos]: val }));
  };

  const getCellBgColor = (val: number, mean: number) => {
    if (mean <= 0 || val <= 0) return "var(--surface-2)";
    const diff = (val - mean) / mean;
    if (diff > 0.15) return "rgba(229, 164, 75, 0.25)";
    if (diff < -0.15) return "rgba(98, 168, 255, 0.2)";
    return "rgba(103, 214, 174, 0.18)";
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const occurredAt = new Date().toISOString();
    const newMap = {
      id: crypto.randomUUID(),
      dimmerPercent,
      powerWatts: Math.round(run.config.ledMaxW * (dimmerPercent / 100)),
      fixtureHeightCm,
      points,
      mean: summary.mean,
      min: summary.min,
      max: summary.max,
      uniformity: summary.uniformity,
      measurementDevice: measurementDevice.trim(),
      measuredAt: occurredAt,
    };

    const existingLight = run.config.light || {
      manufacturer: "",
      model: "",
      serialOrAssetId: null,
      ratedPowerW: run.config.ledMaxW,
      measuredMaxPowerW: null,
      dimmerLevels: [dimmerPercent],
      spectrumType: "",
      fixtureDimensions: null,
      ppfdMaps: [],
      commissionedAt: occurredAt,
    };

    const updatedLight = {
      ...existingLight,
      ppfdMaps: [newMap, ...existingLight.ppfdMaps],
    };

    const updatedRun: RunPackage = {
      ...run,
      updatedAt: occurredAt,
      config: {
        ...run.config,
        light: updatedLight,
      },
      auditEvents: [
        {
          id: crypto.randomUUID(),
          occurredAt,
          action: "configuration-changed",
          entityType: "ppfd-map",
          entityId: newMap.id,
          detail: `9-Punkt PPFD Mapping erfasst: Mean ${summary.mean} µmol, Uniformität ${(summary.uniformity * 100).toFixed(1)}% bei ${fixtureHeightCm} cm.`,
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
      aria-labelledby="ppfd-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 100 }}
    >
      <div
        className="command-palette"
        style={{
          width: "min(680px, calc(100vw - 24px))",
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            id="ppfd-modal-title"
            style={{ margin: 0, fontSize: "18px", color: "var(--text)" }}
          >
            🗺️ 9-Punkt <TermTooltip term="PPFD" lens={lens} /> Mapping Erfassung
          </h3>
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

        <form onSubmit={handleFormSubmit}>
          {/* Fixture Controls */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                htmlFor="fixture-height-input"
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Lampenabstand (Höhe in cm)
              </label>
              <input
                id="fixture-height-input"
                type="number"
                min="10"
                max="150"
                value={fixtureHeightCm}
                onChange={(e) => setFixtureHeightCm(Number(e.target.value))}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                }}
                required
              />
            </div>
            <div>
              <label
                htmlFor="dimmer-percent-slider"
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Dimmer Stufe ({dimmerPercent}%)
              </label>
              <input
                id="dimmer-percent-slider"
                type="range"
                min="10"
                max="100"
                step="5"
                value={dimmerPercent}
                onChange={(e) => setDimmerPercent(Number(e.target.value))}
                style={{ width: "100%", minHeight: "44px", cursor: "pointer" }}
              />
            </div>
            <div>
              <label
                htmlFor="measurement-device-input"
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Messgerät / Sensor
              </label>
              <input
                id="measurement-device-input"
                type="text"
                value={measurementDevice}
                onChange={(e) => setMeasurementDevice(e.target.value)}
                placeholder="Hersteller, Modell und Asset-ID"
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
          </div>

          {/* 3x3 Spatial PPFD Grid */}
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--green)",
              marginBottom: "8px",
            }}
          >
            Räumliches 3×3 PPFD Messraster (µmol/m²/s)
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            {DEFAULT_POSITIONS.map(({ pos, label }) => {
              const val = gridValues[pos] ?? 0;
              return (
                <div
                  key={pos}
                  style={{
                    background: getCellBgColor(val, summary.mean),
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px",
                    textAlign: "center",
                    transition: "background 0.2s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--muted)",
                      display: "block",
                      fontWeight: 700,
                    }}
                  >
                    {pos} ({label})
                  </span>
                  <input
                    id={`ppfd-${pos.toLowerCase()}`}
                    aria-label={`PPFD ${label} in Mikromol pro Quadratmeter und Sekunde`}
                    type="number"
                    min="1"
                    max="2500"
                    value={gridValues[pos]}
                    onChange={(e) => handleValueChange(pos, e.target.value)}
                    required
                    style={{
                      width: "100%",
                      minHeight: "44px",
                      textAlign: "center",
                      fontSize: "16px",
                      fontWeight: 700,
                      background: "var(--surface-0)",
                      border: "1px solid var(--line-strong)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text)",
                      marginTop: "4px",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-2)",
                      display: "block",
                      marginTop: "2px",
                    }}
                  >
                    Messwert bei {dimmerPercent}% Dimmer
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Math Summary Card */}
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius-sm)",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--green)",
                fontWeight: 800,
                textTransform: "uppercase",
                display: "block",
                marginBottom: "8px",
              }}
            >
              LIVE METRIKEN BERECHNUNG
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
                textAlign: "center",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Mittelwert
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "16px",
                    color: "var(--text)",
                  }}
                >
                  {summary.mean} µmol
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Minimum
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "16px",
                    color: "var(--text-2)",
                  }}
                >
                  {summary.min} µmol
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Maximum
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "16px",
                    color: "var(--text-2)",
                  }}
                >
                  {summary.max} µmol
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  <TermTooltip
                    term="Uniformität"
                    customText="Ziel: > 80% (Min/Mean)"
                    lens={lens}
                  >
                    Uniformität
                  </TermTooltip>
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "16px",
                    color:
                      summary.uniformity >= 0.8
                        ? "var(--green)"
                        : "var(--amber)",
                  }}
                >
                  {(summary.uniformity * 100).toFixed(1)}%
                </strong>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
          >
            <button
              type="button"
              onClick={onClose}
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
              Abbrechen
            </button>
            <button
              type="submit"
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
              PPFD-Mapping Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PpfdMappingModal;
