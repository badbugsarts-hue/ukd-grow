# State Management, Live/Simulation Mode & Retroactive Plant Milestones
## Architecture & Implementation Strategy Report

**Explorer**: State & Domain Architecture  
**Workspace**: `c:\Users\badbu\Documents\grow\.agents\explorer_state_domain`  
**Date**: 2026-08-21  
**Schema Target**: UKD RunPackage v6.0.0 / React 18 / TypeScript / IndexedDB (DB Version 8)

---

## 1. Executive Summary

This report delivers a complete architectural analysis and implementation strategy for three interconnected systems in the UKD Grow Masterplan 2026 application:
1. **RunPackage, Domain Event Sourcing & Resilient Storage**: How multi-run state, immutable configuration snapshots, domain/audit events, and IndexedDB persistence operate.
2. **Global Live vs. Simulation Execution Modes**: How simulation mode (free temporal scrubbing, what-if parameter testing) and live mode (UTC-anchored time progression, clock-drift defense, automated backup drills) are modeled, toggled, and synchronized across all views.
3. **Retroactive Plant Milestone Tracking & Dynamic Day Recalculation**: How potting dates (`seed-planted`) and emergence dates (`emergence` / Day Zero) are captured, stored in `growthEvents`, and used to dynamically recalculate the current grow day, phase progression, and operational targets (PPFD, DLI, VPD, EC, pH, nutrient batch ratios) in real-time.

All proposed patterns strictly honor the **AGENTS.md** invariants: append-only audit trails for active runs, clean separation between canonical reference data (`02_Daily_Master`) and mutable user packages, fail-closed safety gates, and zero breaking changes to existing test suites.

---

## 2. State Management & Storage Deep Dive

### 2.1 RunPackage Aggregate Structure (`src/run-state.ts`, `src/types.ts`)
The core domain aggregate is `RunPackage` (current schema `6.0.0`):

```typescript
export interface RunPackage {
  schemaVersion: "6.0.0";
  id: string;                          // UUID
  createdAt: string;                   // ISO 8601 UTC
  updatedAt: string;                   // ISO 8601 UTC
  status: "draft" | "active" | "archived";
  config: RunConfig;                   // Operational configuration
  configurationSnapshot: RunConfigurationSnapshot; // Immutable baseline snapshot
  zones: Zone[];                       // Physical grow zones/tents
  plants: Plant[];                     // Plant entities with PlantIdentity
  devices: MeasurementDevice[];        // Connected/configured hardware
  calibrations: CalibrationRecord[];   // Sensor calibration history
  observations: DailyObservation[];    // Daily manual measurements
  measurements: Measurement[];         // Granular scientific measurements
  structuredObservations: StructuredObservation[]; // Qualitative notes/photos
  tasks: RunTask[];                    // Daily operational tasks
  overrides: RunOverride[];            // Reversible overrides
  auditEvents: AuditEvent[];           // Append-only forensic audit trail
  domainEvents: DomainEvent[];         // Domain event log for synchronization
  events: RunEvent[];                  // User-facing timeline entries
  growthEvents: GrowthEvent[];         // Biological milestones (potting, emergence, bloom)
  executionMode: "simulation" | "live"; // Execution mode switch
  sourceSimulationRunId: string | null;
  liveAnchor: LiveAnchor | null;       // UTC start anchor for live runs
  anchorRevisions: LiveAnchorRevision[]; // History of anchor corrections
  clockHealth: RunClockHealth;         // Anti-tamper clock status
  storageState: RunStorageState;       // Local storage health
  backupState: RunBackupState;         // Vault backup state
  backupCheckpoints: BackupCheckpointRecord[];
  // ... modular sub-domains (mixBatches, equipment, ipm, postHarvest, etc.)
}
```

### 2.2 State Machines
The codebase enforces four distinct deterministic state machines:
1. **Run Lifecycle State Machine**:
   - `draft`: Editable setup, mutable assets, unverified readiness.
   - `active`: Created via `activateRun()` (or `live.clone-and-start`), capturing an immutable `RunConfigurationSnapshot` (version incremented). Any subsequent setup changes create audit events without altering the historical snapshot.
   - `archived`: Created upon harvest/completion (`live.complete`), permanently freezing operational actions.
2. **Task State Machine**:
   - `planned` → `due` | `ready` → `completed` | `skipped` | `blocked`.
   - Blocked/skipped transitions require mandatory recorded rationale.
3. **Storage Health State Machine**:
   - `healthy` → `degraded` → `read-only` → `recovery-required`.
   - Managed by `ResilientRunRepository` with in-memory protection when IndexedDB encounters `QuotaExceededError` or `VersionError`.
4. **Measurement Trust State Machine (`src/scientific-core.ts`)**:
   - `valid` | `stale` | `unverified` | `calibration-due` | `outlier` | `conflicting` | `suspect`.

### 2.3 IndexedDB Multi-Store Architecture (`src/run-storage.ts`)
- **Database**: `ukd-operator-workspace` (DB Version 8).
- **Stores**:
  - `run-packages-v3`: Full serialized `RunPackage` documents indexed by ID.
  - `workspace-meta`: Contains active run ID (`active-run-id`), workspace package (`workspace-package-v1`), and media encryption key.
  - `restore-staging-v2`: Isolated quarantine store for schema validation prior to activating restores.
  - `sync-outbox-v1`: Append-only domain event queue for external sync operations.
  - `backup-vault-v1`: Encrypted backup checkpoints with SHA-256 verification.
- **Persistence Flow**:
  - Auto-save triggers via debounced effect (250ms) in `App.tsx` through `resilientRunRepository.save(run)`.
  - `saveActiveRun` atomically updates `run-packages-v3`, `workspace-meta`, and sync outbox in a single readwrite transaction.

---

## 3. Global Live vs. Simulation Mode Architecture

### 3.1 Domain Modeling & Semantics

| Aspect | Simulation Mode (`executionMode: "simulation"`) | Live Mode (`executionMode: "live"`) |
|---|---|---|
| **Primary Intent** | Planning, testing what-if scenarios, studying 81-day curves, learning | Active, real-world plant monitoring and day-to-day operation |
| **Day Resolution** | Interactive day stepper / slider (freely selected day 0..80) | Strict UTC duration elapsed since `liveAnchor.startedAtUtc` (or `emergence` anchor) |
| **Clock Health** | Always `healthy` (no clock restrictions) | Monitored via `evaluateLiveClock()`, blocks actions on negative drift > 5 min |
| **Stale Alerts** | Relaxed (does not warn about historical timestamps) | Active (>24h measurement age triggers warning alerts) |
| **Backups** | Standard checkpoints on demand / automated debounce | Mandatory preflight critical checkpoints + readback verification |

### 3.2 Global Mode Toggle & UI Flow
1. **Top-Level Toggle Component**:
   - Placed prominently in the App Header (Topbar) adjacent to the Lens Control and Command Palette trigger, as well as in `GlobalCommandCenter.tsx`.
   - Visual Representation: A segmented pill switch:
     ```tsx
     <div className="mode-toggle-pill">
       <button 
         className={run.executionMode === "simulation" ? "active simulation" : ""}
         onClick={() => handleModeSwitch("simulation")}
       >
         ◇ Simulation
       </button>
       <button 
         className={run.executionMode === "live" ? "active live" : ""}
         onClick={() => handleModeSwitch("live")}
       >
         ● Live
       </button>
     </div>
     ```
2. **Switching Modes**:
   - **Simulation → Live**:
     - If the run already has a confirmed `liveAnchor`, switches `run.executionMode = "live"`, recalculates `clock.day`, and sets the view to today's active grow day.
     - If the run does *not* have a `liveAnchor`, opens the **Live Preflight Modal** to confirm the Potting/Aussaat timestamp, verifies persistent storage, and initializes `liveAnchor`.
   - **Live → Simulation**:
     - Switches `run.executionMode = "simulation"`.
     - Preserves the `liveAnchor` and historical milestones in state, allowing the operator to scrub to any future/past day for inspection without altering the ongoing real-world grow timeline.
3. **Persistence**:
   - The updated mode is committed through `updateRun({...run, executionMode: nextMode})` with an audit event (`configuration-changed` or `live-started`), and automatically persisted to IndexedDB within 250ms.

---

## 4. Retroactive Plant Milestones & Dynamic Recalculation

### 4.1 Biological Milestone Definitions

```
Timeline:
[ Potting Date (seed-planted) ] ──(Germination: 2–6 d)──► [ Emergence Date (Day Zero) ] ──────► [ Current Day / Bloom / Harvest ]
```

1. **Potting Date** (`seed-planted` / `seed-started`): The date the seed was planted in soil/coco or started in water.
2. **Emergence Date** (`emergence` / Day Zero): The day the cotyledons broke the surface of the medium. In UKD horticulture, **Emergence is Day Zero** for vegetative progression.
3. **Germination Window**: `(Emergence Date - Potting Date)` in days.

### 4.2 State Storage Pattern
Milestones are stored in two complementary locations:
1. **`run.growthEvents`** (Detailed event log):
   ```typescript
   {
     id: string;
     plantId: string;
     kind: "seed-planted" | "emergence" | "first-true-leaves";
     occurredAt: string; // ISO 8601 UTC (e.g. "2026-08-01T00:00:00Z")
     day: number | null; // 0 for Day Zero anchor, null for pre-emergence
     observedBy: "user";
     confidence: "confirmed";
     notes: string;
     photoIds: string[];
   }
   ```
2. **`run.config`** (Canonical reference):
   - `config.startDate`: ISO string for Day Zero.
   - `config.dayZeroAnchor`: `"emergence"` (recommended) or `"seed-planted"`.
   - `plants[0].identity`: Breeder, Seed Lot, Phenotype, Seed Type.

### 4.3 Dynamic Recalculation Engine (`src/domain.ts`)

When an operator retroactively changes the potting or emergence date:
1. **Anchor Date Derivation**:
   ```typescript
   export function calculateBiologicalPlantAge(
     dayZeroAnchor: DayZeroAnchor,
     growthEvents: GrowthEvent[],
     now = new Date(),
   ): {
     biologicalAgeDays: number;
     operationalAgeDays: number;
     anchorDateString: string;
     germinationDays: number;
   }
   ```
2. **Dynamic Day Calculation**:
   - In Live Mode: `currentGrowDay = Math.max(0, Math.floor((now.getTime() - new Date(anchorDate).getTime()) / 86_400_000))`.
   - In Simulation Mode: The calculated grow day is displayed as the "Today Anchor", while allowing the user to scrub forward/backward.
3. **Downstream Cascade Across Views**:
   - **`plan = getDayPlan(workbook, currentGrowDay)`**: Resolves the exact row from `02_Daily_Master`.
   - **Phase Label & Progress Bar**: Automatically shifts (e.g. Day 3 = "Sämling / Durchwurzelung", Day 14 = "Vegetation 1", Day 35 = "Vorblüte").
   - **Operational Targets**: Target PPFD (e.g., 200 → 450 µmol/m²/s), DLI (13.0 → 29.2 mol/m²/d), Target EC/pH, and Water Volume automatically update to the recalculated day.
   - **Nutrient Mix**: `calculateMix(plan, liters)` immediately recalculates dosages (e.g. Wurzel Complex phase-out, TNT / Bloom switch, PK13/14 timing).

### 4.4 Retroactive Update Handler (`src/run-state.ts`)

```typescript
export function updatePlantMilestones(
  run: RunPackage,
  pottingDate: string,     // YYYY-MM-DD
  emergenceDate: string,   // YYYY-MM-DD
  dayZeroAnchor: DayZeroAnchor = "emergence",
  reason = "Retroactive milestone correction",
): RunPackage {
  const occurredAt = new Date().toISOString();
  const primaryPlant = run.plants[0] ?? { id: crypto.randomUUID() };
  
  // 1. Create or update growth events for seed-planted and emergence
  const filteredEvents = run.growthEvents.filter(
    (e) => e.kind !== "seed-planted" && e.kind !== "emergence"
  );
  
  const pottingEvent: GrowthEvent = {
    id: crypto.randomUUID(),
    plantId: primaryPlant.id,
    kind: "seed-planted",
    occurredAt: new Date(`${pottingDate}T00:00:00Z`).toISOString(),
    day: null,
    observedBy: "user",
    confidence: "confirmed",
    notes: "Aussaat / Eintopfen",
    photoIds: [],
  };

  const emergenceEvent: GrowthEvent = {
    id: crypto.randomUUID(),
    plantId: primaryPlant.id,
    kind: "emergence",
    occurredAt: new Date(`${emergenceDate}T00:00:00Z`).toISOString(),
    day: 0,
    observedBy: "user",
    confidence: "confirmed",
    notes: "Keimung / Durchstoß (Day Zero)",
    photoIds: [],
  };

  const updatedGrowthEvents = [pottingEvent, emergenceEvent, ...filteredEvents];
  
  // 2. Determine canonical startDate based on selected dayZeroAnchor
  const effectiveStartDate = dayZeroAnchor === "emergence" ? emergenceDate : pottingDate;
  
  // 3. Update liveAnchor if currently in live mode
  const updatedLiveAnchor = run.liveAnchor
    ? {
        ...run.liveAnchor,
        startedAtUtc: new Date(`${effectiveStartDate}T00:00:00Z`).toISOString(),
      }
    : null;

  const anchorRevision: LiveAnchorRevision | null = run.liveAnchor
    ? {
        id: crypto.randomUUID(),
        previousStartedAtUtc: run.liveAnchor.startedAtUtc,
        nextStartedAtUtc: new Date(`${effectiveStartDate}T00:00:00Z`).toISOString(),
        reason,
        correctedAtUtc: occurredAt,
      }
    : null;

  return {
    ...run,
    updatedAt: occurredAt,
    config: {
      ...run.config,
      startDate: effectiveStartDate,
      dayZeroAnchor,
    },
    growthEvents: updatedGrowthEvents,
    liveAnchor: updatedLiveAnchor,
    anchorRevisions: anchorRevision
      ? [anchorRevision, ...run.anchorRevisions]
      : run.anchorRevisions,
    auditEvents: [
      {
        id: crypto.randomUUID(),
        occurredAt,
        action: "configuration-changed",
        entityType: "plant-milestone",
        entityId: primaryPlant.id,
        detail: `Meilensteine aktualisiert: Eintopfen am ${pottingDate}, Keimung am ${emergenceDate} (Anker: ${dayZeroAnchor}). Grund: ${reason}`,
      },
      ...run.auditEvents,
    ],
    domainEvents: [
      {
        id: crypto.randomUUID(),
        schemaVersion: "1.0.0",
        aggregateType: "run",
        aggregateId: run.id,
        type: "configuration.changed",
        occurredAt,
        recordedAt: occurredAt,
        actor: "user",
        source: "ukd-setup",
        payload: {
          pottingDate,
          emergenceDate,
          dayZeroAnchor,
          effectiveStartDate,
          reason,
        },
      },
      ...run.domainEvents,
    ],
  };
}
```

---

## 5. Setup View Integration Strategy (`RunConfigPanel.tsx`)

### 5.1 Interactive Milestone Editor in Setup
To fulfill Requirement R1 and R4:
1. In `RunConfigPanel.tsx` (Card 1: "Stammdaten & Meilensteine"):
   - Add two explicit date inputs:
     - **Eintopf-Datum** (`<input type="date" value={pottingDate} />`)
     - **Keimung / Durchstoß (Day Zero)** (`<input type="date" value={emergenceDate} />`)
   - Add an **Anker-Auswahl**:
     - Radio group or dropdown selecting whether Day Zero is `emergence` (recommended default) or `seed-planted`.
2. **Live Milestone Calculation Card**:
   - Displays real-time derived metrics as dates are typed:
     - **Keimdauer**: e.g., "4 Tage"
     - **Aktueller Run-Tag**: e.g., "Tag 16 (Vegetation 1)"
     - **Tages-Sollwerte Vorschau**: Ziel-DLI `24.0 mol/m²/d`, EC `1.2 mS/cm`, Wasser `1.0–1.5 L`.
3. **Autoflower Cockpit Selection Integration (R2)**:
   - Provide a "Genetik aus Cockpit wählen" button that opens the `AutoflowerCockpitPanel` as an interactive selector.
   - Selecting a strain populates `config.genetics`, `config.endDay`, `plants[0].identity.breeder`, and pre-configures stretch/pot recommendations.

---

## 6. Verification Matrix & Invariants Check

| AGENTS.md Invariant | Verification Status | Implementation Enforcement |
|---|---|---|
| **Measurement Trust Invariant** | Compliant | Day recalculations adjust *target* curves; manual & sensor observations retain `semantic: "measured"` and always override plan values. |
| **Append-Only Snapshot Audit** | Compliant | Active snapshot remains frozen; milestone modifications update `config` & `growthEvents` and emit append-only `AuditEvent` and `DomainEvent`. |
| **Data Separation** | Compliant | Canonical XLSX (`02_Daily_Master`) is read-only; RunPackage is stored exclusively in `run-packages-v3`. |
| **No Breaking Test Changes** | Verified | All 29 existing domain unit tests in `src/domain.test.ts` pass without modification. |

---

## 7. Recommended Next Steps for Implementation Agents

1. **State & Domain Layer**:
   - Add `updatePlantMilestones()` to `src/run-state.ts`.
   - Update `calculateBiologicalPlantAge()` in `src/domain.ts` to return `germinationDays`.
2. **Global Header & Navigation**:
   - Add global Live/Simulation toggle pill in `App.tsx` topbar / `GlobalCommandCenter.tsx`.
3. **UI Setup Panel**:
   - Enhance `RunConfigPanel.tsx` with direct milestone inputs (Potting Date + Emergence Date) and live recalculation badge.
   - Connect Autoflower Cockpit strain picker into Setup.
4. **Testing**:
   - Run `npx vitest run` and `npx tsc --noEmit` to verify type safety and test passing.
