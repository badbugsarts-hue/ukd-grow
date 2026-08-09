# Vollständiger Funktions- und Release-Test · 2026-08-09

## Ergebnis

`pnpm check` ist am 09.08.2026 vollständig erfolgreich durchgelaufen.

| Gate | Ergebnis |
| --- | --- |
| Biome-Lint | bestanden, 0 Fehler |
| TypeScript | bestanden, 0 Fehler |
| Vitest | 17/17 Unit-Tests bestanden |
| Content-Gate | 22 Claims, 32 Quellen, 55 Findings und 7 Skills validiert |
| Produktionsbuild | bestanden |
| Produktionsaudit | 0 bekannte Schwachstellen |
| Build-Budget | initialer JS-Chunk 252,6 kB / maximal 300 kB |
| Playwright | 37 bestanden, 11 absichtlich plattformspezifisch übersprungen, 0 fehlgeschlagen |
| Axe/WCAG | 17 Ansichten × 2 Themes × Desktop/Mobil ohne automatisiert erkennbare A/AA-Verstöße |

Die elf Skips sind keine offenen Defekte. Sie vermeiden identische Doppelprüfungen: `file://`-Diagnose, Desktop-Shell, Downloadintegrität, Fokuswiederherstellung und Netzwerkfehler werden einmal im Desktop-Projekt geprüft; mobile Navigation und Overflow einmal im Mobile-Projekt.

## Geprüfte Funktionsmatrix

- Alle 17 Routen: Cockpit, Run-Setup, Messungen & Log, Heute, Zeitplan, Mixlabor, Klima & Licht, Nährstoffe, Produkte, Kompatibilität, Diagnose, Knowledge Base, Audit, Rohdaten, Recht & Bestand, Berichte und System.
- Guided, Advanced und Expert auf allen Routen; URL-, LocalStorage-, Tages-, Theme- und Lens-Persistenz einschließlich Grenzwert-Clamping.
- Sidebar, Mobile-Navigation, kontextuelle Hilfe, Escape-Verhalten und globale Suche mit Pfeiltasten/Enter sowie Leersuche.
- Tagesauswahl, Phasenband, Checkliste und geteilter Run-Tag-Zustand.
- Batchskalierung, Null-/Negativwerte, Mischreihenfolge, Klimaformeln und Detailstufen.
- Produkt- und Kompatibilitätssuche, Diagnose-Checkliste, Evidenz- und Auditfilter, Claim-Akkordeon und Quellenlinks.
- Rohdatenblattwechsel, Formelumschaltung und inhaltlich geprüfter JSON-Download.
- RunPackage-/IndexedDB-Persistenz, Soll-/Ist-Erfassung, Warnlogik, Alert-Bestätigung und Ereignislog.
- Sitzungsgebundenes Rechtsprofil, persistente Bestandsereignisse und Datenschutztrennung.
- JSON-Backup/Restore, CSV-, XLSX-, PDF- und Druckexport sowie ungültiger Import.
- Manifest-/Hashdiagnose, Hochkontrast, Textskalierung, Deep-Links und semantisch sortierbare Tabellen.
- Sichtbarer Ladefehler mit Retry sowie direkter `file://`-Aufruf mit verständlicher Startanweisung.
- 390×844 und 1440×900, horizontales Reflow/Overflow, Dark/Light sowie automatisierte WCAG-2.2-AA-Regeln.
- Browserkonsole und unbehandelte Seitenfehler über die Routenmatrix.

## Während des Tests behoben

1. Ein fehlender `day`-Queryparameter wurde wegen `Number(null) === 0` fälschlich zu Tag 0 statt zum gespeicherten Tag.
2. Die Command-Palette kündigte Pfeiltasten/Enter an, implementierte die Navigation aber noch nicht vollständig.
3. Der Claim-Zähler der Suche war hart codiert statt aus der Knowledge Base abgeleitet.
4. Die Bibliothekssuche konnte Begriffe über zwei Tabellenzellen hinweg, etwa „Athena Balance“, nicht finden.
5. Der Experience-Lens-Schalter lag auf kleinen Viewports außerhalb des sichtbaren Bereichs.
6. Gedimmte Mix- und Nährstoffzeilen unterschritten durch Container-Opacity den Mindestkontrast.
7. Mehrere Light-Theme-Tokens lagen knapp unter 4,5:1.
8. Horizontal scrollbare Tabellen waren in Safari nicht per Tastatur fokussierbar.
9. Ungültige, nicht endliche und negative Rechenwerte wurden nicht überall defensiv normalisiert.
10. Die Tabellenkopfzeile lag optisch korrekt, aber semantisch im `<tbody>`; sie wurde in ein echtes `<thead>` verschoben.
11. Der versteckte Restore-Dateiwähler hatte noch keinen zugänglichen Namen.
12. Die npm-Ausgabe von SheetJS/XLSX enthielt zwei hohe Schwachstellen; sie wurde entfernt und der Ersatz einschließlich Transitivität gehärtet.
13. Playwright übernahm lokal einen fremden Dev-Server; Release-Läufe starten nun deterministisch einen eigenen Prozess.

## Reproduzieren

```powershell
cd C:\Users\badbu\Documents\grow
pnpm check
```

Automatisierte Axe-Tests sind ein starkes Regression-Gate, aber kein formaler WCAG-Konformitätsnachweis. Ein finaler Release sollte zusätzlich mit realen Screenreadern, 200-%-Zoom und mindestens einem physischen Touch-Gerät geprüft werden.
