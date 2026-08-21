# Migration and Legacy Parity

| Legacy-Fähigkeit          | v8-Status           | Umsetzung                                                                     |
| ------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| Dashboard                 | verbessert          | Cockpit mit Decision Gate und Moduslinsen                                     |
| Run Config                | erhalten            | Rohdaten plus URL-/Local-State für Tag/Linse                                  |
| Daily Master 0–80         | verbessert          | Heute + Timeline + Expert Trace                                               |
| Weekly/Monthly            | erhalten            | Rohdaten und Trajektorien                                                     |
| Mix Calculator            | verbessert          | reaktiver Batchrechner und Mess-Gates                                         |
| HESI/AN/Athena Referenzen | erhalten            | Nährstoffsystem, Knowledge Base, Raw Data                                     |
| Blumat                    | bewusst Legacy      | Warnung und Audit; kein operatives Referenzsystem                             |
| Klima/Licht               | verbessert          | responsive SVG-Kurven und Modellgrenzen                                       |
| Daily Log                 | verbessert          | persistentes Mess-/Beobachtungslog, Tasks, Alerts, Bewässerung und Ist-Mix   |
| Diagnostics               | verbessert          | messwertbasierte Triage plus Legacy-Tabelle                                   |
| Products/Compatibility    | erhalten            | filterbare, zugängliche Tabellen                                              |
| Legal/Sources             | verbessert          | kuratierte Claims mit Prüftag und Scope                                       |
| Rechtsprofile/Bestand     | implementiert       | getrennte Rechtswege; Profil session-only, Bestand als lokale Ereignisse       |
| Backend/Auth/Sensorik     | nicht implementiert | Capability-Trigger dokumentiert; keine Fake-Live-Daten                        |
| Audit Report              | vollständig         | alle 55 Findings filterbar                                                    |
| Formeln/Rohwerte          | vollständig         | 29 Blätter; Expert-Formelansicht und JSON-Export                              |

## Bewusste Grenze

Die Web-App ist kein vollständiger Excel-Formelprozessor. Sie verwendet den geprüften Evidence-Guarded-v8-Snapshot und berechnet nur explizit portierte Fachlogik. Der kanonische Tagesplan bleibt read-only; Run-Änderungen werden als Konfiguration, Messung, Aktion, Event oder Override gespeichert. Noch offene v4-Flächen sind in `COMPLETE_APP_AUDIT_2026-08-16.md` priorisiert.

Die technische Ertragsprognose erhält keinen rechtlichen Grammdeckel. Ein zukünftiges Bestandsmodul muss stattdessen Herkunft, Ernte, Trocknung, Einlagerung, Entnahme und Vernichtung als prüfbare Übergänge modellieren. Persönliche Rechtsprofile bleiben lokal und unversioniert.
