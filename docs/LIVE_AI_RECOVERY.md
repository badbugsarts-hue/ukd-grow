# Live-Betrieb, AI-Austausch und Langzeit-Recovery

## Betriebsarten

`RunPackage 6.0.0` trennt Simulation und Live-Betrieb. Bestehende v1–v5-Runs migrieren als `simulation`. „Live starten“ erzeugt einen neuen Run und erhält die Simulation unverändert. Kopiert werden Setup, unveränderlicher Konfigurationssnapshot, Equipment-Identitäten sowie freigegebene Cultivar- und Nährstoffprofile. Messungen, Beobachtungen, erledigte Tasks, Mix-/Bewässerungsaktionen, Medien und simulierte Events werden nicht als reale Historie übernommen.

Der Live-Anker ist die bestätigte Aussaat (`seed-planted`) in UTC. Der operative Tag ist `floor((nowUtc-anchorUtc)/86_400_000)`. `viewDay` dient nur der Navigation. Uhrzeit vor dem Anker oder ein Rücksprung über die Toleranz blockiert fachliche Mutationen. Eine Korrektur erzeugt eine append-only `LiveAnchorRevision`; historische Events behalten Zeit und damalige Tageszuordnung.

## Globales Command Center

Das Command Center steht unabhängig von der Route bereit: Status, „Heute“, Quick Log, persistente Alerts, Hilfe, Sofortbackup, AI-Export und AI-Rückimport. Mobile wird dieselbe Aktionsfläche als Bottom Sheet gezeigt. Die Metadaten der globalen Aktionen liegen zentral in `src/ui-guidance.ts`.

## AI-Dateiverträge

`ukd-ai-exchange/1` enthält Run, Plan, Historie, Lineage, Alerts, freigegebene Wissensinhalte und Capability-Status. Ausgeschlossen sind Rechts-/Patientendaten, Bestandslog, E-Mail, Credentials, Recovery-Material, Telemetrie-IDs und Medienbinärdaten. Payload und Run-Projektion tragen SHA-256-Hashes.

`ukd-ai-proposal/1` ist untrusted input. Der Importpfad lautet Quarantäne → JSON/Schema → Base-Run-Hash → Zielpfad-Safety → Diff → Einzelentscheidung → Command. Unbekannte Felder, Prompt-Injection-Muster, HTML/Script sowie Änderungen an Evidenz, Formeln, Live-Anker, Rechtsdaten, Geräten und Snapshots werden blockiert. Fehler können als `ukd-ai-correction-request/1` exportiert werden. Die Rohdatei wird nicht kanonisch gespeichert; Annahme und Ablehnung werden mit Dateihash auditiert.

## Backup-Vault

Jede fachliche Mutation markiert den Run für einen Checkpoint. Nach maximal 30 Sekunden Inaktivität wird ein vollständiges `ukd-workspace-backup/2` erzeugt, mit dem Workspace-Key AES-GCM-verschlüsselt, per SHA-256 und unmittelbarem Decrypt-/Schema-Readback geprüft und im IndexedDB-Vault abgelegt. Live-Start, AI-Entscheidung, Ankerkorrektur und Abschluss sichern sofort.

Rotation: 20 neueste, 30 tägliche, 12 monatliche Checkpoints; Abschlussbackups werden nicht rotiert. Ein gewählter externer Ordner wird über die File System Access API beschrieben und zurückgelesen. Ohne Ordnerzugriff wird eine verifizierte `.ukdbackup`-Datei heruntergeladen. Recovery-Key und Passphrase bleiben getrennt: Auf einem neuen Gerät zuerst Recovery-Kit plus Passphrase importieren, danach das verschlüsselte Backup.

Die App fragt `navigator.storage.persist()` an, zeigt Speicherwarnstufen bei 70/85/95 Prozent und führt wöchentlich eine isolierte vollständige Backup-Validierung durch. Der aktive Store wird dabei nicht mutiert.

## Stable-Gates

- v1→v6-Migrationsmatrix und alte Backup-Roundtrips
- UTC-/DST-/Rollback-/Ankerkorrekturtests
- Clone-Parität ohne simulierte Historie
- AI-Redaction, stale base, unknown fields und Injection
- Quota/Permission/Corruption/Recovery auf neuem Gerät
- Keyboard, Touch, NVDA und VoiceOver
- mehrtägiger echter Restore-Drill ohne Datenverlust
