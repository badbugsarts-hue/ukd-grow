# Forensic Audit Report — Milestone 2

**Work Product**: `src/components/panels/` (`EnvironmentTargetsPanel.tsx`, `NutrientMixPanel.tsx`, `RunConfigPanel.tsx`, `VpdDliCalculatorPanel.tsx`, `panels.test.ts`)
**Integrity Mode**: `demo` (from `ORIGINAL_REQUEST.md`)
**Verdict**: `INTEGRITY VIOLATION`

---

## 1. Observation

### Source Code & Implementation Analysis

- **`EnvironmentTargetsPanel.tsx`**:
  - Implements authentic React UI with sliders for temperature (15–35°C), humidity (30–90%), PPFD (50–1200), light hours (12–24h), and leaf temp delta (-4..+2°C).
  - Imports and invokes pure domain functions `calculateLeafVpd` and `calculateDli` from `../../domain`.
  - Integrates with `run-state` via `createObservation` and `addObservation`.
  - Includes German terminology tooltips (`TermTooltip`), lens badges (`LensBadge`), and interactive presets. No hardcoded calculation return values.
- **`NutrientMixPanel.tsx`**:
  - Implements interactive 7-step nutrient mixing protocol and dynamic dosage table scaling by `batchLiters`.
  - Imports and calls `calculateMix` and `numberAt` from `../../domain`.
  - Enforces **AGENTS.md Invariant 4** (Fail-Closed Water Profile Alert when `sourcePh`, `sourceEc`, or `calciumMgL` are missing).
  - Enforces **AGENTS.md Invariant 6** (PK Booster Stacking rule alert avoiding additive stacking of HESI PK 13/14 with Big Bud/Overdrive).
  - Records batch entries into `RunPackage.mixBatches`. No facade logic or hardcoded outputs detected.
- **`RunConfigPanel.tsx`**:
  - Implements 5-category configuration form (Substrate, Light, Tent, Water Analysis, Equipment/Genetics).
  - Exports `calculateReadinessScore(config)` performing real category checks and returning `score`, `missingItems`, and `isReady`.
  - Enforces fail-closed readiness gate, blocking activation until readiness score is 100%.
  - Invokes `updateRunConfig` and `activateRun` from `../../run-state`. No facade implementations found.
- **`VpdDliCalculatorPanel.tsx`**:
  - Implements interactive calculator simulating microclimate inputs against a 4-phase target matrix (Sämling, Veg, Hauptblüte, Spätblüte).
  - Imports and calls `calculateLeafVpd`, `calculateDli`, and `calculateGaugeStatus`.
  - Performs live calculations for Leaf VPD, Air VPD, and DLI. No hardcoded calculation return values.

### Unit Tests Analysis

- **`src/components/panels/panels.test.ts`**:
  - Contains 10 unit tests covering `EnvironmentTargetsPanel logic`, `NutrientMixPanel logic`, `RunConfigPanel logic`, and `VpdDliCalculatorPanel logic`.
  - All 10 tests in `panels.test.ts` pass cleanly (10/10 passed).
  - Tests verify authentic calculation matching (e.g. `dli` close to 38.88 for 600 PPFD, 18h; nutrient scaling for 5L, 10L, 20L; fail-closed water profile detection; readiness score transitions 0% -> 100%).

### Command Execution Results

1. **TypeScript Typecheck (`npx tsc --noEmit`)**:
   - Command: `npx tsc --noEmit`
   - Result: **PASSED** (Exit code: `0`, 0 type errors).
2. **Vitest Unit Test Suite (`npx vitest run`)**:
   - Command: `npx vitest run`
   - Result: **FAILED** (Exit code: `1`).
   - Summary: 6 test files passed, 1 test file failed (72 passed, 2 failed out of 74 total tests).
   - Verbatim error output from `src/components/panels/climate-stress-test.test.ts`:
     ```text
     FAIL  src/components/panels/climate-stress-test.test.ts > Milestone 2 - Interactive Climate Controls & Domain Stress Test Suite > VpdDliCalculatorPanel component props stress testing > instantiates VpdDliCalculatorPanel with extreme initial props without crashing
     TypeError: Cannot read properties of null (reading 'useState')
      ❯ process.env.NODE_ENV.exports.useState node_modules/.pnpm/react@19.2.8/node_modules/react/cjs/react.development.js:1263:33
      ❯ VpdDliCalculatorPanel src/components/panels/VpdDliCalculatorPanel.tsx:31:33
          31|   const [tempAir, setTempAir] = useState<number>(initialTemp);

     FAIL  src/components/panels/climate-stress-test.test.ts > Milestone 2 - Interactive Climate Controls & Domain Stress Test Suite > VpdDliCalculatorPanel component props stress testing > instantiates VpdDliCalculatorPanel with high extreme initial props without crashing
     TypeError: Cannot read properties of null (reading 'useState')
      ❯ process.env.NODE_ENV.exports.useState node_modules/.pnpm/react@19.2.8/node_modules/react/cjs/react.development.js:1263:33
      ❯ VpdDliCalculatorPanel src/components/panels/VpdDliCalculatorPanel.tsx:31:33
          31|   const [tempAir, setTempAir] = useState<number>(initialTemp);
     ```

---

## 2. Logic Chain

1. **Source Code Authenticity Check**: Inspection of `EnvironmentTargetsPanel.tsx`, `NutrientMixPanel.tsx`, `RunConfigPanel.tsx`, and `VpdDliCalculatorPanel.tsx` confirmed that all panels use genuine React state and invoke pure domain calculations (`calculateLeafVpd`, `calculateDli`, `calculateMix`, `activateRun`). There are no facade functions, dummy returns, or hardcoded expected outputs in the component source.
2. **AGENTS.md Rule Compliance Check**: Invariant 4 (Fail-closed missing water profile) and Invariant 6 (PK booster stacking restriction) are actively enforced in `NutrientMixPanel.tsx` and `RunConfigPanel.tsx`.
3. **Type Safety Check**: `npx tsc --noEmit` executed with 0 errors.
4. **Behavioral Test Suite Verification**: Running `npx vitest run` failed with exit code 1 due to 2 failing tests in `src/components/panels/climate-stress-test.test.ts` (lines 167 & 182). In these tests, `VpdDliCalculatorPanel(props)` is called directly as a standard JS function rather than through a React rendering context, triggering an unhandled `TypeError: Cannot read properties of null (reading 'useState')`.
5. **Integrity Rule Application**: Per Integrity Forensics rules, behavioral verification requires that all test commands execute successfully. Because `npx vitest run` fails with exit code 1, the work product cannot be certified clean.

---

## 3. Caveats

- The component source code in `src/components/panels/` is cleanly authored and fully functional when rendered inside a React application or React testing wrapper.
- The unit tests in `src/components/panels/panels.test.ts` (10/10) all passed. The test failures are isolated to `src/components/panels/climate-stress-test.test.ts`, where direct function invocation of a React hook-based component was attempted without a React DOM test renderer.
- As a Forensic Auditor, no code modifications were made. The issue must be resolved by the implementation team.

---

## 4. Conclusion

**Verdict**: `INTEGRITY VIOLATION`

While the component source code and `panels.test.ts` unit tests are authentic and adhere to AGENTS.md domain rules, the mandatory test verification gate `npx vitest run` fails (exit code 1) due to 2 failing tests in `src/components/panels/climate-stress-test.test.ts`.

**Actionable Recommendation**:
Refactor lines 167 and 182 in `src/components/panels/climate-stress-test.test.ts` to test `VpdDliCalculatorPanel` using proper React component testing methods or verify props via pure calculation helper functions, ensuring `npx vitest run` passes with 100% test success.

---

## 5. Verification Method

To independently verify this audit finding:

1. Run TypeScript check:

   ```powershell
   npx tsc --noEmit
   ```

   _(Expected output: Exits cleanly with code 0)_

2. Run Vitest test suite:
   ```powershell
   npx vitest run
   ```
   _(Expected output: Exits with code 1; reports 2 failed tests in `src/components/panels/climate-stress-test.test.ts` due to `useState` hook invocation error)_
