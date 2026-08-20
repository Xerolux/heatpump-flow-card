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
