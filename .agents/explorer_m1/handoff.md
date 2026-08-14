# Handoff Report: Milestone 1 (Common UI Primitives & Terminology Tooltip System)

**Author**: Explorer M1  
**Target Subagent**: Implementer M1  
**Date**: 2026-08-11T03:12:45Z  
**Status**: Read-Only Analysis Complete — Specifications Defined  

---

## 1. Observation

1. **Repository & Rules Inspection**:
   - `AGENTS.md` mandates strict accessibility standards: keyboard navigation (`:focus-visible` 2px focus ring), 44px minimum touch targets, ARIA attributes, semantic elements, and dual-encoding for all status indicators (never convey status by color alone).
   - Domain calculation values (Sollwert, Messwert, Simulation, fehlender Wert) must never be conflated.
   - Design tokens in `src/styles.css` provide canonical CSS variables: `--green`, `--green-dim`, `--blue`, `--blue-dim`, `--amber`, `--amber-dim`, `--red`, `--red-dim`, `--purple`, `--purple-dim`, `--surface-0` through `--surface-3`, `--text`, `--muted`, `--line`, `--radius-sm`.

2. **Term Dictionary Requirements (`src/components/common/termDictionary.ts`)**:
   - Must cover canonical German cultivation terminology: VPD, DLI, EC, pH, PPFD, rF, Leaf-VPD, BT, BW, plus VT, VW, Drain-EC, Drain-pH, Substrat-EC.
   - Each term entry must contain: German plain name, technical acronym, scientific unit, beginner explanation (`guided` lens), advanced technical context (`advanced` lens), expert tips & targets (`expert` lens), and optional phase target ranges.
   - Lookup functions must handle case-insensitivity, trim whitespaces, and resolve aliases (e.g. `rh` -> `rF`, `leaf_vpd` -> `Leaf-VPD`).

3. **Tooltip Component Requirements (`src/components/common/TermTooltip.tsx`)**:
   - Accessible React component handling hover, focus, and click/tap interactions.
   - Supports `term`, `children`, `lens` (`"guided" | "advanced" | "expert"`), `showIcon`, `customText`, `className`.
   - Accessible ARIA attributes (`role="tooltip"`, `aria-expanded`, `aria-label`).
   - Outside-click listener to dismiss open popovers on touch/desktop.
   - Keyboard accessibility: `tabIndex={0}`, `Enter`/`Space` to toggle, `Escape` to close. Focus ring using `:focus-visible` 2px solid `var(--green)`.

4. **Lens Badge Component Requirements (`src/components/common/LensBadge.tsx`)**:
   - Renders experience level badges for `guided` (`GEFÜHRT`, 🌱, blue tokens), `advanced` (`STANDARD`, ⚡, green tokens), `expert` (`EXPERTE`, 🔬, purple tokens).
   - Supports interactive mode when `onClick` is provided (`role="button"`, `tabIndex={0}`, keyboard Enter/Space execution).

5. **Metric Gauge Component Requirements (`src/components/common/MetricGauge.tsx`)**:
   - Visual gauge/bar displaying metric value relative to min, max, optimal range, and warning margins.
   - Pure `calculateGaugeStatus` helper evaluating values into 5 discrete status states: `"optimal"`, `"warning"`, `"alert-low"`, `"alert-high"`, `"missing"`.
   - Dual-encoding guarantee: CSS color variable + icon (`✓`, `⚠`, `↓`, `↑`, `?`) + German text label (`Optimal`, `Warnung`, `Zu niedrig`, `Zu hoch`, `Kein Wert`).
   - ARIA `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`.

6. **Unit Test Suite (`src/components/common/common.test.ts`)**:
   - Vitest unit tests verifying term lookup, alias resolution, lens text generation, fallback handling, search filtering, and gauge status calculations.

---

## 2. Logic Chain

1. **Why separate `termDictionary.ts` into a pure TS module?**
   - Enables fast, synchronous term lookup across UI components, search glossaries, and unit tests without React DOM dependencies or extra overhead.
   - Guarantees single source of truth for German cultivation terminology across the application.

2. **Why dual trigger (hover + tap + keyboard) for `TermTooltip.tsx`?**
   - Hover only works on desktop mice. Mobile/tablet users require tap-to-toggle. Keyboard users require focus + Enter/Space. Adding click-outside dismissal ensures modal state doesn't get stuck open on touchscreens.

3. **Why pure `calculateGaugeStatus` in `MetricGauge.tsx`?**
   - Keeps business logic pure and testable directly in Vitest (`common.test.ts`) without needing DOM rendering tools or React wrappers in unit tests.

4. **Why token-based CSS for `LensBadge.tsx` and `MetricGauge.tsx`?**
   - Guarantees theme compatibility (dark/light/high-contrast modes) automatically using existing `:root` design variables (`var(--blue)`, `var(--green)`, `var(--purple)`, `var(--amber)`, `var(--red)`).

---

## 3. Caveats

1. **Read-Only Scope**:
   - Explorer M1 has strictly analyzed and specified all 5 components without mutating `src/`. Implementer M1 will create the files under `src/components/common/`.
2. **Lens Adjustments Scope**:
   - Experience lenses adjust detail levels and explanations; domain formulas or scientific calculations are never mutated by lens selection (project invariant).
3. **No External Libraries Required**:
   - All components use native React 19 hooks and existing CSS tokens from `src/styles.css`.

---

## 4. Conclusion & Proposed Specifications

The exact specifications for all 5 target files have been defined in full detail below. Implementer M1 can create these files directly.

### Specification 1: `src/components/common/termDictionary.ts`
```typescript
import type { ExperienceLens, ScientificUnit } from "../../types";

export interface OptimalRange {
  phase: string;
  min: number;
  max: number;
  unit: ScientificUnit | string;
}

export interface TermDefinition {
  key: string;
  acronym: string;
  germanName: string;
  unit: ScientificUnit | string;
  category: "climate" | "light" | "nutrients" | "phase" | "plant";
  beginner: string;
  advanced: string;
  expert: string;
  optimalRanges?: OptimalRange[];
}

export const DICTIONARY: Record<string, TermDefinition> = {
  VPD: {
    key: "VPD",
    acronym: "VPD",
    germanName: "Dampfdruckdefizit",
    unit: "kPa",
    category: "climate",
    beginner:
      "VPD zeigt, wie stark die Luft Wasser aus den Blättern zieht. Passt der Wert, transpiriert die Pflanze optimal ohne zu vertrocknen.",
    advanced:
      "Differenz zwischen Sättigungsdampfdruck und tatsächlichem Dampfdruck der Luft. Steuert Transpiration und Nährstofftransport.",
    expert:
      "Zentraler Klimatreiber für Stomata-Leitfähigkeit. Zielwerte: Sämlinge 0.4–0.8 kPa, Vegi 0.8–1.1 kPa, Blüte 1.1–1.5 kPa, Spätblüte 1.3–1.6 kPa.",
    optimalRanges: [
      { phase: "Sämling", min: 0.4, max: 0.8, unit: "kPa" },
      { phase: "Vegetation", min: 0.8, max: 1.1, unit: "kPa" },
      { phase: "Blüte", min: 1.1, max: 1.5, unit: "kPa" },
    ],
  },
  DLI: {
    key: "DLI",
    acronym: "DLI",
    germanName: "Tägliches Lichtintegral",
    unit: "mol/m²/d",
    category: "light",
    beginner:
      "DLI misst die Gesamtmenge an Licht, die eine Pflanze an einem Tag erhält – wie die tägliche 'Licht-Ration'.",
    advanced:
      "Akkumulierte Photonenmenge (PAR) pro Quadratmeter und Tag, berechnet aus PPFD und Photoperiode.",
    expert:
      "DLI = PPFD × Lichtstunden × 3600 / 1.000.000. Zielwerte: Sämling 10–15, Vegi 20–30, Blüte 35–45+ mol/m²/d.",
    optimalRanges: [
      { phase: "Sämling", min: 10, max: 15, unit: "mol/m²/d" },
      { phase: "Vegetation", min: 20, max: 30, unit: "mol/m²/d" },
      { phase: "Blüte", min: 35, max: 45, unit: "mol/m²/d" },
    ],
  },
  EC: {
    key: "EC",
    acronym: "EC",
    germanName: "Elektrische Leitfähigkeit",
    unit: "mS/cm",
    category: "nutrients",
    beginner:
      "Der EC-Wert gibt an, wie viele Nährstoffsalze im Wasser gelöst sind. Ein zu hoher Wert verbrennt die Wurzeln.",
    advanced:
      "Maß für die Gesamtsalzkonzentration der Nährlösung in MilliSiemens pro Zentimeter.",
    expert:
      "Korreliert mit osmotischem Druck im Root-Zone. Zielwerte: Sämling 0.6–0.9, Vegi 1.2–1.6, Blüte Peak 1.8–2.2 mS/cm.",
    optimalRanges: [
      { phase: "Sämling", min: 0.6, max: 0.9, unit: "mS/cm" },
      { phase: "Vegetation", min: 1.2, max: 1.6, unit: "mS/cm" },
      { phase: "Blüte", min: 1.8, max: 2.2, unit: "mS/cm" },
    ],
  },
  pH: {
    key: "pH",
    acronym: "pH",
    germanName: "Säuregrad",
    unit: "pH",
    category: "nutrients",
    beginner:
      "Der pH-Wert bestimmt, ob die Wurzeln Nährstoffe überhaupt aufnehmen können. Optimal für Hydro/Erde liegt meist bei 5.8–6.5.",
    advanced:
      "Negativer dekadischer Logarithmus der Wasserstoffionen-Aktivität. Entscheidet über Löslichkeit von Ca, Mg, P, Fe.",
    expert:
      "Hydro/Kokus Optimalfenster: 5.5–6.2 (Drift erlaubt für maximale Mikronährstoffaufnahme). Erde Optimalfenster: 6.2–6.8.",
    optimalRanges: [
      { phase: "Hydro/Kokus", min: 5.5, max: 6.2, unit: "pH" },
      { phase: "Erde", min: 6.2, max: 6.8, unit: "pH" },
    ],
  },
  PPFD: {
    key: "PPFD",
    acronym: "PPFD",
    germanName: "Photosynthetische Photonenflussdichte",
    unit: "µmol/m²/s",
    category: "light",
    beginner:
      "PPFD misst die aktuelle Lichtintensität auf Höhe der Blätter.",
    advanced:
      "Anzahl der verwertbaren Lichtquanten (400–700 nm) pro Quadratmeter und Sekunde.",
    expert:
      "Sämling: 150–300, Vegi: 400–600, Blüte: 700–1000+ µmol/m²/s (ohne CO2-Anreicherung Sättigung bei ~1050 µmol/m²/s).",
    optimalRanges: [
      { phase: "Sämling", min: 150, max: 300, unit: "µmol/m²/s" },
      { phase: "Vegetation", min: 400, max: 600, unit: "µmol/m²/s" },
      { phase: "Blüte", min: 700, max: 1000, unit: "µmol/m²/s" },
    ],
  },
  rF: {
    key: "rF",
    acronym: "rF",
    germanName: "Relative Luftfeuchtigkeit",
    unit: "%",
    category: "climate",
    beginner:
      "Zeigt den Feuchtigkeitsgehalt der Luft in Prozent. Zu hohe Feuchte in der Spätblüte fördert Schimmel (Botrytis).",
    advanced:
      "Verhältnis von tatsächlichem Wasserdampfdruck zum Sättigungsdampfdruck bei aktueller Temperatur.",
    expert:
      "Muss immer in Kombination mit Raumtemperatur betrachtet werden, um den Ziel-VPD einzustellen. Blüte-Ziel: <50-55% rF.",
    optimalRanges: [
      { phase: "Sämling", min: 65, max: 75, unit: "%" },
      { phase: "Vegetation", min: 55, max: 70, unit: "%" },
      { phase: "Blüte", min: 40, max: 55, unit: "%" },
    ],
  },
  "Leaf-VPD": {
    key: "Leaf-VPD",
    acronym: "Leaf-VPD",
    germanName: "Blattoberflächen-VPD",
    unit: "kPa",
    category: "climate",
    beginner:
      "Das echte VPD direkt an der Blattoberfläche unter Berücksichtigung der Blatt-Temperatur (meist 1–2°C kühler als die Luft).",
    advanced:
      "Präzisere VPD-Berechnung basierend auf gemessener Blatttemperatur ($T_{leaf}$) statt reiner Lufttemperatur ($T_{air}$).",
    expert:
      "UKD-Modell nutzt $T_{leaf} = T_{air} + \\text{offset}$ (Standard -1°C unter LED Transpiration). Vermeidet Messfehler bei hoher LED-Strahlung.",
    optimalRanges: [
      { phase: "Vegetation", min: 0.8, max: 1.1, unit: "kPa" },
      { phase: "Blüte", min: 1.1, max: 1.4, unit: "kPa" },
    ],
  },
  BT: {
    key: "BT",
    acronym: "BT",
    germanName: "Blütetag",
    unit: "Tage",
    category: "phase",
    beginner:
      "Zählt die Anzahl der Tage seit der Umstellung der Photoperiode auf 12/12 Licht (oder ersten Blütenanzeichen).",
    advanced:
      "Tageszahl ab Blüteinduktion. Bestimmt den Nährstoff- und Lichtbedarf laut Zuchtplan.",
    expert:
      "Phasen-Einteilung: Stretch (BT 1–21), Peak Blüte (BT 22–42), Reife & Flush (BT 43+).",
  },
  BW: {
    key: "BW",
    acronym: "BW",
    germanName: "Blütewoche",
    unit: "Wochen",
    category: "phase",
    beginner:
      "Gibt die aktuelle Blütewoche an (z.B. BW 3 = Blütetag 15–21).",
    advanced:
      "Wochenabschnitt der generativen Phase zur Zuordnung im Düngeschema.",
    expert:
      "Berechnet als Math.floor((BT - 1) / 7) + 1.",
  },
  VT: {
    key: "VT",
    acronym: "VT",
    germanName: "Vegetationstag",
    unit: "Tage",
    category: "phase",
    beginner:
      "Zählt die Tage des vegetativen Wachstums (18/6 Licht) ab den ersten echten Blättern.",
    advanced:
      "Tageszahl in der Vegetationsphase vor der Blüteeinleitung.",
    expert:
      "Fokus auf Wurzelaufbau, Strukturierung (Topping/LST) und Etablierung des Vorgelege-Klimas.",
  },
  VW: {
    key: "VW",
    acronym: "VW",
    germanName: "Vegetationswoche",
    unit: "Wochen",
    category: "phase",
    beginner:
      "Gibt die vegetative Woche an.",
    advanced:
      "Wochenabschnitt der Vegetationsphase.",
    expert:
      "Berechnet als Math.floor((VT - 1) / 7) + 1.",
  },
  "Drain-EC": {
    key: "Drain-EC",
    acronym: "Drain-EC",
    germanName: "Drain-Leitfähigkeit",
    unit: "mS/cm",
    category: "nutrients",
    beginner:
      "Der EC-Wert des auslaufenden Wassers. Ist er viel höher als der Giess-EC, sammeln sich Salze im Topf an.",
    advanced:
      "EC-Wert des Ablaufwassers (Runoff). Zeigt Versalzung oder Nährstoffmangel im Substrat an.",
    expert:
      "Ziel: Drain-EC sollte maximal 0.2–0.4 mS/cm über Input-EC liegen. Bei Delta > 0.6 mS/cm Spülung/Dryback anpassen.",
  },
  "Drain-pH": {
    key: "Drain-pH",
    acronym: "Drain-pH",
    germanName: "Drain-Säuregrad",
    unit: "pH",
    category: "nutrients",
    beginner:
      "Der pH-Wert des auslaufenden Wassers. Er verrät, wie sich der pH-Wert in der Wurzelzone verändert hat.",
    advanced:
      "pH-Wert des Ablaufwassers zur Diagnose der Wurzelzonen-Chemie.",
    expert:
      "Sinkender Drain-pH deutet auf Kationenaustausch / Ammonium-Aufnahme hin; steigender Drain-pH auf Nitrat-Aufnahme.",
  },
  "Substrat-EC": {
    key: "Substrat-EC",
    acronym: "Substrat-EC",
    germanName: "Wurzelzonen-EC",
    unit: "mS/cm",
    category: "nutrients",
    beginner:
      "Die tatsächliche Salzkonzentration direkt im Wurzelbereich.",
    advanced:
      "Effektiver EC im Porenwasser des Substrats (Pore Water EC).",
    expert:
      "Abschätzung über 1:2 Extrakt oder WGT (Pore Water = 2-3x Bulk EC bei Sättigung).",
  },
};

const ALIAS_MAP: Record<string, string> = {
  vpd: "VPD",
  dli: "DLI",
  ec: "EC",
  ph: "pH",
  ppfd: "PPFD",
  rf: "rF",
  rh: "rF",
  "leaf-vpd": "Leaf-VPD",
  leaf_vpd: "Leaf-VPD",
  leafvpd: "Leaf-VPD",
  blattvpd: "Leaf-VPD",
  "blatt-vpd": "Leaf-VPD",
  bt: "BT",
  bw: "BW",
  vt: "VT",
  vw: "VW",
  "drained-ec": "Drain-EC",
  "drain-ec": "Drain-EC",
  drainec: "Drain-EC",
  "drain-ph": "Drain-pH",
  drainph: "Drain-pH",
  "substrat-ec": "Substrat-EC",
  substratec: "Substrat-EC",
};

export function getTermDefinition(term: string): TermDefinition | undefined {
  if (!term) return undefined;
  if (DICTIONARY[term]) return DICTIONARY[term];
  const normalized = term.trim().toLowerCase();
  const matchedKey = ALIAS_MAP[normalized];
  if (matchedKey && DICTIONARY[matchedKey]) {
    return DICTIONARY[matchedKey];
  }
  return undefined;
}

export function getTermDescription(
  term: string,
  lens: ExperienceLens = "guided"
): string {
  const def = getTermDefinition(term);
  if (!def) return `Fachbegriff "${term}"`;
  switch (lens) {
    case "expert":
      return def.expert;
    case "advanced":
      return def.advanced;
    case "guided":
    default:
      return def.beginner;
  }
}

export function searchTerms(query: string): TermDefinition[] {
  if (!query || !query.trim()) return Object.values(DICTIONARY);
  const q = query.toLowerCase().trim();
  return Object.values(DICTIONARY).filter(
    (item) =>
      item.key.toLowerCase().includes(q) ||
      item.acronym.toLowerCase().includes(q) ||
      item.germanName.toLowerCase().includes(q) ||
      item.beginner.toLowerCase().includes(q) ||
      item.advanced.toLowerCase().includes(q) ||
      item.expert.toLowerCase().includes(q)
  );
}

export function getAllTerms(): TermDefinition[] {
  return Object.values(DICTIONARY);
}
```

### Specification 2: `src/components/common/TermTooltip.tsx`
```tsx
import React, { useState, useRef, useEffect } from "react";
import type { ExperienceLens } from "../../types";
import { getTermDefinition, getTermDescription } from "./termDictionary";

export interface TermTooltipProps {
  term: string;
  children?: React.ReactNode;
  lens?: ExperienceLens;
  showIcon?: boolean;
  customText?: string;
  className?: string;
}

export const TermTooltip: React.FC<TermTooltipProps> = ({
  term,
  children,
  lens = "guided",
  showIcon = false,
  customText,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const termDef = getTermDefinition(term);

  const displayText = children || (termDef ? termDef.acronym : term);
  const tooltipContent = customText || getTermDescription(term, lens);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape" && isOpen) {
      setIsOpen(false);
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <span
      ref={triggerRef}
      className={`term-tooltip ${className}`.trim()}
      tabIndex={0}
      role="button"
      aria-expanded={isOpen}
      aria-label={`Erklärung für ${termDef?.germanName || term}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="term-text">{displayText}</span>
      {showIcon && <span className="tooltip-icon" aria-hidden="true"> ⓘ</span>}
      <span
        className="tooltip-text"
        role="tooltip"
        style={{ display: isOpen ? "block" : undefined }}
      >
        {termDef && (
          <strong className="tooltip-header" style={{ display: "block", marginBottom: 4, color: "var(--green)" }}>
            {termDef.germanName} ({termDef.acronym}){termDef.unit ? ` · ${termDef.unit}` : ""}
          </strong>
        )}
        <span>{tooltipContent}</span>
      </span>
    </span>
  );
};

export default TermTooltip;
```

### Specification 3: `src/components/common/LensBadge.tsx`
```tsx
import React from "react";
import type { ExperienceLens } from "../../types";

export interface LensBadgeProps {
  lens: ExperienceLens;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  onClick?: () => void;
  className?: string;
}

const LENS_CONFIG: Record<
  ExperienceLens,
  { label: string; icon: string; styleClass: string; colorVar: string; dimVar: string }
> = {
  guided: {
    label: "GEFÜHRT",
    icon: "🌱",
    styleClass: "lens-badge-guided",
    colorVar: "var(--blue)",
    dimVar: "var(--blue-dim)",
  },
  advanced: {
    label: "STANDARD",
    icon: "⚡",
    styleClass: "lens-badge-advanced",
    colorVar: "var(--green)",
    dimVar: "var(--green-dim)",
  },
  expert: {
    label: "EXPERTE",
    icon: "🔬",
    styleClass: "lens-badge-expert",
    colorVar: "var(--purple)",
    dimVar: "var(--purple-dim)",
  },
};

export const LensBadge: React.FC<LensBadgeProps> = ({
  lens,
  size = "md",
  showIcon = true,
  onClick,
  className = "",
}) => {
  const config = LENS_CONFIG[lens] || LENS_CONFIG.guided;
  const isInteractive = typeof onClick === "function";

  const sizeStyles: Record<"sm" | "md" | "lg", React.CSSProperties> = {
    sm: { padding: "2px 6px", fontSize: "10px" },
    md: { padding: "4px 10px", fontSize: "11px" },
    lg: { padding: "6px 14px", fontSize: "12px" },
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    borderRadius: "var(--radius-sm)",
    border: `1px solid ${config.colorVar}`,
    background: config.dimVar,
    color: config.colorVar,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontFamily: "var(--font-ui)",
    cursor: isInteractive ? "pointer" : "default",
    userSelect: "none",
    ...sizeStyles[size],
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <span
      className={`lens-badge ${config.styleClass} ${className}`.trim()}
      style={badgeStyle}
      role={isInteractive ? "button" : "status"}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={`Erfahrungsstufe: ${config.label}`}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      {showIcon && <span aria-hidden="true">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
};

export default LensBadge;
```

### Specification 4: `src/components/common/MetricGauge.tsx`
```tsx
import React from "react";
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
  warnMax?: number
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
    warnMax
  );

  const range = max - min;
  const optMinPct = range > 0 ? Math.max(0, Math.min(100, ((optimalMin - min) / range) * 100)) : 0;
  const optMaxPct = range > 0 ? Math.max(0, Math.min(100, ((optimalMax - min) / range) * 100)) : 100;
  const optWidthPct = optMaxPct - optMinPct;

  const displayVal = value !== null && value !== undefined && !Number.isNaN(value)
    ? `${value} ${unit}`.trim()
    : "—";

  return (
    <div
      className={`metric-gauge ${className}`.trim()}
      role="meter"
      aria-label={label ? `${label} Messanzeige` : "Messanzeige"}
      aria-valuenow={value ?? undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${label ? label + ": " : ""}${displayVal} (${result.labelGerman})`}
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
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>
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
        <span>{min} {unit}</span>
        <span>Ziel: {optimalMin}–{optimalMax} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};

export default MetricGauge;
```

### Specification 5: `src/components/common/common.test.ts`
```typescript
import { describe, expect, it } from "vitest";
import {
  getTermDefinition,
  getTermDescription,
  searchTerms,
  getAllTerms,
} from "./termDictionary";
import { calculateGaugeStatus } from "./MetricGauge";

describe("termDictionary", () => {
  it("resolves canonical term definitions for all required cultivation metrics", () => {
    const requiredTerms = [
      "VPD",
      "DLI",
      "EC",
      "pH",
      "PPFD",
      "rF",
      "Leaf-VPD",
      "BT",
      "BW",
    ];

    for (const termKey of requiredTerms) {
      const def = getTermDefinition(termKey);
      expect(def).toBeDefined();
      expect(def?.key).toBe(termKey);
      expect(def?.acronym).toBeDefined();
      expect(def?.germanName).toBeDefined();
      expect(def?.unit).toBeDefined();
      expect(def?.beginner).toBeDefined();
      expect(def?.advanced).toBeDefined();
      expect(def?.expert).toBeDefined();
    }
  });

  it("handles case-insensitive and alias lookups deterministically", () => {
    expect(getTermDefinition("vpd")?.key).toBe("VPD");
    expect(getTermDefinition("dli")?.key).toBe("DLI");
    expect(getTermDefinition("leaf-vpd")?.key).toBe("Leaf-VPD");
    expect(getTermDefinition("leaf_vpd")?.key).toBe("Leaf-VPD");
    expect(getTermDefinition("rh")?.key).toBe("rF");
  });

  it("returns appropriate explanations based on the experience lens", () => {
    const term = "VPD";
    const beginnerText = getTermDescription(term, "guided");
    const advancedText = getTermDescription(term, "advanced");
    const expertText = getTermDescription(term, "expert");

    expect(beginnerText).toContain("Luft Wasser aus den Blättern");
    expect(advancedText).toContain("Sättigungsdampfdruck");
    expect(expertText).toContain("Stomata-Leitfähigkeit");
  });

  it("returns safe fallback for unknown terms", () => {
    expect(getTermDefinition("UNKNOWN_TERM")).toBeUndefined();
    expect(getTermDescription("UNKNOWN_TERM", "guided")).toBe(
      'Fachbegriff "UNKNOWN_TERM"'
    );
  });

  it("searches terms by query string", () => {
    const results = searchTerms("dampf");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((t) => t.key === "VPD")).toBe(true);
  });

  it("retrieves all dictionary terms", () => {
    const terms = getAllTerms();
    expect(terms.length).toBeGreaterThanOrEqual(9);
  });
});

describe("MetricGauge calculateGaugeStatus", () => {
  const min = 0;
  const max = 3.0;
  const optimalMin = 1.0;
  const optimalMax = 1.5;
  const warnMin = 0.7;
  const warnMax = 1.8;

  it("returns optimal status when value is within optimal range", () => {
    const result = calculateGaugeStatus(
      1.2,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax
    );
    expect(result.status).toBe("optimal");
    expect(result.colorVar).toBe("var(--green)");
    expect(result.icon).toBe("✓");
    expect(result.labelGerman).toBe("Optimal");
    expect(result.percentage).toBeCloseTo(40, 1);
  });

  it("returns warning status when value is in warning margin", () => {
    const lowWarn = calculateGaugeStatus(
      0.8,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax
    );
    expect(lowWarn.status).toBe("warning");
    expect(lowWarn.colorVar).toBe("var(--amber)");
    expect(lowWarn.icon).toBe("⚠");
    expect(lowWarn.labelGerman).toBe("Warnung");

    const highWarn = calculateGaugeStatus(
      1.6,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax
    );
    expect(highWarn.status).toBe("warning");
    expect(highWarn.colorVar).toBe("var(--amber)");
  });

  it("returns alert-low status when value is below warning threshold", () => {
    const result = calculateGaugeStatus(
      0.4,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax
    );
    expect(result.status).toBe("alert-low");
    expect(result.colorVar).toBe("var(--blue)");
    expect(result.icon).toBe("↓");
    expect(result.labelGerman).toBe("Zu niedrig");
  });

  it("returns alert-high status when value is above warning threshold", () => {
    const result = calculateGaugeStatus(
      2.5,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax
    );
    expect(result.status).toBe("alert-high");
    expect(result.colorVar).toBe("var(--red)");
    expect(result.icon).toBe("↑");
    expect(result.labelGerman).toBe("Zu hoch");
  });

  it("returns missing status for null or NaN values", () => {
    const nullRes = calculateGaugeStatus(
      null,
      min,
      max,
      optimalMin,
      optimalMax
    );
    expect(nullRes.status).toBe("missing");
    expect(nullRes.colorVar).toBe("var(--muted)");
    expect(nullRes.icon).toBe("?");
    expect(nullRes.labelGerman).toBe("Kein Wert");

    const nanRes = calculateGaugeStatus(
      Number.NaN,
      min,
      max,
      optimalMin,
      optimalMax
    );
    expect(nanRes.status).toBe("missing");
  });

  it("handles exact optimal boundaries", () => {
    const lowerOpt = calculateGaugeStatus(
      optimalMin,
      min,
      max,
      optimalMin,
      optimalMax
    );
    expect(lowerOpt.status).toBe("optimal");

    const upperOpt = calculateGaugeStatus(
      optimalMax,
      min,
      max,
      optimalMin,
      optimalMax
    );
    expect(upperOpt.status).toBe("optimal");
  });
});
```

---

## 5. Verification Method

To independently verify these specifications after implementation:

1. **Unit Test Suite**:
   ```bash
   pnpm test
   ```
   Or specifically for Milestone 1 common primitives:
   ```bash
   npx vitest run src/components/common/common.test.ts
   ```

2. **TypeScript Typecheck**:
   ```bash
   pnpm typecheck
   ```

3. **Full Project Gate**:
   ```bash
   pnpm check
   ```

4. **Visual & Accessibility Inspection**:
   - Inspect CSS variables in `src/styles.css` (`var(--green)`, `var(--amber)`, `var(--red)`, `var(--blue)`, `var(--purple)`).
   - Confirm focus ring (`:focus-visible`) highlights 2px solid `var(--green)`.
   - Confirm dual-encoding on `MetricGauge` (color + icon + text label).
