<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/logo-dark.png">
    <img src="docs/brand/logo.png" alt="Heat Pump Flow Card" width="580">
  </picture>
</p>

<p align="center">
  <a href="https://hacs.xyz/"><img alt="HACS" src="https://img.shields.io/badge/HACS-custom-41BDF5.svg"></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://github.com/Xerolux/heatpump-flow-card/releases/latest"><img alt="release" src="https://img.shields.io/github/v/release/Xerolux/heatpump-flow-card?display_name=tag&color=0369a1"></a>
  <a href="https://xerolux.github.io/heatpump-flow-card/"><img alt="demo" src="https://img.shields.io/badge/live-demo-0ea5e9"></a>
</p>

Ein animiertes Hydraulikschema für Home Assistant. Die Karte zeichnet deine
Heizungsanlage so, wie sie verrohrt ist – Wärmepumpe, Pufferspeicher,
Warmwasser, Photovoltaik, Solarthermie und bis zu sieben Heizkreise – und stellt
die Live-Werte genau dort dar, wo sie hingehören.

*[English version](README.md)* · **[Live-Demo](https://xerolux.github.io/heatpump-flow-card/)** · **[Wiki](https://github.com/Xerolux/heatpump-flow-card/wiki)**

![Layout „full“](docs/images/full.png)

## Was die Karte kann

* **Rohre transportieren Temperaturen.** Jedes Rohr wird nach der Temperatur
  eingefärbt, die es führt. Sind beide Enden bekannt, verläuft die Farbe
  *entlang des Rohres* – man sieht also, wie das Wasser auf dem Rückweg von den
  Heizkörpern abkühlt.
* **Was läuft, bewegt sich.** Der Ventilator der Wärmepumpe dreht sich (schneller
  bei höherer Verdichterlast), Umwälzpumpen laufen, und durch jedes
  durchströmte Rohr wandern Punkte. Inaktive Stränge werden abgedunkelt und
  stehen still.
* **Alles ist bedienbar.** Klick auf die Wärmepumpe schaltet sie ein oder aus,
  Klick auf einen Betriebsart-Chip wählt Heizen, Kühlen oder Warmwasser, Klick
  auf einen Sollwert öffnet ein Plus/Minus-Stellfeld. Langes Drücken öffnet
  immer den Info-Dialog.
* **Jeder Heizkreis antwortet für sich.** Dass Kreis A läuft, sagt nichts über
  Kreis D: jedes Panel, jede Pumpe und jedes Rohr zeigt den eigenen Zustand.
* **Achtzehn fertige Layouts** – von der kompakten Karte mit einem Kreis bis zur
  kompletten Anlage, mit oder ohne Warmwasser, PV, Solarthermie oder Puffer.
* **Grafischer Editor** – YAML ist möglich, aber nicht nötig.
* **Nichts ist Pflicht.** Fehlt ein Sensor, bleibt die Stelle einfach leer,
  statt dass die Karte kaputtgeht.
* Deutsche und englische Beschriftung, helles und dunkles Theme, und
  `prefers-reduced-motion` wird respektiert.

## Layouts

Im Editor eine fertige Anlage auswählen oder `layout:` im YAML setzen. Das
Layout legt nur fest, was **standardmäßig** gezeichnet wird – jeder Abschnitt
lässt sich mit einem eigenen Block ergänzen oder mit `false` entfernen.

| `layout` | Speicher | Warmwasser | PV | Solarthermie | Heizkreise |
| --- | :-: | :-: | :-: | :-: | :-: |
| `compact` | ● | | | | 1 |
| `compact-dual` | ● | | | | 2 |
| `single` | ● | | | | 1 |
| `dual` | ● | | | | 2 |
| `triple` | ● | | | | 3 |
| `quad` | ● | | | | 4 |
| `dhw` | ● | ● | | | 1 |
| `dhw-dual` | ● | ● | | | 2 |
| `dhw-quad` | ● | ● | | | 4 |
| `pv-single` | ● | | ● | | 1 |
| `pv-dual` | ● | | ● | | 2 |
| `pv-dhw-dual` | ● | ● | ● | | 2 |
| `solar-dual` | ● | ● | | ● | 2 |
| `full` | ● | ● | ● | ● | 2 |
| `full-quad` | ● | ● | ● | ● | 4 |
| `direct` | | | | | 1 |
| `direct-dual` | | | | | 2 |
| `direct-dhw` | | ● | | | 2 |

Bis zu **sieben** Heizkreise (A–G) sind möglich – `circuits:` sticht immer das,
was das Layout mitbringt.

## Galerie

**`compact` – Wärmepumpe, Speicher, ein Kreis, passt in eine schmale Spalte**

![compact](docs/images/compact.png)

**`single` – ein Heizkreis mit allen Details**

![single](docs/images/single.png)

**`dual` – Heizkörper und Fußbodenheizung**

![dual](docs/images/dual.png)

**`dhw-dual` – Warmwasser und zwei Kreise, ohne PV, ohne Solarthermie**

![dhw-dual](docs/images/dhw-dual.png)

**`pv-dual` – mit Photovoltaik, ohne Solarthermie**

![pv-dual](docs/images/pv-dual.png)

**`full` – die komplette Anlage**

![full](docs/images/full.png)

**`direct-dhw` – ohne Pufferspeicher: die Wärmepumpe speist den Verteiler
direkt, hier mit vier Kreisen inklusive Gebläsekonvektor und Pool**

![ohne Pufferspeicher](docs/images/advanced.png)

**Jeder Heizkreis zeigt seinen eigenen Zustand.** A wird versorgt, C auch; B ist
über sein Zeitprogramm geparkt und D ist aus. Panels, Pumpen und Rohre folgen
jedem Kreis einzeln – nur der Verteiler führt Wasser, solange *irgendein* Kreis
zieht.

![vier Heizkreise mit unterschiedlichem Zustand](docs/images/circuits.png)

**Dunkles Theme** – die Karte übernimmt das Theme des Dashboards:

![dunkles Theme](docs/images/dual-dark.png)

## Installation

### HACS (empfohlen)

1. HACS → Drei-Punkte-Menü → **Benutzerdefinierte Repositories**
2. Repository: `https://github.com/Xerolux/heatpump-flow-card`, Kategorie
   **Dashboard** (in älteren HACS-Versionen *Lovelace*/*Plugin*)
3. **Heat Pump Flow Card** installieren, danach den Browser neu laden.

### Manuell

1. `dist/heatpump-flow-card.js` nach `config/www/heatpump-flow-card.js` kopieren.
2. Einstellungen → Dashboards → Drei-Punkte-Menü → **Ressourcen** →
   **Ressource hinzufügen**
   * URL: `/local/heatpump-flow-card.js`
   * Typ: **JavaScript-Modul**

## Schnellstart

Karte hinzufügen, nach **Heat Pump Flow Card** suchen und im Editor die
Entitäten auswählen. Das gleiche als YAML für eine kleine Anlage:

```yaml
type: custom:heatpump-flow-card
layout: single
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
```

Weitere Beispiele – auch eine Anlage ohne Puffer und eine mit vier Kreisen –
liegen in [`examples/`](examples).

## Bedienen direkt in der Karte

Ein Klick tut das Naheliegende für die Entität hinter dem Element, langes
Drücken öffnet immer den Info-Dialog:

| Entität hinter dem Element | Ein Klick |
| --- | --- |
| `switch`, `light`, `fan`, `input_boolean`, `valve`, `humidifier` | schaltet um |
| `button`, `input_button`, `script`, `scene` | löst aus |
| `select`, `input_select` | öffnet die Auswahlliste |
| `number`, `input_number` | öffnet ein Plus/Minus-Stellfeld mit min/max/step |
| `climate` | öffnet HVAC-Modi und Solltemperatur |
| `water_heater` | öffnet Betriebsarten und Solltemperatur |
| `sensor`, `binary_sensor`, alles andere | öffnet more-info |

![Bedienfeld](docs/images/controls.png)

Bedienbare Werte bekommen eine gepunktete Unterstreichung, Betriebsart-Chips
einen kleinen Pfeil. Dafür gibt es zwei zusätzliche Felder:

```yaml
heatpump:
  mode: select.system_mode          # Chip an der Wärmepumpe, Klick wechselt die Betriebsart
circuits:
  - mode: climate.circuit_a         # Chip am Heizkreis
    target_temp: climate.circuit_a  # Sollwert dieses Thermostats
dhw:
  mode: water_heater.dhw            # Chip am Warmwasser
  boost: switch.onetime_dhw         # zusätzlicher Chip, ein Klick
```

Eine `climate`- oder `water_heater`-Entität als `target_temp`, `temp` oder
`room_temp` liest automatisch das passende Attribut – `target_temp:
climate.circuit_a` zeigt also den Sollwert und nicht das Wort „heat“.

Mit `controls: false` gibt es wieder nur die Info-Dialoge; einzelne Elemente
lassen sich weiterhin per `tap_action` überschreiben.

## Optionen

### Karte

| Option | Typ | Standard | Beschreibung |
| --- | --- | --- | --- |
| `type` | string | — | `custom:heatpump-flow-card` |
| `layout` | string | `dual` | `compact`, `single`, `dual` oder `full` |
| `title` | string | — | Überschrift der Karte |
| `animation` | boolean | `true` | Punkte durch die Rohre bewegen |
| `flow_speed` | number | `1` | Geschwindigkeit, `0.2` – `3` |
| `temperature_colors` | boolean | `true` | `false` = Vorlauf rot, Rücklauf blau |
| `controls` | boolean | `true` | `false` = jeder Klick öffnet nur more-info |
| `heatpump` | object | `{}` | siehe unten |
| `buffer` | object \| `false` | sichtbar | Pufferspeicher |
| `dhw` | object \| `false` | nur `full` | Warmwasser |
| `pv` | object \| `false` | nur `full` | Photovoltaik |
| `solar` | object \| `false` | nur `full` | Solarthermie |
| `circuits` | Liste | 1–2 Kreise | Heizkreise, bis zu 7 (A–G) |

### `heatpump`

| Option | Beschreibung |
| --- | --- |
| `name` | Beschriftung, Standard „Wärmepumpe“ |
| `entity` | Klick auf die Wärmepumpe schaltet diese Entität |
| `state_entity` | Entscheidet, ob die Wärmepumpe als laufend gilt |
| `mode` | Betriebsart; `Heizen`/`Kühlen`/`Warmwasser`/`Abtauen`/`Bereitschaft` werden aus dem Statustext erkannt, bei `climate`-Entitäten wird `hvac_action` automatisch verwendet |
| `power`, `cop`, `outside_temp`, `compressor` | Werte neben dem Außengerät (die ersten drei werden angezeigt, die Verdichterlast bestimmt zusätzlich die Drehzahl des Ventilators) |
| `flow_temp`, `return_temp` | Färben und beschriften die Rohre zum Speicher |
| `power_threshold` | Watt, ab denen die Wärmepumpe als laufend gilt (Standard `20`) |

Ohne `state_entity` wird der Reihe nach `power` > Schwelle, `compressor` > 0 und
zuletzt der Zustand von `entity` ausgewertet.

### `buffer`

`name`, `entity`, `top`, `middle`, `bottom`, `charge`

Der Speicher wird mit einem Verlauf zwischen den Schichttemperaturen gefüllt.
`charge` erscheint unter dem Namen. Mit `buffer: false` speist die Wärmepumpe
die Heizkreise direkt.

### `dhw`

`name`, `entity`, `temp`, `target_temp`, `charge`, `pump`, `mode`, `boost`

### `pv` / `solar`

| Abschnitt | Optionen |
| --- | --- |
| `pv` | `name`, `entity`, `power`, `battery`, `grid`, `threshold` (Watt, Standard `5`) |
| `solar` | `name`, `entity`, `collector_temp`, `pump`, `yield`, `return_temp` |

Der Solarkreis wird in den unteren Teil des Pufferspeichers gezeichnet und
braucht deshalb einen Puffer.

### `circuits[]`

| Option | Beschreibung |
| --- | --- |
| `name` | Beschriftung |
| `type` | `radiator`, `underfloor`, `fancoil`, `pool` oder `generic` |
| `entity` | Klick auf den Heizkreis schaltet diese Entität |
| `flow_temp`, `return_temp` | Temperaturen und Rohrfarben |
| `room_temp`, `target_temp`, `humidity` | Weitere Werte (vier werden angezeigt) |
| `mode` | Chip mit der Betriebsart (`select`, `climate` oder einfacher Sensor) |
| `pump` | Umwälzpumpe, bestimmt auch, ob der Kreis durchströmt wird |
| `valve` | Mischer, wird als Prozentwert unter dem Symbol angezeigt |

Ein Heizkreis gilt als aktiv, wenn seine `pump` an ist. Ohne Pumpe parkt ihn
eine `mode` mit *aus*, *off*, *standby*, *idle* oder *geschlossen*, sonst zählt
die Mischerstellung, dann `entity` – und erst wenn nichts davon konfiguriert
ist, der Zustand der Wärmepumpe.

### Langform für jeden Wert

Jeder Wert akzeptiert eine Entitäts-ID oder ein Objekt:

```yaml
heatpump:
  power:
    entity: sensor.wp_leistung
    name: Aufnahme
    decimals: 0
    unit: W
    attribute: null        # statt des Zustands ein Attribut lesen
    tap_action:
      action: more-info
```

`tap_action` und `hold_action` folgen der üblichen Home-Assistant-Syntax
(`more-info`, `toggle`, `navigate`, `url`, `perform-action`, `none`) und lassen
sich an jedem Element setzen – Wärmepumpe, Speicher, Heizkreis oder einzelner
Wert. Ohne Angabe werden schaltbare Entitäten umgeschaltet, alles andere öffnet
den Info-Dialog.

## Farben

Rohre und Werte folgen einer Temperaturskala: tiefblau unter 0 °C, hellblau um
15 °C, neutrales Grau bei Raumtemperatur, Bernstein ab 30 °C, Orange ab 40 °C
und Rot ab 50 °C. Werte nahe der Raumtemperatur behalten die normale Textfarbe,
damit sie lesbar bleiben. Mit `temperature_colors: false` gibt es das klassische
Schema Vorlauf rot / Rücklauf blau.

## Mehr

* **[Live-Demo](https://xerolux.github.io/heatpump-flow-card/)** – die echte
  Karte im Browser, ganz ohne Home Assistant
* **[Wiki](https://github.com/Xerolux/heatpump-flow-card/wiki)** – Installation,
  alle Optionen, Bedienung, Problemlösung, Entwicklung
* **[Beispiele](examples)** – sechs fertige Konfigurationen

## Entwicklung

```bash
npm install
npm run check        # Syntaxprüfung
npm test             # rendert die Karte in Chromium und prüft das Verhalten
npm run screenshots  # docs/images neu erzeugen
```

`tools/preview.html` öffnet die Karte im normalen Browser mit einem
Home-Assistant-Mock – praktisch beim Feinschliff der Zeichnung.

## Kompatibilität

Die Karte ist herstellerneutral. Sie weiß nichts über konkrete Hardware – sie
liest und schreibt ganz normale Home-Assistant-Entitäten und funktioniert
deshalb mit **jeder** Wärmepumpe, Solarthermie, Photovoltaik, jedem
Pufferspeicher und jeder Heizungssteuerung, solange die Werte in Home Assistant
ankommen. Ob sie aus einer Hersteller-Integration, per Modbus, MQTT, ESPHome,
von einem Shelly oder aus ein paar DS18B20-Fühlern kommen, spielt keine Rolle:
das passende Feld auf die richtige Entität zeigen lassen, und die Zeichnung
folgt.

Für die Bedienung gilt dasselbe – alles Schreibbare funktioniert, egal ob
`switch`, `number`, `select`, `climate` oder `water_heater`.

Eine der Beispieldateien ist zufällig auf die IDM-Integration verdrahtet, weil
die genau diese Entitätstypen bereitstellt. Das ist ein Beispiel, keine
Voraussetzung.
