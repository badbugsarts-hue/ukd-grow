# Master Technical Specification & Plant Dataset Mining Report
**Autoflower Cockpit Integration — UKD Grow Masterplan 2026**
**Author**: Spec Miner Subagent (`spec_miner_autoflower`)
**Date**: 2026-08-21
**Reference Sources**: 
- `plan/Autoflower-Cockpit-v3.html` (Authoritative 61-Cultivar Dataset & UI/UX Masterclass)
- `public/data/evidence-guarded-workbook-v8.json` (Sheet `15_Strains` & `01_Run_Config`)
- `UKD_Grow_Masterplan_2026_Interactive_Masterclass.html` (App Shell, Workbook Engine & Design Tokens)
- `src/types.ts`, `src/run-state.ts`, `src/components/modals/PlantIdentityModal.tsx`

---

## 1. Executive Summary & Source Provenance Architecture

The investigation across the codebase, reference HTML artifacts, and workbook snapshots revealed two distinct operational tiers of plant data:

1. **The Comprehensive 61-Cultivar Masterclass Dataset (`plan/Autoflower-Cockpit-v3.html`)**:
   - **50 Jungpflanzen (Top 50)**: Clones/seedlings evaluated under the strict indoor 60×60 cm (0.36 m²), 140 W LED envelope. Evaluated across 44 granular scientific and sensory dimensions.
   - **11 Saatgut-Kandidaten (Top 11)**: Curated original seed lines (8 Autoflowers, 3 Photoperiodic benchmarks) with reproduction guarantees, phenotype uniformity, and lab data trust.
   - **Provenance Breakdown**:
     - `original`: Breeder-verified original genetics (e.g. Sensi Seeds, Fast Buds, Mephisto Genetics, Humboldt Seed Company, Dutch Passion, Sweet Seeds, Serious Seeds, Royal Queen Seeds).
     - `whitelabel`: Reseller/bulk seedlots without transparent breeding documentation (e.g. BubatzBuddy, WEEZEL, BlackLabel Seeds).
     - `unklar`: Conflicting or contested provenance listings (e.g. Super Boof XL, Dr. Zaius OG).

2. **The Core Benchmark Cultivars (`public/data/evidence-guarded-workbook-v8.json` — Sheet `15_Strains`)**:
   - 6 curated anchor cultivars: Double Grape (Mephisto F7), Auto Night Queen (Dutch Passion), Auto Cinderella Jack (Dutch Passion), Sour Stomper (Mephisto F7), Banana Purple Punch Auto RF3 (Fast Buds), and 24 Carat (Mephisto F7).

3. **Current Codebase Gap Analysis**:
   - `src/data/autoflower-cockpit.json` contains only 6 mocked, flat entries with 8 basic string properties.
   - `src/components/panels/AutoflowerCockpitPanel.tsx` is currently a rudimentary card grid lacking the 2026 Master Class dark theme, yield uncertainty bands, drawer disclosure, multi-criteria facets, height sliders, and RunPackage state binding.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Data Architecture | Dual-Tab Cultivar Scope (`kind`) | Toggles between Jungpflanzen (50) and Saatgut (11) with dedicated KPI banners and metadata. | Tab toggle (`jungpflanze` \| `samen`) | Filtered dataset scope, tab-specific header text, dynamic facet reset. | Falls back to `jungpflanze` if unselected. | `plan/Autoflower-Cockpit-v3.html:175-178` |
| 2 | Photobiology Model | Scientific Yield Uncertainty Band | Calculates tent yield based on $E = 140\text{ W} \times 0.45\text{--}0.90\text{ g/W} \times q$. | LED Watt (140W), efficiency factor $q$ (0.55..1.00). | `ertrag_lo` (g), `ertrag_hi` (g), relative bar positioning ($MAXY=130$). | Clamped to tent photobiology limits (63–126 g basis). | `plan/Autoflower-Cockpit-v3.html:160-163` |
| 3 | UI Visualization | Proportional Yield Range Bars | Visual range bar indicating yield uncertainty within 0–130 g axis. | `ertrag_lo`, `ertrag_hi`, `MAXY = 130`. | CSS left offset ($l\%$) and width ($w\%$), min-width 1.4%. | Invisible on mobile viewport ($\le 900\text{px}$). | `plan/Autoflower-Cockpit-v3.html:92-102` |
| 4 | Data Governance | Provenance Classification & Tagging | Visual dot indicator and badge distinguishing Original, White Label, and Unclear lineages. | `prov` ("original" \| "whitelabel" \| "unklar") | Colored dot/badge: Signal Green (`#6FE3A8`), Warn Amber (`#F2A93B`), Alert Red (`#FF6B6B`). | Throws warning box in detail drawer when `warn` is present. | `plan/Autoflower-Cockpit-v3.html:89-91, 118-127` |
| 5 | Search & Filtering | Multi-Field Fulltext Search | Live text search query across 9 attributes simultaneously. | Search string $q$ | Filtered subset matching `name`, `shop`, `breeder`, `cross`, `terpene`, `geschmack`, `geruch`, `wirkung`, `gen`. | Returns empty state when query matches zero items. | `plan/Autoflower-Cockpit-v3.html:361-363` |
| 6 | Filtering Matrix | Multi-Facet Chip Selectors | Toggleable filter chips for Provenance, Experience Level, Mold Resistance, and Cultivar Type. | Set of selected chip values per facet | Active visual state (`aria-pressed`), filtered item list. | Multi-select OR within facet, AND across facets. | `plan/Autoflower-Cockpit-v3.html:67-71, 335-348` |
| 7 | Layout & Dimension | Tent Height Guarding Slider | Range slider filtering cultivars by maximum mature canopy height. | Range value 70..200 cm (step 5 cm) | Filters items where `hmax <= selected_height` (or shows all if 200+ cm). | Items with `hmax: null` are excluded when slider $< 200\text{ cm}$. | `plan/Autoflower-Cockpit-v3.html:203-206, 366` |
| 8 | Sourcing Filter | Dynamic Source / Shop Dropdown | Dropdown filtering cultivars by vendor, breeder, or nursery. | Selected vendor string | Displays only items where `shop === selected_shop`. | Reset to "alle" (all vendors). | `plan/Autoflower-Cockpit-v3.html:201-202, 350-353` |
| 9 | Ranking & Sorting | Multi-Strategy Sorter | Sorts list by Master Class Score, Yield Potential, Plant Height, or Alphabetical Name. | Sort mode (`rank` \| `yield` \| `height` \| `name`) | Sorted list; `yield` sorts by $(lo + hi)$ descending, `height` by `hmax` ascending. | Null height treated as 999 cm (pushed to bottom). | `plan/Autoflower-Cockpit-v3.html:208-215, 367-372` |
| 10 | Progressive Disclosure | Sliding Detail Drawer Modal | Right-side sliding panel displaying complete 44-attribute profile, badges, warnings, and formulas. | Cultivar ID selection via row click | Sliding modal (`translateX(0)`), dark scrim overlay (`#060B09`), full technical definition list. | Dismissable via close button, scrim click, or `Escape` key. | `plan/Autoflower-Cockpit-v3.html:111-139, 396-435` |
| 11 | Sensory & Chemistry | Cannabinoid & Terpene Profiling | Granular qualitative and quantitative breakdown of THC, CBD, CBN, minor cannabinoids, terpenes, and esters. | `thc`, `cbd`, `cbn`, `minor`, `terpene`, `terpene_src`, `ester` | 2-column definition grid in drawer + source tags. | Marks unverified breeder claims with caution notes. | `plan/Autoflower-Cockpit-v3.html:241-330` |
| 12 | Botanical Modeling | Agronomic Risk Models [C] | Calculated model values for Nutrient Feed Tolerance, Mold Resistance, and Skill Level. | `feed`, `feed_note`, `mold`, `mold_note`, `level`, `level_note` | Model badge, highlighted inline recommendations (e.g. HESI EC targets, RH late-bloom drop). | Labeled with `[C] Modell` to distinguish from empirical lab measurements. | `plan/Autoflower-Cockpit-v3.html:230-234, 423-426` |
| 13 | Legal & Compliance | Legal Footnotes & Guardrails | Disclaimers regarding rooted cuttings (VG Köln 1 L 1051/26), seed legality, and non-prescriptive data. | Tab context (`jungpflanze` vs. `samen`) | Persistent footer disclaimers in UI. | Enforces strict separation between private KCanG cultivation and MedCanG. | `plan/Autoflower-Cockpit-v3.html:230-235` |
| 14 | Integration Contract | Plant Identity & Run State Bridge | Selection bridge to inject chosen cultivar into `PlantIdentity` and `RunPackage` active run. | Selected cultivar record | Updates `run.config.genetics`, `primaryPlant.identity`, `expectedYieldGrams`, `targetCycleDays`. | Must maintain immutability and record audit event. | `src/run-state.ts`, `src/types.ts` |

---

## 2. Edge Cases & Empirical Observations

| # | Feature | Input / Condition | Observed Behavior | Handling / Recommendation |
|---|---------|-------------------|-------------------|---------------------------|
| 1 | Genotype Percentage | White label lines with missing Ruderalis or unknown lineage (e.g. Watermelon Auto sum = 95%, Jealousy Auto sum = 95%, or Blueberry Clones). | `indica` and `sativa` fields are `null`; `gen` field provides descriptive text with explicit notice of unlisted percentage. | UI must gracefully handle `null` numeric ratios and display the textual `gen` breakdown. |
| 2 | Canopy Height Missing | Clones from unverified seedlots (Ranks 31, 32, 33, 34, 35, 39). | `hmin: null`, `hmax: null`, `hoehe: "Wahrscheinlich kompakt bis mittel..."`. | When height slider $< 200\text{ cm}$, these items are filtered out. Sorting by `height` treats `null` as `999` (end of list). Drawer displays "Höhe: unbekannt". |
| 3 | Missing Lab THC Values | European clone shop products without public certificates of analysis (COA) (e.g. Mighty Dwarf Auto, Sticky Orange XXL, Runtz Auto). | `thc: "Kein belastbarer öffentlicher THC-/CBD-Wert auf der Pflanzenproduktseite."`, `med` marks this as a dosage planning barrier. | Prevent UI from crashing on string-based THC fields. Display medical warning tag that Chemotype I potency is unquantified. |
| 4 | Contested Breeder Provenance | Sorte Rank 21 "Super Boof XL Autoflowering". | `breeder: "STRITTIG: Fast Buds vs. Sweet Seeds"`, `prov: "unklar"`. | Display Red Alert badge (`prov: "unklar"`) and render `warn` box explaining the lineage discrepancy. |
| 5 | Photoperiodic vs Autoflower Scaling | Saatgut Candidates Ranks 1–3 (Blueberry Muffin, Hindu Kush, Bubble Gum). | `typ: "Photoperiodisch"`, `zeit` includes vegetative duration dependency ($3\text{--}4\text{ w Veg} + 7\text{--}9\text{ w Blüte}$). | Yield formula note clarifies: "Bei photoperiodischen Sorten skaliert der reale Ertrag zusätzlich mit der gewählten Vegetationsdauer." |
| 6 | Zero Search Results | Any filter combination eliminating all 50 (or 11) entries (e.g. Height $< 70\text{ cm}$ with White Label only). | Render empty state box: `Keine Treffer` with actionable hint: *"Die Filterkombination schließt alle 50 Angebote aus. Höhengrenze anheben oder Provenienzfilter lösen."* | Provide one-click "Filter zurücksetzen" button restoring default state (`h=200`, empty filters). |
| 7 | Viewport Resizing (Mobile $\le 900\text{px}$) | Narrow mobile screen. | Sidebar unpins and stacks below/above; 4-column axis collapses to 3-column (`28px 1fr 74px`); `.band` (range bar) is hidden (`display: none`). | Ensure essential text (`name`, `shop`, `breeder`, `score`, `level`) remains fully legible and touch targets meet 44 px minimum. |

---

## 3. Complete Plant & Strain Attribute Catalog (44 Attributes)

Every entry in the authoritative masterclass dataset possesses the following 44 attributes:

| Field Name | Type | German Label | Description & Allowed Values / Unit | Nullable? | Example Value |
|---|---|---|---|---|---|
| `rank` | `number` | Rang | Position within ranking list (1..50 for Jungpflanzen, 1..11 for Saatgut). | No | `1` |
| `name` | `string` | Sortenname | Commercial / genetic strain designation. | No | `"Mighty Dwarf Automatic"` |
| `shop` | `string` | Bezugsquelle / Shop | Distribution vendor or nursery. | No | `"Sensi Seeds direkt / Bushplanet"` |
| `score` | `number` | Master Class Score | Composite evaluation score (0..100) based on fit, data trust, and vigor. | No | `92` |
| `id` | `string` | Slug ID | Unique kebab-case identifier. | No | `"1-mighty-dwarf-automatic"` |
| `breeder` | `string` | Züchter | Originating seedbank or breeder house. | No | `"Sensi Seeds"` |
| `prov` | `string` | Provenienz | Lineage verification status: `"original"` \| `"whitelabel"` \| `"unklar"`. | No | `"original"` |
| `warn` | `string \| null` | Warnung | Disambiguation / lineage risk warning. | Yes | `"Name 'Blueberry' existiert bei DJ Short..."` |
| `form` | `string` | Produktform & Status | Delivery plug format, physical age, stock snapshot. | No | `"Samenpflanze im Eazy Block; 2,5-3,5 Wochen"` |
| `gen` | `string` | Genetik | Textual breakdown of Indica/Sativa/Ruderalis lineage. | No | `"65 % Indica / 35 % Sativa"` |
| `indica` | `number \| null` | Indica-Anteil | Percentage of Indica genetics (0..100). | Yes | `65` |
| `sativa` | `number \| null` | Sativa-Anteil | Percentage of Sativa genetics (0..100). | Yes | `35` |
| `cross` | `string` | Kreuzung | Pedigree / parental cross lineage. | No | `"Purple Pickle Automatic x Sunset Peach"` |
| `thc` | `string` | THC-Gehalt | Cannabinoid potency declaration with evidence context. | No | `"Offizieller Growbericht ca. 19,8 % THC"` |
| `cbd` | `string` | CBD-Gehalt | Cannabidiol percentage or chemotype classification. | No | `"<1 % (Breederangabe)"` |
| `cbn` | `string` | CBN-Gehalt | Cannabinol oxidation profile and aging remarks. | No | `"Frisch <0,1 %; bei Curing sedierend"` |
| `minor` | `string` | Minor Cannabinoids | Trace cannabinoids (CBG, CBC, THCV) & secondary pigments (Anthocyanins). | No | `"Anthocyane (Purpurfärbung); CBG-Spuren"` |
| `ester` | `string` | Ester & Aromaklassen | Volatile organic aroma compounds (esters, thiols/VSC, pyrazines). | No | `"Bratapfel-/Pfirsichnoten (Ethylhexanoat)"` |
| `wirkung` | `string` | Wirkung | Psychoactive and physiological effect profile. | No | `"Ausgewogen: zunächst erhebend, danach beruhigend"` |
| `geschmack` | `string` | Geschmack | Palate flavor profile. | No | `"Bratapfel, Pfirsich, Gebäck, Kräuter, Gas"` |
| `geruch` | `string` | Geruch im Zelt | Olfactory profile during bloom & carbon filter load requirement. | No | `"Warmes Backobst; Filterbedarf mittel"` |
| `terpene_src` | `string` | Terpen-Quelllage | Evidence origin of terpene profile (Lab COA vs. Derived vs. Untested). | No | `"LAB/Linie: Myrcen, Caryophyllen genannt"` |
| `terpene` | `string` | Terpenprofil | Dominant mono- and sesquiterpenes. | No | `"ABL: beta-Caryophyllen, Limonen, Myrcen"` |
| `reviews` | `string` | Nutzerbewertungen | Community & buyer rating sample size and feedback. | No | `"4,9/5 aus 463 Breeder-Plattformbewertungen"` |
| `med` | `string` | Medizinische Einordnung | Clinical Chemotype, indication profile & dosage considerations. | No | `"Chemotyp I mit ~19,8 % THC; Abendprofil"` |
| `med_src` | `string` | Med-Basisbewertung | Indication evidence base and caution notes. | No | `"Subjektiv für Stressabbau; keine klinische Sortenevidenz"` |
| `feed` | `string` | Nährstofftoleranz | Categorical nutrient feeding appetite: `"gering"` \| `"gering-mittel"` \| `"mittel"` \| `"mittel-hoch"` \| `"vorsichtig – unbekannt"`. | No | `"gering-mittel"` |
| `feed_note` | `string` | Dünge-Hinweis | Actionable dosing guidelines (e.g. HESI EC target, CalMag schedule). | No | `"Hesi-Dosis halbieren, EC-Ziel Blüte 1,3–1,5"` |
| `mold` | `string` | Schimmelresistenz | Mold resistance rating: `"gering"` \| `"gering – erhöhtes Risiko"` \| `"gering-mittel"` \| `"mittel"` \| `"mittel-gut"` \| `"gut"` \| `"sehr gut"` \| `"UNBEKANNT"`. | No | `"mittel"` |
| `mold_note` | `string` | Schimmel-Hinweis | Botanical inflorescence density & humidity (RH) management rules. | No | `"rF > 55 % in Woche 6+ erhöht Risiko; Entlauben"` |
| `level` | `string` | Erfahrungsniveau | Target grower skill tier: `"Anfänger"` \| `"Fortgeschritten"` \| `"Profi"`. | No | `"Anfänger"` |
| `level_note` | `string` | Niveau-Begründung | Agronomic difficulty rationale (stretch, LST tolerance, cycle speed). | No | `"Dokumentierte Genetik, kompakter Wuchs, kalkulierbar"` |
| `zeit` | `string` | Dauer & Restzeit | Flowering days, total seed-to-harvest cycle, remaining clone weeks. | No | `"Blüte 55-65 Tage; Rest ab Erhalt 8-10 Wochen"` |
| `hoehe` | `string` | Höhenprofil | Textual height expectations across environments. | No | `"Indoor ca. 25-80 cm"` |
| `hmin` | `number \| null` | Min. Höhe (cm) | Lower boundary mature height in cm. | Yes | `25` |
| `hmax` | `number \| null` | Max. Höhe (cm) | Upper boundary mature height in cm. | Yes | `80` |
| `ertrag_lo` | `number` | Min. Ertrag (g) | Lower boundary dry yield in 60×60 cm tent ($140\text{ W} \times 0.45 \times q$). | No | `60` |
| `ertrag_hi` | `number` | Max. Ertrag (g) | Upper boundary dry yield in 60×60 cm tent ($140\text{ W} \times 0.90 \times q$). | No | `120` |
| `ertrag_src` | `string` | Ertragsherleitung | Breeder claim vs. tent surface scaling ($0.36\text{ m}^2$) vs. photobiology. | No | `"Breederclaim 250-325 g/m² -> Setup ca. 45-80 g"` |
| `urteil` | `string` | Projekturteil | UKD Masterplan final verdict and training instructions. | No | `"Sehr guter 60x60-Fit. 1 Pflanze in 11-15 l; sanftes LST"` |
| `evidenz` | `string` | Datenvertrauen | UKD evidence confidence rating (A, B, C, D). | No | `"A-/B: transparente Breederdaten, THC fehlt"` |
| `q` | `number` | Effizienzfaktor $q$ | Canopy light-use & genetic conversion efficiency coefficient (0.55..1.00). | No | `0.95` |
| `kind` | `string` | Kategorie | Sourcing type: `"jungpflanze"` \| `"samen"`. | No | `"jungpflanze"` |
| `typ` | `string` | Typ | Photoperiodic behavior: `"Autoflower"` \| `"Photoperiodisch"` \| `"Fast Version"`. | No | `"Autoflower"` |

---

## 4. Full Strain Dataset Reference

### 4.1. Saatgut Top 11 (Chapter 21 Reference Seeds)

| # | ID | Name | Breeder | Bezugsquelle | Typ | Prov | Score | Genetik | Yield (g) | Height (cm) | Level | Mold | Feed | THC / Chemotyp | Dominante Terpene & Aromatik |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `samen-1-blueberry-muffin` | Blueberry Muffin | Humboldt Seed Company | Humboldt Seed Company (Direktbezug EU) | Photoperiodisch | original | 96 | Indica-dominant (F9) | 65–125 (q=1.0) | 60–80 | Anfänger | gut | mittel-hoch | 20–28 % THC | Blaubeere, Muffin, Gebäck, Kamille, brauner Zucker |
| 2 | `samen-2-hindu-kush` | Hindu Kush | Sensi Seeds | Sensi Seeds (Direktbezug) | Photoperiodisch | original | 87 | 100% Indica-Landrasse | 55–115 (q=0.9) | 60–90 | Anfänger | gut | gering-mittel | Moderates THC | Sandelholz, Weihrauch, Erde, Gewürznelke |
| 3 | `samen-3-bubble-gum` | Bubble Gum | Serious Seeds | Serious Seeds (Direktbezug) | Photoperiodisch | original | 83 | IBL Hybrid | 55–105 (q=0.85) | 80–130 | Fortgeschritten | mittel | gering-mittel | Moderate Potenz | Süßer Kaugummi, rote Beeren, Erdbeere |
| 4 | `samen-4-double-grape` | Double Grape | Mephisto Genetics | Mephisto (DE/EU MischSeeds) | Autoflower | original | 94 | 60% Ind / 40% Sat (F7) | 65–125 (q=1.0) | 55–80 | Anfänger | mittel-gut | mittel-hoch | Bis 31,8 % THC | Süße Traube, Wein, Gas, Kerosin, saure Beere |
| 5 | `samen-5-sour-stomper` | Sour Stomper | Mephisto Genetics | Mephisto (DE/EU MischSeeds) | Autoflower | original | 86 | 50% Ind / 50% Sat (F7) | 55–105 (q=0.85) | 60–100 | Fortgeschritten | mittel | mittel-hoch | Hohe Potenz | Trauben-Soda, Kiefer, süß-säuerlich, Moschus |
| 6 | `samen-6-critical-kush-auto` | Critical Kush Auto | Fast Buds | Fast Buds (2fast4buds.com) | Autoflower | original | 89 | 90% Ind / 10% Sat | 60–120 (q=0.95) | 60–90 | Anfänger | mittel-gut | gering-mittel | 16–20 % THC | Süße Zitrusfrüchte, Kiefer, Kush, Erde |
| 7 | `samen-7-royal-kush-automatic` | Royal Kush Automatic | Royal Queen Seeds | RQS (EU-Direktversand) | Autoflower | original | 78 | Indica-dominant | 55–105 (q=0.85) | 60–90 | Fortgeschritten | gut | gering-mittel | 13–16 % THC | Würzig-erdig, Holz, Kiefer, sanfte Süße |
| 8 | `samen-8-royal-critical-automatic` | Royal Critical Automatic | Royal Queen Seeds | RQS (EU-Direktversand) | Autoflower | original | 84 | 50% Ind / 15% Sat / 35% Rud | 55–115 (q=0.9) | 55–80 | Anfänger | gut | gering | 14 % THC | Süße Bonbons, Pfeffer, Kräuter, Skunk |
| 9 | `samen-9-auto-night-queen` | Auto Night Queen | Dutch Passion | Dutch Passion (DE-Direkt) | Autoflower | original | 79 | Indica-dominant | 50–100 (q=0.8) | 50–100 | Fortgeschritten | gering | mittel | 15–20 % THC | Afghani-Hasch, Erde, Holz, süße Würze |
| 10 | `samen-10-auto-cinderella-jack` | Auto Cinderella Jack | Dutch Passion | Dutch Passion (DE-Direkt) | Autoflower | original | 76 | Hybrid, sativabetont | 45–95 (q=0.75) | 90–140 | Fortgeschritten | mittel | mittel-hoch | Bis ~26 % THC | Fruchtig-zitrisch, Pinie, Kräuter, Haze |
| 11 | `samen-11-banana-purple-punch-auto-rf3` | Banana Purple Punch Auto RF3 | Fast Buds | Fast Buds (2fast4buds.com) | Autoflower | original | 74 | Indica-dominant (RF3) | 45–95 (q=0.75) | 80–120 | Profi | gering | mittel-hoch | Bis 30,4 % THC | Reife Banane, Beeren, Fruchtgummi, Erde |

---

### 4.2. Jungpflanzen Top 50 (Section 20.4 Clones & Seedlings)

| # | ID | Name | Breeder | Shop | Prov | Score | Genetik | Yield (g) | Height (cm) | Level | Mold | Feed | THC / Chemotyp | Dominante Terpene & Aromatik |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `1-mighty-dwarf-automatic` | Mighty Dwarf Automatic | Sensi Seeds | Sensi Seeds / Bushplanet | original | 92 | 65% Ind / 35% Sat | 60–120 (q=0.95) | 25–80 | Anfänger | mittel | gering-mittel | Chemotyp I (unquantifiziert) | Bratapfel, Pfirsich, Gebäck, Kräuter, Hasch |
| 2 | `2-blueberry-candiez-automatic` | Blueberry Candiez Automatic | Sensi Seeds | Sensi Seeds / Bushplanet | original | 90 | 60% Ind / 40% Sat | 65–125 (q=1.0) | 100–125 | Anfänger | mittel | mittel-hoch | 19,8 % THC | Blaubeere, Bonbon, Skunk, Gewürz, Erde |
| 3 | `3-super-skunk-automatic` | Super Skunk Automatic | Sensi Seeds | Sensi Seeds / Bushplanet | original | 89 | 80% Ind / 20% Sat | 60–120 (q=0.95) | 70–100 | Anfänger | gering – erhöhtes Risiko | gering-mittel | 22,6 % THC | Klassisch Skunk, Erde, süße Würze, Hasch |
| 4 | `4-purple-skunk-automatic` | Purple Skunk Automatic | Sensi Seeds | Sensi Seeds / Bushplanet | original | 88 | 75% Ind / 25% Sat | 65–125 (q=1.0) | 80–120 | Anfänger | gering – erhöhtes Risiko | mittel-hoch | 18,3 % THC | Süß, skunkig, erdig, pfeffrig |
| 5 | `5-blueberry-autoflower` | Blueberry Autoflower | UNBEKANNT (Seedlot) | BubatzBuddy | whitelabel | 87 | 80% Ind / 20% Sat | 60–120 (q=0.95) | 70–100 | Fortgeschritten | gering – erhöhtes Risiko | vorsichtig – unbekannt | Bis 21 % THC | Blaubeere, süße Beeren, Erde, Wald |
| 6 | `6-watermelon-autoflower` | Watermelon Autoflower | UNBEKANNT (Seedlot) | BubatzBuddy | whitelabel | 86 | 75% Ind / 20% Sat | 60–120 (q=0.95) | 70–105 | Fortgeschritten | gering – erhöhtes Risiko | vorsichtig – unbekannt | 20 % THC | Wassermelone, süße Frucht, Beere |
| 7 | `7-orange-zkittlez-autoflower` | Orange Zkittlez Autoflower | UNBEKANNT (Seedlot) | BubatzBuddy | whitelabel | 85 | 50% Ind / 50% Sat | 65–125 (q=1.0) | 80–120 | Fortgeschritten | mittel-gut | mittel-hoch | Bis 26 % THC | Orange, Zitrus, Tropenfrüchte, Bonbons |
| 8 | `8-sticky-orange-xxl-automatic` | Sticky Orange XXL Automatic | Sensi Seeds | Sensi Seeds / Bushplanet | original | 84 | 80% Ind / 20% Sat | 65–125 (q=1.0) | 70–100 | Anfänger | gering – erhöhtes Risiko | mittel-hoch | Chemotyp I (sedierend) | Orangenschale, Erde, Kakao, Hasch |
| 9 | `9-gorilla-cookies-autoflowering` | Gorilla Cookies Auto | Fast Buds | Bushplanet / Fast Buds | original | 83 | 55% Ind / 45% Sat | 55–115 (q=0.9) | 60–150 | Profi | mittel-gut | mittel-hoch | Bis 28,5 % THC | Keksteig, Erde, Kush, Minze, Gas |
| 10 | `10-banana-kush-cake-automatic` | Banana Kush Cake Automatic | Sensi Seeds | Sensi Seeds / Bushplanet | original | 82 | 75% Ind / 25% Sat | 65–125 (q=1.0) | 75–100 | Anfänger | gering – erhöhtes Risiko | gering-mittel | 24,97 % THC | Banane, Zitrus, süße Würze, Kuchen |
| 11 | `11-purple-lemonade-autoflowering` | Purple Lemonade Auto | Fast Buds | Bushplanet / Fast Buds | original | 81 | 40% Ind / 60% Sat | 60–120 (q=0.95) | 80–130 | Profi | gut | mittel-hoch | Bis 25,5 % THC | Zitronen-Limonade, süß-sauer, Beeren |
| 12 | `12-jealousy-autoflower` | Jealousy Autoflower | UNBEKANNT (Seedlot) | BubatzBuddy | whitelabel | 80 | 50% Ind / 45% Sat | 55–115 (q=0.9) | 70–110 | Fortgeschritten | mittel-gut | vorsichtig – unbekannt | Bis 20 % THC | Süß, cremig, erdig, Gas, Zitrus |
| 13 | `13-sunset-sherbet-go-fast-autoflower` | Sunset Sherbet Go Fast Auto | UNBEKANNT (Seedlot) | BubatzBuddy | whitelabel | 80 | 70% Ind / 30% Sat | 65–125 (q=1.0) | 110–110 | Fortgeschritten | mittel | vorsichtig – unbekannt | 22 % THC | Süß, Zitrus, Tropenfrüchte, Creme |
| 14 | `14-candy-apples-automatic` | Candy Apples Automatic | Sensi Seeds | Sensi Seeds / Bushplanet | original | 79 | 60% Ind / 40% Sat | 50–100 (q=0.8) | 70–110 | Anfänger | mittel | gering-mittel | Chemotyp I | Saure Äpfel, Keksteig, Butterzucker, Vanille |
| 15 | `15-cherry-cola-autoflowering` | Cherry Cola Auto | Fast Buds | Bushplanet / Fast Buds | original | 79 | 55% Ind / 45% Sat | 55–115 (q=0.9) | 90–150 | Profi | mittel-gut | mittel-hoch | Bis 28,1 % THC | Kirsche, Cola, süße Früchte, Gas |
| 16 | `16-banana-purple-punch-autoflowering` | Banana Purple Punch Auto | Fast Buds | Bushplanet / Fast Buds | original | 78 | 75% Ind / 25% Sat | 65–125 (q=1.0) | 80–120 | Anfänger | gering – erhöhtes Risiko | mittel-hoch | Bis 30,4 % THC | Banane, Erdbeere, Fruchtgummi |
| 17 | `17-runtz-automatic` | Runtz Automatic | Sensi Seeds | Sensi Seeds / Bushplanet | original | 78 | 70% Ind / 30% Sat | 55–115 (q=0.9) | 70–105 | Anfänger | mittel | gering-mittel | Chemotyp I | Tropische Bonbons, Zitrus, Creme, Kräuter |
| 18 | `18-lemon-cherry-cookies-autoflowering` | Lemon Cherry Cookies Auto | Fast Buds | Bushplanet / Fast Buds | original | 77 | 70% Ind / 30% Sat | 65–125 (q=1.0) | 80–120 | Anfänger | mittel | mittel-hoch | Bis 28,5 % THC | Kirsche, Zitrone, Cookies, Gas |
| 19 | `19-gorilla-glue-autoflower` | Gorilla Glue Autoflower | UNBEKANNT (Seedlot) | BubatzBuddy | whitelabel | 77 | 55% Ind / 45% Sat | 55–115 (q=0.9) | 90–130 | Profi | mittel-gut | mittel-hoch | Bis 26 % THC | Scharf-chemisch, Diesel, Klebstoff, Pinie |
| 20 | `20-strawberry-gorilla-rf3-autoflowering` | Strawberry Gorilla RF3 Auto | Fast Buds | Bushplanet / Fast Buds | original | 76 | 60% Ind / 40% Sat | 65–125 (q=1.0) | 77–132 | Profi | mittel | mittel-hoch | Bis 31 % THC | Erdbeere, Guave, Kiefer, Diesel |
| 21 | `21-super-boof-xl-autoflowering-bushplanet` | Super Boof XL Auto | STRITTIG (Fast Buds/Sweet) | Bushplanet (Sweet Seeds) | unklar | 75 | 40% Ind / 60% Sat | 50–100 (q=0.8) | 110–150 | Profi | gut | mittel-hoch | Bis 28,5 % THC | Grapefruit, Kirsche, Vanille, Gas |
| 22 | `22-permanent-marker-xl-autoflowering` | Permanent Marker XL Auto | Sweet Seeds | Bushplanet / Sweet Seeds | original | 75 | 67% Ind / 33% Sat | 65–125 (q=1.0) | 50–130 | Profi | mittel | mittel-hoch | 23–30 % THC | Edding/Permanent Marker, Klebstoff, Diesel |
| 23 | `23-citrus-fuel-automatic` | Citrus Fuel Automatic | Sensi Seeds | Sensi Seeds direkt | original | 74 | 30% Ind / 70% Sat | 50–100 (q=0.8) | 70–110 | Anfänger | gut | gering-mittel | 20,8 % THC | Limette, Orange, Treibstoff/Diesel, Hasch |
| 24 | `24-mimosa-sunrise-xxl-automatic` | Mimosa Sunrise XXL Auto | Sensi Seeds | Sensi Seeds direkt | original | 74 | 60% Ind / 40% Sat | 55–115 (q=0.9) | 70–110 | Anfänger | mittel-gut | gering-mittel | 20,15 % THC | Mandarine, Orange, Zitrus, Kräuter |
| 25 | `25-strawberry-pie-autoflowering` | Strawberry Pie Auto | Fast Buds | Bushplanet / Fast Buds | original | 73 | 85% Ind / 15% Sat | 55–115 (q=0.9) | 60–100 | Anfänger | gering – erhöhtes Risiko | mittel-hoch | Bis 26 % THC | Erdbeerkuchen, Gebäck, süße Sahne |
| 26 | `26-sour-jealousy-auto` | Sour Jealousy Auto | Fast Buds | Bushplanet / Fast Buds | original | 72 | 28% Ind / 72% Sat | 50–100 (q=0.8) | 90–150 | Profi | gut | mittel-hoch | Bis 29 % THC | Sauer, Diesel, Zitrone, erdige Würze |
| 27 | `27-crispy-apple-auto` | Crispy Apple Auto | WEEZEL (Hausmarke) | WEEZEL | whitelabel | 71 | Ausgewogen (50/50) | 55–115 (q=0.9) | 70–110 | Fortgeschritten | gut | vorsichtig – unbekannt | 22 % THC | Knackiger Apfel, süße Früchte, leichte Kräuter |
| 28 | `28-lemon-cherry-cookies-auto-weezel` | Lemon Cherry Cookies Auto | WEEZEL (Hausmarke) | WEEZEL | whitelabel | 70 | 60% Ind / 40% Sat | 60–120 (q=0.95) | 80–120 | Fortgeschritten | mittel | vorsichtig – unbekannt | 25 % THC | Kirsche, Zitrone, süße Cookies, Gas |
| 29 | `29-cookie-crusher-auto` | Cookie Crusher Auto | WEEZEL (Hausmarke) | WEEZEL | whitelabel | 69 | 70% Ind / 30% Sat | 60–120 (q=0.95) | 70–110 | Fortgeschritten | gering – erhöhtes Risiko | vorsichtig – unbekannt | 24 % THC | Süße Kekse, Schokolade, Vanille, Minze |
| 30 | `30-apple-pie-auto` | Apple Pie Auto | WEEZEL (Hausmarke) | WEEZEL | whitelabel | 68 | 40% Ind / 60% Sat | 55–115 (q=0.9) | 60–110 | Fortgeschritten | gut | vorsichtig – unbekannt | 21 % THC | Warmer Apfelkuchen, Zimt, süße Würze |
| 31 | `31-blueberry-autoflower` | Blueberry Autoflower | UNBEKANNT | Hanfblumenladen | whitelabel | 67 | Indica-dominant | 45–95 (q=0.75) | unbekannt | Fortgeschritten | UNBEKANNT | vorsichtig – unbekannt | Bis 20 % THC | Blaubeere, Beeren, Erde |
| 32 | `32-watermelon-autoflower` | Watermelon Autoflower | UNBEKANNT | Hanfblumenladen | whitelabel | 66 | Indica-dominant | 45–95 (q=0.75) | unbekannt | Fortgeschritten | UNBEKANNT | vorsichtig – unbekannt | 18–20 % THC | Wassermelone, süß-fruchtig |
| 33 | `33-jealousy-autoflower` | Jealousy Autoflower | UNBEKANNT | Hanfblumenladen | whitelabel | 65 | Ausgewogen | 45–95 (q=0.75) | unbekannt | Fortgeschritten | UNBEKANNT | vorsichtig – unbekannt | Bis 20 % THC | Süß, cremig, Gas |
| 34 | `34-gorilla-zkittlez-autoflower` | Gorilla Zkittlez Autoflower | UNBEKANNT | Hanfblumenladen | whitelabel | 64 | Indica-dominant | 50–100 (q=0.8) | unbekannt | Fortgeschritten | UNBEKANNT | vorsichtig – unbekannt | Bis 22 % THC | Tropische Früchte, Diesel, Schokolade |
| 35 | `35-bruce-banner-autoflower` | Bruce Banner Autoflower | UNBEKANNT | Hanfblumenladen | whitelabel | 62 | Sativa-dominant | 45–95 (q=0.75) | unbekannt | Fortgeschritten | UNBEKANNT | vorsichtig – unbekannt | Bis 24 % THC | Diesel, süße Erde, Zitrus |
| 36 | `36-strawberry-haze-autoflower` | Strawberry Haze Auto | UNBEKANNT | cannabis-clones.de | whitelabel | 60 | 30% Ind / 70% Sat | 45–90 (q=0.7) | 90–140 | Profi | UNBEKANNT | mittel-hoch | 18–21 % THC | Erdbeere, süße Haze-Noten |
| 37 | `37-mazar-autoflower-samling` | Mazar Auto-Sämling | BlackLabel Seeds | Cali Club | whitelabel | 65 | 80% Ind / 20% Sat | 55–105 (q=0.85) | 60–100 | Fortgeschritten | UNBEKANNT | vorsichtig – unbekannt | 18–20 % THC | Haschisch, Holz, Erde, Weihrauch |
| 38 | `38-orange-zkittlez-autoflower-samling` | Orange Zkittlez Auto-Sämling | BlackLabel Seeds | Cali Club | whitelabel | 64 | 50% Ind / 50% Sat | 55–105 (q=0.85) | 75–120 | Fortgeschritten | UNBEKANNT | mittel-hoch | Bis 22 % THC | Orange, Bonbons, Zitrus |
| 39 | `39-blueberry-autoflower-samling` | Blueberry Auto-Sämling | White Label (reseller) | Cali Club | whitelabel | 63 | Indica-dominant | 45–95 (q=0.75) | unbekannt | Fortgeschritten | UNBEKANNT | vorsichtig – unbekannt | 18 % THC | Beeren, Blaubeere, Erde |
| 40 | `40-amnesia-haze-autoflower-samling` | Amnesia Haze Auto-Sämling | BlackLabel Seeds | Cali Club | whitelabel | 58 | 20% Ind / 80% Sat | 45–90 (q=0.7) | 90–150 | Profi | UNBEKANNT | mittel-hoch | Bis 21 % THC | Scharf-zitrisch, Haze, Kräuter |
| 41 | `41-super-lemon-haze-auto-samling` | Super Lemon Haze Auto | BlackLabel Seeds | Cali Club | whitelabel | 56 | 20% Ind / 80% Sat | 40–80 (q=0.65) | 100–160 | Profi | UNBEKANNT | mittel-hoch | Bis 20 % THC | Intensive Zitrone, Haze, Pfeffer |
| 42 | `42-orange-zkittlez-automatic` | Orange Zkittlez Automatic | UNBEKANNT | 420Grower / BlackLabel | whitelabel | 63 | 50% Ind / 50% Sat | 50–100 (q=0.8) | 75–120 | Fortgeschritten | UNBEKANNT | mittel-hoch | Bis 22 % THC | Süße Orange, Tropenfrüchte |
| 43 | `43-strawberry-haze-automatic` | Strawberry Haze Automatic | UNBEKANNT | 420Grower / BlackLabel | whitelabel | 57 | 30% Ind / 70% Sat | 45–90 (q=0.7) | 90–140 | Profi | UNBEKANNT | mittel-hoch | 18–20 % THC | Erdbeere, süß-säuerlich, Haze |
| 44 | `44-moby-dick-automatic` | Moby Dick Automatic | UNBEKANNT | 420Grower / BlackLabel | whitelabel | 52 | 30% Ind / 70% Sat | 45–90 (q=0.7) | 100–160 | Profi | UNBEKANNT | mittel-hoch | Bis 21 % THC | Vanille, Zeder, Weihrauch, Zitrus |
| 45 | `45-amnesia-haze-automatik` | Amnesia Haze Automatik | BlackLabel Seeds | 420Grower / BlackLabel | whitelabel | 55 | 20% Ind / 80% Sat | 45–95 (q=0.75) | 90–150 | Profi | UNBEKANNT | mittel-hoch | Bis 20 % THC | Zitrone, Kräuter, Pfeffer |
| 46 | `46-alter-tobi-auto-im-eazyplug` | Alter Tobi - Auto | Krumme Gurken (Haus) | Krumme Gurken | whitelabel | 61 | Indica-dominant | 65–125 (q=1.0) | 90–120 | Fortgeschritten | gering – erhöhtes Risiko | mittel-hoch | Bis 22 % THC | Pfeifentabak, süße Kräuter, Moos |
| 47 | `47-nami-s-orangen-auto-im-eazyplug` | Nami's Orangen - Auto | V-BUDS / Krumme Gurken | Krumme Gurken | whitelabel | 60 | 50% Ind / 50% Sat | 65–125 (q=1.0) | 87–87 | Fortgeschritten | UNBEKANNT | vorsichtig – unbekannt | Bis 21 % THC | Blutorange, Mandarine, saure Zitrus |
| 48 | `48-dr-zaius-og-auto-im-eazyplug` | Dr. Zaius OG - Auto | Krumme Gurken (Haus) | Krumme Gurken | unklar | 59 | 60% Ind / 40% Sat | 55–105 (q=0.85) | 60–140 | Profi | UNBEKANNT | mittel-hoch | Bis 23 % THC | Erdöl, faulige Frucht, feuchter Waldboden |
| 49 | `49-longbottom-haze-auto-im-eazyplug` | Longbottom Haze - Auto | Krumme Gurken (Haus) | Krumme Gurken | unklar | 55 | 20% Ind / 80% Sat | 45–90 (q=0.7) | 150–150 | Profi | gut | mittel-hoch | Bis 20 % THC | Metallisch-zitrisch, Haze, süßes Holz |
| 50 | `50-usa-mimosa-punch-autoflower` | USA Mimosa Punch Auto | UNBEKANNT (PLANTYME) | PLANTYME | whitelabel | 49 | Ausgewogen | 35–70 (q=0.55) | 80–120 | Fortgeschritten | gut | mittel-hoch | Bis 20 % THC | Süße Früchte, Zitrusnoten |

---

## 5. Mathematical & Photobiology Modeling

### 5.1. The 140 W / 0.36 m² Yield Equation
In the UKD setup (60×60×180 cm tent, 140 W LED fixture), dry yield ($E_{gesamt}$) is constrained by photosynthetic flux (DLI), not by artificial gram claims:
$$E_{gesamt} = 140\text{ W} \times [0.45\text{--}0.90\text{ g/W}] \times q$$
where:
- **Fixture Wattage**: $140\text{ W}$ max electrical power.
- **Photosynthetic Baseline**: $0.45\text{ g/W}$ (conservative beginner/stress baseline) to $0.90\text{ g/W}$ (optimized VPD & nutrient canopy conversion).
- **Baseline Tent Yield**: $140 \times 0.45 = 63\text{ g}$ to $140 \times 0.90 = 126\text{ g}$.
- **Efficiency Factor $q$**: Strain-specific vigor and light conversion index ($0.55 \le q \le 1.00$).
- **Resulting Yield Range**:
  - `ertrag_lo` = $\text{round}(63 \times q)$ (clamped/rounded to nearest 5)
  - `ertrag_hi` = $\text{round}(126 \times q)$ (clamped/rounded to nearest 5)

### 5.2. Relative Bar Visualization Model
The UI renders a horizontal range indicator against an absolute scale of $MAXY = 130\text{ g}$:
$$\text{Offset Left } (l) = \frac{\text{ertrag\_lo}}{MAXY} \times 100\%$$
$$\text{Bar Width } (w) = \max\left(1.4\%, \frac{\text{ertrag\_hi} - \text{ertrag\_lo}}{MAXY} \times 100\%\right)$$
$$\text{Value Label Left} = \min\left(62\%, l + w + 1.5\%\right)$$

---

## 6. UI/UX Structure & 2026 Master Class Design Tokens

### 6.1. CSS Design Tokens & Visual Hierarchy
The Autoflower Cockpit adopts a dark emerald / deep obsidian aesthetic:

```css
:root {
  --bg: #0E1714;         /* Obsidian Forest Deep Background */
  --surface: #16211E;    /* Dark Emerald Surface Container */
  --surface2: #1D2A26;   /* Elevated Card / Active Chip Surface */
  --line: #26352F;       /* Structural Dividing Border */
  --ink: #E8F1EB;        /* Primary High-Contrast Text */
  --muted: #8DA69B;      /* Secondary Descriptive Text */
  --faint: #5E7368;      /* Captions, Metric Subtitles, Tags */
  
  --bloom: #F2385A;      /* 660 nm Deep Red Bloom Diode Accent */
  --veg: #5B8CFF;        /* 450 nm Royal Blue Veg Diode Accent */
  --signal: #6FE3A8;     /* Verified / Original Genetics Accent */
  --warn: #F2A93B;       /* White Label Warning Accent */
  --alert: #FF6B6B;      /* Contested Provenance Accent */
  --r: 3px;              /* High-precision 2026 micro-radius */
}
```

### 6.2. Component Architecture
1. **Header & KPI Summary**:
   - Eyebrow with current section & date snapshot (`Stand 2. August 2026`).
   - Title: `Was in 0,36 m² unter 140 Watt wirklich passt`.
   - Photobiology Equation Box (`.eq`).
   - KPI Cards: Total Offers (`kTotal`), Original Genetics (`kOrig`), White Label (`kWl`), Base Band (`63–126 g`).
2. **Filter Aside (Sticky Sidebar)**:
   - Tab Segmented Switch: `Jungpflanzen (50)` vs. `Saatgut (11)`.
   - Live Search Input (`#q`).
   - Cultivar Type Chips (when in Saatgut tab: `Autoflower`, `Photoperiodisch`).
   - Provenance Chips: `Originalgenetik`, `White Label`, `Provenienz ungeklärt`.
   - Experience Level Chips: `Anfänger`, `Fortgeschritten`, `Profi`.
   - Mold Risk Chips: Dynamic facet values.
   - Sourcing / Shop Select dropdown.
   - Max. Height Range Slider (`70 cm` to `200+ cm`).
   - Sort Select: `Rang (Score absteigend)`, `Ertragspotenzial`, `Endhöhe aufsteigend`, `Name A–Z`.
   - "Filter zurücksetzen" button.
3. **Main Content Table / Axis View**:
   - Header Axis: `#`, `Angebot`, Tick marks (`0`, `50`, `100`, `130 g`), `Score`.
   - Row Buttons: Rank (`padStart(2, '0')`), Name with Provenance Dot, Subtitle metadata line, Yield Uncertainty Band with gradient fill (`linear-gradient(90deg, var(--veg), var(--bloom))`), Score badge.
4. **Sliding Detail Drawer (`#drawer`) & Scrim (`#scrim`)**:
   - Top dismiss button (`schließen ✕`).
   - Eyebrow with position & shop.
   - H2 Strain Title + Badge cluster.
   - Warning callout box (`.warnbox`) if `warn` is non-null.
   - Yield Box (`.yieldbox`): Big dry yield range + photobiology formula explanation.
   - 2-Column Cannabinoid grid (`Genetik`, `Kreuzung`, `THC`, `CBD`, `CBN`, `Minor`).
   - Detailed agronomic list (`Terpene` + Quelllage tag, `Ester`, `Wirkung`, `Geschmack`, `Geruch`, `Reviews`, `Medizin`, `Düngerverträglichkeit [C]`, `Schimmelresistenz [C]`, `Erfahrungsniveau [C]`, `Blüte/Dauer`, `Höhe`, `Produktform`, `Projekturteil`, `Datenvertrauen`).

---

## 7. TypeScript Interfaces & JSON Schema

### 7.1. TypeScript Contract (`src/types/autoflower.ts`)

```typescript
export type PlantProvenance = "original" | "whitelabel" | "unklar";

export type ExperienceLevel = "Anfänger" | "Fortgeschritten" | "Profi";

export type MoldResistanceRating = 
  | "gering" 
  | "gering – erhöhtes Risiko" 
  | "gering-mittel" 
  | "mittel" 
  | "mittel-gut" 
  | "gut" 
  | "sehr gut" 
  | "UNBEKANNT";

export type NutrientFeedTolerance = 
  | "gering" 
  | "gering-mittel" 
  | "mittel" 
  | "mittel-hoch" 
  | "vorsichtig – unbekannt";

export type CultivarType = "Autoflower" | "Photoperiodisch" | "Fast Version";

export type CultivarKind = "jungpflanze" | "samen";

export interface AutoflowerCockpitEntry {
  /** Rank within category (1..50 or 1..11) */
  rank: number;
  /** Commercial cultivar name */
  name: string;
  /** Vendor, nursery, or distribution source */
  shop: string;
  /** Master Class Composite Score (0..100) */
  score: number;
  /** Unique slug identifier (e.g. '1-mighty-dwarf-automatic') */
  id: string;
  /** Breeder house or seedbank */
  breeder: string;
  /** Provenance verification classification */
  prov: PlantProvenance;
  /** Provenance or disambiguation warning text */
  warn: string | null;
  /** Delivery format, seedling age, and physical condition */
  form: string;
  /** Textual genetic lineage summary */
  gen: string;
  /** Numeric Indica percentage (0..100) */
  indica: number | null;
  /** Numeric Sativa percentage (0..100) */
  sativa: number | null;
  /** Parental crossing pedigree */
  cross: string;
  /** THC declaration and laboratory verification context */
  thc: string;
  /** CBD percentage and chemotype classification */
  cbd: string;
  /** CBN oxidation profile and aging notes */
  cbn: string;
  /** Minor cannabinoids & anthocyanin pigments */
  minor: string;
  /** Volatile aroma chemistry (esters, thiols/VSC, pyrazines) */
  ester: string;
  /** Psychoactive and physiological effect profile */
  wirkung: string;
  /** Flavor and gustatory profile */
  geschmack: string;
  /** Bloom odor intensity and carbon filter load */
  geruch: string;
  /** Terpene evidence source designation */
  terpene_src: string;
  /** Dominant terpene spectrum */
  terpene: string;
  /** Community reviews and sample size */
  reviews: string;
  /** Medical chemotype classification and indication profile */
  med: string;
  /** Medical evidence rating and indication scope */
  med_src: string;
  /** Nutrient feeding appetite model rating */
  feed: NutrientFeedTolerance;
  /** Actionable dosing advice and EC targets */
  feed_note: string;
  /** Mold risk model rating */
  mold: MoldResistanceRating;
  /** Inflorescence density and humidity management guidance */
  mold_note: string;
  /** Target grower experience level */
  level: ExperienceLevel;
  /** Agronomic difficulty rationale */
  level_note: string;
  /** Flowering weeks, seed-to-harvest duration, and remaining clone weeks */
  zeit: string;
  /** Textual plant height description */
  hoehe: string;
  /** Minimum indoor height in cm */
  hmin: number | null;
  /** Maximum indoor height in cm */
  hmax: number | null;
  /** Lower dry yield boundary under 140W LED (g) */
  ertrag_lo: number;
  /** Upper dry yield boundary under 140W LED (g) */
  ertrag_hi: number;
  /** Yield calculation source & breeder claim scaling */
  ertrag_src: string;
  /** UKD Masterplan final verdict and training instructions */
  urteil: string;
  /** Evidence confidence rating and data trust audit */
  evidenz: string;
  /** Genetic light-use efficiency coefficient (0.55..1.00) */
  q: number;
  /** Category: young plant vs. seed candidate */
  kind: CultivarKind;
  /** Photoperiodic behavior */
  typ: CultivarType;
}

export interface AutoflowerFilterState {
  kind: CultivarKind;
  q: string;
  typ: Set<CultivarType>;
  prov: Set<PlantProvenance>;
  level: Set<ExperienceLevel>;
  mold: Set<MoldResistanceRating>;
  shop: string;
  h: number;
  sort: "rank" | "yield" | "height" | "name";
}
```

---

## 8. RunPackage State Integration Bridge

When the user selects a cultivar in the Autoflower Cockpit to populate the active grow run, the selected `AutoflowerCockpitEntry` maps to the `RunPackage` domain model as follows:

```typescript
// Mapping function from Autoflower Cockpit to active RunPackage
function applyCultivarToRun(run: RunPackage, cultivar: AutoflowerCockpitEntry): RunPackage {
  const isSeed = cultivar.kind === "samen";
  
  return {
    ...run,
    config: {
      ...run.config,
      genetics: cultivar.name,
      // Map estimated cycle days (extract numeric from zeit or default to 75-80)
      planEndDay: isSeed ? 80 : 65,
    },
    plants: run.plants.map((plant, idx) => {
      if (idx === 0) {
        return {
          ...plant,
          label: `${cultivar.name} #${idx + 1}`,
          genetics: cultivar.name,
          identity: {
            ...plant.identity,
            breeder: cultivar.breeder,
            seedType: cultivar.typ === "Autoflower" ? "autoflower" : "photoperiodic",
            seedLot: cultivar.prov === "original" ? "Breeder-Original" : "Shop-Selection",
            phenotype: cultivar.gen,
            pottingDate: plant.identity?.pottingDate ?? new Date().toISOString().split("T")[0],
            emergenceDate: plant.identity?.emergenceDate ?? new Date().toISOString().split("T")[0],
            dayZeroAnchor: plant.identity?.dayZeroAnchor ?? "emergence",
          }
        };
      }
      return plant;
    })
  };
}
```

---

## 9. Next Steps for Implementation Team

1. Replace `src/data/autoflower-cockpit.json` with the complete 61-entry verified dataset.
2. Add `AutoflowerCockpitEntry` and related types into `src/types.ts`.
3. Upgrade `src/components/panels/AutoflowerCockpitPanel.tsx` to the Master Class 2026 design with:
   - Full Dual-Tab (`jungpflanze` / `samen`) switcher.
   - KPI metric banner with active photobiology equation.
   - Proportional yield bars ($MAXY = 130\text{ g}$) with bloom/veg gradient.
   - Sliding detail drawer with ESC/scrim dismissal.
   - "Sorten ins Setup übernehmen" button dispatching `updatePlantIdentity` to `run-state.ts`.
4. Implement the global Live vs. Simulation toggle and retroactive potting/emergence date pickers as requested in `ORIGINAL_REQUEST.md`.
