# Third-Party Integration Governance

## Verbindliche Grenze

UKD bleibt das kanonische Evidence-, Planungs- und Run-System. Keine Fremdanwendung darf direkt zwischen UI und Evidence-/Domain-Core sitzen. In diesem Release wurde kein Quellcode aus Emerald, GrowApp, Isley, GanjOS, farmOS oder einem anderen genannten Projekt importiert.

Die im Research genannten Namen und Pattern sind Intake-Kandidaten, noch keine verifizierten Abhängigkeiten. Solange exaktes Repository, Commit-SHA, Lizenz, Notices, Wartungsstatus, Tests und eingebettete Fachlogik nicht geprüft sind, lautet die Entscheidung `REJECT_UNTIL_VERIFIED`.

## Intake-Gate

Vor jedem Fremdcode müssen dokumentiert sein:

1. exaktes Repository und unveränderlicher Commit-SHA,
2. Lizenz, Copyright und erforderliche Notices,
3. Dependency- und Security-Audit,
4. Wartungsstatus, Tests und Code-Ownership,
5. exakt benötigtes Modul statt Komplettimport,
6. enthaltene wissenschaftliche, kultivierungsbezogene oder rechtliche Logik,
7. Entscheidung `ADOPT`, `ADAPT`, `STUDY` oder `REJECT` mit Begründung.

## Integrationsgrenze

Sensoren werden später ausschließlich über Adapter normalisiert. Phase eins ist read-only. Gerätesteuerung benötigt eine eigene Zustandsmaschine `REQUESTED → VALIDATED → USER_CONFIRMED → SENT → ACKNOWLEDGED → VERIFIED` sowie Fehlerzustände und Safe-State. Ein UI-Boolean darf keine Pumpe, Dosierung oder andere Aktorik direkt auslösen.

Die maschinenlesbare Roadmap steht in `src/data/integration-epics.json`.
