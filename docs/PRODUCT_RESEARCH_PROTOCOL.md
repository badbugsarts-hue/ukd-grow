# Product Research & Human Factors

## Zweck

Tests messen nicht, ob eine Seite rendert, sondern ob Menschen eine sichere, korrekte Entscheidung treffen. Rohaufzeichnungen enthalten keine Rechts- oder medizinischen Dokumente und werden getrennt vom Produktdatensatz behandelt.

## Stichprobe

- mindestens fünf Personen pro Experience Lens für formative Runden;
- getrennte Auswertung für Guided, Advanced und Expert;
- Keyboard-only und mindestens eine reale Assistive-Technology-Runde;
- Aufgaben werden ohne Erklärung der UI gestellt.

## Kernaufgaben

1. In höchstens 90 Sekunden die heute erforderliche Aktion und einen Blocker benennen.
2. Target, Measured, Derived und Missing korrekt unterscheiden.
3. Als Expert innerhalb von zehn Sekunden Formel, Inputs, Version und Quelle öffnen.
4. Ein valides Backup wiederherstellen und ein beschädigtes korrekt zurückweisen.
5. Einen widersprüchlichen Sensorzustand erkennen und keine automatische Interpretation ableiten.

## Messung

- Task Completion und Critical Error Rate;
- Time to Decision und Time to Lineage;
- Zahl benötigter Hilfen;
- Verständnisfragen nach jeder kritischen Aufgabe;
- Single Ease Question;
- qualitative Ursache jedes Fehlers, nicht nur die Fehlerzahl.

Ein unerkannter kritischer Fehler blockiert den Release. Weniger als 90 % korrektes Verständnis der Datensemantik blockiert ebenfalls.

Die maschinenlesbaren Journeys und Zielwerte liegen in `src/data/platform-quality.json`.
