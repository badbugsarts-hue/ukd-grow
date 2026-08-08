# Product Spec · UKD Operator Workspace v6

## Ziel

Eine einzige UI soll neue Nutzer sicher zu einer sinnvollen Tagesentscheidung führen und erfahrenen Nutzern direkten Zugriff auf Formeln, Rohdaten, Provenienz und Auditgrenzen geben. Beide arbeiten auf denselben Daten.

## Nutzerflächen

1. Cockpit: Run-Status, Sollwerte, Operator-Pfad, Decision Gate.
2. Heute: vollständige Tageskarte mit Checkliste und Stop-Regel.
3. Zeitachse: 81 Tage, Phasen und triggerbasierte Feed-Verläufe.
4. Mischlabor: ml/L-zu-Batch-Rechnung und Mess-Gates.
5. Klima & Licht: PPFD/DLI/VPD/Energie mit Interpretationsgrenzen.
6. Nährstoffsystem: operativer Motor, A/B-Abgrenzung, Do-not-stack.
7. Bibliothek: Produkte, Kompatibilität und Diagnose-Triage.
8. Evidenz: kuratierte Claims, Quellen und 55 Audit-Findings.
9. Rohdaten: vollständige Werte und im Expert-Modus Formeln.

## Experience Lens

- Guided: Orientierung, sichere nächste Aktion, reduzierte Tabellenmenge.
- Advanced: Parameter, Beziehungen und vollständige operative Matrizen.
- Expert: Formeln, rohe Strukturen, Provenienz und JSON-Export.

Die Linse ist persistent und in der URL teilbar. Sie darf niemals einen Sollwert, eine Formel oder ein fachliches Ergebnis ändern.

## Qualitätsziele

- WCAG 2.2 AA als Release-Kriterium.
- statischer, vendor-neutraler Produktionsbuild.
- keine Tracking- oder Telemetrieabhängigkeit.
- Initial-JavaScript unter 300 kB minifiziert; große Fachdaten separat cachebar.
- keine stillen fachlichen Fallbackdaten.
