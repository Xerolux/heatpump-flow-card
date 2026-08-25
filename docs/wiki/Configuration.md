# Configuration

Everything on this page works in YAML and, apart from the long form fields,
in the visual editor. Nothing is mandatory: a section you leave out is drawn
empty, a section you set to `false` is not drawn at all.

## Card options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | string | — | `custom:heatpump-flow-card` |
| `layout` | string | `dual` | `compact`, `single`, `dual`, `full` — see [Layouts](Layouts) |
| `title` | string | — | Heading above the drawing |
| `animation` | boolean | `true` | Move the dots through the pipes |
| `flow_speed` | number | `1` | Speed multiplier, `0.2`–`3` |
| `temperature_colors` | boolean | `true` | `false` keeps flow red and return blue |
| `controls` | boolean | `true` | `false` makes every tap open more-info |
| `zoom` | boolean | `true` | The magnifier that opens the card full screen |
| `heatpump` | object | `{}` | The heat pump panel |
| `buffer` | object \| `false` | shown | Buffer tank |
| `dhw` | object \| `false` | `full` only | Domestic hot water |
| `pv` | object \| `false` | `full` only | Photovoltaics |
| `solar` | object \| `false` | `full` only | Solar thermal |
| `circuits` | list | 1–2 | Heating circuits, up to **seven** (A–G) |

## heatpump

| Option | Description |
| --- | --- |
| `name` | Label, defaults to “Heat pump” |
| `entity` | Tapping the panel operates this entity |
| `state_entity` | Decides whether the heat pump counts as running |
| `mode` | Operating mode chip; a `select` or `climate` entity makes it a mode picker |
| `status` | What the heat pump reports it is doing. Beats `mode` for the chip and for the animation, so the chip can read “Defrosting” while the plant stays set to “Automatic” |
| `aux_heat` | Second heat generator — an extra row on the panel, lit while it carries load |
| `aux_heat_power` | Its power, printed in that row |
| `defrost` | Binary sensor that forces the defrost look, if the status text does not say it |
| `flow_rate` | Flow rate through the heat pump, as a badge under the flow temperature |
| `power` | Electrical or thermal power, shown next to the unit |
| `cop` | Efficiency / COP |
| `outside_temp` | Outdoor temperature |
| `compressor` | Compressor load in percent — also sets the fan speed |
| `flow_temp` | Flow temperature: badge and pipe colour towards the tank |
| `return_temp` | Return temperature: badge and pipe colour back from the tank |
| `power_threshold` | Watts above which the heat pump counts as running (default `20`) |

Only the first three of `power`, `cop`, `outside_temp`, `compressor` are drawn —
the rest is available through more-info.

**Is it running?** The card asks, in this order: `state_entity` → `power` above
`power_threshold` → `compressor` above 0 → the state of `entity` → the text of
`mode`. The answer decides whether the fan turns and whether the pipes to the
tank flow.

## buffer

| Option | Description |
| --- | --- |
| `name` | Heading above the tank |
| `entity` | Tapping the tank operates this entity |
| `top`, `middle`, `bottom` | Layer temperatures — they fill the tank with a gradient and print as pills |
| `charge` | Charge level, printed under the name |
| `heater` | Electric element inside the tank — glows while it draws power, tap to operate |
| `heater_power` | Its power, printed under the element |
| `heater_temp` | Its own temperature, printed next to the power |
| `heater_mode` | Off / automatic / boost — takes over the tap on the element |

The element's caption carries its `heater_mode` next to the name. A plain
`switch` is the exception: switched on it says only that the element is allowed
to run, which the glow and the wattage already answer, so only its *off* state
is written out. A `select` or `climate` mode is always shown, because named
options carry something the drawing cannot.


Configure only `top` and `bottom` and the tank shows two pills; configure none
and it shows three empty ones. `buffer: false` wires the heat pump straight to
the circuits.

## dhw

| Option | Description |
| --- | --- |
| `name` | Label, defaults to “Hot water” |
| `entity` | Tapping the panel operates this entity |
| `temp` | Current water temperature |
| `target_temp` | Setpoint — tap it for a stepper |
| `mode` | Operating mode chip (`select` or `water_heater`) |
| `boost` | Extra chip for a one-time charge (`button` or `switch`) |
| `pump` | Charging pump |
| `charge` | Charge level |

## pv and solar

| Section | Options |
| --- | --- |
| `pv` | `name`, `entity`, `power`, `battery`, `grid`, `battery_power`, `grid_power`, `wallbox`, `house`, `threshold` (watts, default `5`) |
| `solar` | `name`, `entity`, `collector_temp`, `flow_temp`, `return_temp`, `pump`, `yield` |

The PV panel draws a dashed energy line to the heat pump while the heat pump is
drawing power. Name `battery_power`, `grid_power`, `wallbox` or `house` and it
becomes an energy bus under the plant instead — see [the electrical side](#the-electrical-side)
below. The
solar circuit is plumbed into the bottom of the buffer tank, so it needs a
buffer to connect to, and both of its temperatures appear as badges on its
pipes: `flow_temp` (or the collector) on the way down, `return_temp` on the way
back up.

**Is solar running?** `pump` → `yield` above 0 → collector above 35 °C.

## the electrical side

With a battery, a meter, a wallbox or the house named, the card draws an energy
bus below the plant. Photovoltaics, the battery, the grid, a wallbox, the house,
the heat pump and an element in a tank hang off it, and every node decides for
itself which way its own energy is travelling.

```yaml
pv:
  power: [sensor.inverter_1, sensor.inverter_2]
  battery: sensor.battery_soc          # a percentage, shown next to the name
  battery_power: sensor.battery_power  # + charging, - discharging
  grid_power: sensor.grid_power        # + import, - export; invert below if needed
  wallbox: sensor.wallbox_power        # an openWB or any other charger
  house:
    calculate: true                    # net PV + normalized grid - wallbox
```

| Node | Comes from | Direction |
| --- | --- | --- |
| Photovoltaics | `pv.power` | always into the bus while producing |
| Battery | `pv.battery_power` | out of the bus while charging, into it while discharging |
| Grid | `pv.grid_power` (or `pv.grid`) | into the bus while importing, out of it while exporting |
| Wallbox | `pv.wallbox` | out of the bus while charging |
| House | `pv.house` entity or `calculate: true` | out of the bus |
| Heat pump | `heatpump.power` | out of the bus while it draws |
| Element | `buffer.heater_power` or `dhw.heater_power` | out of the bus while it draws |

Meters disagree about which direction counts as positive. If an arrow points the
wrong way round, flip that one entity:

```yaml
  grid_power:
    entity: sensor.grid_power
    invert: true
```

A node stays idle while its power is within `threshold` watts of zero (5 by
default). W and kW entities are normalized before that comparison.
`electrics: false` at the top level turns the bus off again.

With `house: { calculate: true }`, the card calculates residual building
consumption as net inverter power plus the normalized grid value, minus the
separately shown wallbox. A normal entity still works when you need another
topology or want the value elsewhere in Home Assistant — see
[Template sensors](Template-Sensors), which also carries the check for which
direction your meter counts as positive.

## circuits

```yaml
circuits:
  - name: Heating circuit A
    type: underfloor
    entity: climate.circuit_a
    mode: select.circuit_a_mode
    flow_temp: sensor.circuit_a_flow
    return_temp: sensor.circuit_a_return
    room_temp: sensor.living_room
    target_temp: number.circuit_a_setpoint
    pump: binary_sensor.circuit_a_pump
    valve: sensor.circuit_a_mixer
```

| Option | Description |
| --- | --- |
| `name` | Label |
| `type` | `radiator`, `underfloor`, `fancoil`, `pool`, `generic` |
| `entity` | Tapping the panel operates this entity |
| `mode` | Operating mode chip |
| `flow_temp`, `return_temp` | Temperatures and pipe colours |
| `room_temp`, `target_temp`, `humidity` | Extra values — four columns are drawn |
| `pump` | Circulation pump; also decides whether the circuit flows |
| `valve` | Mixing valve, printed as a percentage under the symbol |

**Is the circuit running?** `pump` → `valve` above 0 → `entity` → the heat pump
state.

Seven circuits are supported, which covers controllers that address their
circuits A to G. An eighth entry is ignored rather than drawn off canvas.

## Long form for any value

Every value takes an entity id or an object:

```yaml
power:
  entity: sensor.hp_power
  name: Input          # overrides the label
  decimals: 0          # digits after the decimal point
  unit: W              # overrides the unit
  attribute: null      # read an attribute instead of the state
  tap_action: ...      # see Controls
  hold_action: ...
```

A `climate` or `water_heater` entity used as `target_temp`, `temp` or
`room_temp` reads the matching attribute by itself, so
`target_temp: climate.circuit_a` shows the setpoint rather than the word
“heat”.

## One value out of several entities

Any value also takes a list, and folds it into one number:

```yaml
pv:
  power:                       # added up
    - sensor.inverter_1_ac_power
    - sensor.inverter_2_ac_power
  battery:                     # averaged - it is a percentage
    - sensor.battery_1_soc
    - sensor.battery_2_soc
```

| Unit | Default |
| --- | --- |
| `%`, `°C`, `°F`, `K` | average |
| everything else (W, kWh, l/min …) | sum |

```yaml
power:
  entities: [sensor.inverter_1_ac_power, sensor.inverter_2_ac_power]
  combine: max               # sum, avg, min, max, first
```

Missing or unavailable entities are skipped rather than dragging the result
down; if none of them has a value the card shows a dash. A tap opens the first
entity in the list.

## What switches in and out

![Defrosting, with the element in the tank running](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/extras.png)

```yaml
heatpump:
  mode: select.system_mode        # what it was told to do, and how you change it
  status: sensor.operating_state  # what it is doing right now
  aux_heat: binary_sensor.second_heat_generator
  aux_heat_power: sensor.heating_element_power
buffer:
  heater: switch.ac_thor          # element in the tank
  heater_power: sensor.ac_thor_power
```

* **Second heat generator** — the row lights up and the coil glows while the
  bivalent stage carries load. Counted as running when `aux_heat` is on, or,
  without it, when `aux_heat_power` is above zero.
* **Defrost** — vapour rises off the unit and the fan ring turns icy whenever
  the mode resolves to defrosting. The card recognises *defrost*, *abtau* and
  *enteis* in the state text of `status` or `mode`; `defrost` forces it.
* **Element in the tank** — drawn inside the tank at about two thirds height,
  glowing while it runs, with its power underneath. Works on `buffer` and on
  `dhw`, so a my-PV AC-Thor on the buffer and a booster in the hot water tank
  can both be shown.
