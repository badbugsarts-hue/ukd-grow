import type React from "react";
import { useState } from "react";
import { calculateDli, calculateLeafVpd } from "../../domain";
import type { DayPlan, ExperienceLens, RouteId, RunPackage } from "../../types";
import LensBadge from "../common/LensBadge";
import MetricGauge, { calculateGaugeStatus } from "../common/MetricGauge";
import TermTooltip from "../common/TermTooltip";

export interface VpdDliCalculatorPanelProps {
  run?: RunPackage;
  plan?: DayPlan;
  lens?: ExperienceLens;
  onUpdateRun?: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
  initialTemp?: number;
  initialHumidity?: number;
  initialPpfd?: number;
  initialHours?: number;
  initialLeafDelta?: number;
}

export const VpdDliCalculatorPanel: React.FC<VpdDliCalculatorPanelProps> = ({
  lens = "guided",
  navigate,
  initialTemp = 24.0,
  initialHumidity = 60.0,
  initialPpfd = 500,
  initialHours = 18,
  initialLeafDelta = -1.0,
}) => {
  // Local state for microclimate inputs
  const [tempAir, setTempAir] = useState<number>(initialTemp);
  const [humidity, setHumidity] = useState<number>(initialHumidity);
  const [ppfd, setPpfd] = useState<number>(initialPpfd);
  const [lightHours, setLightHours] = useState<number>(initialHours);
  const [leafDelta, setLeafDelta] = useState<number>(initialLeafDelta);

  // Pure calculations
  const leafVpd = calculateLeafVpd(tempAir, humidity, leafDelta);
  const airVpd = calculateLeafVpd(tempAir, humidity, 0);
  const dli = calculateDli(ppfd, lightHours);

  // 4-Phase Targets Matrix
  const PHASES = [
    {
      id: "seedling",
      title: "1. Keimung / Sämling",
      days: "Tag 0–7",
      vpdMin: 0.4,
      vpdMax: 0.8,
      dliMin: 10,
      dliMax: 15,
      ppfdRange: "150–300",
      rhRange: "65–75%",
      icon: "🌱",
    },
    {
      id: "veg",
      title: "2. Vegetation",
      days: "Tag 8–28",
      vpdMin: 0.8,
      vpdMax: 1.1,
      dliMin: 20,
      dliMax: 30,
      ppfdRange: "400–600",
      rhRange: "55–70%",
      icon: "🌿",
    },
    {
      id: "bloom",
      title: "3. Hauptblüte",
      days: "Tag 29–63",
      vpdMin: 1.1,
      vpdMax: 1.5,
      dliMin: 35,
      dliMax: 45,
      ppfdRange: "700–1000",
      rhRange: "40–55%",
      icon: "🌸",
    },
    {
      id: "lateBloom",
      title: "4. Spätblüte",
      days: "Tag 64–80",
      vpdMin: 1.3,
      vpdMax: 1.6,
      dliMin: 30,
      dliMax: 40,
      ppfdRange: "600–900",
      rhRange: "38–48%",
      icon: "🍂",
    },
  ];

  return (
    <div
      className="panel-container vpd-dli-calculator-panel"
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
            🧮 VPD & DLI Schnellrechner & Phasenmatrix
          </h2>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            Interaktiver Rechner zur Vorab-Simulation von{" "}
            <TermTooltip term="VPD" lens={lens} />,{" "}
            <TermTooltip term="DLI" lens={lens} /> und Phasenvergleich
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LensBadge lens={lens} />
          {navigate && (
            <button
              type="button"
              onClick={() => navigate("climate")}
              style={{
                padding: "8px 14px",
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🌡️ Zu den Klima-Zielwerten
            </button>
          )}
        </div>
      </div>

      {/* Sliders Control Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          background: "var(--surface-2)",
          padding: "16px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
        }}
      >
        {/* Air Temp */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
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

        {/* Humidity */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
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

        {/* PPFD */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
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

        {/* Photoperiod */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
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

        {/* Leaf Delta */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
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
      </div>

      {/* Real-Time Calculated Results Box */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          padding: "16px",
          background: "var(--surface-2)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Leaf-VPD (Berechnet)
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "var(--green)",
            }}
          >
            {(Math.round(leafVpd * 100) / 100).toFixed(2)} kPa
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            DLI (Daily Light Integral)
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "var(--green)",
            }}
          >
            {(Math.round(dli * 10) / 10).toFixed(1)} mol/m²/d
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Air-VPD (Ohne Offset)
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "var(--text)",
            }}
          >
            {(Math.round(airVpd * 100) / 100).toFixed(2)} kPa
          </div>
        </div>
      </div>

      {/* 4-Phase Comparison Matrix Cards */}
      <div>
        <h3
          style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          📊 4-Phasen Vergleichsmatrix (Ist-Simulation vs. Zielkorridore)
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {PHASES.map((phase) => {
            const _vpdStatus = calculateGaugeStatus(
              leafVpd,
              0.2,
              2.0,
              phase.vpdMin,
              phase.vpdMax,
            );
            const _dliStatus = calculateGaugeStatus(
              dli,
              5,
              50,
              phase.dliMin,
              phase.dliMax,
            );

            return (
              <div
                key={phase.id}
                style={{
                  padding: "14px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong style={{ fontSize: "14px", color: "var(--text)" }}>
                    {phase.icon} {phase.title}
                  </strong>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {phase.days}
                  </span>
                </div>

                {/* Leaf VPD Gauge for Phase */}
                <MetricGauge
                  value={Math.round(leafVpd * 100) / 100}
                  min={0.2}
                  max={2.0}
                  unit="kPa"
                  optimalMin={phase.vpdMin}
                  optimalMax={phase.vpdMax}
                  label="VPD"
                  lens={lens}
                />

                {/* DLI Gauge for Phase */}
                <MetricGauge
                  value={Math.round(dli * 10) / 10}
                  min={5}
                  max={50}
                  unit="mol/m²/d"
                  optimalMin={phase.dliMin}
                  optimalMax={phase.dliMax}
                  label="DLI"
                  lens={lens}
                />

                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    lineHeight: "1.4",
                  }}
                >
                  Empfohlenes PPFD: <strong>{phase.ppfdRange}</strong> |
                  Ziel-RLF: <strong>{phase.rhRange}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VpdDliCalculatorPanel;
