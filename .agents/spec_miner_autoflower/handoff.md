# Handoff Report — Autoflower Cockpit Specification Mining
**Agent**: `spec_miner_autoflower`
**Recipient**: Parent Orchestrator (`f405ce39-450a-4cb1-bc3b-d8f617d532f0`)
**Timestamp**: 2026-08-21T02:03:00Z
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

1. **Reference HTML Source**:
   - `plan/Autoflower-Cockpit-v3.html` lines 240–330 define `const DATA = [...]` containing **61 cultivar entries** (50 Jungpflanzen + 11 Saatgut candidates).
   - Lines 331–333 define `const MAXY = 130; const N = {jungpflanze: 50, samen: 11}; const PROV_LABEL = {original:"Originalgenetik", whitelabel:"White Label", unklar:"Provenienz ungeklärt"};`.
   - Lines 334–348 define `const TAB_META` with tab titles, subtitles, empty state messaging, and equation notes.
   - Lines 11–20 define CSS theme tokens: `--bg: #0E1714`, `--surface: #16211E`, `--surface2: #1D2A26`, `--line: #26352F`, `--ink: #E8F1EB`, `--muted: #8DA69B`, `--faint: #5E7368`, `--bloom: #F2385A`, `--veg: #5B8CFF`, `--signal: #6FE3A8`, `--warn: #F2A93B`, `--alert: #FF6B6B`.

2. **Workbook Reference Snapshot**:
   - `public/data/evidence-guarded-workbook-v8.json` sheet `15_Strains` contains 6 core benchmark cultivars: Double Grape (Mephisto F7), Auto Night Queen (Dutch Passion), Auto Cinderella Jack (Dutch Passion), Sour Stomper (Mephisto F7), Banana Purple Punch Auto RF3 (Fast Buds), and 24 Carat (Mephisto F7).
   - `01_Run_Config` defines the default run parameters: `Canopy Fläche = 0.36 m²`, `LED max W = 140 W`, `Genetik = Double Grape Auto`.

3. **Existing Application Gap**:
   - `src/data/autoflower-cockpit.json` contains only 6 mocked records with minimal flat keys (`title`, `image`, `description`, `tags`, `type`, `provenienz`, `level`, `yield`).
   - `src/components/panels/AutoflowerCockpitPanel.tsx` renders a basic card grid that lacks the 2026 Master Class dark theme, yield uncertainty bars, drawer disclosure, multi-criteria facets, height sliders, and RunPackage state binding.

4. **Extracted Dataset Artifacts**:
   - Written to `.agents/spec_miner_autoflower/extracted_plant_data.json` (complete 61-entry JSON with all 44 fields verified).
   - Written to `.agents/spec_miner_autoflower/report.md` (comprehensive specification and reference tables).

---

## 2. Logic Chain

1. **Step 1 (Source Authoritativeness)**: `ORIGINAL_REQUEST.md` (lines 74–75) instructs the agent team to *"extract the plant data from the provided Autoflower-Cockpit v3 HTML structure"*. Inspection of `plan/Autoflower-Cockpit-v3.html` confirmed it contains the complete, canonical 61-strain dataset with 44 distinct agronomic, chemical, and sensory attributes per strain.
2. **Step 2 (Data Integrity Verification)**: Execution of `.agents/spec_miner_autoflower/extract.js` confirmed that all 61 entries parse successfully without syntax errors. The data comprises 50 `kind: "jungpflanze"` and 11 `kind: "samen"`.
3. **Step 3 (Field Completeness & Typing)**: Analysis across all 61 records demonstrated consistent schema adherence. Only 5 fields are nullable: `warn`, `indica`, `sativa`, `hmin`, `hmax`. All other 39 fields are non-null across all 61 records.
4. **Step 4 (Mathematical Soundness)**: The photobiology model equation $E_{gesamt} = 140\text{ W} \times 0.45\text{--}0.90\text{ g/W} \times q$ correctly bounds tent yield between 63 g and 126 g for $q=1.0$, scaling down to 35–70 g for lower efficiency lines ($q=0.55$).
5. **Step 5 (UI/UX Architecture Alignment)**: The UI structure in `Autoflower-Cockpit-v3.html` provides a ready blueprint for the React component rewrite, incorporating tab switching, multi-criteria facet filtering, fulltext search, proportional yield range bars ($MAXY = 130$), and a right-sliding detail drawer.

---

## 3. Caveats

1. **Photoperiodic Vegetative Scaling**: In the Saatgut tab, cultivars 1–3 are photoperiodic. Their yield and cycle time in practice depend on the vegetative cycle duration chosen by the grower, unlike autoflowers which flower automatically on a fixed biological clock.
2. **Medical Claims Disclaimer**: In accordance with UKD evidence guardrails and AGENTS.md invariants, medical indication profiles (`med`, `med_src`) describe chemotype associations, not clinical proof for strain names.
3. **Legal Status of Rooted Cuttings**: As noted in the footer of the reference HTML, rooted cuttings in Germany are subject to regulatory boundaries (VG Köln 1 L 1051/26), whereas certified seeds are legally unencumbered under KCanG.

---

## 4. Conclusion

The specification mining and dataset extraction for the Autoflower Cockpit integration is 100% complete and validated. The full 61-strain masterclass dataset, 44-attribute taxonomy, photobiology formulas, UI design tokens, and TypeScript contracts are fully documented in `.agents/spec_miner_autoflower/report.md` and dumped to `.agents/spec_miner_autoflower/extracted_plant_data.json`.

The downstream implementation agents can immediately:
1. Replace `src/data/autoflower-cockpit.json` with `.agents/spec_miner_autoflower/extracted_plant_data.json`.
2. Add `AutoflowerCockpitEntry` and filter types into `src/types.ts`.
3. Upgrade `src/components/panels/AutoflowerCockpitPanel.tsx` to the Master Class 2026 UI.
4. Connect cultivar selection to `RunPackage` / `PlantIdentity`.

---

## 5. Verification Method

To independently verify the extracted dataset and schema:
```powershell
# 1. Verify JSON validity and record counts
node -e "const d = JSON.parse(require('fs').readFileSync('.agents/spec_miner_autoflower/extracted_plant_data.json')); console.log('Count:', d.length, 'Jungpflanzen:', d.filter(x => x.kind === 'jungpflanze').length, 'Saatgut:', d.filter(x => x.kind === 'samen').length);"

# 2. Run existing unit tests to confirm repository health
npm run test
```

### Files to Inspect:
- `.agents/spec_miner_autoflower/report.md` (Full specification document)
- `.agents/spec_miner_autoflower/extracted_plant_data.json` (Full 61-cultivar JSON dataset)
- `plan/Autoflower-Cockpit-v3.html` (Authoritative source HTML)
