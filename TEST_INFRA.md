# E2E Test Infra: UKD App UI Master Class

## Test Philosophy
- Opaque-box, requirement-driven verification.
- Validates that UI components, tooltips, state flow, and experience lenses perform strictly to specifications.
- Preserves all 29/29 existing unit tests in `src/*.test.ts`.

## Feature Inventory & Test Coverage
| # | Feature | Source (Requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|---------------------|:----------------:|:-----------------:|:---------------------:|:-------------------:|
| F1 | Terminology Tooltips | R3 / .antigravitz term map | 5 | 5 | ✓ | ✓ |
| F2 | Environment Targets Panel | R1 / .antigravitz section map | 5 | 5 | ✓ | ✓ |
| F3 | Nutrient Mix Panel | R1 / .antigravitz poster | 5 | 5 | ✓ | ✓ |
| F4 | Run Config Setup Panel | R1 / .antigravitz decision flow | 5 | 5 | ✓ | ✓ |
| F5 | VPD/DLI Standalone Calculator | R1 / .antigravitz section map | 5 | 5 | ✓ | ✓ |
| F6 | Daily Operator Panel | R1 / .antigravitz v10 PDF | 5 | 5 | ✓ | ✓ |
| F7 | Context Help Glossary | R1, R3 / .antigravitz v10 PDF | 5 | 5 | ✓ | ✓ |
| F8 | App.tsx Navigation Routing | R2 / App.tsx shell | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Unit/Integration Test Runner: `vitest` (executing co-located tests and core domain tests).
- Static Verification: TypeScript compiler (`npx tsc --noEmit`).
- Build Verification: Vite production bundler (`npx vite build`).

## Real-World Application Scenarios (Tier 4)
1. Beginner Grower Workflow: Navigates with `guided` lens, views German tooltips for VPD/DLI, adjusts daily observation inputs, verifies automatic IndexedDB debounce saving.
2. Advanced Nutrient Batch Calculation: Opens 7-step mix operator, selects water profile, calculates dosage, checks fail-closed status chips (`AKTIV`/`GESPERRT`).
3. Master Class Climate Optimization: Adjusts temperature, humidity, and PPFD sliders, observes real-time Leaf-VPD calculation and target range indicators.
