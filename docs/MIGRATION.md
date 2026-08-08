# Migration and Legacy Parity

| Legacy-Fähigkeit          | v6-Status          | Umsetzung                                                             |
| ------------------------- | ------------------ | --------------------------------------------------------------------- |
| Dashboard                 | verbessert         | Cockpit mit Decision Gate und Moduslinsen                             |
| Run Config                | erhalten           | Rohdaten plus URL-/Local-State für Tag/Linse                          |
| Daily Master 0–80         | verbessert         | Heute + Timeline + Expert Trace                                       |
| Weekly/Monthly            | erhalten           | Rohdaten und Trajektorien                                             |
| Mix Calculator            | verbessert         | reaktiver Batchrechner und Mess-Gates                                 |
| HESI/AN/Athena Referenzen | erhalten           | Nährstoffsystem, Knowledge Base, Raw Data                             |
| Blumat                    | bewusst Legacy     | Warnung und Audit; kein operatives Referenzsystem                     |
| Klima/Licht               | verbessert         | responsive SVG-Kurven und Modellgrenzen                               |
| Daily Log                 | teilweise migriert | lokale Tagescheckliste; persistentes Run-Log noch nicht implementiert |
| Diagnostics               | verbessert         | messwertbasierte Triage plus Legacy-Tabelle                           |
| Products/Compatibility    | erhalten           | filterbare, zugängliche Tabellen                                      |
| Legal/Sources             | verbessert         | kuratierte Claims mit Prüftag und Scope                               |
| Audit Report              | vollständig        | alle 55 Findings filterbar                                            |
| Formeln/Rohwerte          | vollständig        | 27 Blätter; Expert-Formelansicht und JSON-Export                      |

## Bewusste Grenze

Die Web-App ist kein vollständiger Excel-Formelprozessor. Sie verwendet den geprüften Evidence-Guarded-v6-Snapshot und berechnet nur explizit portierte Fachlogik (DLI, Leaf-VPD, Batchskalierung). Eine zukünftige editierbare Run-Engine braucht versionierte Formelmigrationen und Vergleichstests gegen die XLSX.
