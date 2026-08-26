# Examples

All files below live in
[`examples/`](https://github.com/Xerolux/heatpump-flow-card/tree/main/examples)
and can be pasted into a manual card editor as they are.

| File | What it shows |
| --- | --- |
| `01-minimal.yaml` | The smallest useful card: heat pump, tank, one circuit |
| `02-compact.yaml` | Compact layout for a narrow column |
| `03-two-circuits.yaml` | Radiators plus underfloor heating |
| `04-full.yaml` | PV, solar thermal, hot water, two circuits, modes and boost |
| `05-advanced.yaml` | No buffer tank, four circuits, long form fields, own actions |
| `06-idm-heatpump.yaml` | Wired up for the IDM heat pump integration |
| `07-idm-solaredge-paradigma.yaml` | A whole plant: IDM heat pump, SolarEdge PV, Paradigma solar thermal |
| `08-immersion-heater.yaml` | An AC-Thor element in the buffer tank, plus the bivalent stage |
| `09-dashboard-idm.yaml` | A whole dashboard view around that plant — the card plus built-in cards |
| `10-energy-bus.yaml` | The electrical side: battery, grid, wallbox, house and the element on one bus |

## Every circuit keeps its own state

![Four circuits in different states](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/circuits.png)

Circuit A is being served and circuit C is too; B is parked by its time program
and D is switched off. Each panel, each pump and each pipe answers for its own
circuit — only the distributor between the tank and the circuits carries water
as long as *any* circuit draws.

```yaml
circuits:
  - name: Heating circuit A
    type: radiator
    mode: select.hk_a_mode
    pump: binary_sensor.hk_a_pump
    flow_temp: sensor.hk_a_flow
    return_temp: sensor.hk_a_return
    room_temp: sensor.living_room
  - name: Heating circuit B
    type: underfloor
    mode: select.hk_b_mode
    pump: binary_sensor.hk_b_pump
  - name: Heating circuit C
    type: underfloor
    mode: select.hk_c_mode
    pump: binary_sensor.hk_c_pump
  - name: Heating circuit D
    type: fancoil
    mode: select.hk_d_mode
    pump: binary_sensor.hk_d_pump
```

## IDM heat pump

The [IDM integration](https://github.com/Xerolux/idm-heatpump-hass) exposes
exactly the entity types this card can operate: `select` for the system and
circuit modes, `climate` per heating circuit, `water_heater` for hot water and
`number` for the setpoints.

```yaml
type: custom:heatpump-flow-card
layout: full
heatpump:
  entity: select.idm_heatpump_system_mode
  mode: select.idm_heatpump_system_mode
  power: sensor.idm_heatpump_current_heating_power
  cop: sensor.idm_heatpump_calculated_cop
  flow_temp: sensor.idm_heatpump_hp_flow_temperature
  return_temp: sensor.idm_heatpump_hp_return_temperature
  outside_temp: sensor.idm_heatpump_outdoor_temperature
dhw:
  entity: water_heater.idm_heatpump
  mode: water_heater.idm_heatpump
  temp: sensor.idm_heatpump_dhw_temp_top
  target_temp: number.idm_heatpump_dhw_setpoint
  boost: switch.idm_heatpump_demand_onetime_dhw
circuits:
  - name: Heating circuit A
    type: underfloor
    mode: select.idm_heatpump_circuit_a_mode
    flow_temp: sensor.idm_heatpump_circuit_a_flow_temp
    room_temp: sensor.idm_heatpump_circuit_a_room_temp
    target_temp: number.idm_heatpump_circuit_a_room_setpoint_heat_normal
  # ... circuits B, C and D exactly the same way
```

The entity id prefix follows the device name you gave the integration, so
`idm_heatpump` may read differently on your system — check
**Settings → Devices & Services → IDM Heatpump → Entities**. The full file is
`examples/06-idm-heatpump.yaml`.

## IDM, SolarEdge and Paradigma together

`07-idm-solaredge-paradigma.yaml` wires all three into one card: the IDM heat
pump with its system mode, both heating circuits and the second heat generator,
SolarEdge for photovoltaics and battery, and a SystaSolar Aqua controller for
the Paradigma collectors.

Two details worth copying:

```yaml
heatpump:
  mode: select.alm6_15_systembetriebsart          # settable
  status: sensor.alm6_15_warmepumpen_betriebsart  # what it is really doing
  aux_heat: binary_sensor.alm6_15_zweiter_warmeerzeuger_web
  aux_heat_power: sensor.alm6_15_e_heizstab_leistung
```

`status` is what makes the card show a defrost cycle while the plant stays set
to automatic, and `aux_heat` is what makes the bivalent stage visible when it
engages.

The second IDM device in this installation exposes circuit D under a separate
device prefix. Wire its measured temperatures and operating components to the
circuit instead of using the active-mode enum as a temperature:

```yaml
- name: Heating circuit D
  type: underfloor
  mode: select.alm6_15_hc_d_mode
  flow_temp: sensor.heizkreis_d_hc_d_flow_temp
  room_temp: sensor.heizkreis_d_hc_d_room_temp
  target_temp: number.alm6_15_hc_d_room_setpoint_heat_normal
  pump: binary_sensor.heizkreis_d_pumpe_heizkreis_d_web
  valve: sensor.heizkreis_d_mischer_heizkreis_d_web
```

For photovoltaics with several inverters, sum them in a template sensor and
point `pv.power` at that — the card draws one PV source.

## A whole dashboard, not just a card

`09-dashboard-idm.yaml` is a complete view: the flow card across the top, then
the heat pump with its COP gauge, cycle counters and a 24 hour graph, hot water
with its thermostat and boost buttons, both heating circuits, photovoltaics,
solar thermal and the second heat generator.

Paste it under `views:` in **dashboard → pencil → three dots → Raw
configuration editor**. Everything except the first card is a built-in Home
Assistant card, so nothing else has to be installed.

## An electric element in the tank

`08-immersion-heater.yaml` adds a my-PV AC-Thor to the buffer tank:

```yaml
buffer:
  heater: switch.ac_thor_betriebsmodus
  heater_power: sensor.ac_thor_power
```

The element is drawn inside the tank and glows while it draws power. The same
two options exist on `dhw` for an element in the hot water tank.

## A plant without a buffer tank

![Without a buffer tank](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/advanced.png)

```yaml
buffer: false
```

The heat pump then feeds the distributor directly and the tank disappears from
the drawing.

## Several cards side by side

Nothing stops you from using more than one card: a `compact` card per floor in a
sections view, or one `full` card as an overview plus one `single` card per
circuit on its own dashboard page.

## The electrical side

`10-energy-bus.yaml` is the electrical half on its own. Naming any of
`battery_power`, `grid_power`, `wallbox` or `house` under `pv` draws a bus
below the plant, and every node on it decides for itself which way its own
energy travels:

| Node | Comes from | Direction |
| --- | --- | --- |
| Photovoltaics | `pv.power` | always into the bus while producing |
| Battery | `pv.battery_power` | out of the bus while charging, into it while discharging |
| Grid | `pv.grid_power` | into the bus while importing, out of it while exporting |
| Wallbox | `pv.wallbox` | out of the bus while charging |
| House | `pv.house` | out of the bus |
| Heat pump | `heatpump.power` | out of the bus while it draws |
| Element | `buffer.heater_power` or `dhw.heater_power` | out of the bus while it draws |

The heat pump and the element join through the entities they already have, so
neither is configured twice. Meters disagree about which direction counts as
positive — if an arrow points the wrong way round, add `invert: true` to that
one entity rather than to the card.
