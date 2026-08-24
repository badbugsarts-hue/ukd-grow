# Original User Request

## 2026-08-22T03:18:46Z

Führe ein umfassendes Usability-Review (UX Audit) der UKD-Frontend-Anwendung durch und setze sofortige Verbesserungen direkt im Code um. Der Fokus liegt auf Mobile UX, Desktop UX und nahtlosem In-Place Editing (AJAX-mäßige Dateneingabe mit Vorhersagen).

Working directory: C:\Users\badbu\Documents\grow
Integrity mode: development

## Requirements

### R1. UX Audit & Immediate Fixes

Überprüfe die UI/UX der Anwendung (Fokus auf `src/components/panels/`). Behebe offensichtliche Usability-Mängel (z.B. unklare Klickziele, fehlende Abstände, schlechte Kontraste, umständliche Navigation) direkt im React-Code.

### R2. In-Place Editing Erweitern

Verbessere die Dateneingabe im gesamten Dashboard. Wo Daten angezeigt werden, sollten sie nach Möglichkeit auch direkt dort (in-place) editierbar sein, um den Wechsel ins Setup-Menü zu minimieren. Nutze die neue `prediction-engine.ts`, um sinnvolle AJAX-mäßige Vorschläge bei der Eingabe zu machen.

### R3. Dokumentation größerer Baustellen

Erstelle eine Datei `ux_audit_report.md` im Workspace. Dokumentiere darin größere Architektur- oder UX-Probleme, deren Behebung den Rahmen eines schnellen Fixes sprengen würde.

## Acceptance Criteria

### Funktionalität & Stabilität

- [ ] Der Befehl `pnpm check` (Lint, Typecheck, Build, Tests) läuft nach allen Änderungen fehlerfrei durch.
- [ ] Bestehende Unit-Tests (z.B. Legacy-Tests in `src/run-state.ts`) wurden entweder erhalten oder erfolgreich an die neue UI angepasst.

### UX-Verbesserungen

- [ ] Mindestens 3 konkrete UX-Verbesserungen (z.B. In-Place Editing Felder, verbesserte Mobile-Ansicht) wurden im Code implementiert.
- [ ] Ein `ux_audit_report.md` existiert und listet verbleibende, größere UI/UX-Probleme klar verständlich auf.
