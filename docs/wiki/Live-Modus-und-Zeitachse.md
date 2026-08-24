# Live-Modus und Zeitachse

Simulation und Live sind getrennte Runs. Beim Live-Start werden Setup, Plan und freigegebene Profile geklont; simulierte Messungen, Tasks und Aktionen werden nicht zu realer Historie.

Der Zeitanker wird im Setup als Aussaat oder Emergence gewählt. Der operative Live-Tag wird aus dem bestätigten UTC-Zeitpunkt in vollständigen 24-Stunden-Perioden berechnet und aktualisiert sich beim Laden sowie während die App geöffnet ist. Der frei gewählte Ansichtstag verändert niemals den realen Live-Tag.

Eine falsche Ankerzeit wird nur mit Begründung append-only korrigiert. Rückwärts springende Systemzeit oder Zeit vor dem Anker blockiert fachliche Tagesaktionen bis zur Prüfung.
