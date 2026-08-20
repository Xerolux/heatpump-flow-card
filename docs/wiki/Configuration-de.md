# Konfiguration

Alles hier funktioniert in YAML und – bis auf die Langform-Felder – auch im
grafischen Editor. Nichts ist Pflicht: ein weggelassener Abschnitt wird leer
gezeichnet, ein Abschnitt auf `false` gar nicht.

## Karten-Optionen

| Option | Typ | Standard | Beschreibung |
| --- | --- | --- | --- |
| `type` | string | — | `custom:heatpump-flow-card` |
| `layout` | string | `dual` | `compact`, `single`, `dual`, `full` |
| `title` | string | — | Überschrift über der Zeichnung |
| `animation` | boolean | `true` | Punkte durch die Rohre bewegen |
| `flow_speed` | number | `1` | Geschwindigkeit, `0.2`–`3` |
| `temperature_colors` | boolean | `true` | `false` = Vorlauf rot, Rücklauf blau |
| `controls` | boolean | `true` | `false` = jeder Klick öffnet nur more-info |
| `heatpump` | object | `{}` | Das Wärmepumpen-Panel |
| `buffer` | object \| `false` | sichtbar | Pufferspeicher |
| `dhw` | object \| `false` | nur `full` | Warmwasser |
| `pv` | object \| `false` | nur `full` | Photovoltaik |
| `solar` | object \| `false` | nur `full` | Solarthermie |
| `circuits` | Liste | 1–2 | Heizkreise, bis zu **sieben** (A–G) |

## heatpump

| Option | Beschreibung |
| --- | --- |
| `name` | Beschriftung, Standard „Wärmepumpe“ |
| `entity` | Klick auf das Panel bedient diese Entität |
| `state_entity` | Entscheidet, ob die Wärmepumpe als laufend gilt |
| `mode` | Betriebsart-Chip; `select` oder `climate` macht daraus eine Auswahl |
| `power` | Leistung, neben dem Außengerät |
| `cop` | Arbeitszahl / COP |
| `outside_temp` | Außentemperatur |
| `compressor` | Verdichterlast in Prozent – bestimmt auch die Drehzahl des Ventilators |
| `flow_temp` | Vorlauf: Pille und Rohrfarbe Richtung Speicher |
| `return_temp` | Rücklauf: Pille und Rohrfarbe zurück |
| `power_threshold` | Watt, ab denen die Wärmepumpe als laufend gilt (Standard `20`) |

Von `power`, `cop`, `outside_temp` und `compressor` werden die ersten drei
gezeichnet.

**Läuft sie?** Die Karte fragt der Reihe nach: `state_entity` → `power` über
`power_threshold` → `compressor` über 0 → Zustand von `entity` → Text von
`mode`. Davon hängt ab, ob der Ventilator dreht und die Rohre zum Speicher
fließen.

## buffer

| Option | Beschreibung |
| --- | --- |
| `name` | Überschrift über dem Speicher |
| `entity` | Klick auf den Speicher bedient diese Entität |
| `top`, `middle`, `bottom` | Schichttemperaturen – füllen den Speicher mit Verlauf und erscheinen als Pillen |
| `charge` | Ladezustand, unter dem Namen |

Nur `top` und `bottom` konfiguriert → zwei Pillen. Gar nichts → drei leere.
`buffer: false` verrohrt die Wärmepumpe direkt auf die Heizkreise.

## dhw

`name`, `entity`, `temp`, `target_temp` (Klick öffnet das Stellfeld), `mode`
(Betriebsart-Chip), `boost` (Chip für die Einmalladung), `pump`, `charge`.

## pv und solar

| Abschnitt | Optionen |
| --- | --- |
| `pv` | `name`, `entity`, `power`, `battery`, `grid`, `threshold` (Watt, Standard `5`) |
| `solar` | `name`, `entity`, `collector_temp`, `pump`, `yield`, `return_temp` |

Die PV-Fläche zeichnet eine gestrichelte Energielinie zur Wärmepumpe, solange
sie produziert. Der Solarkreis wird unten in den Pufferspeicher geführt und
braucht deshalb einen Puffer.

**Läuft Solar?** `pump` → `yield` über 0 → Kollektor über 35 °C.

## circuits

```yaml
circuits:
  - name: Heizkreis A
    type: underfloor
    entity: climate.hk_a
    mode: select.hk_a_modus
    flow_temp: sensor.hk_a_vorlauf
    return_temp: sensor.hk_a_ruecklauf
    room_temp: sensor.wohnzimmer
    target_temp: number.hk_a_raumsoll
    pump: binary_sensor.hk_a_pumpe
    valve: sensor.hk_a_mischer
```

| Option | Beschreibung |
| --- | --- |
| `name` | Beschriftung |
| `type` | `radiator`, `underfloor`, `fancoil`, `pool`, `generic` |
| `entity` | Klick auf das Panel bedient diese Entität |
| `mode` | Betriebsart-Chip |
| `flow_temp`, `return_temp` | Temperaturen und Rohrfarben |
| `room_temp`, `target_temp`, `humidity` | Weitere Werte – vier Spalten werden gezeichnet |
| `pump` | Umwälzpumpe, bestimmt auch, ob der Kreis durchströmt wird |
| `valve` | Mischer, als Prozentwert unter dem Symbol |

**Läuft der Kreis?** `pump` → `mode` auf „Aus“ parkt ihn → `valve` über 0 →
`entity` → sonst folgt er der Wärmepumpe. Jeder Kreis beantwortet das für sich:
dass A läuft, sagt nichts über D.

Sieben Kreise werden unterstützt (A–G). Ein achter Eintrag wird ignoriert,
statt aus der Zeichnung zu laufen.

## Langform für jeden Wert

```yaml
power:
  entity: sensor.wp_leistung
  name: Aufnahme       # überschreibt die Beschriftung
  decimals: 0          # Nachkommastellen
  unit: W              # überschreibt die Einheit
  attribute: null      # statt des Zustands ein Attribut lesen
  tap_action: ...      # siehe Bedienung
  hold_action: ...
```

Eine `climate`- oder `water_heater`-Entität als `target_temp`, `temp` oder
`room_temp` liest automatisch das passende Attribut – `target_temp:
climate.hk_a` zeigt also den Sollwert und nicht das Wort „heat“.
