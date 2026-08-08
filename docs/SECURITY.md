# Security and Privacy

- Keine Secrets, Accounts, Analytics oder Telemetrie.
- Keine externe Script- oder Font-Abhängigkeit im Browser.
- Keine Verwendung von `innerHTML`; alle Legacy-Inhalte werden als Text gerendert.
- JSON-Import ist derzeit read-only und same-origin. Zukünftige Uploads benötigen Schema-, Größen- und Inhaltvalidierung.
- Export enthält nur den gewählten fachlichen Snapshot; keine Local-Storage-Präferenzen.
- Local Storage enthält ausschließlich Lens, Tag und Theme, keine sensiblen Messwerte.
- Für Deployment empfohlen: restriktive CSP (`default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'`) sowie immutable Cache-Hashes für Assets und versionierte Cache-Regeln für Fachdaten.
