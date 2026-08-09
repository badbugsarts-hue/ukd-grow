# Product Spec · UKD Operator Workspace v6

## Ziel

Eine einzige UI soll neue Nutzer sicher zu einer sinnvollen Tagesentscheidung führen und erfahrenen Nutzern direkten Zugriff auf Formeln, Rohdaten, Provenienz und Auditgrenzen geben. Beide arbeiten auf denselben Daten.

## Nutzerflächen

1. Cockpit: Run-Status, Soll-/Messwerttrennung, Warnzentrale und Decision Gate.
2. Run-Setup: versionierte Anlage-, Medium-, Nährstoff- und Wasser-Baseline.
3. Messprotokoll: Istwerte, Notizen, Aktionen und chronologisches Ereignislog.
4. Heute: vollständige Tageskarte mit persistenter Checkliste und Stop-Regel.
5. Zeitachse: 81 Tage, Phasen und triggerbasierte Feed-Verläufe.
6. Mischlabor: ml/L-zu-Batch-Rechnung und Mess-Gates.
7. Klima & Licht: PPFD/DLI/VPD/Energie mit Interpretationsgrenzen.
8. Nährstoffsystem: operativer Motor, A/B-Abgrenzung, Do-not-stack.
9. Bibliothek: Produkte, Kompatibilität und Diagnose-Triage.
10. Evidenz: kuratierte Claims, Quellen und 55 Audit-Findings.
11. Rohdaten: vollständige Werte und im Expert-Modus Formeln.
12. Recht & Bestand: sitzungsgebundenes Rechtsprofil und persistentes Bestandsereignislog ohne Dokumentablage.
13. Berichte: validiertes JSON-Backup/Restore sowie CSV-, XLSX-, PDF- und Druckexport.
14. System: Datenhash, Offline-/Integrationsstatus, Kontrast und Textskalierung.

## Experience Lens

- Guided: Orientierung, sichere nächste Aktion, reduzierte Tabellenmenge.
- Advanced: Parameter, Beziehungen und vollständige operative Matrizen.
- Expert: Formeln, rohe Strukturen, Provenienz und JSON-Export.

Die Linse ist persistent und in der URL teilbar. Sie darf niemals einen Sollwert, eine Formel oder ein fachliches Ergebnis ändern.

Guided, Advanced und Expert sind absichtlich drei semantische Zustände. Eine numerische 1–10-Skala wird erst eingeführt, wenn Nutzerforschung zehn klar unterscheidbare Bedürfnisse und ein belastbares Mapping belegt. Expert blendet Hilfe nicht vollständig aus; Scope, Provenienz und kontextuelle Erklärung bleiben auf Abruf verfügbar.

## Datenwahrheit

Jeder operative Wert muss als `target`, `measured`, `simulated`, `missing` oder `stale` erkennbar sein. Ohne implementiertes Sensor-Gateway gibt es keine „Live“-Werte. Simulationen zeigen Modell, Eingaben, Unsicherheit und dürfen nie wie Messungen aussehen. Kritische Warnungen erscheinen persistent und zugänglich; ein Toast allein ist kein Safety-Gate.

## Qualitätsziele

- WCAG 2.2 AA als Release-Kriterium.
- statischer, vendor-neutraler Produktionsbuild.
- keine Tracking- oder Telemetrieabhängigkeit.
- Initial-JavaScript unter 300 kB minifiziert; große Fachdaten separat cachebar.
- Core Web Vitals als LCP ≤2,5 s, INP ≤200 ms und CLS ≤0,1 am p75 bewerten, sobald datenschutzgerechte Felddaten vorliegen.
- keine stillen fachlichen Fallbackdaten.
