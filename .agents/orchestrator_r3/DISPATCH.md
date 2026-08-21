## 2026-08-21T01:57:39Z

Enhance the UKD Grow Masterplan Setup View by making parameters visible and editable, fully integrating the Autoflower Cockpit plant data as a browsing interface, adding a global Live/Simulation toggle, and enabling retroactive plant milestone tracking (potting, emergence) to dynamically adjust the plan.

Working directory: `c:\Users\badbu\Documents\grow`
Integrity mode: development

**Reference Data:** Extract the plant data from the provided Autoflower-Cockpit v3 HTML structure (see `UKD_Grow_Masterplan_2026_Interactive_Masterclass.html`, sources, or any other existing project files) to populate the integration.

## Requirements:
### R1. Setup Parameters Visibility & Editing
The Setup view must clearly display all currently configured setup parameters. These parameters must be directly editable by the user within the Setup view.

### R2. Autoflower Cockpit Integration
Integrate the provided Autoflower Cockpit plant data into the app. Create a full interactive browsing interface (matching the 2026 aesthetics) that allows users to select plants for their setup. The selected plants must be globally available across relevant panels.

### R3. Global Live vs Simulation Mode
Implement a globally visible toggle/button indicating whether the system is in "Live" or "Simulation" mode. The user must be able to switch between these modes, and the application state should reflect this choice.

### R4. Retroactive Plant Milestones
In the Setup view, users must be able to retroactively enter the dates when a plant was potted and when it emerged through the soil (even after going "Live"). The global plan must dynamically update based on these entered dates.

### R5. Missing UKD Setup Elements
Analyze the current UKD setup architecture and identify what fundamental elements are missing. Implement these missing elements into the Setup view to ensure a complete grow plan.

## Acceptance Criteria:
- Run `npm run test` (or `pnpm test`) to verify that no existing domain logic is broken by the state changes.
- UI tests or visual verification must confirm that the new interactive Cockpit interface renders correctly and selected plants appear in the global state.
- The global Live/Simulation toggle must persist state and be visible across the app.
- Full typecheck (`pnpm typecheck` / `npx tsc --noEmit`) and build (`pnpm build`) must succeed cleanly.
