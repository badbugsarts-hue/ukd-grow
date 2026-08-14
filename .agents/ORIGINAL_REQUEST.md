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
