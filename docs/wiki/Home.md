<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/brand/logo-dark.png">
  <img src="https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/brand/logo.png" alt="Heat Pump Flow Card" width="520">
</picture>


An animated hydraulic scheme for Home Assistant: heat pump, buffer tank, hot
water, photovoltaics, solar thermal and up to seven heating circuits — with the
live values where they belong on the drawing, and everything operable by tapping
it.

**[Live demo](https://xerolux.github.io/heatpump-flow-card/)** ·
[Repository](https://github.com/Xerolux/heatpump-flow-card) ·
[Deutsch](Home-de)

![The complete plant](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/full.png)

## Start here

| Page | What it covers |
| --- | --- |
| [Installation](Installation) | HACS, manual install, updating |
| [Layouts](Layouts) | The four card variants and when to use which |
| [Configuration](Configuration) | Every option, section by section |
| [Controls](Controls) | What a tap does, mode chips, setpoints |
| [Examples](Examples) | Ready-made configurations, including IDM |
| [Colours and Themes](Colours-and-Themes) | The temperature ramp, theme variables |
| [Troubleshooting](Troubleshooting) | Card not found, empty values, nothing moves |
| [Development](Development) | Preview, tests, screenshots, releases |

## In one minute

```yaml
type: custom:heatpump-flow-card
layout: dual
heatpump:
  entity: switch.heat_pump
  flow_temp: sensor.hp_flow_temperature
  return_temp: sensor.hp_return_temperature
buffer:
  top: sensor.buffer_top
  bottom: sensor.buffer_bottom
circuits:
  - type: radiator
    pump: binary_sensor.circuit_1_pump
  - type: underfloor
    pump: binary_sensor.circuit_2_pump
```

Nothing is mandatory. Leave a sensor out and that spot stays empty instead of
breaking the card.

## What makes it different

* **Pipes carry temperatures.** Each pipe is coloured by what it transports, and
  where both ends are known the colour fades along the pipe — you can watch the
  water cool on its way back.
* **Motion means running.** The fan turns faster at higher compressor load,
  pumps spin, dots travel through flowing pipes, idle branches dim and stop.
* **It is a control surface,** not just a picture: modes, setpoints, pumps and
  boosts are one tap away.
