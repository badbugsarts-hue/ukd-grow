# Review Report: Setup View and Autoflower Cockpit Integration
**Reviewer**: Reviewer 2 (Reviewer & Adversarial Critic)
**Date**: 2026-08-21
**Target Working Directory**: c:\Users\badbu\Documents\grow\.agents\reviewer_2
**Project Root**: c:\Users\badbu\Documents\grow

---

## 1. Executive Summary & Verdict

**Verdict**: **APPROVE**

The state management, domain invariant compliance, and persistence layer for the Setup View and Autoflower Cockpit Integration have been rigorously audited and stress-tested. The implementation strictly adheres to all architectural constraints, domain invariants, and data integrity guarantees specified in AGENTS.md, PROJECT.md, and ORIGINAL_REQUEST.md.

---

## 2. Detailed Technical Audit Findings

### 2.1 State Transitions & Execution Mode (src/run-state.ts)
- **updateExecutionMode(run, mode)** (lines 473–554):
  - Properly checks for idempotency (un.executionMode === mode).
  - When switching from simulation to live, creates an immutable liveAnchor (with UUID, kind: seed-planted, ISO timestamp anchor from un.config.startDate, and operator timezone).
  - Automatically transitions un.status from draft to active if necessary.
  - Generates append-only AuditEvent (action: live-started or configuration-changed) and DomainEvent (type: live.started or configuration.changed with previousMode and 
extMode).
  - Employs immutable update semantics (	ouch({ ...run, ... })).

### 2.2 Retroactive Plant Milestones (src/run-state.ts)
- **updatePlantMilestones(run, milestones, reason)** (lines 556–734):
  - Robust date normalization (
ormalizeIso) that handles ISO strings, dates without time (YYYY-MM-DD), and rejects invalid date strings cleanly (Number.isNaN(parsed.getTime())).
  - Correctly creates and preserves GrowthEvent entries for seed-planted (potting) and emergence (Day Zero) with confidence: confirmed.
  - Determines effectiveAnchorDateIso according to configured dayZeroAnchor.
  - Updates plant identity metadata (pottingDateIso, emergenceDateIso, dayZeroAnchorDate).
  - Dynamically updates active un.liveAnchor.startedAtUtc if in live mode and records a traceable LiveAnchorRevision in un.anchorRevisions documenting previous and new anchor timestamps with the revision reason.
  - Emits corresponding AuditEvent and DomainEvent entries.

### 2.3 Snapshot Immutability & Audit Trails (src/run-state.ts)
- Active run configuration snapshots (un.configurationSnapshot) are strictly immutable:
  - effectiveRunConfig(run) returns un.config only when status === draft; once active/archived, it returns un.configurationSnapshot.config.
  - Modifying parameters in updateRunConfig or updatePotProfile on an active run leaves un.configurationSnapshot untouched, logging: Profil geändert; Snapshot  nicht verändert.
  - All modifications emit append-only AuditEvent and DomainEvent entries.

### 2.4 Biological Age & Dynamic Plan Recalculation (src/domain.ts, src/live-run.ts)
- **calculateBiologicalPlantAge** (src/domain.ts, lines 313–396):
  - Correctly evaluates biological age against the designated dayZeroAnchor (e.g. emergence or seed-planted) while calculating operational age from the earliest operational start.
  - Calculates germinationDays when both potting and emergence events are recorded.
  - Fail-safe boundary protections: Math.max(0, ...) ensures ages are never negative, and missing or future anchor dates fall back cleanly without NaN or unhandled exceptions.
- **evaluateLiveClock** (src/live-run.ts, lines 13–68):
  - Returns day: 0 and status: healthy when in simulation mode.
  - Fail-closed gate: When 
owMs < anchorMs, returns day: 0, status: blocked-before-anchor, and locked: true.
  - Anti-rollback protection: When clock moves backward beyond tolerance (
owMs + CLOCK_ROLLBACK_TOLERANCE_MS < previousMs), returns status: blocked-clock-rollback and locked: true.

### 2.5 Substrate Hydration & Tare Weights (src/domain.ts)
- **calculateSubstrateHydration** (src/domain.ts, lines 408–497):
  - Correctly requires both emptyMassGrams (tare) and saturatedMassGrams (field capacity reference).
  - Explicitly guards against invalid inputs:
    - Missing tare -> state: INSUFFICIENT_DATA, eason: EMPTY_MASS_MISSING.
    - Missing or non-positive capacity (satMass <= emptyMass) -> state: INSUFFICIENT_DATA, eason: SATURATION_REFERENCE_MISSING (preventing 0-division).
    - Current mass below tare -> state: UNKNOWN, eason: MASS_BELOW_TARE.
    - Current mass exceeding 105% of saturation -> state: UNKNOWN, eason: MASS_EXCEEDS_SATURATION.
  - Computes hydrationPercent (-100\%$), depletionPercent, and classifies into standard hydrological bins (dry, light, medium, heavy, saturated).

### 2.6 Persistence Layer & Storage Gate (src/run-storage.ts)
- IndexedDB database schema v8 (ukd-operator-workspace) with stores: un-packages-v3, workspace-meta, estore-staging-v2, media-ciphertexts-v1, sync-outbox-v1, ackup-vault-v1.
- ResilientRunRepository handles storage failures (quota, locked, corrupt, unavailable), transitioning to ead-only or ecovery-required while protecting the active run in memory.
- stageAndActivateRestoredRun enforces a staging gate (RESTORE_STAGING_STORE), schema validation (alidateRunPackage), and abort rollback before overwriting the active run.

### 2.7 AGENTS.md Invariants Compliance Check
- **No fake live hardware claims**: Connector and sensor capabilities follow defined MeasurementTrustStatus (unverified, alid, calibration-due); no simulated hardware is claimed as real.
- **No silent CalMag dosing**: Water chemistry profiles require explicit baseline entry; missing baseline produces a persistent alert (water-baseline-missing) preventing automated conditioner dosing.
- **Experience Lenses**: Guided, Advanced, and Expert lenses alter presentation depth and tooltips only; underlying formulas, calculations, and domain state remain completely invariant.
- **Integrity Verification**: No hardcoded dummy data, no bypassing of domain checks, no self-certifying mock shortcuts.

---

## 3. Verification Commands & Test Results

1. **Unit and Integration Test Suite**:
   `
   npx vitest run
   `
   - **Result**: 39 test files passed (100%), 431 tests passed (100%), 0 failed.
   - **Coverage includes**:
     - src/run-state.test.ts (18 tests)
     - src/domain.test.ts (18 tests)
     - src/live-run.test.ts (3 tests)
     - src/run-storage.test.ts (7 tests)
     - src/m1-empirical-fuzz.test.ts (5 tests, fuzzing plant age & PPFD)
     - src/plant-identity-adversarial-challenger.test.tsx (19 tests)
     - src/components/panels/pot-weight-dryback.adversarial.test.tsx (16 tests)
     - src/domain-adversarial-challenge.test.ts (23 tests)

2. **TypeScript Static Typecheck**:
   `
   npx tsc --noEmit
   `
   - **Result**: 0 errors, exit code 0.

---

## 4. Adversarial Challenge & Stress-Testing

| Stress Scenario | Tested Behavior | System Response | Verdict |
|---|---|---|---|
| Zero / Negative Capacity (satMass <= emptyMass) | Dryback calculation division by zero | Returns INSUFFICIENT_DATA with SATURATION_REFERENCE_MISSING | PASS |
| Clock Jump to Past ($> 5\text{ min}$) | System clock tampering / desync | Transitions to locked-clock-rollback, blocks daily operations | PASS |
| Future Start Date in Live Mode | Current time before anchor | Transitions to locked-before-anchor, blocks execution | PASS |
| Retroactive Emergence Change | Shift Day Zero by $-3$ days | Updates liveAnchor, writes LiveAnchorRevision, shifts current day | PASS |
| Active Run Config Modification | Edit parameters on active run | Preserves configurationSnapshot immutability, logs audit event | PASS |
| Malformed / Partial Backup Restore | Restore invalid payload | Staging gate rejects schema before touching active run | PASS |

---

## 5. Final Assessment

The state management, persistence, domain rules, and retroactive milestone tracking are rock-solid, fully tested, and ready for production.

**Verdict**: **APPROVE**
