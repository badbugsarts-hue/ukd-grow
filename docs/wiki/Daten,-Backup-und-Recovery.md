# Daten, Backup und Recovery

UKD arbeitet local-first mit IndexedDB. Jeder erfolgreiche Command erzeugt fachliche Daten, DomainEvent, AuditEvent, Timeline und – sofern aktiviert – Sync-Outbox atomar.

Der Backup-Vault schreibt verschlüsselte, SHA-256-verifizierte Checkpoints. Kritische Operationen wie Live-Start, Migration, AI-Import, Ankerkorrektur und Run-Abschluss erzwingen einen Checkpoint. Ein externer Ordner ist bevorzugt; ein verifizierter Download ist der Browser-Fallback.

Restore läuft zuerst in einer isolierten Staging-Datenbank. Aktive Daten werden erst nach Hash-, Schema-, Referenz- und Medienprüfung ersetzt. Recovery-Key und Passphrase niemals gemeinsam mit dem Backup lagern.
