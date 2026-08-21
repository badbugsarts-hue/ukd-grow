## 2026-08-21T01:58:09Z
You are an Explorer agent investigating State Management, Live/Simulation Mode, and Retroactive Plant Milestones.
Your Working Directory is: c:\Users\badbu\Documents\grow\.agents\explorer_state_domain
Project Root: c:\Users\badbu\Documents\grow

Read:
- c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md
- c:\Users\badbu\Documents\grow\AGENTS.md
- src/run-state.ts
- src/run-storage.ts
- src/domain.ts
- src/scientific-core.ts
- src/App.tsx

Your Task:
1. Examine how RunPackage, Domain Events, State Machines, and Run Storage currently work.
2. Investigate how a global "Live" vs "Simulation" mode should be modeled in state, persisted (IndexedDB / storage), and exposed across panels/views (e.g. status bar / global header toggle).
3. Investigate how retroactive plant milestone tracking (potting date, emergence date / Day Zero) should be recorded in state (e.g. within PlantIdentity / RunState / events) and how modifying these dates dynamically recalculates current grow day, phase progression, and operational daily targets in `domain.ts` and UI.
4. Check invariants from AGENTS.md (e.g., active snapshots append-only audit, measurement trust, no breaking changes to existing 29 domain tests).
5. Write your analysis and implementation strategy to c:\Users\badbu\Documents\grow\.agents\explorer_state_domain\report.md and create handoff.md.
6. When done, send a message to your parent orchestrator.
