# CSS Tokens, UI Design Guidelines, Accessibility & Test Suite Analysis

**Author**: Explorer 3 (CSS Tokens & Test Suite Explorer)  
**Date**: 2026-08-11  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\explorer_3\`  
**Target Project**: UKD Grow Masterplan 2026 (`c:\Users\badbu\Documents\grow`)

---

## Executive Summary

This report provides a detailed catalog of the design tokens, visual styling mechanisms, accessibility invariants, and unit testing infrastructure in the UKD Grow Masterplan 2026 codebase (`src/styles.css`, `package.json`, `vite.config.ts`, `tsconfig.app.json`, and existing test files).

Key findings include:

1. **CSS Token System**: `styles.css` features CSS variable layers (`@layer reset, tokens, base, components, responsive;`) supporting default Dark mode, explicit Light mode (`data-theme="light"`), High Contrast mode (`data-contrast="high"`), scalable font sizes (`data-text-scale`), and specialized domain tokens (v7 irrigation, equipment, incident, IPM, post-harvest, nav groups).
2. **2026 World Elite Styling & Glassmorphism**: Utilizes modern CSS capabilities including `color-mix(in srgb, ...)`, `backdrop-filter: blur(14px)`, custom `clip-path` geometry (polygon brand mark), linear gradients (`135deg`), glowing status indicators, and multi-lens interface elements.
3. **Accessibility Invariants**: Strict compliance with AGENTS.md rules—44px minimum touch targets, high contrast contrast-ratio fallbacks, mandatory 2px green focus rings, `@media (prefers-reduced-motion: reduce)` overrides, screen reader classes (`.sr-only`), skip links, and non-color-exclusive status indicators.
4. **Test Suite Inventory & Architecture**: Vitest 4.1.10 configured with `environment: "node"` and `include: ["src/**/*.test.ts"]`. Exactly **29/29 unit tests** pass across 4 test files (`domain.test.ts`: 10, `scientific-core.test.ts`: 3, `run-state.test.ts`: 13, `backup.test.ts`: 3).

---

## 1. Complete Catalog of CSS Tokens (`src/styles.css`)

### 1.1 Color & Surface Tokens

#### Default Dark Theme (`:root`)

| Token Name      | Hex / Value | Purpose / Usage                                            |
| --------------- | ----------- | ---------------------------------------------------------- |
| `--bg`          | `#07110f`   | Main application backdrop background                       |
| `--surface-0`   | `#0b1715`   | Sidebar & modal background base layer                      |
| `--surface-1`   | `#101e1b`   | Primary panel, card, topbar & console container background |
| `--surface-2`   | `#152521`   | Secondary nested container, tab & input background         |
| `--surface-3`   | `#1c2d29`   | Table header, tooltip & active selection background        |
| `--line`        | `#29403a`   | Standard container borders & dividers                      |
| `--line-strong` | `#3b5850`   | Emphasized borders, active bounds & kbd borders            |
| `--text`        | `#eef6f2`   | Primary high-contrast typography color                     |
| `--text-2`      | `#b6c7c1`   | Secondary text, label & description typography             |
| `--muted`       | `#82958e`   | Subtle captions, timestamps, icons & inactive labels       |

#### Accent & Semantic Color Palette

| Token Name | Base Hex  | Dim Hex (`-dim`) | Text/Foreground          | Semantic Usage                                                 |
| ---------- | --------- | ---------------- | ------------------------ | -------------------------------------------------------------- |
| `--green`  | `#67d6ae` | `#174d3f`        | `--on-green` (`#062018`) | Active operator state, optimal values, success, primary CTA    |
| `--blue`   | `#62a8ff` | `#163958`        | —                        | Light, VPD/DLI metrics, knowledge evidence, info banners       |
| `--amber`  | `#e5a44b` | `#4a3417`        | —                        | Climate metrics, measurement requirements, warnings, limits    |
| `--red`    | `#ef705c` | `#4f211b`        | —                        | Emergency stop rules, critical hazards, audit issues, danger   |
| `--purple` | `#b898ec` | `#34284b`        | —                        | Biostimulants, nutrient mix calculations, experimental modules |

#### Light Mode Theme (`:root[data-theme="light"]`)

| Token Name      | Value                             | Purpose                                          |
| --------------- | --------------------------------- | ------------------------------------------------ |
| `--bg`          | `#eef3f0`                         | Light main backdrop                              |
| `--surface-0`   | `#f8fbf9`                         | Light sidebar background                         |
| `--surface-1`   | `#ffffff`                         | Light card & panel background                    |
| `--surface-2`   | `#f2f6f4`                         | Light input & hover background                   |
| `--surface-3`   | `#e8efeb`                         | Light header & selection background              |
| `--line`        | `#d3dfd9`                         | Light border line                                |
| `--line-strong` | `#b9cbc2`                         | Light strong border line                         |
| `--text`        | `#14231f`                         | Light primary text                               |
| `--text-2`      | `#40564f`                         | Light secondary text                             |
| `--muted`       | `#566a63`                         | Light muted text                                 |
| `--green`       | `#006b4d`                         | Darker green for AA contrast on light background |
| `--green-dim`   | `#d8efe6`                         | Light green surface tint                         |
| `--on-green`    | `#ffffff`                         | Text on green CTA                                |
| `--shadow`      | `0 18px 40px rgb(33 56 49 / 12%)` | Soft light shadow                                |

#### High Contrast Theme (`:root[data-contrast="high"]`)

- **Dark High-Contrast**: Adjusts `--line` (`#78958c`), `--line-strong` (`#b1d1c7`), `--muted` (`#b8cbc5`), `--text-2` (`#d9e7e2`), `--green` (`#85f0c9`), `--blue` (`#8cc4ff`), `--amber` (`#ffd083`), `--red` (`#ff9484`).
- **Light High-Contrast**: Adjusts `--line` (`#516a62`), `--line-strong` (`#263d36`), `--muted` (`#30453e`), `--text-2` (`#243a33`), `--green` (`#00573e`), `--blue` (`#004f96`), `--amber` (`#673800`), `--red` (`#8c211a`).

---

### 1.2 Layout, Dimensions & Geometry Tokens

| Token         | Value                          | Responsive Adjustments                      | Description                            |
| ------------- | ------------------------------ | ------------------------------------------- | -------------------------------------- |
| `--sidebar`   | `260px`                        | `224px` @ ≤1180px, slide-in drawer @ ≤900px | Width of sidebar navigation            |
| `--topbar`    | `64px`                         | `56px` @ ≤680px                             | Height of sticky header topbar         |
| `--radius-sm` | `6px`                          | —                                           | Buttons, inputs, small cards, tooltips |
| `--radius`    | `10px`                         | —                                           | Modals, command palette, welcome card  |
| `--radius-lg` | `14px`                         | —                                           | Outer modal or container overlays      |
| `--shadow`    | `0 18px 50px rgb(0 0 0 / 24%)` | Light mode variant available                | Elevation shadow                       |

---

### 1.3 Typography Tokens

- **UI Font (`--font-ui`)**: `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Monospace Font (`--font-mono`)**: `"SFMono-Regular", Consolas, "Liberation Mono", monospace`
- **Font Size Hierarchy**:
  - `body`: 14px baseline (line-height: 1.5)
  - `data-text-scale="large"`: 16px body font size
  - `data-text-scale="xlarge"`: 18px body font size
  - Page Titles (`h1`): `clamp(28px, 3vw, 42px)`, line-height 1.05
  - Section Titles (`h2`): 18px - 21px
  - Panel Headers / Metric Labels: 10px - 12px uppercase monospace / sans-serif with `letter-spacing: 0.1em - 0.13em`
  - Metric Numbers (`strong`): `clamp(23px, 2vw, 32px)` in monospace font

---

### 1.4 Specialized v7 Domain Tokens

```css
/* v7: Irrigation & Dryback */
--irrigation-applied: #4fc3f7;
--irrigation-drain: #ff8a65;
--dryback-trend: #ab47bc;

/* v7: Equipment Status */
--equip-online: var(--green);
--equip-degraded: var(--warn);
--equip-offline: var(--danger);
--equip-unknown: var(--muted);

/* v7: Incident Severity */
--incident-low: var(--info);
--incident-medium: var(--warn);
--incident-high: var(--danger);
--incident-critical: #d50000;

/* v7: IPM */
--ipm-clear: var(--green);
--ipm-trace: #ffee58;
--ipm-moderate: var(--warn);
--ipm-severe: var(--danger);

/* v7: Post-Harvest */
--drying-target: #80cbc4;
--cure-target: #a5d6a7;
--aw-band: rgba(103, 214, 174, 0.15);

/* Navigation Group Colors */
--group-operator: var(--green);
--group-werkzeuge: var(--blue);
--group-bibliothek: var(--amber);
--group-evidenz: var(--purple);
--group-system: var(--muted);
```

---

### 1.5 2026 World Elite Visual Styling & Glassmorphism Patterns

1. **TopBar Glassmorphism**:
   ```css
   background: color-mix(in srgb, var(--surface-0) 94%, transparent);
   backdrop-filter: blur(14px);
   ```
2. **Octagonal Polygon Brand Mark**:
   ```css
   clip-path: polygon(
     20% 0,
     80% 0,
     100% 24%,
     100% 76%,
     80% 100%,
     20% 100%,
     0 76%,
     0 24%
   );
   ```
3. **Glowing Status Pulse Effect**:
   ```css
   box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 18%, transparent);
   ```
4. **Onboarding Welcome Card Gradient**:
   ```css
   background: linear-gradient(135deg, var(--surface-1), var(--surface-2));
   border-left: 4px solid var(--green);
   ```
5. **Interactive Lens Selector (`data-lens`)**:
   - `guided`: Emphasizes tooltips, inline explanations, and simplified UI hints.
   - `advanced`: Shows target/actual comparisons, detailed formulas, and technical charts.
   - `expert`: Full diagnostic telemetry, manual overrides, and raw data export options.

---

## 2. Accessibility & AGENTS.md Rules Compliance

### 2.1 AGENTS.md Invariants & Guidelines

| Requirement / Rule               | CSS / Code Implementation                                                                                                                                          | Compliance Status            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **Token Usage**                  | All colors, spacing, and radii MUST use existing CSS variables (`var(--green)`, `var(--surface-1)`, etc.)                                                          | Mandatory for all new panels |
| **No Color-Only Information**    | Color indicators are ALWAYS paired with text labels, icons, or status badges (e.g. `.status-dot`, `.action-status`, `.evidence-badge`)                             | Verified                     |
| **44px Touch Targets on Mobile** | Interactive elements (`.btn-dismiss`, `.page-context-toggle`, `.failure-banner button`, mobile bar buttons) have `min-height: 44px` or `44px` touch bounding boxes | Verified                     |
| **Visible Focus Rings**          | `:focus-visible { outline: 2px solid var(--green); outline-offset: 3px; }`                                                                                         | Verified                     |
| **Skip Link Keyboard Access**    | `.skip-link { position: fixed; top: -60px; }` -> `.skip-link:focus { top: 12px; }` targeting `#main-content`                                                       | Verified                     |
| **Reduced Motion Support**       | `@media (prefers-reduced-motion: reduce)` disables all animations and transitions (`animation: none !important; transition: none !important;`)                     | Verified                     |
| **Screen Reader Utilities**      | `.sr-only` utility class for invisible accessibility labels                                                                                                        | Verified                     |
| **Experience Lenses**            | Guided / Advanced / Expert change density and detail without altering data or formulas                                                                             | Verified                     |

---

## 3. Test Suite Architecture & Testing Guidelines

### 3.1 Vitest Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

### 3.2 Existing Test Suite Catalog (29 Tests)

| Test File Path                | Suite Name                      | Test Count  | Key Areas Covered                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain.test.ts`          | `canonical domain calculations` | **10**      | DLI formula, Leaf VPD calculation, DayPlan resolution, day clamping, workbook missing sheet error, numeric/text fallbacks, Excel date serials, nutrient mix scaling, volume clamping, row normalization                                                                                                         |
| `src/scientific-core.test.ts` | `scientific measurement trust`  | **3**       | Conflict tolerance in parallel measurements, stale & calibration-due statuses, device capability negotiation                                                                                                                                                                                                    |
| `src/run-state.test.ts`       | `versioned run state`           | **13**      | RunPackage creation (v4.0.0), import validation, observation persistence, baseline/critical alert derivation, checklist state, inventory balance, CSV export, active snapshot freezing, v1/v2 schema migration, task transitions, measurement superseding audit log, structured observations & expert overrides |
| `src/backup.test.ts`          | `verified backup and recovery`  | **3**       | SHA-256 backup envelope round-trip, tampered payload detection & rejection, raw v2 legacy backup import & migration                                                                                                                                                                                             |
| **TOTAL**                     |                                 | **29 / 29** | **All 29 tests pass synchronously**                                                                                                                                                                                                                                                                             |

### 3.3 How to Write New Component Unit Tests

When implementing new Master Class UI panels under `src/components/`:

1. **Helper / Calculation Logic Unit Tests (`.test.ts`)**:
   - Extract state management, calculations, input transformations, and validation logic into pure functions in helper or domain modules (or co-located `.ts` files).
   - Co-locate tests alongside code in `src/components/` (e.g. `src/components/MyPanel.test.ts` or `src/components/panel-helpers.test.ts`).
   - Vitest automatically picks up any test file matching `src/**/*.test.ts`.
2. **German Technical Terminology & Tooltips**:
   - Ensure all input state validators and technical labels have co-located string tables or helper functions that can be tested deterministically.
3. **Integration & E2E Validation**:
   - Playwright end-to-end tests (`tests/e2e`) run as part of `pnpm check`.
   - Accessibility gating is executed via `@axe-core/playwright` across all view states.

---

## Conclusion & Recommendations for Implementers

1. **Strict Token Re-use**: Use existing tokens in `src/styles.css` (`var(--surface-1)`, `var(--surface-2)`, `var(--green)`, `var(--blue)`, `var(--amber)`, `var(--red)`, `var(--purple)`). Do not define ad-hoc hex colors.
2. **Component File Structure**: Create individual interactive panels inside `src/components/` (e.g., `src/components/NutrientCalculatorPanel.tsx`, `src/components/VpdClimatePanel.tsx`, etc.).
3. **Accessibility**: Guarantee `min-height: 44px` on mobile interactive controls, incorporate inline tooltips (`.term-hint` / `.term-tooltip`) for German technical terms (VPD, DLI, EC, pH), and preserve keyboard focus visibility.
4. **Test Discipline**: Maintain 100% pass rate on `pnpm test` (29 existing tests + new unit tests for panel logic).
