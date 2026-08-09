# Security and Privacy

- Keine Secrets, Accounts, Analytics oder Telemetrie.
- Keine externe Script- oder Font-Abhängigkeit im Browser.
- Keine Verwendung von `innerHTML`; alle Legacy-Inhalte werden als Text gerendert.
- JSON-Import ist derzeit read-only und same-origin. Zukünftige Uploads benötigen Schema-, Größen- und Inhaltvalidierung.
- Export enthält nur den gewählten fachlichen Snapshot; keine Local-Storage-Präferenzen.
- Local Storage enthält ausschließlich Lens, Tag und Theme, keine sensiblen Messwerte.
- Local Storage gilt nicht als vertraulicher Speicher: JavaScript und erfolgreicher XSS können darauf zugreifen. Web Crypto allein ersetzt weder Schlüsselmanagement noch ein geprüftes Sicherheitsdesign.
- Patienten-, Rezept-, Genehmigungs- und Bestandsdaten werden weder in Git noch in Local Storage gespeichert. Lokale Rechtsprofile verwenden `*.legal-profile.local.json` und sind über `.gitignore` ausgeschlossen.
- Eine zukünftige Profilpersistenz benötigt explizite Einwilligung, Verschlüsselung, Löschkonzept und Datenminimierung; bis dahin nur flüchtiger Import/Export in eine nutzerkontrollierte Datei.
- Für Deployment empfohlen: restriktive CSP (`default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'`) sowie immutable Cache-Hashes für Assets und versionierte Cache-Regeln für Fachdaten.

Referenzen: [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), [MDN Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
