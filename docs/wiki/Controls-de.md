# Bedienung

Die Karte ist eine Bedienoberfläche, kein Bild. Ein **Klick** tut das, was die
Entität hinter dem Element hergibt, **langes Drücken** öffnet immer den
Info-Dialog.

![Das Bedienfeld](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/controls.png)

| Entität hinter dem Element | Ein Klick |
| --- | --- |
| `switch`, `light`, `fan`, `input_boolean`, `valve`, `humidifier`, `siren` | schaltet um |
| `button`, `input_button`, `script`, `scene` | löst aus |
| `select`, `input_select` | öffnet die Auswahlliste |
| `number`, `input_number` | öffnet ein Plus/Minus-Stellfeld mit min, max und step |
| `climate` | öffnet HVAC-Modi und Solltemperatur |
| `water_heater` | öffnet Betriebsarten und Solltemperatur |
| `cover`, `media_player` | schaltet um |
| `sensor`, `binary_sensor`, alles andere | öffnet more-info |

Das Bedienfeld ist ein kleines Popover am angeklickten Element. Schließen mit
<kbd>Esc</kbd>, Klick daneben oder erneutem Klick auf dasselbe Element. Der
Knopf **Details** öffnet den vollen Info-Dialog.

## Wo bedient wird

* **Wärmepumpe** – das Panel bedient `entity`, der Chip unten `mode`.
* **Heizkreis** – Panel bedient `entity`, der Chip in der Ecke `mode`, das
  Pumpensymbol `pump`, der Mischer `valve`, jeder Wert seine eigene Entität.
* **Warmwasser** – dazu ein optionaler `boost`-Chip für die Einmalladung.
* **Pufferspeicher** – der Speicher bedient `entity`, jede Schicht-Pille öffnet
  ihren Sensor.

## Woran man es sieht

Bedienbare Werte bekommen eine gepunktete Unterstreichung. Chips, die eine
Liste öffnen, bekommen einen kleinen Pfeil. Chips, die schalten oder auslösen,
haben keinen – ein Klick genügt.

## Betriebsarten und Sollwerte verdrahten

```yaml
heatpump:
  mode: select.system_mode
circuits:
  - mode: climate.hk_a            # HVAC-Modi und Raumsollwert
    target_temp: climate.hk_a
  - mode: select.hk_b_modus       # einfache Auswahlliste
    target_temp: number.hk_b_raumsoll
dhw:
  mode: water_heater.warmwasser
  target_temp: number.ww_soll
  boost: switch.ww_einmalladung
```

Ein Betriebsart-Chip zeigt den Zustand der Entität, den Home Assistant bereits
übersetzt hat. Nur technische Tokens wie `heating` oder `heat_cool` ersetzt die
Karte durch eigene deutsche Bezeichnungen.

## Einzelne Elemente überschreiben

```yaml
heatpump:
  entity: switch.waermepumpe
  tap_action:
    action: more-info
  hold_action:
    action: navigate
    navigation_path: /lovelace/heizung
```

Unterstützt werden `control` (Standard), `more-info`, `toggle`, `navigate`,
`url`, `perform-action` (alias `call-service`) und `none`.

## Alles abschalten

```yaml
controls: false
```

Dann öffnet jeder Klick nur noch more-info und die Markierungen verschwinden –
praktisch auf einem Wandtablet, wo ein versehentlicher Klick nicht die Heizung
verstellen soll.
