# Original User Request

## 2026-08-11T01:07:34Z

Implementiere neue interaktive Input-Panels und "Master Class" UI-Elemente für die UKD App basierend auf den Design-Konzepten im `.antigravitz` Verzeichnis. Das UI soll durch elitäres 2026 Webdesign, exzellente Usability und verständliche deutsche Terminologie überzeugen, sodass es für alle Erfahrungsstufen (vom Anfänger bis zum Grand Master) zugänglich ist.

Working directory: c:\Users\badbu\Documents\grow
Integrity mode: demo

## Requirements

### R1. Komponenten-Architektur
Extrahiere und implementiere alle interaktiven Input-Panels aus den `.antigravitz` Mockups (z.B. PDF, Bilder) als eigenständige "Master Class" UI-Komponenten. Lege diese in einem neuen Ordner `src/components/` an, um die Übersichtlichkeit zu fördern.

### R2. Integration in die App-Shell
Binde die neuen Komponenten nahtlos in die bestehende Navigation und den State-Flow der `App.tsx` ein. Die bestehende fachliche Logik (Domain, State, Storage) darf dabei nicht verändert oder beschädigt werden. 

### R3. Verständlichkeit und Terminologie
Alle Texte müssen in leicht verständlichem Deutsch verfasst sein, geeignet für Grower aller Erfahrungsstufen. Verwende Tooltips oder Inline-Erklärungen für Fachbegriffe (z.B. VPD, DLI, EC), um auch Anfängern den Kontext zu vermitteln.

### R4. Design-Konsistenz
Lese und nutze strikt die vorhandenen React-Muster aus `App.tsx` und die CSS-Tokens/Patterns aus `styles.css` als Vorlage, bevor neuer Code geschrieben wird. Erweitere das Design auf ein "2026 World Elite" Niveau, bleibe aber dem bestehenden Theme treu.

## Acceptance Criteria

### Build & Verification
- [ ] `npx tsc --noEmit` läuft ohne Typisierungsfehler durch.
- [ ] `npx vitest run` besteht alle vorhandenen Unit Tests (29/29).
- [ ] `npx vite build` schließt den Produktions-Build erfolgreich ab.

### UX & Architektur
- [ ] Alle neuen Panels sind als isolierte Dateien unter `src/components/` angelegt und in `App.tsx` geroutet.
- [ ] Es werden ausschließlich die bestehenden CSS-Variablen (z.B. `var(--green)`, `var(--surface-1)`) aus `styles.css` für Farben und Hintergründe verwendet.
- [ ] Jedes Panel enthält mindestens eine Inline-Erklärung/Tooltip für einen fachlichen Begriff auf Deutsch.

## 2026-08-14T01:18:26Z

Das Projekt umfasst die vollständige, lückenlose Implementierung der fehlenden "Product Science" und "Data Lineage" P0/P1-Features (echtes PPFD-Mapping, Sensor-Kalibrierungs-Ebene, Pflanzenidentität, Topfgewicht-Tracking) in die React-Frontend-App. Die Umsetzung muss höchsten "2026 Master Class Elite" UI/UX-Standards entsprechen (Progressive Disclosure, erstklassiges Design) und das bestehende Typsystem funktional an die Oberfläche anbinden. Gemogelte Default-Werte werden durch echte interaktive State-Logik ersetzt.

Working directory: c:\Users\badbu\Documents\grow

Integrity mode: development

## Requirements

### R1. Equipment Manager & Data Lineage UI
Implementiere dedizierte "Master Class" Overlay-Modale oder Unterseiten für die komplexe Hardware- und Kalibrierungserfassung. Dies umfasst das 9-Punkt-PPFD-Mapping (inkl. Hersteller, Modell, Dimmerstufen) und die Sensor-Kalibrierungs-Historie (pH/EC). Diese dürfen das Setup-Akkordeon nicht überladen, sondern müssen tief und wissenschaftlich korrekt (Data Lineage) gepflegt werden können.

### R2. Plant Identity & Biology Engine
Implementiere ein "Plant Identity Modal", in dem Züchter (Breeder), Seed-Lot und Phenotyp von der einfachen Genetik getrennt werden. Verknüpfe dies mit einer echten Definition des Zeitankers (Day Zero: z. B. Seed planted vs. Emergence), damit die App nicht mehr standardmäßig "defaultPlantIdentity" generiert.

### R3. Usability & Validation (Subagent: Browser)
Das gesamte UI muss zwingend auf Usability, Sinn-Logik und Verständlichkeit (inkl. Tooltips und Icons) durch visuelle UX-Tests validiert werden. Das Design muss das "2026 Elite" Niveau widerspiegeln und fehlerhaftes oder leeres Einreichen verhindern.

## Acceptance Criteria

### UI Architecture & UX
- [ ] Es existiert eine dedizierte UI-Komponente für das PPFD-Mapping, in die der Nutzer 9 Messpunkte eintragen kann.
- [ ] Es existiert ein Calibration-Manager für Sensoren, der das Prüfdatum und den Zustand ("valid", "expired") speichert und anzeigt.
- [ ] Das Plant Identity Modal speichert beim Start einen konkreten Zeitanker ab, anstatt "Day 0" hart zu kodieren.

### Visuelle Verifikation (Browser Agent)
- [ ] Der `browser` Agent muss die neu erstellten Seiten/Modale öffnen und durch Screenshots visuell analysieren.
- [ ] Der Browser-Agent bestätigt formell, dass Abstände, Typografie und Icons dem elitären 2026-Design entsprechen.
- [ ] Der Browser-Agent durchläuft den kompletten Flow von der Navigation über Dateneingabe bis zur Speicherung, um Bug-Freiheit (kein Hängenbleiben) zu garantieren.

## 2026-08-21T01:56:43Z

Enhance the UKD Grow Masterplan Setup View by making parameters visible and editable, fully integrating the Autoflower Cockpit plant data as a browsing interface, adding a global Live/Simulation toggle, and enabling retroactive plant milestone tracking (potting, emergence) to dynamically adjust the plan.

Working directory: `c:\Users\badbu\Documents\grow`
Integrity mode: development

**Reference Data:** The agent team must extract the plant data from the provided Autoflower-Cockpit v3 HTML structure (available in the user's initial prompt) to populate the integration.

## Requirements

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

## Acceptance Criteria

### Verification
- [ ] Run `npm run test` to verify that no existing domain logic is broken by the state changes.
- [ ] UI tests or visual verification must confirm that the new interactive Cockpit interface renders correctly and selected plants appear in the global state.
- [ ] The global Live/Simulation toggle must persist state and be visible across the app.

