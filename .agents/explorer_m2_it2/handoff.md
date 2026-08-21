# Handoff Report — Explorer M2 Iteration 2 (Remediation of Fail-Closed Dose & Stacking Rules)

## 1. Observation

### Current Implementation State & Previous Reviews

- **Reviewer 2 Finding (`.agents/reviewer_m2_2/handoff.md`)**:
  - Finding 1 (Critical): In `src/components/panels/NutrientMixPanel.tsx` (lines 36–54 & 403–441), when `isWaterProfileIncomplete` is `true`, a red alert banner is rendered, but `mixItems` continues to calculate and display positive nutrient doses (e.g., 2.5 ml/L, 25.0 ml total) and status `✓ Freigegeben`.
  - Finding 2 (Major): In `src/components/panels/NutrientMixPanel.tsx` (lines 28, 348–367), toggling `stackingBoosterConflict` displays a text warning box but does not modify `mixItems` or zero out the PK 13/14 dose.
- **Auditor Finding (`.agents/auditor_m2_1/handoff.md`)**:
  - Found that component logic was genuine, but test suite execution failed previously due to React hook call context in `climate-stress-test.test.ts`.
- **Current Test Suite Status**:
  - Execution of `npx vitest run` verified clean passing across all 8 test files (93 tests total, 0 failures), including `climate-stress-test.test.ts` and `panels.test.ts`.
  - Execution of `npx tsc --noEmit` verified 0 TypeScript compilation errors.

---

## 2. Logic Chain

1. **Safety Invariants Requirement**:
   - Invariant 4 / Fail-Closed Rule: Missing water chemistry parameters (`sourcePh === null`, `sourceEc === null`, or `calciumMgL === null`) MUST block positive dose generation. Doses must be overridden to `0.0` (ml/L and total ml) and display status `⛔ Gesperrt: Wasserprofil fehlt`.
   - Invariant 6 / Stacking Rule: When PK booster stacking conflict is flagged (`stackingBoosterConflict === true`), PK 13/14 dosage in `mixItems` MUST be overridden to `0.0` (ml/L and total ml) and display status `⛔ GESPERRT: Stacking-Konflikt`.
2. **Architecture & Pure Domain/Safety Function Design**:
   - By creating and exporting a pure helper function `applyMixSafetyRules(items, isWaterProfileIncomplete, stackingBoosterConflict)` from `NutrientMixPanel.tsx`, the safety transformation becomes deterministic, decoupled from React DOM rendering, and directly testable via unit tests.
   - `NutrientMixPanel` computes raw items via `calculateMix` (or fallback defaults), then passes them through `applyMixSafetyRules`.
   - Because `mixItems` is passed directly to both the JSX table rendering and `handleRecordBatch`, zeroing out doses ensures both visual display and batch audit logs enforce fail-closed zero dosage.
3. **Test Suite Expansion**:
   - `panels.test.ts` must import `applyMixSafetyRules` and assert that:
     - Under `isWaterProfileIncomplete = true`, every item in `mixItems` has `dose === 0.0`, `amount === 0.0`, and `statusText === "⛔ Gesperrt: Wasserprofil fehlt"`.
     - Under `stackingBoosterConflict = true` (with complete water profile), PK 13/14 has `dose === 0.0`, `amount === 0.0`, and `statusText === "⛔ GESPERRT: Stacking-Konflikt"`, while non-PK items retain positive dosages.

---

## 3. Caveats

- No caveats. Test suite `npx vitest run` and typecheck `npx tsc --noEmit` are currently passing. The proposed fixes are additive and purely enforce fail-closed safety without breaking existing components or domain interfaces.

---

## 4. Conclusion

### Required Implementation Specifications

#### File 1: `src/components/panels/NutrientMixPanel.tsx`

1. **Export `DisplayMixItem` interface & `applyMixSafetyRules` pure helper**:

```tsx
export interface DisplayMixItem {
  name: string;
  dose: number;
  amount: number;
  role: string;
  warning?: string;
  statusText?: string;
  isBlocked?: boolean;
}

export function applyMixSafetyRules(
  items: Array<{
    name: string;
    dose: number;
    amount: number;
    role: string;
    warning?: string;
  }>,
  isWaterProfileIncomplete: boolean,
  stackingBoosterConflict: boolean,
): DisplayMixItem[] {
  return items.map((item) => {
    const isPkItem =
      item.name === "PK13/14" ||
      item.name === "PK 13/14" ||
      item.name.includes("PK13/14");

    if (isWaterProfileIncomplete) {
      return {
        ...item,
        dose: 0.0,
        amount: 0.0,
        statusText: "⛔ Gesperrt: Wasserprofil fehlt",
        isBlocked: true,
      };
    }

    if (stackingBoosterConflict && isPkItem) {
      return {
        ...item,
        dose: 0.0,
        amount: 0.0,
        statusText: "⛔ GESPERRT: Stacking-Konflikt",
        isBlocked: true,
      };
    }

    return item;
  });
}
```

2. **Update `NutrientMixPanel` component calculation**:

Replace current `mixItems` definition (lines 42–54) with:

```tsx
const rawMixItems = plan
  ? calculateMix(plan, batchLiters)
  : [
      {
        name: "Athena Balance",
        dose: 0.5,
        amount: 0.5 * batchLiters,
        role: "Wasser zuerst",
        warning: "Nur nach Wasserchemie titrieren",
      },
      {
        name: run.config.nutrientSystem || "HESI TNT / Blüh Complex",
        dose: 2.5,
        amount: 2.5 * batchLiters,
        role: "Basis",
      },
      {
        name: "CalMag",
        dose: 0.5,
        amount: 0.5 * batchLiters,
        role: "Nur nach Bedarf",
      },
      {
        name: "Wurzel Complex",
        dose: 1.0,
        amount: 1.0 * batchLiters,
        role: "Definierte Frühgabe",
      },
      {
        name: "PowerZyme",
        dose: 2.0,
        amount: 2.0 * batchLiters,
        role: "Support",
        warning: "Nicht zusätzlich Sensizym im Referenzplan",
      },
      {
        name: "SuperVit",
        dose: 0.05,
        amount: 0.05 * batchLiters,
        role: "Mikrodosis",
      },
      {
        name: "HESI Boost",
        dose: 2.0,
        amount: 2.0 * batchLiters,
        role: "Blüte-Support",
      },
      {
        name: "PK13/14",
        dose: 1.0,
        amount: 1.0 * batchLiters,
        role: "PK-Modul",
        warning: "Nicht mit Big Bud/Overdrive stapeln",
      },
      {
        name: "pH Down",
        dose: 0.2,
        amount: 0.2 * batchLiters,
        role: "Ganz zum Schluss",
        warning: "Nur nach finaler Endmix-Messung",
      },
    ];

const mixItems = applyMixSafetyRules(
  rawMixItems,
  isWaterProfileIncomplete,
  stackingBoosterConflict,
);
```

3. **Update JSX Table Status rendering** (lines 422–440):

```tsx
  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: item.isBlocked ? "var(--muted)" : "var(--green)" }}>
    {item.amount.toFixed(1)} ml
  </td>
  <td style={{ padding: "8px 10px", fontSize: "11px" }}>
    {item.statusText ? (
      <span style={{ color: "var(--red)", fontWeight: 700 }}>{item.statusText}</span>
    ) : item.warning ? (
      <span style={{ color: "var(--amber)" }}>⚠️ {item.warning}</span>
    ) : (
      <span style={{ color: "var(--green)" }}>✓ Freigegeben</span>
    )}
  </td>
```

---

#### File 2: `src/components/panels/panels.test.ts`

1. **Import `applyMixSafetyRules`**:

```typescript
import { applyMixSafetyRules } from "./NutrientMixPanel";
```

2. **Add unit test cases inside `describe("NutrientMixPanel logic", ...)`**:

```typescript
it("zeros out all positive dose amounts and displays '⛔ Gesperrt: Wasserprofil fehlt' when water profile is incomplete", () => {
  const mockPlan = {
    day: 20,
    raw: [
      20,
      "2026-08-11",
      3,
      null,
      "Veg",
      "Wachstum",
      18,
      140,
      500,
      32.4,
      40,
      25,
      20,
      60,
      0.9,
      1.4,
      6.0,
      500,
      1000,
      "Manuell",
      "HESI TNT Complex",
      2.5,
      1.0,
      2.0,
      0.05,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      "Veg",
      "",
      0,
      0,
      0.9,
      0,
      0.5,
      0,
      0.2,
    ],
    formulaRow: [],
  };

  const rawItems = calculateMix(mockPlan, 10);
  const safeItems = applyMixSafetyRules(rawItems, true, false);

  expect(safeItems.length).toBeGreaterThan(0);
  for (const item of safeItems) {
    expect(item.dose).toBe(0.0);
    expect(item.amount).toBe(0.0);
    expect(item.statusText).toBe("⛔ Gesperrt: Wasserprofil fehlt");
    expect(item.isBlocked).toBe(true);
  }
});

it("zeros out PK 13/14 dose amount and displays '⛔ GESPERRT: Stacking-Konflikt' when booster conflict is active", () => {
  const mockPlan = {
    day: 20,
    raw: [
      20,
      "2026-08-11",
      3,
      null,
      "Veg",
      "Wachstum",
      18,
      140,
      500,
      32.4,
      40,
      25,
      20,
      60,
      0.9,
      1.4,
      6.0,
      500,
      1000,
      "Manuell",
      "HESI TNT Complex",
      2.5,
      1.0,
      2.0,
      0.05,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      "Veg",
      "",
      0,
      0,
      0.9,
      0,
      0.5,
      0,
      0.2,
    ],
    formulaRow: [],
  };

  const rawItems = calculateMix(mockPlan, 10);
  // Water profile complete (false), booster conflict active (true)
  const safeItems = applyMixSafetyRules(rawItems, false, true);

  const pkItem = safeItems.find(
    (i) => i.name === "PK13/14" || i.name === "PK 13/14",
  );
  expect(pkItem).toBeDefined();
  expect(pkItem?.dose).toBe(0.0);
  expect(pkItem?.amount).toBe(0.0);
  expect(pkItem?.statusText).toBe("⛔ GESPERRT: Stacking-Konflikt");
  expect(pkItem?.isBlocked).toBe(true);

  // Verify non-PK items remain unblocked with normal dosages
  const baseItem = safeItems.find(
    (i) => i.name === "HESI TNT Complex" || i.role === "Basis",
  );
  expect(baseItem).toBeDefined();
  expect(baseItem?.dose).toBeGreaterThan(0);
  expect(baseItem?.amount).toBeGreaterThan(0);
  expect(baseItem?.statusText).toBeUndefined();
});
```

---

## 5. Verification Method

To verify these changes after implementation:

1. **TypeScript Typecheck**:

   ```bash
   npx tsc --noEmit
   ```

   _(Must return Exit code 0 with zero errors)_

2. **Vitest Unit Tests**:

   ```bash
   npx vitest run
   ```

   _(Must return Exit code 0 with all test suites passing, including `panels.test.ts`)_

3. **Behavioral Invalidation Check**:
   - If `isWaterProfileIncomplete` is true and any item in `mixItems` has `dose > 0` or `amount > 0` or missing status `⛔ Gesperrt: Wasserprofil fehlt`, the verification fails.
   - If `stackingBoosterConflict` is true and PK 13/14 has `dose > 0` or `amount > 0` or missing status `⛔ GESPERRT: Stacking-Konflikt`, the verification fails.
