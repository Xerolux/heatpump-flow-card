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
| `zoom` | boolean | `true` | Die Lupe, die die Karte bildschirmfüllend öffnet |
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
| `status` | Was die Wärmepumpe gerade meldet. Sticht `mode` für Chip und Animation – der Chip kann also „Abtauen“ zeigen, während die Anlage auf „Automatik“ steht |
| `aux_heat` | Zweiter Wärmeerzeuger – eigene Zeile im Panel, leuchtet unter Last |
| `aux_heat_power` | Dessen Leistung, in derselben Zeile |
| `defrost` | Binärsensor, der die Abtau-Darstellung erzwingt, wenn der Statustext sie nicht hergibt |
| `flow_rate` | Durchfluss durch die Wärmepumpe, als Pille unter der Vorlauftemperatur |
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
| `heater` | Heizstab im Speicher – glüht, solange er Leistung zieht, Klick bedient ihn |
| `heater_power` | Dessen Leistung, unter dem Heizstab |
| `heater_temp` | Seine eigene Temperatur, neben der Leistung |
| `heater_mode` | Aus / Automatik / Boost – übernimmt den Klick auf den Heizstab |

Nur `top` und `bottom` konfiguriert → zwei Pillen. Gar nichts → drei leere.
`buffer: false` verrohrt die Wärmepumpe direkt auf die Heizkreise.

## dhw

`name`, `entity`, `temp`, `target_temp` (Klick öffnet das Stellfeld), `mode`
(Betriebsart-Chip), `boost` (Chip für die Einmalladung), `pump`, `charge`,
`heater`, `heater_power`.

## pv und solar

| Abschnitt | Optionen |
| --- | --- |
| `pv` | `name`, `entity`, `power`, `battery`, `grid`, `battery_power`, `grid_power`, `wallbox`, `house`, `threshold` (Watt, Standard `5`) |
| `solar` | `name`, `entity`, `collector_temp`, `flow_temp`, `return_temp`, `pump`, `yield` |

Die PV-Fläche zeichnet eine gestrichelte Energielinie zur Wärmepumpe, solange
sie produziert. Der Solarkreis wird unten in den Pufferspeicher geführt und
braucht deshalb einen Puffer; beide Temperaturen erscheinen als Pillen an
seinen Rohren: `flow_temp` (oder der Kollektor) auf dem Weg nach unten,
`return_temp` auf dem Rückweg.

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

## Was sich zwischendurch zuschaltet

![Abtauen, mit laufendem Heizstab im Speicher](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/extras.png)

```yaml
heatpump:
  mode: select.system_mode        # was sie tun soll, und worüber du es änderst
  status: sensor.operating_state  # was sie gerade tatsächlich tut
  aux_heat: binary_sensor.second_heat_generator
  aux_heat_power: sensor.heating_element_power
buffer:
  heater: switch.ac_thor          # Heizstab im Speicher
  heater_power: sensor.ac_thor_power
```

* **Zweiter Wärmeerzeuger** – die Zeile leuchtet und die Wendel glüht, solange
  die bivalente Stufe Last übernimmt. Als laufend gilt sie, wenn `aux_heat` an
  ist oder – ohne diese Entität – `aux_heat_power` über null liegt.
* **Abtauen** – vom Außengerät steigt Dampf auf und der Ventilatorring wird
  eisblau, sobald die Betriebsart auf Abtauen hinausläuft. Erkannt werden
  *defrost*, *abtau* und *enteis* im Zustandstext von `status` oder `mode`;
  `defrost` erzwingt es.
* **Heizstab im Speicher** – auf etwa zwei Dritteln Höhe in den Speicher
  gezeichnet, glüht im Betrieb, darunter die Leistung. Funktioniert bei
  `buffer` und bei `dhw` – ein AC-Thor im Puffer und ein Booster im
  Warmwasserspeicher lassen sich also beide zeigen.

## Die elektrische Seite

Sobald `battery_power`, `grid_power`, `wallbox` oder `house` gesetzt ist,
zeichnet die Karte unter der Anlage eine Stromschiene. Photovoltaik, Batterie,
Netz, Wallbox, Haus, Wärmepumpe und ein Heizstab im Speicher hängen daran, und
jeder Knoten entscheidet selbst, in welche Richtung sein Strom fließt.

```yaml
pv:
  power: [sensor.wechselrichter_1, sensor.wechselrichter_2]
  battery: sensor.batterie_ladestand      # Prozent, steht neben dem Namen
  battery_power: sensor.batterie_leistung # + laden, - entladen
  grid_power: sensor.netz_leistung        # + Bezug, - Einspeisung
  wallbox: sensor.wallbox_leistung        # openWB oder jede andere
  house: sensor.hausverbrauch
```

| Knoten | Kommt aus | Richtung |
| --- | --- | --- |
| Photovoltaik | `pv.power` | bei Erzeugung immer in die Schiene |
| Batterie | `pv.battery_power` | beim Laden aus der Schiene, beim Entladen hinein |
| Netz | `pv.grid_power` (oder `pv.grid`) | beim Bezug in die Schiene, bei Einspeisung heraus |
| Wallbox | `pv.wallbox` | beim Laden aus der Schiene |
| Haus | `pv.house` | aus der Schiene |
| Wärmepumpe | `heatpump.power` | aus der Schiene, solange sie zieht |
| Heizstab | `buffer.heater_power` oder `dhw.heater_power` | aus der Schiene, solange er zieht |

Zähler sind sich nicht einig, welche Richtung positiv zählt. Zeigt ein Pfeil
falsch herum, dreht man genau diese Entität um:

```yaml
  grid_power:
    entity: sensor.netz_leistung
    invert: true
```

Ein Knoten bleibt still, solange seine Leistung innerhalb von `threshold` Watt
um null liegt (Standard 5). `electrics: false` auf oberster Ebene schaltet die
Schiene wieder ab.

Den Hausverbrauch gibt es selten als eigene Entität, und bei DC-gekoppelter
Batterie die PV-Erzeugung auch nicht. Beides ist eine Subtraktion entfernt –
siehe [Vorlagen-Sensoren](Template-Sensors-de), dort steht auch der Test, in
welche Richtung dein Zähler positiv zählt.
