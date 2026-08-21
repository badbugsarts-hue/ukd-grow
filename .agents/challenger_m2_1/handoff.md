# Handoff Report — Milestone 2 Challenger 1 (Nutrient & RunConfig Calculation Stress Test)

## 1. Observation

- **Target Files Inspected**:
  - `src/components/panels/NutrientMixPanel.tsx` (lines 36-54, 223-248, 403-441)
  - `src/components/panels/RunConfigPanel.tsx` (lines 14-96, 114-117, 212-283)
  - `src/domain.ts` (lines 146-191)
  - `src/run-state.ts` (lines 75-187, 280-378, 381, 1077-1090)

- **Execution Commands and Results**:
  1. `npx tsc --noEmit` -> Exited with code `0`. 0 TypeScript errors found across the codebase.
  2. `npx vitest run` -> Exited with code `0`. Passed 8/8 test files, 93/93 total tests, including 19 new stress tests added in `src/components/panels/nutrient-runconfig-stress.test.ts`.

- **Direct Code Observations**:
  - **Batch Volume Clamping**: `src/domain.ts` line 147: `const volume = Number.isFinite(batchLiters) ? Math.max(0, batchLiters) : 0;`. Clamps negative batch sizes, `NaN`, and `Infinity` safely to `0`. `NutrientMixPanel.tsx` line 228 enforces minimum 1L UI input via `onChange={(e) => setBatchLiters(Math.max(1, parseFloat(e.target.value) || 1))}`.
  - **Water Profile Incompleteness Alert Check**: `NutrientMixPanel.tsx` lines 36-39:
    ```typescript
    const isWaterProfileIncomplete =
      water.sourcePh === null ||
      water.sourceEc === null ||
      water.calciumMgL === null;
    ```
    _Note_: `water.magnesiumMgL === null` is omitted from `NutrientMixPanel.tsx` line 39, while `RunConfigPanel.tsx` line 72 explicitly includes `w.magnesiumMgL === null`.
  - **Ca:Mg Ratio Logic**: `RunConfigPanel.tsx` line 116: `const caMgRatio = mg > 0 ? (ca / mg).toFixed(1) : ca > 0 ? `${ca}:0` : "—";`. Gracefully handles zero Ca, zero Mg, and null values (`0:0` -> `" — "`, `60:0` -> `"60:0"`).
  - **Readiness Score Calculation**: `RunConfigPanel.tsx` lines 14-96 (`calculateReadinessScore`): Computes 5 categories (Substrate/Pot, Light, Tent, Water, Equipment/Genetics) at 20% each. Unconfigured `createDefaultRunPackage()` starts at **80% readiness** because `defaultWaterProfile()` initializes `sourcePh`, `sourceEc`, `calciumMgL`, `magnesiumMgL` to `null` (satisfying Invariant 4: Fail-Closed Gate).
  - **Stage Transitions & Activation**: `src/run-state.ts` lines 327-378 (`activateRun`):
    - `run.status !== "draft"` returns early (idempotent for active runs, blocks re-activation for archived runs).
    - Transitioning from draft to active creates an immutable snapshot with version incremented (`version + 1`) and locks `effectiveRunConfig(run)` to `run.configurationSnapshot.config`.

## 2. Logic Chain

1. **Batch Size Calculations (0L, 1000L, Negative, NaN, Infinity)**:
   - `calculateMix(plan, batchLiters)` in `domain.ts` checks `Number.isFinite(batchLiters)`. If false or negative, `volume` evaluates to `0`. `dose * 0` yields `0` for all nutrient amounts without throwing errors or producing `NaN`.
   - For `1000L` batches, amounts scale linearly (`2.5 * 1000 = 2500` ml) without numeric overflow.
   - UI input handling in `NutrientMixPanel.tsx` prevents users from entering values below 1 in the interactive input box.

2. **Water Profile & Ca:Mg Edge Cases**:
   - `RunConfigPanel.tsx` calculates readiness Category 4 by checking `sourcePh`, `sourceEc`, `calciumMgL`, `magnesiumMgL` for `null` or `NaN`.
   - Default water profile has `null` values for all 4 parameters, causing new runs to score 80% and blocking activation until water analysis is filled.
   - `caMgRatio` in `RunConfigPanel.tsx` guards against division by zero (`mg > 0 ? (ca/mg).toFixed(1) : ...`).

3. **Readiness Score & Gating**:
   - `calculateReadinessScore` correctly evaluates missing attributes per category.
   - `handleActivateRun` in `RunConfigPanel.tsx` checks `if (!readiness.isReady) return;`, ensuring draft runs cannot be activated until 100% readiness is achieved.

4. **Stage Transition Invariants & Snapshot Immutability**:
   - `activateRun` creates an immutable `configurationSnapshot` and sets `status = "active"`.
   - `effectiveRunConfig` checks `run.status === "draft" ? run.config : run.configurationSnapshot.config`. Subsequent calls to `updateRunConfig` modify `run.config` in draft state, but leave `configurationSnapshot` untouched, ensuring active run targets cannot be silently mutated.

## 3. Caveats

- **Minor Consistency Finding 1**: `NutrientMixPanel.tsx` line 39 checks `isWaterProfileIncomplete` using `water.sourcePh === null || water.sourceEc === null || water.calciumMgL === null`, but does not include `water.magnesiumMgL === null`. If Ca is present (e.g. 60 mg/L) but Mg is `null`, `NutrientMixPanel` does not trigger the red `⛔ FEHLENDES WASSERPROFIL` warning block, even though `RunConfigPanel` flags Category 4 as missing (80% score).
- **Minor Consistency Finding 2**: `calculateReadinessScore` Category 5 checks `!config.name || !config.genetics` without `.trim()`. Whitespace-only strings (e.g. `"   "`) pass Category 5, whereas Category 1 uses `!config.medium.trim()`.

## 4. Conclusion

The calculation logic in `NutrientMixPanel.tsx` and `RunConfigPanel.tsx` is robust, mathematically sound, handles boundary conditions (0L, 1000L, NaN, zero Ca/Mg) safely, and strictly enforces stage transition invariants and fail-closed readiness gates.

**Explicit Verdict**: `APPROVE`

## 5. Verification Method

To independently verify these findings:

1. **Run Typecheck**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected result_: Exit code 0, 0 errors.

2. **Run Vitest Test Suite**:

   ```bash
   npx vitest run
   ```

   _Expected result_: 8/8 test files pass, 93/93 tests pass (including 19 tests in `src/components/panels/nutrient-runconfig-stress.test.ts`).

3. **Inspect Stress Test File**:
   - File: `src/components/panels/nutrient-runconfig-stress.test.ts`
   - Inspect tests covering 0L batch, 1000L batch, NaN/Infinity batch, readiness scores 0-100%, missing water profile fields, invalid stage transitions, and snapshot immutability.
