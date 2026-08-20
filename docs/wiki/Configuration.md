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
| `pv` | `name`, `entity`, `power`, `battery`, `grid`, `threshold` (watts, default `5`) |
| `solar` | `name`, `entity`, `collector_temp`, `pump`, `yield`, `return_temp` |

The PV panel draws a dashed energy line to the heat pump while it produces. The
solar circuit is plumbed into the bottom of the buffer tank, so it needs a
buffer to connect to.

**Is solar running?** `pump` → `yield` above 0 → collector above 35 °C.

## circuits

```yaml
circuits:
  - name: Heizkreis A
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
