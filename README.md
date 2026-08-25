![Heat Pump Flow Card](docs/brand/logo-plate.png)

[![HACS](https://img.shields.io/badge/HACS-custom-41BDF5.svg)](https://hacs.xyz/)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![release](https://img.shields.io/github/v/release/Xerolux/heatpump-flow-card?display_name=tag&color=0369a1)](https://github.com/Xerolux/heatpump-flow-card/releases/latest)
[![demo](https://img.shields.io/badge/live-demo-0ea5e9)](https://xerolux.github.io/heatpump-flow-card/)

An animated hydraulic scheme for Home Assistant. The card draws your heating
plant the way it is actually plumbed — heat pump, buffer tank, hot water,
photovoltaics, solar thermal and up to seven heating circuits — and puts the
live values right where they belong on the drawing.

*[Deutsche Version](README.de.md)* · **[Live demo](https://xerolux.github.io/heatpump-flow-card/)** · **[Wiki](https://github.com/Xerolux/heatpump-flow-card/wiki)**

![Full layout](docs/images/full.png)

## What it does

* **Pipes carry temperatures.** Every pipe is coloured by the temperature it
  transports, and where both ends are known the colour *fades along the pipe* —
  so you can see the water cooling down on its way back from the radiators.
* **Things move when they run.** The heat pump fan turns (faster at higher
  compressor load), circulation pumps spin, and dots travel through every pipe
  that is currently flowing. Idle branches dim and stop.
* **Everything is operable.** Tap the heat pump to switch it on or off, tap a
  mode chip to pick heating, cooling or hot water, tap a setpoint for a
  plus/minus stepper. Long press always opens the more-info dialog.
* **Every circuit answers for itself.** Circuit A running says nothing about
  circuit D: each panel, pump and pipe shows its own state.
* **Eighteen ready-made layouts**, from a compact card with one circuit to the
  complete plant — with or without hot water, PV, solar thermal or a buffer tank.
* **A visual editor** — no YAML required, though every option is available in
  YAML too.
* **Nothing is mandatory.** Leave a sensor out and the card simply draws that
  spot empty instead of breaking.
* German and English labels, light and dark theme, and it respects
  `prefers-reduced-motion`.

## Layouts

Pick a ready-made plant in the editor, or set `layout:` in YAML. A layout only
decides what is drawn **by default** — every section can still be added with its
own block or removed with `false`.

| `layout` | Tank | Hot water | PV | Solar thermal | Circuits |
| --- | :-: | :-: | :-: | :-: | :-: |
| `compact` | ● | | | | 1 |
| `compact-dual` | ● | | | | 2 |
| `single` | ● | | | | 1 |
| `dual` | ● | | | | 2 |
| `triple` | ● | | | | 3 |
| `quad` | ● | | | | 4 |
| `dhw` | ● | ● | | | 1 |
| `dhw-dual` | ● | ● | | | 2 |
| `dhw-quad` | ● | ● | | | 4 |
| `pv-single` | ● | | ● | | 1 |
| `pv-dual` | ● | | ● | | 2 |
| `pv-dhw-dual` | ● | ● | ● | | 2 |
| `solar-dual` | ● | ● | | ● | 2 |
| `full` | ● | ● | ● | ● | 2 |
| `full-quad` | ● | ● | ● | ● | 4 |
| `direct` | | | | | 1 |
| `direct-dual` | | | | | 2 |
| `direct-dhw` | | ● | | | 2 |

Up to **seven** circuits are supported (A–G) — `circuits:` wins over whatever
the layout brings.

## Gallery

**`compact` — heat pump, tank, one circuit, narrow enough for a sidebar column**

![compact](docs/images/compact.png)

**`single` — one circuit with all the detail**

![single](docs/images/single.png)

**`dual` — radiators and underfloor heating**

![dual](docs/images/dual.png)

**`dhw-dual` — hot water and two circuits, no PV, no solar thermal**

![dhw-dual](docs/images/dhw-dual.png)

**`pv-dual` — with photovoltaics, without solar thermal**

![pv-dual](docs/images/pv-dual.png)

**`full` — the complete plant**

![full](docs/images/full.png)

**`direct-dhw` — no buffer tank: the heat pump feeds the distributor directly,
here with four circuits including a fan coil and a pool**

![without a buffer tank](docs/images/advanced.png)

**Every circuit keeps its own state.** A is being served and so is C; B is parked
by its time program and D is switched off. Panels, pumps and pipes follow each
circuit separately — only the distributor carries water as long as *any* circuit
draws.

![four circuits in different states](docs/images/circuits.png)

**The electrical side.** The heat pump is in standby, so the roof is not feeding
it: the current goes into the battery and out to the grid, and every node shows
which way its own energy is travelling.

![battery, grid and wallbox](docs/images/electrics.png)

**Dark theme** — the card follows the dashboard theme:

![dark theme](docs/images/dual-dark.png)

## Installation

### HACS (recommended)

1. HACS → three dots menu → **Custom repositories**
2. Repository: `https://github.com/Xerolux/heatpump-flow-card`, category
   **Dashboard** (older HACS versions call it *Lovelace*/*Plugin*)
3. Install **Heat Pump Flow Card**, then reload your browser.

### Manual

1. Copy `dist/heatpump-flow-card.js` to `config/www/heatpump-flow-card.js`.
2. Settings → Dashboards → three dots → **Resources** → **Add resource**
   * URL: `/local/heatpump-flow-card.js`
   * Type: **JavaScript module**

## Quick start

Add a card, search for **Heat Pump Flow Card**, and pick your entities in the
editor. The equivalent YAML for a small system:

```yaml
type: custom:heatpump-flow-card
layout: single
heatpump:
  entity: switch.heat_pump
  flow_temp: sensor.hp_flow_temperature
  return_temp: sensor.hp_return_temperature
buffer:
  top: sensor.buffer_top
  bottom: sensor.buffer_bottom
circuits:
  - type: radiator
    pump: binary_sensor.circuit_pump
```

More examples — including a plant without a buffer tank and one with four
circuits — are in [`examples/`](examples).

## Operating the plant from the card

A tap does the obvious thing for the entity behind an element, a long press
always opens the more-info dialog:

| Entity behind the element | A tap does |
| --- | --- |
| `switch`, `light`, `fan`, `input_boolean`, `valve`, `humidifier` | Toggles it |
| `button`, `input_button`, `script`, `scene` | Presses it |
| `select`, `input_select` | Opens the list of options |
| `number`, `input_number` | Opens a plus/minus stepper within min/max/step |
| `climate` | Opens the hvac modes and the target temperature |
| `water_heater` | Opens the operation modes and the target temperature |
| `sensor`, `binary_sensor`, anything else | Opens more-info |

![Control panel](docs/images/controls.png)

Values that can be operated are marked with a dotted underline, mode chips with
a chevron. Two extra fields exist for this:

```yaml
heatpump:
  mode: select.system_mode          # chip on the heat pump, tap to switch mode
circuits:
  - mode: climate.circuit_a         # chip on the circuit
    target_temp: climate.circuit_a  # the setpoint of that thermostat
dhw:
  mode: water_heater.dhw            # chip on the hot water panel
  boost: switch.onetime_dhw         # extra chip, one tap
```

A `climate` or `water_heater` entity used as `target_temp`, `temp` or
`room_temp` automatically reads the matching attribute, so
`target_temp: climate.circuit_a` shows the setpoint rather than the word
"heat".

Set `controls: false` to go back to plain more-info dialogs, or override a
single element with its own `tap_action`.

### The bits that switch in and out

![Defrosting, with the element in the tank running](docs/images/extras.png)

Three things a heat pump does that are easy to miss, and hard to explain
afterwards:

* **The second heat generator.** `aux_heat` and `aux_heat_power` add a row to
  the heat pump panel that lights up while the bivalent stage carries load, so
  you can see it engage instead of finding it in the electricity bill.
* **Defrosting.** When the heat pump reports a defrost cycle, vapour rises off
  the unit and the fan ring turns icy. Detected from `status` (or `mode`), or
  from an explicit `defrost` binary sensor.
* **An electric element in the tank.** `heater` and `heater_power` on `buffer`
  or `dhw` draw a heating element inside the tank — a my-PV AC-Thor, a booster,
  a backup heater — glowing while it draws power, captioned with its name, its
  power and, with `heater_temp`, its own temperature. Give it a `heater_mode`
  and one tap offers off / automatic / boost.

```yaml
heatpump:
  mode: select.system_mode        # what it was told to do, and how you change it
  status: sensor.operating_state  # what it is doing right now
  aux_heat: binary_sensor.second_heat_generator
  aux_heat_power: sensor.heating_element_power
buffer:
  heater: switch.ac_thor
  heater_power: sensor.ac_thor_power
```

### One value out of several entities

Four inverters, two batteries, three room sensors — any value takes a list and
folds it into one number:

```yaml
pv:
  power:                       # added up
    - sensor.inverter_1_ac_power
    - sensor.inverter_2_ac_power
    - sensor.inverter_3_ac_power
    - sensor.inverter_4_ac_power
  battery:                     # averaged, because it is a percentage
    - sensor.battery_1_soc
    - sensor.battery_2_soc
```

Powers, energies and flow rates are **added up**; percentages and temperatures
are **averaged**. Override it, and set the usual extras, with the long form:

```yaml
power:
  entities: [sensor.inverter_1_ac_power, sensor.inverter_2_ac_power]
  combine: max               # sum (default), avg, min, max, first
  name: Roof
  decimals: 1
```

Entities that are missing or unavailable are skipped rather than dragging the
total down, and a tap opens the first one in the list.

## Size

The card fills whatever column it is given and scales the drawing to that width
— it is one SVG, so it stays sharp at any size. In a sections dashboard it asks
for the full column width and a height that grows with the number of consumers;
Home Assistant's own **grid options** on the card (three dots → *Edit* → the
layout tab) override both if you want it narrower or taller.

A dashboard column is still often narrower than the scheme was drawn for — on a
phone in portrait the whole plant ends up thumbnail sized. That is what the
**magnifier in the bottom-right corner** is for: it lifts the live card out into
a full screen layer, the same scene with the same animations, scaled to the
screen you are holding. Turn the phone and it re-fits itself; on a monitor it
simply gets big. Escape, a click beside the card, or the button again brings it
back.

It never scales the drawing below three quarters of the size it was designed at
— below that the labels stop being readable — so on a narrow screen you get a
readable scheme that scrolls sideways rather than a smaller thumbnail. There is
a ceiling at the other end too: a 4K screen is filled comfortably within it, and
past three times the design size the drawing would only get bigger, not more
readable, so on a 4K or 8K panel it stops there and centres instead.

`zoom: false` removes the button.

## Options

### Card

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | string | — | `custom:heatpump-flow-card` |
| `layout` | string | `dual` | `compact`, `single`, `dual` or `full` |
| `title` | string | — | Card heading |
| `animation` | boolean | `true` | Move the dots through the pipes |
| `flow_speed` | number | `1` | Speed multiplier, `0.2` – `3` |
| `temperature_colors` | boolean | `true` | `false` keeps flow red / return blue |
| `controls` | boolean | `true` | `false` makes every tap open more-info |
| `zoom` | boolean | `true` | The magnifier that opens the card full screen |
| `heatpump` | object | `{}` | see below |
| `buffer` | object \| `false` | shown | Buffer tank |
| `dhw` | object \| `false` | `full` only | Domestic hot water |
| `pv` | object \| `false` | `full` only | Photovoltaics |
| `solar` | object \| `false` | `full` only | Solar thermal |
| `circuits` | list | 1–2 circuits | Heating circuits, up to 7 (A–G) |

### `heatpump`

| Option | Description |
| --- | --- |
| `name` | Label, defaults to “Heat pump” |
| `entity` | Tapping the heat pump switches this entity |
| `state_entity` | Decides whether the heat pump counts as running |
| `mode` | Operating mode; `heat`/`cool`/`water`/`defrost`/`idle` are detected from the state text, and `hvac_action` of a `climate` entity is used automatically |
| `power`, `cop`, `outside_temp`, `compressor` | Values shown next to the unit (the first three are displayed, the compressor also sets the fan speed) |
| `flow_temp`, `return_temp` | Colour and label the pipes to the tank |
| `power_threshold` | Watts above which the heat pump counts as running (default `20`) |

Without `state_entity` the card falls back to `power` > threshold, then
`compressor` > 0, then the state of `entity`.

### `buffer`

`name`, `entity`, `top`, `middle`, `bottom`, `charge`, `heater`, `heater_power`,
`heater_temp`, `heater_mode`

The tank is filled with a gradient between the layer temperatures. `charge` is
printed under the name. `buffer: false` connects the heat pump straight to the
circuits.

### `dhw`

`name`, `entity`, `temp`, `target_temp`, `charge`, `pump`, `mode`, `boost`, `heater`,
`heater_power`

### `pv` / `solar`

| Section | Options |
| --- | --- |
| `pv` | `name`, `entity`, `power`, `battery`, `grid`, `battery_power`, `grid_power`, `wallbox`, `house`, `threshold` (watts, default `5`) |
| `solar` | `name`, `entity`, `collector_temp`, `flow_temp`, `return_temp`, `pump`, `yield` |

The solar circuit is drawn into the bottom of the buffer tank, so it needs a
buffer to connect to.

### The electrical side

Name `battery_power`, `grid_power`, `wallbox` or `house` and the card draws an
energy bus under the plant. Photovoltaics, the battery, the grid, a wallbox,
the house, the heat pump and an element in a tank hang off it, and **each node
decides for itself which way its own energy is travelling** — so when the heat
pump is in standby the sun visibly goes into the battery and out to the grid
instead of into a machine that is not running.

```yaml
pv:
  power: [sensor.inverter_1, sensor.inverter_2]
  battery: sensor.battery_soc         # a percentage, shown next to the name
  battery_power: sensor.battery_power # + charging, - discharging
  grid_power: sensor.grid_power       # + import, - export
  wallbox: sensor.wallbox_power       # an openWB or any other charger
  house: sensor.house_consumption
```

Meters disagree about which direction counts as positive. If an arrow points
the wrong way round, flip that one entity:

```yaml
  grid_power:
    entity: sensor.grid_power
    invert: true
```

The heat pump joins the bus through its own `power`, and an element in a tank
through `heater_power` — neither needs configuring twice. `electrics: false`
at the top level turns the bus off again and restores the single line from the
photovoltaics to the heat pump.

### `circuits[]`

| Option | Description |
| --- | --- |
| `name` | Label |
| `type` | `radiator`, `underfloor`, `fancoil`, `pool` or `generic` |
| `entity` | Tapping the circuit switches this entity |
| `flow_temp`, `return_temp` | Temperatures and pipe colours |
| `room_temp`, `target_temp`, `humidity` | Extra values (four are shown) |
| `mode` | Operating mode chip (`select`, `climate`, or a plain sensor) |
| `pump` | Circulation pump; also decides whether the circuit is flowing |
| `valve` | Mixing valve, shown as a percentage under the valve symbol |

A circuit counts as running when its `pump` is on. Without a pump, a `mode`
containing *off*, *aus*, *standby*, *idle* or *closed* parks it, otherwise the
`valve` position, then `entity`, then — only if nothing else is configured — the
heat pump state decides.

### Long form for any value

Every value accepts an entity id or an object:

```yaml
heatpump:
  power:
    entity: sensor.hp_power
    name: Input
    decimals: 0
    unit: W
    attribute: null        # read an attribute instead of the state
    tap_action:
      action: more-info
```

`tap_action` and `hold_action` follow the usual Home Assistant action syntax
(`more-info`, `toggle`, `navigate`, `url`, `perform-action`, `none`) and can be
set on any element — the heat pump, a tank, a circuit or a single value.
Without them, switchable entities toggle and everything else opens more-info.

## Colours

Pipes and values follow one temperature ramp: deep blue below 0 °C, light blue
around 15 °C, neutral grey at room temperature, amber from 30 °C, orange from
40 °C and red from 50 °C. Values close to room temperature keep the normal text
colour so they stay readable. Set `temperature_colors: false` for the classic
red-flow / blue-return scheme.

## More

* **[Live demo](https://xerolux.github.io/heatpump-flow-card/)** — the real card
  in your browser, no Home Assistant needed
* **[Wiki](https://github.com/Xerolux/heatpump-flow-card/wiki)** — installation,
  every option, controls, troubleshooting, development
* **[Examples](examples)** — ten ready-made configurations, including a whole
  dashboard view

## Development

```bash
npm install
npm run check        # syntax check
npm test             # renders the card in Chromium and checks behaviour
npm run screenshots  # regenerate docs/images
```

`tools/preview.html` opens the card in a plain browser with a mock Home
Assistant — handy while tweaking the drawing.

## Compatibility

The card is vendor neutral. It knows nothing about any particular hardware — it
reads and writes plain Home Assistant entities, so it works with **any** heat
pump, solar thermal system, photovoltaics, buffer tank or heating controller as
long as the values arrive in Home Assistant. Whether they come from a vendor
integration, Modbus, MQTT, ESPHome, a Shelly or a handful of DS18B20 probes
makes no difference: point each field at the right entity and the drawing
follows.

The same goes for controlling it — anything writable works, whether that is a
`switch`, a `number`, a `select`, a `climate` or a `water_heater` entity.

One of the example files happens to be wired up for the IDM integration because
it exposes all of those entity types; that is an example, not a requirement.

## Changelog

Every release is written up in [CHANGELOG.md](CHANGELOG.md).

## Support

The card is free and stays free. If it makes your plant easier to live with and
you would like to support the work, any of these is hugely motivating — and none
of them is expected:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Buy%20me%20a%20coffee!-yellow?logo=buy-me-a-coffee&style=for-the-badge)](https://www.buymeacoffee.com/xerolux)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20the%20work-ff5e5b?logo=ko-fi&style=for-the-badge)](https://ko-fi.com/xerolux)
[![PayPal](https://img.shields.io/badge/PayPal-Thanks%20for%20your%20support!-blue?logo=paypal&style=for-the-badge)](https://paypal.me/xerolux)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub-Sponsors-ea4aaa?logo=githubsponsors&logoColor=white&style=for-the-badge)](https://github.com/sponsors/Xerolux)

[Tesla Referral](https://ts.la/sebastian564489) · or simply star the repository.
