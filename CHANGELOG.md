# Changelog

> **This card draws your heating plant and keeps it operable at a glance — and it is completely free.**
> If it helps you and you would like to support the work, a small token of appreciation is hugely motivating. No obligation at all. 😊☕

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Buy%20me%20a%20coffee!-yellow?logo=buy-me-a-coffee&style=for-the-badge)](https://www.buymeacoffee.com/xerolux)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20the%20work-ff5e5b?logo=ko-fi&style=for-the-badge)](https://ko-fi.com/xerolux)
[![PayPal](https://img.shields.io/badge/PayPal-Thanks%20for%20your%20support!-blue?logo=paypal&style=for-the-badge)](https://paypal.me/xerolux)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub-Sponsors-ea4aaa?logo=githubsponsors&logoColor=white&style=for-the-badge)](https://github.com/sponsors/Xerolux)

[Tesla Referral](https://ts.la/sebastian564489)

---

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions whose heading is not a link were never tagged on their own; their
changes shipped with the next tagged release.

## [Unreleased]

Nothing yet.

## [1.7.0] - 2026-08-25

### Fixed

- **Photovoltaic power no longer flows into a heat pump that is not drawing
  any.** The line ran as soon as the roof produced, whatever the heat pump was
  doing, which read as if a machine in standby were eating the yield. It now
  needs the heat pump to actually draw — and with a battery or a meter
  configured the current visibly goes where it really goes (see below).
- **A mode on its own no longer means a circuit is running.** A circuit whose
  only state source was `mode` reported itself as running for every value that
  was not literally "off" — so a circuit sitting on "Normal" showed a green dot
  and a flowing pipe while the plant was in standby. A mode says what the
  circuit was told to do; such a circuit now follows the plant, exactly as the
  documentation always claimed.
- **A hot water thermostat that is switched on is not a tank that is charging.**
  `entity: water_heater.x` was read as on/off, but the state of a `climate` or
  `water_heater` entity is its selected mode: "heat_pump" is not "off", so the
  tank claimed to be charging at 61.5 °C against a 48 °C target. Those two
  domains now only rule the tank *out*; the temperatures decide the rest. A
  `mode` that says off parks the tank outright, and `charge` is read when it is
  there.
- More states count as off: "out of service", "no demand", "keine Anforderung",
  "abgeschaltet", "deaktiviert", "disabled", "gesperrt", "blocked".
- The IDM examples had the emitters the wrong way round — circuit A is
  radiators, circuit D is underfloor heating.

### Added

- **The electrical side.** Name `battery_power`, `grid_power`, `wallbox` or
  `house` and the card draws an energy bus under the plant. Photovoltaics, the
  battery, the grid, a wallbox, the house, the heat pump and an element in a
  tank hang off it, and **every node decides for itself which way its own
  energy is travelling**: the battery takes from the bus while it charges and
  feeds it while it discharges, the grid the same in reverse. So with the heat
  pump in standby the sun visibly goes into the battery and out to the grid.
  - The heat pump joins through its own `power` and an element through
    `heater_power`, so neither has to be configured twice.
  - `invert: true` on a single entity flips a meter that counts the other
    direction as positive; `threshold` (5 W by default) keeps a node quiet
    around zero; `electrics: false` turns the bus off again.
- A new demo view and screenshot for it, and the openWB wallbox, the SolarEdge
  battery and meter and the AC-Thor in the buffer tank wired up in the two IDM
  examples.

## [1.6.4] - 2026-08-24

### Fixed

- `controls: false` now consistently opens more-info instead of still toggling
  switches or pressing buttons.
- Selecting zero heating circuits in the visual editor is respected instead of
  silently restoring the layout preset's circuits.
- The visual editor exposes the hot-water tank element fields and circuit
  humidity, preserves their advanced YAML field options, and uses the intended
  descriptive labels again.
- Repeated setpoint clicks accumulate immediately, and number steps are aligned
  to the entity's minimum instead of to zero.
- Loading the card resource more than once is idempotent: custom elements and
  card-picker metadata are registered only once.

### Changed

- The browser regression suite now covers 31 interactions and rendering cases,
  including disabled controls, empty circuit lists, editor preservation,
  non-zero step origins, rapid setpoint changes and duplicate resource loads.

## [1.6.3] - 2026-08-20

### Changed

- **The changelog is a proper changelog.** Keep a Changelog structure with
  `Added` / `Changed` / `Fixed` / `Removed` per version, a date on every
  section, comparison links between the tags, and the support and feedback
  block at the end — the same shape the IDM heat pump integration uses.
- `check:docs` and the release workflow accept both heading styles, so
  `## [1.6.3] - 2026-08-20` counts as the section for the version the card
  carries.

### Added

- A **Support** section in both READMEs, and the funding links at the top of the
  changelog: Buy Me a Coffee, Ko-fi, PayPal, GitHub Sponsors and the Tesla
  referral. `.github/FUNDING.yml` had them all along, but nothing in the
  documents ever said so.

## [1.6.2] - 2026-08-20

### Fixed

- **The README header renders in the HACS store again.** HACS drops `<picture>`
  and `<source>` and does not resolve relative `src` on raw `<img>`, so the
  header arrived as literal markup with a broken image beside it. Both READMEs
  use plain markdown for the logo and for the badge row now.

### Added

- `docs/brand/logo-plate.png` — the wordmark on its own dark plate. Renderers
  that drop `<picture>` cannot switch per theme, so the READMEs need one logo
  that stays readable on a light and on a dark page alike.

## [1.6.1] - 2026-08-20

### Fixed

- The wiki job now says what actually has to happen when it cannot push: GitHub
  creates the wiki repository only once a first page has been saved by hand, so
  enabling wikis in the settings is not enough on a fresh repository.

## [1.6.0] - 2026-08-20

### Fixed

- **Nothing overlaps any more.** A new `check:overlaps` step renders every demo
  layout in a browser and fails the build when two labels, or a label and a
  pill, cover each other. It found three: a long circuit name running under its
  mode chip, the outside temperature under the second heat generator, and the
  element caption under the bottom layer of the tank. All three are fixed, and
  long panel titles are trimmed with an ellipsis instead of colliding.

### Added

- **The element in the tank is captioned**: its name, its power and, with
  `heater_temp`, its own temperature. `heater_mode` takes over the tap, so one
  tap offers off / automatic / boost.
- **The solar circuit shows both ends**: what the collector sends down and what
  comes back up, as badges on its pipes. New `solar.flow_temp` for plants that
  measure it separately from the collector.
- **New `heatpump.flow_rate`**, as a badge under the flow temperature.
- Two new views in the live demo: four circuits each with their own state, and a
  defrost cycle with the second heat generator and the element in the tank
  running.
- A whole dashboard as an example, not just a card: `09-dashboard-idm.yaml` is a
  complete view with the flow card, a COP gauge, cycle counters, a 24 hour
  graph, hot water, both circuits, photovoltaics and solar thermal.
- A wiki page that lists what the HACS default store requires and how to submit
  the card to it.

### Changed

- Values are only coloured by the temperature ramp when they actually carry a
  temperature — a flow rate in l/min stays neutral.

## 1.5.0 - 2026-08-20

### Added

- **Any value can read several entities at once.** Four inverters become one PV
  power, several batteries become one state of charge: powers and energies are
  added up, percentages and temperatures averaged, and `combine` (`sum`, `avg`,
  `min`, `max`, `first`) overrides the choice. Entities that are missing or
  unavailable are skipped instead of dragging the result down.

## 1.4.0 - 2026-08-20

### Added

- **The second heat generator is visible.** `aux_heat` and `aux_heat_power` add
  a row to the heat pump panel that lights up while the bivalent stage carries
  load.
- **Defrost cycles look like defrost cycles.** Vapour rises off the unit and the
  fan ring turns icy whenever the heat pump reports one. New `defrost` option
  for plants that signal it separately.
- **An electric element in the tank.** `heater` and `heater_power` on `buffer`
  or `dhw` draw a heating element inside the tank — a my-PV AC-Thor, a booster,
  a backup heater — glowing while it draws power and operable by tapping it.
- **New `status` option**: what the heat pump reports it is doing, as opposed to
  `mode`, which is what it was told to do and what a tap changes. The chip and
  the animation follow `status` when it is set.
- Two new examples: a complete plant with an IDM heat pump, SolarEdge
  photovoltaics and a Paradigma solar thermal system, and one with an AC-Thor
  element in the buffer tank.

### Fixed

- The documentation check no longer trips over German entity ids — those are
  data, and an example has to quote them exactly.

## [1.3.1] - 2026-08-20

### Fixed

- The demo page stamps the card version onto every asset it loads, so a browser
  that still holds yesterday's bundle no longer shows yesterday's card. If a
  demo ever looks out of date again, it is enough to reload it.
- Four heating circuits in the English wiki pages were still named in German.

### Added

- `check:docs` fails when German wording turns up in an English-facing file —
  README, the English wiki pages, the examples, the demo page or the tooling.
  German belongs in `README.de.md`, the `-de` wiki pages and the card's own
  translation table.

## [1.3.0] - 2026-08-20

### Changed

- **English is the project's default language and German is a translation of
  it**, the way the integrations are built. The demo, the example
  configurations, the entity ids in the documentation and every screenshot are
  English now.
- The live demo starts in English and has a button that switches the card to
  German, which is also how it behaves in Home Assistant: the labels follow the
  language of your instance, and any `name:` you set wins over both.
- The demo entities were renamed along with it, from `sensor.wp_vorlauf` to
  `sensor.hp_flow_temperature` and so on, so a copied example reads the same in
  any language.

### Added

- The release workflow can be started by hand from the Actions tab; it creates
  the tag from the version in the card, and refuses to publish unless
  `CARD_VERSION`, `package.json`, the tag and the changelog agree.

## 1.2.1 - 2026-08-20

### Added

- **A logo**: the card's own visual language as an icon — the temperature ramp
  as a ring, its flow dots, and the heat pump fan in the middle. Rendered from
  one SVG into app icons, a favicon, a light and a dark wordmark and a social
  preview; the demo page and both READMEs use it.

### Fixed

- The documentation workflow no longer needs the repository to be prepared by
  hand: Pages is enabled on the first run, and a wiki that has never been
  written to is created instead of failing the job. If wikis are switched off
  entirely, the job warns instead of turning the branch red.

## 1.2.0 - 2026-08-20

### Added

- **Eighteen layout presets** instead of four: with or without hot water, PV,
  solar thermal or a buffer tank, and one to four circuits — pick one in the
  editor instead of assembling it by hand.
- **Up to seven heating circuits** (A–G) instead of four.
- A live demo published to GitHub Pages, a wiki under `docs/wiki/`, and a
  screenshot gallery in both READMEs.
- New workflows: documentation (Pages + wiki sync), security (CodeQL, dependency
  review), Dependabot, issue and pull request templates, and a `check:docs` step
  that keeps versions, screenshots, examples and wiki links honest.

### Changed

- **Every circuit answers for itself.** A `mode` set to off, aus, standby, idle
  or closed parks a circuit even while the heat pump runs; only a circuit
  without any state source of its own follows the heat pump. Panels, pumps and
  pipes are marked with `data-part`, so a circuit can also be styled or asserted
  individually.

### Fixed

- `dim_inactive: false` now really keeps idle branches at full opacity (the dots
  still stop).

### Removed

- A wrong claim about where the card came from — it is vendor neutral and always
  was.

## 1.1.0 - 2026-08-20

### Added

- **Operate the plant straight from the card**: a tap toggles switches, presses
  buttons, opens the options of a `select`, or a plus/minus stepper and the hvac
  modes of `number`, `climate` and `water_heater` entities. Holding an element
  still opens more-info.
- New `mode` field for the heat pump, the heating circuits and hot water, shown
  as a chip on the panel, plus a `boost` chip for hot water.
- New option `controls` (default `true`) to switch all of this off.
- A new example for the IDM heat pump integration.

### Changed

- `climate` and `water_heater` entities used as `target_temp`, `temp` or
  `room_temp` read the matching attribute automatically.
- Values that can be operated are marked, and mode chips show a chevron.

## 1.0.0 - 2026-08-20

First release.

### Added

- Animated hydraulic scheme with heat pump, buffer tank, hot water,
  photovoltaics, solar thermal and up to four heating circuits.
- Four layouts: `compact`, `single`, `dual`, `full`.
- Pipes coloured by the temperature they carry, with a gradient along the pipe
  when both ends are known.
- Rotating fan and pumps, travelling flow dots, dimmed idle branches.
- Tap and hold actions on every element; switchable entities toggle by default.
- A visual editor with sections for every part of the plant.
- German and English labels, light and dark theme, reduced-motion support.

---

### Support

- [Buy Me a Coffee](https://buymeacoffee.com/xerolux)
- [Ko-fi](https://ko-fi.com/xerolux)
- [PayPal](https://paypal.me/xerolux)
- [GitHub Sponsors](https://github.com/sponsors/Xerolux)
- [Tesla Referral](https://ts.la/sebastian564489)
- Star this repository

Every contribution is a huge motivation. Thank you!

---

### Feedback & Contributions

- [Report a bug](https://github.com/Xerolux/heatpump-flow-card/issues/new)
- [Request a feature](https://github.com/Xerolux/heatpump-flow-card/issues/new)
- [Wiki](https://github.com/Xerolux/heatpump-flow-card/wiki)
- [Live demo](https://xerolux.github.io/heatpump-flow-card/)

---

**Developed by:** [Xerolux](https://github.com/Xerolux)
**Card for:** any heat pump, solar thermal system, photovoltaics or heating
controller that reports to Home Assistant
**License:** MIT

[Unreleased]: https://github.com/Xerolux/heatpump-flow-card/compare/v1.7.0...HEAD
[1.7.0]: https://github.com/Xerolux/heatpump-flow-card/compare/v1.6.4...v1.7.0
[1.6.4]: https://github.com/Xerolux/heatpump-flow-card/compare/v1.6.3...v1.6.4
[1.6.3]: https://github.com/Xerolux/heatpump-flow-card/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/Xerolux/heatpump-flow-card/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/Xerolux/heatpump-flow-card/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/Xerolux/heatpump-flow-card/compare/v1.3.1...v1.6.0
[1.3.1]: https://github.com/Xerolux/heatpump-flow-card/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Xerolux/heatpump-flow-card/releases/tag/v1.3.0
