# Controls

The card is a control surface, not just a picture. A **tap** does what the
entity behind an element affords, a **long press** always opens the more-info
dialog.

![The control panel](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/controls.png)

| Entity behind the element | A tap does |
| --- | --- |
| `switch`, `light`, `fan`, `input_boolean`, `valve`, `humidifier`, `siren` | Toggles it |
| `button`, `input_button`, `script`, `scene` | Presses it |
| `select`, `input_select` | Opens the option list |
| `number`, `input_number` | Opens a plus/minus stepper honouring min, max and step |
| `climate` | Opens the hvac modes together with the target temperature |
| `water_heater` | Opens the operation modes together with the target temperature |
| `cover`, `media_player` | Toggles it |
| `sensor`, `binary_sensor`, everything else | Opens more-info |

The panel is a small popover anchored to the element you tapped. Close it with
<kbd>Esc</kbd>, a click next to it, or by tapping the same element again. Its
**Details** button opens the full more-info dialog.

## Where the controls sit

* **Heat pump** — the panel itself operates `entity`; the mode chip at the
  bottom operates `mode`.
* **Heating circuit** — the panel operates `entity`, the chip in the corner
  operates `mode`, the pump symbol operates `pump`, the mixer operates `valve`,
  and each value operates its own entity.
* **Hot water** — same, plus an optional `boost` chip for a one-time charge.
* **Buffer tank** — the tank operates `entity`, each layer pill opens its
  sensor.
* **Every value** — flow, return, room, setpoint: whatever entity is behind it.

## How you can tell

Values that can be operated get a dotted underline. Chips that open a list get
a chevron. Chips that toggle or press have neither — one tap and it happens.

## Wiring modes and setpoints

```yaml
heatpump:
  mode: select.system_mode
circuits:
  - mode: climate.circuit_a          # hvac modes and the room setpoint
    target_temp: climate.circuit_a
  - mode: select.circuit_b_mode      # a plain option list
    target_temp: number.circuit_b_room_setpoint
dhw:
  mode: water_heater.dhw
  target_temp: number.dhw_setpoint
  boost: switch.onetime_dhw_charge
```

A mode chip shows the entity's own state, which Home Assistant has already
translated. Only technical tokens such as `heating` or `heat_cool` are replaced
by the card's own German or English wording.

## Overriding a single element

Any element accepts the standard Home Assistant action syntax:

```yaml
heatpump:
  entity: switch.heat_pump
  tap_action:
    action: more-info
  hold_action:
    action: navigate
    navigation_path: /lovelace/heating
```

Supported actions: `control` (the default described above), `more-info`,
`toggle`, `navigate`, `url`, `perform-action` (alias `call-service`) and
`none`.

## Turning it all off

```yaml
controls: false
```

Every tap then opens more-info, and the affordance marks disappear. Useful on a
wall tablet where a stray tap should not change the heating.
