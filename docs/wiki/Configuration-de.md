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
| `flow_speed` | number | `1` | Geschwindigkeit, `0.1`–`5` |
| `temperature_colors` | boolean | `true` | `false` = Vorlauf rot, Rücklauf blau |
| `controls` | boolean | `true` | `false` = jeder Klick öffnet nur more-info |
| `zoom` | boolean | `true` | Die Lupe, die die Karte bildschirmfüllend öffnet |
| `heatpump` | object | `{}` | Das Wärmepumpen-Panel |
| `buffer` | object \| `false` | sichtbar | Pufferspeicher |
| `dhw` | object \| `false` | nur `full` | Warmwasser |
| `pv` | object \| `false` | nur `full` | Photovoltaik |
| `solar` | object \| `false` | nur `full` | Solarthermie |
| `electrics_style` | string | `tiles` | `flow` zeichnet den Strombus als runde Knoten auf einer dünnen Linie |
| `wood_stove` | object \| `false` | aus | Zweiter, von Hand beschickter Wärmeerzeuger — siehe unten |
| `circuits` | Liste \| number | 1–2 | Heizkreise, bis zu **sieben** (A–G); eine nackte Zahl erzeugt so viele Platzhalter-Kreise |

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
| `ref_discharge_temp` | Heißgastemperatur des Kältemittels, Messpunkt 1 des Kältekreises |
| `ref_condenser_temp` | Verflüssigertemperatur, Punkt 2 |
| `ref_liquid_temp` | Temperatur der Flüssigkeitsleitung, Punkt 3 |
| `ref_suction_temp` | Sauggastemperatur, Punkt 4 |
| `ref_circuit` | `false` blendet den Kältekreis aus. Standardmäßig wird er gezeichnet, sobald einer der vier Sensoren gesetzt ist |
| `defrost` | Binärsensor, der die Abtau-Darstellung erzwingt, wenn der Statustext sie nicht hergibt |
| `flow_rate` | Durchfluss durch die Wärmepumpe, als Pille unter der Vorlauftemperatur |
| `power` | Leistung, neben dem Außengerät |
| `cop` | Arbeitszahl / COP |
| `outside_temp` | Außentemperatur |
| `compressor` | Verdichterlast in Prozent – bestimmt auch die Drehzahl des Ventilators |
| `flow_temp` | Vorlauf: Pille und Rohrfarbe Richtung Speicher |
| `return_temp` | Rücklauf: Pille und Rohrfarbe zurück |
| `fan` | `false` für Sole/Wasser- oder Wasser/Wasser-Geräte: kein Außengerät-Ventilator — stattdessen zwei Sole-Anschlüsse — und kein Abtau-Dampf |
| `power_threshold` | Watt, ab denen die Wärmepumpe als laufend gilt (Standard `20`) |

`cop` kennt auch die Langform: `{ calculate: true, thermal_power: sensor.heizleistung, power: sensor.wp_leistung }`
teilt die Heizleistung durch die elektrische Aufnahme, beide vorher einheitlich
in Watt umgerechnet, sodass kW gegen W aufgeht. Läuft die Wärmepumpe nicht,
bleibt der Wert leer. `decimals` wird beachtet (Standard 2); ein einfacher
COP-Sensor bleibt unterstützt.

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

Die Beschriftung des Heizstabs trägt seinen `heater_mode` neben dem Namen. Ein
reiner `switch` ist die Ausnahme: Eingeschaltet sagt er nur, dass der Heizstab
laufen *darf* – ob er läuft, beantworten Glühen und Wattzahl bereits –, deshalb
wird nur sein *Aus* ausgeschrieben. Eine `select`- oder `climate`-Betriebsart
steht immer da, weil benannte Optionen etwas tragen, das die Zeichnung nicht
zeigen kann.


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

## Stromfluss als Linie oder Hub

`electrics_style: tiles` behält die Kacheln. `flow` zeigt runde Knoten auf einer
Linie; `hub` ordnet PV oben, Netz links, Batterie unten sowie Haus und einzelne
Verbraucher rechts an. Bei `flow` und `hub` wechseln Leistungswerte ab 1 kW zu
kW mit einer Nachkommastelle. Vollständige Namen stehen in bis zu zwei Zeilen.
PV bleibt gelb-orange, Netz indigo und Batterie grün.

```yaml
electrics_style: hub
pv:
  flow_threshold: 25
```

Die Totzone gilt in Watt und beträgt standardmäßig 25. Werte bis einschließlich
dieser Grenze bewegen keine Punkte; `0` deaktiviert die Totzone. Das eigene
`threshold` eines Knotens ersetzt dessen Totzone. Bei `flow` müssen beide Seiten
eines Segments mit bekannten Messwerten dieselbe Richtung bestätigen. Es gilt
der kleinere Betrag; Restleistungen fließen dadurch nicht in inaktive Endgeräte.

Die Hub-Verbindungen sind **geschätzte Verteilungen**, keine gemessene Zuordnung
von Quellen zu Verbrauchern. PV versorgt zuerst gemessene Verbraucher, dann die
Batterieladung und zuletzt die Netzeinspeisung. Entladende Batterie und Netzbezug
decken in dieser Reihenfolge verbleibenden Bedarf. Jede Verbindung bleibt auf
die Messwerte von Quelle und Ziel begrenzt. Unbekannte Werte, ungedeckter Bedarf
und übriger Überschuss erzeugen keine erfundenen Verbindungen. `house.subtract`
darf nur Verbraucher abziehen, die der Hauszähler bereits enthält.
Siehe [vollständiges Beispiel](../../examples/12-energy-hub.yaml).

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
  ref_discharge_temp: sensor.hp_ref_discharge_gas
  ref_condenser_temp: sensor.hp_ref_condenser
  ref_liquid_temp: sensor.hp_ref_liquid_line
  ref_suction_temp: sensor.hp_ref_suction_gas
buffer:
  heater: switch.ac_thor          # Heizstab im Speicher
  heater_power: sensor.ac_thor_power
```

* **Zweiter Wärmeerzeuger** – die Zeile leuchtet und die Wendel glüht, solange
  die bivalente Stufe Last übernimmt. Als laufend gilt sie, wenn `aux_heat` an
  ist oder – ohne diese Entität – `aux_heat_power` über null liegt.
* **Kältekreis** – ein Kreis aus Verdichter, Verflüssiger, Expansionsventil und
  Verdampfer im Wärmepumpen-Panel. Die vier Sensoren sitzen als nummerierte
  Punkte im Kreis und stehen in gleicher Reihenfolge darunter. Ein nicht
  gesetzter Sensor lässt Punkt und Platz abgedunkelt. Die Werte bleiben neutral
  statt in Temperaturfarben, weil das Heißgas weit über die Farbskala
  hinausgeht. Der Verdichter dreht und der Kreis fließt, solange der Verdichter
  läuft – nach `compressor`, wenn gesetzt (null heißt Stillstand), sonst nach
  dem Zustand der Wärmepumpe.
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
  grid_power: sensor.netz_leistung        # + Bezug, - Einspeisung; ggf. unten umdrehen
  wallbox: sensor.wallbox_leistung        # openWB oder jede andere
  house:
    calculate: true                       # Netto-PV + Netz - Wallbox
```

| Knoten | Kommt aus | Richtung |
| --- | --- | --- |
| Photovoltaik | `pv.power` | bei Erzeugung immer in die Schiene |
| Batterie | `pv.battery_power` | beim Laden aus der Schiene, beim Entladen hinein |
| Netz | `pv.grid_power` (oder `pv.grid`) | beim Bezug in die Schiene, bei Einspeisung heraus |
| Wallbox | `pv.wallbox` | beim Laden aus der Schiene |
| Haus | `pv.house`-Entität oder `calculate: true` | aus der Schiene |
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
um null liegt (Standard 5). W- und kW-Entitäten werden davor einheitlich in
Watt umgerechnet. `electrics: false` auf oberster Ebene schaltet die Schiene
wieder ab.

Mit `house: { calculate: true }` berechnet die Karte den restlichen
Hausverbrauch als Netto-Wechselrichterleistung plus normalisierten Netzwert,
abzüglich der separat gezeigten Wallbox. Eine normale Entität funktioniert
weiterhin, wenn die Anlage anders aufgebaut ist oder der Wert auch außerhalb
der Karte gebraucht wird – siehe [Vorlagen-Sensoren](Template-Sensors-de).

**Enthält der Hauszähler einige der großen Verbraucher selbst**, zählt der Bus
sie doppelt. Man nennt, was er schon enthält, und die Karte lässt sie aus der
Hausanzeige heraus:

```yaml
  house:
    entity: sensor.hausverbrauch
    subtract: [heatpump, wallbox, consumers]   # beliebig aus diesen drei
```

Ein Verbrauch ohne eigenen Zähler wird übersprungen, statt den Hauswert ganz
leer zu machen.

**Eigene große Verbraucher** — Klimaanlage, Trockner, Serverschrank — bekommen
eigene Knoten, statt sich im `house`-Wert zu verstecken:

```yaml
  consumers:
    - entity: sensor.klima_leistung
      name: Klima
    - entity: sensor.trockner_leistung
```

Bis zu vier Verbraucher; jeder animiert nur, während er Leistung zieht, und
entscheidet seine Richtung wie jeder andere Knoten selbst.

**Der Look der Schiene** folgt `electrics_style` auf der Karte. `tiles`
(Standard) zeichnet rechteckige Kacheln unter einer kräftigen Energielinie;
`flow` zeichnet runde Knoten auf einer dünnen, durchgehenden Linie — wie die
Tesla-App oder power-flow-card-plus: einspeisende Knoten in ihrer eigenen
Farbe, Punkte, deren Tempo der Leistung folgt, und Leitungsstücke, die nur
Strom führen, wenn die Bilanz der Anlage wirklich durch sie fließt.

## wood_stove

Ein zweiter, von Hand beschickter Wärmeerzeuger — Holzofen, Pelletofen, alles,
was man selbst füllt und entzündet statt einen Kompressor laufen zu lassen —
hängt neben der Wärmepumpe an eigenen Rohren am Pufferspeicher. Bewusst
schlicht: keine Leistung, keine Arbeitszahl, kein Betriebsart-Chip, weil es
das für etwas, das man mit Scheiten lädt, nicht gibt. Er ist aus, solange er
nicht genannt wird — jede bestehende Konfiguration behält ihr Aussehen. Er
speist nur den Pufferspeicher, so wie der Solarthermie-Kreis.

```yaml
wood_stove:
  entity: binary_sensor.holzofen         # Klick schaltet; sein Zustand sagt auch „brennt“
  state_entity: binary_sensor.holzofen_brennt
  status: sensor.holzofen_status         # gemeldeter Zustand, falls vorhanden
  flow_temp: sensor.holzofen_vorlauf
  return_temp: sensor.holzofen_ruecklauf
```
