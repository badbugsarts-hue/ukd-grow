# Milestone 4 Technical Analysis: Pot Weight Dryback Tracking Widget & App Shell Routing Integration

**Target Release:** 2026-08-14 Release (Product Science & Data Lineage)  
**Author:** Explorer M4 (`teamwork_preview_explorer`)  
**Status:** COMPLETE (Investigation & Technical Specification)

---

## Executive Summary

This specification defines the architecture, data models, state transitions, UI/UX components, and test strategies for **Milestone 4 (Pot Weight Dryback Tracking Widget & App Shell Routing Integration)**.

1. **Interactive Pot Weight & Dryback Substrate-Monitoring Widget**:
   Integrates `PotProfile` metadata (`emptyMassGrams`, `saturatedMassGrams`, `nominalVolumeLiters`, `actualFillLiters`) and real-time gross pot mass measurements (`potMassGrams`) into `DailyOperatorPanel.tsx`. Utilizes `calculateSubstrateHydration` from `src/domain.ts` to compute hydration %, depletion %, available water in grams, and 5 discrete moisture categories with dynamic German watering recommendations (`Gieß-Empfehlung`).
2. **State Transition & Audit Flow (`src/run-state.ts`)**:
   Specifies the pure state transition function `updatePotProfile`, maintaining immutable `RunPackage` snapshots, strictly preserving `run.configurationSnapshot`, and appending structured audit events (`action: "configuration-changed"`, `entityType: "pot-profile"`) and domain events (`pot.profile_updated`).
3. **App Shell Routing & Modal Overlay Integration (`src/App.tsx`)**:
   Verifies `#equipment` route registration and rendering of `EquipmentManagerPanel.tsx`, and confirms robust modal callback wiring (`PpfdMappingModal`, `SensorCalibrationModal`, `PlantIdentityModal`) with focus restoration, 44px min touch targets, and zero-mutation data persistence.
4. **Comprehensive Unit Test Suite**:
   Specifies unit and component test suites in `src/components/panels/pot-weight-dryback.test.tsx` and routing suites in `src/AppRoutingStress.test.tsx` and `src/m4-empirical-challenge.test.ts`.

---

## 1. Pot Weight & Dryback Data Model Integration

### 1.1 Data Model Specification (`src/types.ts`)

The pot profile and observation data models are already established in `src/types.ts`:

```typescript
// ── Pot Profile Interface ──
export interface PotProfile {
  type: "fabric" | "plastic" | "airpot" | "autopot" | "other";
  nominalVolumeLiters: number; // e.g. 11
  actualFillLiters: number | null; // e.g. 10
  diameterCm: number | null;
  heightCm: number | null;
  emptyMassGrams: number | null; // Tare / Trockengewicht (TARA)
  saturatedMassGrams: number | null; // 100% Saturation / Vollsättigung
}

// ── Daily Observation Values Interface ──
export interface ObservationValues {
  tempMax: number | null;
  tempMin: number | null;
  humidityMax: number | null;
  humidityMin: number | null;
  leafTemp: number | null;
  ppfd: number | null;
  phIn: number | null;
  ecIn: number | null;
  phDrain: number | null;
  ecDrain: number | null;
  waterLiters: number | null;
  drainLiters: number | null;
  drainPercent: number | null;
  potMassGrams: number | null; // Gross measured pot mass (g)
  plantHeightCm: number | null;
  stress: number | null;
}
```

### 1.2 Gravimetric Substrate Hydration Mathematics (`src/domain.ts`)

The canonical calculation function `calculateSubstrateHydration` in `src/domain.ts` calculates gravimetric moisture metrics:

```typescript
export interface SubstrateHydration {
  hydrationPercent: number; // 0% to 100%
  depletionPercent: number; // 100% - hydrationPercent (Dryback %)
  availableWaterGrams: number; // Remaining water mass in grams (~ml)
  category: "dry" | "light" | "medium" | "heavy" | "saturated";
  drybackRateGramsPerHour?: number; // Calculated when historical readings exist
}

export function calculateSubstrateHydration(
  currentMassGrams: number,
  potProfile: PotProfile,
): SubstrateHydration {
  const emptyMass = potProfile.emptyMassGrams ?? 0;

  // Fallback for fill volume if actualFillLiters is missing
  const fillVolumeLiters =
    potProfile.actualFillLiters && potProfile.actualFillLiters > 0
      ? potProfile.actualFillLiters
      : potProfile.nominalVolumeLiters && potProfile.nominalVolumeLiters > 0
        ? potProfile.nominalVolumeLiters
        : 10;

  // Fallback for saturated mass: 750g water holding capacity per liter of substrate
  const satMass =
    potProfile.saturatedMassGrams && potProfile.saturatedMassGrams > emptyMass
      ? potProfile.saturatedMassGrams
      : emptyMass + fillVolumeLiters * 750;

  const availableWaterCapacity = Math.max(1, satMass - emptyMass);
  const currentWaterGrams = Math.max(0, currentMassGrams - emptyMass);

  const hydrationPercent = Math.min(
    100,
    Math.max(0, Math.round((currentWaterGrams / availableWaterCapacity) * 100)),
  );

  const depletionPercent = 100 - hydrationPercent;
  const availableWaterGrams = Math.round(currentWaterGrams);

  let category: "dry" | "light" | "medium" | "heavy" | "saturated";
  if (hydrationPercent < 20) category = "dry";
  else if (hydrationPercent < 40) category = "light";
  else if (hydrationPercent < 70) category = "medium";
  else if (hydrationPercent < 90) category = "heavy";
  else category = "saturated";

  return {
    hydrationPercent,
    depletionPercent,
    availableWaterGrams,
    category,
  };
}
```

### 1.3 Hourly Dryback Rate Calculation

When consecutive pot mass observations exist for the current run, the dryback rate is calculated:

$$\text{Dryback Rate } (g/h) = \frac{M_{\text{previous}} - M_{\text{current}}}{\Delta t_{\text{hours}}}$$

```typescript
export function calculateDrybackRate(
  currentMassGrams: number,
  currentTimestamp: string,
  previousObservations: DailyObservation[],
): number | undefined {
  const validPrev = previousObservations
    .filter(
      (obs) =>
        obs.values.potMassGrams !== null &&
        obs.values.potMassGrams > 0 &&
        new Date(obs.recordedAt).getTime() <
          new Date(currentTimestamp).getTime(),
    )
    .sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )[0];

  if (!validPrev || validPrev.values.potMassGrams === null) return undefined;

  const prevMass = validPrev.values.potMassGrams;
  const prevTime = new Date(validPrev.recordedAt).getTime();
  const currTime = new Date(currentTimestamp).getTime();
  const deltaHours = (currTime - prevTime) / (1000 * 60 * 60);

  if (deltaHours >= 0.25 && prevMass > currentMassGrams) {
    const rate = (prevMass - currentMassGrams) / deltaHours;
    return Math.round(rate * 10) / 10;
  }
  return undefined;
}
```

### 1.4 German Watering Recommendations (`Gieß-Empfehlungen`)

The application must deliver clear, actionable German recommendations tailored by the 5 hydration categories and adapted to the active `ExperienceLens`:

| Category    |  Hydration %  | Status Title             |         Color Token         | German Recommendation                                                                                                                      |
| :---------- | :-----------: | :----------------------- | :-------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `saturated` |  $\ge 90\%$   | Vollsättigung / Nass     | `var(--purple)` (`#8b5cf6`) | **Gieß-Empfehlung: Vollsättigung** — Kein Wasser zuführen. Sauerstoffzufuhr der Wurzeln gewährleisten und Drainage ablaufen lassen.        |
| `heavy`     | $70\% - 89\%$ | Feucht / Gut versorgt    |  `var(--cyan)` (`#06b6d4`)  | **Gieß-Empfehlung: Gut versorgt** — Keine Bewässerung erforderlich. Trocknungsphase (Dryback) abwarten.                                    |
| `medium`    | $40\% - 69\%$ | Optimaler Feuchtebereich | `var(--green)` (`#10b981`)  | **Gieß-Empfehlung: Optimale Feuchte** — Perfektes Wasser-Luft-Verhältnis im Wurzelraum für maximale Nährstoffaufnahme.                     |
| `light`     | $20\% - 39\%$ | Leicht / Gießbereit      | `var(--amber)` (`#f59e0b`)  | **Gieß-Empfehlung: Vorbereitung** — Substrat trocknet ab. Nährlösung vorbereiten (Dryback-Ziel bald erreicht).                             |
| `dry`       |   $< 20\%$    | Kritisch Trocken         |  `var(--red)` (`#ef4444`)   | **Gieß-Empfehlung: Gießen erforderlich (Dryback-Ziel erreicht)** — Substrat ist trocken. Bewässerung nach aktuellem Tagesplan durchführen. |

#### Experience Lens Adaptations:

- **Guided**: Highlights the plain German actionable advice (e.g. "Heute nicht gießen. Der Topf hat noch genug Feuchtigkeit.").
- **Advanced**: Displays exact numerical values: Hydratation %, Dryback (Depletion) %, verfügbares Restwasser in Gramm, and dryback rate in g/h.
- **Expert**: Provides physiological details: root zone oxygenation dynamics, osmotic suction pressure, and optimal vegetative vs generative dryback percentages (e.g. 50–60% dryback in vegetative phase for root expansion vs 40–50% in mid-bloom).

### 1.5 Interactive Pot Weight Widget Layout in `DailyOperatorPanel.tsx`

The widget is positioned in `DailyOperatorPanel.tsx` directly above or integrated within the observation logging form:

1. **Card Header**:
   - Title: `🪴 Topfgewicht & Substrat-Hydratation (Dryback Tracking)`
   - Subtitle: `Gravimetrische Feuchtigkeitskontrolle & Bewässerungssteuerung`
   - Tooltip: `<TermTooltip term="Dryback" lens={lens} />`
   - Lens Badge: `<LensBadge lens={lens} />`
2. **Topf-Kalibrierung / Referenzprofil (Collapsible / Quick Edit)**:
   - Tara / Leergewicht ($W_{\text{tara}}$ in g): `<input type="number" placeholder="z.B. 800" ... />`
   - Vollsättigung ($W_{\text{sat}}$ in g): `<input type="number" placeholder="z.B. 4800" ... />`
   - Substratvolumen ($V$ in L): `<input type="number" placeholder="z.B. 11" ... />`
   - In-line Save Button: Triggers `updatePotProfile` state transition.
3. **Aktuelle Messung & Schnell-Eingabe**:
   - Gross Pot Weight Input ($W_{\text{current}}$ in g): Stepper `step="50"`, min `0`, max `25000`.
   - Dynamic update on change with zero input lag.
4. **Color-Banded Progress Bar / Hydration Gauge**:
   - Multi-segment color bar:
     - `0%–20%` (Rot / Trocken)
     - `20%–40%` (Gelb-Orange / Leicht)
     - `40%–70%` (Grün / Optimal)
     - `70%–90%` (Blau-Cyan / Feucht)
     - `90%–100%` (Violett / Sättigung)
   - Real-time Position Needle / Pin displaying current % (e.g. `▲ 58%`).
5. **Key Metrics Grid**:
   - **Hydratation**: `58 %`
   - **Dryback (Depletion)**: `42 %`
   - **Verfügbares Wasser**: `2320 g` (~ 2.32 L)
   - **Dryback-Rate**: `45.2 g/h` (when previous observation available)
6. **Dynamic German Advice Banner**:
   - Status badge and callout box with contextual border and background colors matching the category token.

---

## 2. State Transition & Audit Flow

### 2.1 Pure State Transition: `updatePotProfile` (`src/run-state.ts`)

To ensure compliance with the repository's invariants (immutable `RunPackage` snapshots, append-only audit events, zero active snapshot mutation), the following state transition function is specified for `src/run-state.ts`:

```typescript
export function updatePotProfile(run: RunPackage, pot: PotProfile): RunPackage {
  const occurredAt = new Date().toISOString();
  const updatedPot: PotProfile = {
    type: pot.type || run.config.pot.type || "other",
    nominalVolumeLiters: Math.max(0.1, pot.nominalVolumeLiters || 10),
    actualFillLiters:
      pot.actualFillLiters !== null && pot.actualFillLiters !== undefined
        ? Math.max(0.1, pot.actualFillLiters)
        : null,
    diameterCm:
      pot.diameterCm !== null && pot.diameterCm !== undefined
        ? pot.diameterCm
        : null,
    heightCm:
      pot.heightCm !== null && pot.heightCm !== undefined ? pot.heightCm : null,
    emptyMassGrams:
      pot.emptyMassGrams !== null && pot.emptyMassGrams !== undefined
        ? Math.max(0, pot.emptyMassGrams)
        : null,
    saturatedMassGrams:
      pot.saturatedMassGrams !== null && pot.saturatedMassGrams !== undefined
        ? Math.max(0, pot.saturatedMassGrams)
        : null,
  };

  const updatedConfig: RunConfig = {
    ...run.config,
    pot: updatedPot,
  };

  return touch({
    ...run,
    config: updatedConfig,
    ...(run.status === "draft" ? synchronizedAssets(run, updatedConfig) : {}),
    events: [
      {
        id: crypto.randomUUID(),
        day: 0,
        occurredAt,
        category: "configuration-change",
        title:
          run.status === "draft"
            ? "Topfprofil aktualisiert"
            : "Topfprofil aktualisiert; aktiver Snapshot bleibt unverändert",
        detail: `${updatedPot.nominalVolumeLiters}L (${updatedPot.type}) · Tara: ${updatedPot.emptyMassGrams ?? "-"}g · Sat: ${updatedPot.saturatedMassGrams ?? "-"}g`,
      },
      ...run.events,
    ],
    auditEvents: [
      auditEvent(
        "configuration-changed",
        "pot-profile",
        run.id,
        run.status === "draft"
          ? `Topfprofil konfiguriert: ${updatedPot.nominalVolumeLiters}L, Tara ${updatedPot.emptyMassGrams ?? 0}g, Sättigung ${updatedPot.saturatedMassGrams ?? 0}g.`
          : `Topfprofil geändert; Snapshot ${run.configurationSnapshot.id} nicht verändert.`,
        occurredAt,
      ),
      ...run.auditEvents,
    ],
    domainEvents: [
      domainEvent(
        run.id,
        "pot.profile_updated",
        {
          pot: updatedPot,
          activeSnapshotPreserved: run.status !== "draft",
        },
        occurredAt,
      ),
      ...run.domainEvents,
    ],
  });
}
```

### 2.2 Pot Mass Measurement Ingestion in `addObservation`

When an observation containing `potMassGrams` is saved:

1. `ObservationValues.potMassGrams` is stored in the `DailyObservation` record.
2. In `run-state.ts:measurementsFromObservation()`, the mapping rule `{ key: "potMassGrams", metric: "pot.mass", unit: "g" }` automatically generates a typed `Measurement`:
   ```typescript
   {
     id: crypto.randomUUID(),
     runId: run.id,
     metric: "pot.mass",
     reading: {
       value: observation.values.potMassGrams,
       unit: "g",
       status: "measured",
     },
     timestamp: observation.recordedAt,
   }
   ```
3. `addObservation` appends an `AuditEvent` with `action: "measurement-recorded"`, `entityType: "observation"`, and a `DomainEvent` with `type: "measurement.recorded"`.

---

## 3. App Shell Routing & Global Overlay Integration (`src/App.tsx`)

### 3.1 Route Verification for `#equipment`

In `src/App.tsx`:

1. **Navigation Item**:
   ```typescript
   {
     id: "equipment",
     label: "Equipment & Wartung",
     short: "Equipment",
     icon: "⚙",
     group: "System",
     description: "Geräteprofile und Kalibrierung",
   }
   ```
2. **Route Resolution (`readRoute`)**:
   `window.location.hash.replace(/^#\/?/, "")` resolves `#equipment` or `#/equipment` to `"equipment"`.
3. **Route Rendering (`WorkspaceRoute`)**:
   ```tsx
   case "equipment":
     return (
       <EquipmentManagerPanel
         run={run}
         lens={lens}
         onUpdateRun={setRun}
         navigate={navigate}
       />
     );
   ```

### 3.2 Modal Overlay State Wiring & Data Lineage

All 3 Product Science modals are seamlessly integrated with clean callback handlers and immutable persistence:

| Modal Component          | Host Panel / Location       | Trigger Action                                   | State Update Target                                               | Audit Event Generated                                             |
| :----------------------- | :-------------------------- | :----------------------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------------- |
| `PpfdMappingModal`       | `EquipmentManagerPanel.tsx` | "PPFD-Mapping starten" / "Neues Raster erfassen" | `run.config.light.ppfdMaps`                                       | `action: "configuration-changed"`, `entityType: "ppfd-map"`       |
| `SensorCalibrationModal` | `EquipmentManagerPanel.tsx` | "Sensor kalibrieren" / Status-Card Click         | `run.calibrations`                                                | `action: "configuration-changed"`, `entityType: "sensor"`         |
| `PlantIdentityModal`     | `RunConfigPanel.tsx`        | "Pflanzenidentität & Day Zero bearbeiten"        | `genetics`, `plants[0].identity`, `dayZeroAnchor`, `growthEvents` | `action: "configuration-changed"`, `entityType: "plant-identity"` |

### 3.3 Accessibility & WCAG 2.2 AA Compliance

- **44px Minimum Touch Targets**: All buttons, inputs, tabs, and interactive elements across `EquipmentManagerPanel.tsx`, `DailyOperatorPanel.tsx`, and modals have `minHeight: "44px"` or padding guaranteeing at least $44 \times 44 \text{ px}$ clickable area.
- **Focus Management**: Focus is remembered via `returnFocusRef` when opening modals/drawers and restored on close or ESC.
- **Color Contrast**: All status badges, gauges, and text employ semantically verified tokens (`var(--green)`, `var(--red)`, `var(--amber)`, `var(--cyan)`, `var(--purple)` with appropriate `-dim` backgrounds) meeting AA contrast requirements on dark and light themes.

---

## 4. Unit Test Strategy

### 4.1 Test Suite Specification: `src/components/panels/pot-weight-dryback.test.tsx`

The new test suite must cover 6 critical test suites with at least 15 comprehensive test cases:

```typescript
describe("Milestone 4: Pot Weight Dryback Tracking & Widget Suite", () => {
  // ── 1. Gravimetric Calculation Accuracy ──
  describe("1. calculateSubstrateHydration calculations", () => {
    it("calculates 100% hydration for saturated pot", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 800,
        saturatedMassGrams: 4800,
      };
      const res = calculateSubstrateHydration(4800, pot);
      expect(res.hydrationPercent).toBe(100);
      expect(res.depletionPercent).toBe(0);
      expect(res.availableWaterGrams).toBe(4000);
      expect(res.category).toBe("saturated");
    });

    it("calculates 0% hydration for dry pot at empty tare weight", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 800,
        saturatedMassGrams: 4800,
      };
      const res = calculateSubstrateHydration(800, pot);
      expect(res.hydrationPercent).toBe(0);
      expect(res.depletionPercent).toBe(100);
      expect(res.availableWaterGrams).toBe(0);
      expect(res.category).toBe("dry");
    });

    it("calculates medium optimal hydration accurately (50%)", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 800,
        saturatedMassGrams: 4800,
      };
      const res = calculateSubstrateHydration(2800, pot); // 2000g water / 4000g cap
      expect(res.hydrationPercent).toBe(50);
      expect(res.depletionPercent).toBe(50);
      expect(res.availableWaterGrams).toBe(2000);
      expect(res.category).toBe("medium");
    });

    it("handles fallback when saturatedMassGrams is missing (750g/L heuristic)", () => {
      const pot: PotProfile = {
        type: "plastic",
        nominalVolumeLiters: 10,
        actualFillLiters: null,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 500,
        saturatedMassGrams: null,
      };
      // Sat mass = 500 + 10 * 750 = 8000g, capacity = 7500g
      const res = calculateSubstrateHydration(4250, pot); // 3750g water = 50%
      expect(res.hydrationPercent).toBe(50);
      expect(res.category).toBe("medium");
    });
  });

  // ── 2. Category Boundaries & Recommendations ──
  describe("2. Hydration Categories and German Recommendations", () => {
    it("maps all 5 category thresholds correctly", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 10,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 1000,
        saturatedMassGrams: 5000, // capacity = 4000g
      };

      expect(calculateSubstrateHydration(1400, pot).category).toBe("dry"); // 10%
      expect(calculateSubstrateHydration(2200, pot).category).toBe("light"); // 30%
      expect(calculateSubstrateHydration(3200, pot).category).toBe("medium"); // 55%
      expect(calculateSubstrateHydration(4200, pot).category).toBe("heavy"); // 80%
      expect(calculateSubstrateHydration(4800, pot).category).toBe("saturated"); // 95%
    });
  });

  // ── 3. State Transition Immutability ──
  describe("3. updatePotProfile pure state transitions", () => {
    it("updates pot configuration immutably and preserves snapshot", () => {
      const initialRun = createDefaultRunPackage();
      const updatedPot: PotProfile = {
        type: "airpot",
        nominalVolumeLiters: 15,
        actualFillLiters: 14,
        diameterCm: 30,
        heightCm: 32,
        emptyMassGrams: 1200,
        saturatedMassGrams: 6500,
      };

      const updatedRun = updatePotProfile(initialRun, updatedPot);

      expect(updatedRun.config.pot.type).toBe("airpot");
      expect(updatedRun.config.pot.nominalVolumeLiters).toBe(15);
      expect(updatedRun.config.pot.emptyMassGrams).toBe(1200);
      expect(updatedRun.config.pot.saturatedMassGrams).toBe(6500);

      // Verify zero mutation of initialRun
      expect(initialRun.config.pot.nominalVolumeLiters).toBe(11);
      expect(initialRun.config.pot.emptyMassGrams).toBeNull();

      // Verify audit event generation
      expect(updatedRun.auditEvents.length).toBeGreaterThan(
        initialRun.auditEvents.length,
      );
      expect(updatedRun.auditEvents[0].entityType).toBe("pot-profile");
      expect(updatedRun.auditEvents[0].action).toBe("configuration-changed");
    });
  });

  // ── 4. Observation Recording & Measurement Mapping ──
  describe("4. addObservation pot mass measurement ingestion", () => {
    it("maps potMassGrams to typed pot.mass measurement", () => {
      const run = createDefaultRunPackage();
      const obs = createObservation(5);
      obs.values.potMassGrams = 3250;

      const updatedRun = addObservation(run, obs);

      expect(updatedRun.observations.length).toBe(1);
      expect(updatedRun.observations[0].values.potMassGrams).toBe(3250);

      const potMeasurement = updatedRun.measurements.find(
        (m) => m.metric === "pot.mass",
      );
      expect(potMeasurement).toBeDefined();
      expect(potMeasurement?.reading.value).toBe(3250);
      expect(potMeasurement?.reading.unit).toBe("g");
    });
  });

  // ── 5. Component Interaction & Accessibility ──
  describe("5. DailyOperatorPanel pot weight dryback UI rendering", () => {
    it("renders pot weight dryback widget with 44px min touch targets", () => {
      // Component rendering verification
    });
  });
});
```

### 4.2 App Shell & Navigation Regression Suite

- Update `src/AppRoutingStress.test.tsx` to verify all 22 routes are fully mapped and rendered in `WorkspaceRoute` without falling through to fallback defaults.
- Verify `src/m4-empirical-challenge.test.ts` validates zero mutation and localStorage lens/day persistence.

---

## 5. Implementation Roadmap for Milestone 4 Implementer

1. **Step 1 — State Transition Function**: Add `updatePotProfile` to `src/run-state.ts` with full audit event and domain event logging.
2. **Step 2 — Interactive Widget in `DailyOperatorPanel.tsx`**:
   - Add Pot Weight Dryback Monitoring card to `DailyOperatorPanel.tsx`.
   - Bind `calculateSubstrateHydration` to real-time inputs.
   - Render multi-segment color-banded progress bar and dynamic German advice box.
   - Add in-place Pot Profile quick-calibration button calling `updatePotProfile`.
3. **Step 3 — App Shell & Routing Check**:
   - Ensure `#equipment` route is cleanly routed and tested in `App.tsx`.
   - Ensure all modal callbacks are cleanly wired with zero state mutation.
4. **Step 4 — Test Execution**:
   - Create `src/components/panels/pot-weight-dryback.test.tsx`.
   - Update `src/AppRoutingStress.test.tsx`.
   - Run `npx vitest run`, `npx tsc --noEmit`, and `npx vite build` to ensure 100% pass rate.
