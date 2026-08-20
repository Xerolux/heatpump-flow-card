# Heat Pump Flow Card

Ein animiertes Hydraulikschema für Home Assistant: Wärmepumpe,
Pufferspeicher, Warmwasser, Photovoltaik, Solarthermie und bis zu sieben
Heizkreise – mit den Live-Werten dort, wo sie in der Zeichnung hingehören, und
alles per Klick bedienbar.

**[Live-Demo](https://xerolux.github.io/heatpump-flow-card/)** ·
[Repository](https://github.com/Xerolux/heatpump-flow-card) ·
[English](Home)

![Die komplette Anlage](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/full.png)

## Einstieg

| Seite | Inhalt |
| --- | --- |
| [Installation](Installation-de) | HACS, manuell, Updates |
| [Konfiguration](Configuration-de) | Alle Optionen, Abschnitt für Abschnitt |
| [Bedienung](Controls-de) | Was ein Klick macht, Betriebsarten, Sollwerte |
| [Problemlösung](Troubleshooting-de) | Karte nicht gefunden, leere Werte, nichts bewegt sich |
| [Layouts](Layouts) | Die vier Varianten (englisch) |
| [Beispiele](Examples) | Fertige Konfigurationen, auch für IDM (englisch) |

## In einer Minute

```yaml
type: custom:heatpump-flow-card
layout: dual
heatpump:
  entity: switch.waermepumpe
  flow_temp: sensor.wp_vorlauf
  return_temp: sensor.wp_ruecklauf
buffer:
  top: sensor.puffer_oben
  bottom: sensor.puffer_unten
circuits:
  - type: radiator
    pump: binary_sensor.hk1_pumpe
  - type: underfloor
    pump: binary_sensor.hk2_pumpe
```

Nichts ist Pflicht. Fehlt ein Sensor, bleibt die Stelle leer, statt dass die
Karte kaputtgeht.

## Was sie besonders macht

* **Rohre führen Temperaturen.** Jedes Rohr wird nach der geführten Temperatur
  eingefärbt; sind beide Enden bekannt, verläuft die Farbe entlang des Rohres –
  man sieht das Wasser auf dem Rückweg abkühlen.
* **Bewegung heißt Betrieb.** Der Ventilator dreht schneller bei höherer
  Verdichterlast, Pumpen laufen, Punkte wandern durch durchströmte Rohre,
  inaktive Stränge werden abgedunkelt und stehen still.
* **Jeder Heizkreis für sich.** Dass Kreis A läuft, sagt nichts über Kreis D –
  jedes Panel, jede Pumpe und jedes Rohr zeigt den eigenen Zustand.
* **Bedienoberfläche statt Bild:** Betriebsarten, Sollwerte, Pumpen und Boost
  sind einen Klick entfernt.
