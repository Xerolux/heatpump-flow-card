# Vorlagen-Sensoren

Zwei Werte, die die Karte zeichnen kann, gibt es selten als eigene Entität:
den **Hausverbrauch** und – bei einer Anlage mit DC-gekoppelter Batterie – die
**tatsächliche PV-Erzeugung**. Beide sind eine Subtraktion von Entitäten, die du
schon hast, und Home Assistant baut sie ohne Zusatz-Integration.

Alles hier ist Home-Assistant-Konfiguration, keine Karten-Konfiguration – die
Karte liest nur den fertigen Sensor.

## Einen Vorlagen-Sensor anlegen

**Über die Oberfläche**, ohne Datei zu bearbeiten:

*Einstellungen → Geräte & Dienste → Helfer → Helfer erstellen → Vorlage →
Sensor mit Vorlage.* Zustandsvorlage einfügen, Maßeinheit `W`, Geräteklasse
*Leistung*, Zustandsklasse *Messung*. Ein Helfer namens `Hausverbrauch` heißt
danach `sensor.hausverbrauch`.

**Über YAML**, in der `configuration.yaml`:

```yaml
template:
  - sensor:
      - name: Hausverbrauch
        unique_id: house_consumption
        unit_of_measurement: W
        device_class: power
        state_class: measurement
        state: >
          ...
```

Danach *Entwicklerwerkzeuge → YAML → Vorlagen-Entitäten* neu laden. Ohne dieses
Neuladen taucht der Sensor nicht auf – der häufigste Grund, warum eine frisch
geschriebene Vorlage zu „fehlen" scheint.

Zum Ausprobieren, bevor du dich festlegst: *Entwicklerwerkzeuge → Vorlage*.
Dort rechnet die Vorlage live gegen deine echten Zustände.

## Hausverbrauch

Was das Gebäude zieht, ist das, was die Wechselrichter liefern, plus das, was
aus dem Netz kommt:

```
Haus = Wechselrichter (netto) + Netzbezug
```

Eine DC-gekoppelte Batterie taucht in der Summe nicht auf, weil ihr Laden und
Entladen bereits im AC-Wert des Wechselrichters steckt. Die Wallbox ziehst du
ab, sonst zählt die Karte sie doppelt – einmal als eigener Knoten und einmal im
Haus.

```yaml
template:
  - sensor:
      - name: Hausverbrauch
        unique_id: house_consumption
        unit_of_measurement: W
        device_class: power
        state_class: measurement
        availability: >
          {{ has_value('sensor.netz_leistung') and has_value('sensor.wechselrichter_1') }}
        state: >
          {# auf false stellen, falls der Wert negativ herauskommt – siehe unten #}
          {% set bezug_positiv = true %}
          {% set wr = states('sensor.wechselrichter_1') | float(0)
                    + states('sensor.wechselrichter_2') | float(0) %}
          {% set netz = states('sensor.netz_leistung') | float(0) %}
          {% set netz = netz if bezug_positiv else -netz %}
          {% set wallbox = states('sensor.wallbox_leistung') | float(0) %}
          {{ (wr + netz - wallbox) | round(0) }}
```

In der Karte dann:

```yaml
pv:
  house: sensor.hausverbrauch
```

## In welche Richtung zählt der Zähler?

Zähler sind sich nicht einig, und die Karte zählt Bezug positiv. Manche
Integrationen liefern sogar beide Richtungen als getrennte Entitäten –
SolarEdge hat `..._ac_power` und `..._ac_power_inverted` genau deswegen.

Messen musst du dafür nichts: **Ein Hausverbrauch kann nicht negativ sein.**
Steht der Sensor oben auf einem plausiblen positiven Wert, passt die
Konvention. Spiegelt er ihn – eine sinnvolle Zahl mit Minus davor –, drehst du
beides gleichzeitig um:

* `bezug_positiv` auf `false` in der Vorlage, und
* `invert: true` beim `grid_power` in der Karte:

```yaml
  grid_power:
    entity: sensor.netz_leistung
    invert: true
```

Beurteile das, während tatsächlich etwas fließt. Mittags, wenn Erzeugung,
Verbrauch und ladende Batterie sich gegenseitig aufheben, steht der Zähler nahe
null und beide Varianten sehen gleich aus.

## PV-Erzeugung bei DC-gekoppelter Batterie

Bei einer Anlage, deren Batterie DC-seitig an einem Wechselrichter hängt, wird
dessen AC-Leistung *negativ*, während die Batterie aus einer anderen Quelle
lädt: Er verbraucht dann, statt zu erzeugen. Die Summe aller Wechselrichter
ergibt deshalb die Nettoleistung des Verbunds – ehrlich, kann nachts aber unter
null gehen.

Wenn du lieber die reine Erzeugung sehen willst, zählst du den
Speicher-Wechselrichter nur, solange er positiv ist:

```yaml
        state: >
          {% set speicher = states('sensor.wechselrichter_1') | float(0) %}
          {{ ([speicher, 0] | max
              + states('sensor.wechselrichter_2') | float(0)
              + states('sensor.wechselrichter_3') | float(0)) | round(0) }}
```

und richtest `pv.power` auf diesen einen Sensor statt auf die Liste der
Wechselrichter.
