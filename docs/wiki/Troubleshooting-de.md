# Problemlösung

## „Custom element doesn't exist: heatpump-flow-card“

Der Browser hat das JavaScript nicht geladen.

1. Hart neu laden (<kbd>Strg</kbd>/<kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>).
2. **Einstellungen → Dashboards → Ressourcen**: dort muss ein Eintrag auf die
   Karte zeigen, Typ **JavaScript-Modul**. HACS legt ihn automatisch an, im
   YAML-Modus trägst du ihn selbst ein.
3. Browser-Konsole öffnen: `HEATPUMP-FLOW-CARD v…` erscheint, wenn die Datei
   geladen wurde. Keine Zeile = falsche Ressourcen-URL.

## Überall steht „–“

Die Karte findet keinen Zustand zu diesen Entitäten. Entitäts-IDs unter
**Entwicklerwerkzeuge → Zustände** prüfen; ein Tippfehler erscheint als
Strich, nicht als Fehler. Dasselbe passiert, solange eine Integration noch
startet.

## Ein Wert zeigt das Falsche

Eine `climate`- oder `water_heater`-Entität zeigt ihren *Zustand* (`heat`),
solange die Karte nicht weiß, welches Attribut gemeint ist. Als `target_temp`,
`temp` oder `room_temp` wird es automatisch erkannt, sonst selbst angeben:

```yaml
power:
  entity: climate.hk_a
  attribute: current_temperature
  unit: "°C"
```

## Nichts bewegt sich

* Steht `animation: false` in der Konfiguration?
* Die Systemeinstellung **Bewegung reduzieren** ist aktiv – die Karte hält sich
  daran.
* Es läuft schlicht nichts: Punkte wandern nur durch Rohre, die Wasser führen.

## Ein Heizkreis wirkt aus, obwohl er heizt

Die Karte entscheidet je Kreis, in dieser Reihenfolge:

1. `pump` – wenn konfiguriert, entscheidet sie allein.
2. `mode` – eine Betriebsart mit *aus*, *off*, *standby*, *idle* oder
   *geschlossen* parkt den Kreis.
3. `valve` – Öffnung über 0 %.
4. `entity` – deren Zustand.
5. Nichts konfiguriert? Dann folgt der Kreis der Wärmepumpe.

Ein Kreis mit Pumpen-Entität auf `off` bleibt also aus, während die Wärmepumpe
läuft – und genau das ist der Sinn: dass Kreis A läuft, sagt nichts über
Kreis D.

## Die Wärmepumpe wirkt nie in Betrieb

Ohne `state_entity` prüft die Karte `power` über `power_threshold` (Standard
20 W), dann `compressor` über 0, dann `entity`. Ein Leistungssensor in Kilowatt
braucht eine kleinere Schwelle:

```yaml
heatpump:
  power: sensor.wp_leistung_kw
  power_threshold: 0.02
```

## Klicken tut nichts oder das Falsche

* `controls: false` schaltet die Bedienung ab – jeder Klick öffnet more-info.
* Ein `sensor` lässt sich nicht bedienen; die schreibbare Entität (`number`,
  `select`, `climate`) in das Feld eintragen.
* Ein Element mit `tap_action: {action: none}` schluckt den Klick absichtlich.

## Die Karte ist zu breit

`layout: full` braucht Platz. In einer Abschnitts-Ansicht mehr Spalten geben
oder auf `compact` wechseln. Die Zeichnung skaliert mit der Spaltenbreite – die
Schrift wird kleiner, abgeschnitten wird nichts.

## Der Editor zeigt leere Entitäts-Felder

Optionen in Langform (Objekt mit `entity:`, `attribute:` …) kann das Formular
nicht darstellen. Sie stehen im jeweiligen Abschnitt als *In YAML konfiguriert*,
bleiben beim Speichern unangetastet und lassen sich weiter im YAML-Editor
bearbeiten.

## Immer noch Probleme?

Issue mit Karten-YAML, Home-Assistant-Version und Screenshot eröffnen:
<https://github.com/Xerolux/heatpump-flow-card/issues>
