# Architektur- und UX-Plan-Audit · Runde 2

Stand: 8. August 2026

## Ergebnis

Der neue Entwurf enthält gute Produktziele, beginnt aber mit einer falschen Bestandsaufnahme und vermischt gegenwärtige Fähigkeiten, mögliche Zukunftsoptionen und bereits verworfene Architekturannahmen. Er wird deshalb nicht wörtlich als Implementierungsplan übernommen.

## Faktische Korrekturen

| Eingereichte Aussage                               | Befund im Repository                                                                                                               | Entscheidung                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Kein erkennbarer UI-Quellcode, keine Tests oder CI | Falsch: React/TypeScript-App, Domain-Code, 27-Blatt-Snapshot, Vitest, Playwright, Axe und GitHub Actions sind vorhanden.           | Repository-Inventar ist Source of Truth; externe Audits müssen zuerst `rg --files`, `package.json` und Workflow-Dateien prüfen. |
| Next.js-SPA plus API und Datenbank als Ziel        | Nicht durch aktuelle Anforderungen gedeckt.                                                                                        | Vite-SPA bleibt. Backend und Next.js sind capability-getriggerte Optionen, keine Baseline.                                      |
| Prisma als NoSQL-Datenhaltung                      | Kategorienfehler: Prisma ist ORM/Datenschicht und unterstützt verschiedene Datenbanken; es ist selbst keine JSON-/NoSQL-Datenbank. | Erst Persistenzbedarf und Datenmodell, dann Datenbank und Zugriffsschicht wählen.                                               |
| OAuth/JWT und Nutzerzustand im Local Storage       | Ohne Mehrbenutzeranforderung unnötig; Tokens und sensible Daten im Local Storage sind riskant.                                     | Keine Auth in v6. Sensible Rechts-/Patientendaten bleiben außerhalb von URL und Local Storage.                                  |
| „CryptoAPI“ macht lokale Daten sicher              | Zu pauschal. Web Crypto liefert Low-Level-Primitiven; Schlüsselmanagement und Gesamtdesign bleiben schwierig.                      | Keine sensible Browserpersistenz ohne eigenes Threat Model, Schlüsselkonzept und Security Review.                               |
| Core Web Vitals: LCP, FID, CLS                     | Veraltet: FID wurde 2024 durch INP ersetzt.                                                                                        | LCP ≤2,5 s, INP ≤200 ms und CLS ≤0,1 am 75. Perzentil, getrennt nach Mobil/Desktop.                                             |
| Experience Lens 1–10                               | Zehn fachlich unterscheidbare Stufen sind nicht belegt und erhöhen Einstellungs-/Testkomplexität.                                  | Guided, Advanced und Expert bleiben die drei semantischen Linsen. Eine 1–10-Skala benötigt vorher Nutzerforschung.              |
| Experten erhalten keine Erklärhinweise             | UX- und Safety-Risiko. Experten brauchen weniger Unterbrechung, aber weiterhin Scope, Provenienz und Hilfe auf Abruf.              | Hilfe bleibt in allen Linsen verfügbar; nur Darstellung und Dichte ändern sich.                                                 |
| Alle Kennzahlen seien „aktuell“ oder live          | Ohne Sensor-Gateway falsch.                                                                                                        | Jeder Wert trägt den Zustand Soll, gemessen, simuliert, fehlend oder veraltet. Kein Fake-Live-Modus.                            |
| Slider/Drehregler für Dosierung                    | Für präzise oder risikoreiche Eingaben oft ungeeignet.                                                                             | Gelabelte Zahleneingabe, Einheit, Schrittweite, Grenzbegründung und Bestätigung; Slider nur als ergänzende Exploration.         |
| Kritische Alerts als Toast                         | Flüchtige Toasts reichen für sicherheitsrelevante Informationen nicht aus.                                                         | Persistentes Alert-Center, inline Fehler, `aria-live` und quittierbare Historie; Toast nur als Zusatzsignal.                    |
| Formeln aus Excel pauschal in API übertragen       | Kein Backend vorhanden oder nötig; Snapshot und portierte Domain-Funktionen existieren.                                            | Nur editierbare/aktive Formeln portieren und gegen XLSX-Fixtures testen.                                                        |
| Jest/RTL plus Cypress                              | Doppelung zum vorhandenen Vitest-/Playwright-Stack.                                                                                | Vitest, Playwright und Axe bleiben kanonisch. RTL nur für einen konkret identifizierten Komponenten-Testbedarf.                 |
| GitFlow sei Pflicht                                | Für ein privates, kleines Repository unnötig schwer.                                                                               | Kurze Feature-Branches/PRs, Required Checks und linearer Verlauf; Release-Tags für freigegebene Versionen.                      |
| Kalenderdaten und 4–6-/8–12-Wochen-Schätzungen     | Ohne Team, Scope und Abhängigkeiten Scheingenauigkeit.                                                                             | Outcome-Meilensteine mit Exit-Kriterien statt unbelegter Kalenderprognose.                                                      |

## Belegte technische Leitplanken

- Aktuelle Core Web Vitals sind LCP, INP und CLS. Die empfohlenen Grenzwerte werden am 75. Perzentil bewertet. [web.dev Web Vitals](https://web.dev/articles/vitals)
- OWASP empfiehlt, sensible Informationen nicht in Local Storage abzulegen; ein XSS kann dort gespeicherte Daten lesen oder verändern. [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- Web Crypto ist eine Low-Level-API; sicheres Schlüsselmanagement und Gesamtdesign sind ausdrücklich schwierig. [MDN Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- Ein statischer Next.js-Export unterstützt keine dynamischen Request-Werte, Cookies, Server Actions oder andere serverpflichtige Features. Next.js ist daher keine kostenlose Backend-Schicht. [Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- GitHub kann Required Reviews, Status Checks, lineare Historie und Deployment-Regeln erzwingen. [GitHub Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

## Verbindliches Zielbild

```text
Heute
Browser -> React/Vite -> kanonische JSON-Snapshots
                    -> lokale, nicht sensible Präferenzen
                    -> Import/Export durch den Nutzer

Optional nach Capability-Trigger
Browser -> authentifizierte API -> PostgreSQL
        -> Sensor-Gateway       -> normalisierte Messereignisse
        -> Export-Worker        -> reproduzierbare PDF/XLSX-Artefakte
```

Ein Backend wird erst eingeführt, wenn mindestens eine Serverfähigkeit validiert ist und Offlineverhalten, Datenklassifikation, Authentifizierung, Backup, Migration, Kosten und Betrieb geklärt sind.

## Outcome-Roadmap

1. **Run-Log lokal:** versioniertes Ereignismodell, Import/Export, Migration und Restore-Test.
2. **Datenwahrheit:** Soll/gemessen/simuliert/fehlend/veraltet in Typen und UI sichtbar.
3. **Kritische Alerts:** persistente Historie, Quittierung und zugängliche Live-Region.
4. **Parität:** aktive Formeln gegen XLSX-Fixtures; keine pauschale API-Portierung.
5. **Performance:** Lab-Budget im CI und reale p75-Felddaten erst nach datenschutzgerechtem Opt-in.
6. **Backend-ADR:** nur bei einem validierten Sensor-, Multi-User- oder Export-Use-Case öffnen.

Die maschinenlesbare Fassung liegt in `src/data/capability-roadmap.json`.
