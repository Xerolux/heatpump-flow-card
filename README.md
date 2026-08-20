# Heat Pump Flow Card

[![hacs](https://img.shields.io/badge/HACS-custom-41BDF5.svg)](https://hacs.xyz/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An animated hydraulic scheme for Home Assistant. The card draws your heating
plant the way it is actually plumbed — heat pump, buffer tank, hot water,
photovoltaics, solar thermal and up to four heating circuits — and puts the
live values right where they belong on the drawing.

*[Deutsche Version](README.de.md)*

![Full layout](docs/images/full.png)

## What it does

* **Pipes carry temperatures.** Every pipe is coloured by the temperature it
  transports, and where both ends are known the colour *fades along the pipe* —
  so you can see the water cooling down on its way back from the radiators.
* **Things move when they run.** The heat pump fan turns (faster at higher
  compressor load), circulation pumps spin, and dots travel through every pipe
  that is currently flowing. Idle branches dim and stop.
* **Everything is tappable.** Tap the heat pump to switch it on or off, tap the
  hot water tank, a circuit, a pump or any value to open its more-info dialog.
* **Four layouts** from a single-line compact card to the complete plant.
* **A visual editor** — no YAML required, though every option is available in
  YAML too.
* **Nothing is mandatory.** Leave a sensor out and the card simply draws that
  spot empty instead of breaking.
* German and English labels, light and dark theme, and it respects
  `prefers-reduced-motion`.

## Layouts

| `layout` | What you get | Screenshot |
| --- | --- | --- |
| `compact` | Heat pump, tank, one circuit — narrow enough for a sidebar column | [compact](docs/images/compact.png) |
| `single` | One heating circuit, full detail | [single](docs/images/single.png) |
| `dual` | Two circuits, e.g. radiators + underfloor heating | [dual](docs/images/dual.png) |
| `full` | PV, solar thermal, hot water and two circuits | [full](docs/images/full.png) |

The layout only decides what is drawn *by default*. Any section you configure
is shown, any section you set to `false` is hidden — so `layout: dual` with a
`pv:` block drawn in is perfectly fine.

![Two circuits](docs/images/dual.png)

The card follows the dashboard theme:

![Dark theme](docs/images/dual-dark.png)

Systems without a buffer tank are wired straight from the heat pump to the
circuits — here with four of them, including a fan coil and a pool:

![Without a buffer tank](docs/images/advanced.png)

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
| `heatpump` | object | `{}` | see below |
| `buffer` | object \| `false` | shown | Buffer tank |
| `dhw` | object \| `false` | `full` only | Domestic hot water |
| `pv` | object \| `false` | `full` only | Photovoltaics |
| `solar` | object \| `false` | `full` only | Solar thermal |
| `circuits` | list | 1–2 circuits | Heating circuits, max. 4 |

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

`name`, `entity`, `top`, `middle`, `bottom`, `charge`

The tank is filled with a gradient between the layer temperatures. `charge` is
printed under the name. `buffer: false` connects the heat pump straight to the
circuits.

### `dhw`

`name`, `entity`, `temp`, `target_temp`, `charge`, `pump`

### `pv` / `solar`

| Section | Options |
| --- | --- |
| `pv` | `name`, `entity`, `power`, `battery`, `grid`, `threshold` (watts, default `5`) |
| `solar` | `name`, `entity`, `collector_temp`, `pump`, `yield`, `return_temp` |

The solar circuit is drawn into the bottom of the buffer tank, so it needs a
buffer to connect to.

### `circuits[]`

| Option | Description |
| --- | --- |
| `name` | Label |
| `type` | `radiator`, `underfloor`, `fancoil`, `pool` or `generic` |
| `entity` | Tapping the circuit switches this entity |
| `flow_temp`, `return_temp` | Temperatures and pipe colours |
| `room_temp`, `target_temp`, `humidity` | Extra values (four are shown) |
| `pump` | Circulation pump; also decides whether the circuit is flowing |
| `valve` | Mixing valve, shown as a percentage under the valve symbol |

A circuit counts as running when its `pump` is on; without a pump the `valve`
position, then `entity`, then the heat pump state is used.

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

## Development

```bash
npm install
npm run check        # syntax check
npm test             # renders the card in Chromium and checks behaviour
npm run screenshots  # regenerate docs/images
```

`tools/preview.html` opens the card in a plain browser with a mock Home
Assistant — handy while tweaking the drawing.

## Credits

Built for the [Violet Pool Controller](https://github.com/Xerolux/violet-hass)
ecosystem, but the card is vendor neutral: it works with any heat pump,
controller or set of sensors in Home Assistant.
