# Changelog

## 1.2.1

* The documentation workflow no longer needs the repository to be prepared by
  hand: Pages is enabled on the first run, and a wiki that has never been
  written to is created instead of failing the job. If wikis are switched off
  entirely, the job warns instead of turning the branch red.

## 1.2.0

* **Eighteen layout presets** instead of four: with or without hot water, PV,
  solar thermal or a buffer tank, and one to four circuits — pick one in the
  editor instead of assembling it by hand.
* **Up to seven heating circuits** (A–G) instead of four.
* **Every circuit answers for itself.** A `mode` set to off, aus, standby, idle
  or closed parks a circuit even while the heat pump runs; only a circuit
  without any state source of its own follows the heat pump. Panels, pumps and
  pipes are marked with `data-part`, so a circuit can also be styled or asserted
  individually.
* `dim_inactive: false` now really keeps idle branches at full opacity (the dots
  still stop).
* A live demo published to GitHub Pages, a wiki under `docs/wiki/`, and a
  screenshot gallery in both READMEs.
* New workflows: documentation (Pages + wiki sync), security (CodeQL,
  dependency review), Dependabot, issue and pull request templates, and a
  `check:docs` step that keeps versions, screenshots, examples and wiki links
  honest.
* Removed a wrong claim about where the card came from — it is vendor neutral
  and always was.

## 1.1.0

* Operate the plant straight from the card: a tap toggles switches, presses
  buttons, opens the options of a `select`, or a plus/minus stepper and the
  hvac modes of `number`, `climate` and `water_heater` entities. Holding an
  element still opens more-info.
* New `mode` field for the heat pump, the heating circuits and hot water, shown
  as a chip on the panel, plus a `boost` chip for hot water.
* `climate` and `water_heater` entities used as `target_temp`, `temp` or
  `room_temp` read the matching attribute automatically.
* Values that can be operated are marked, mode chips show a chevron.
* New option `controls` (default `true`) to switch all of this off.
* New example for the IDM heat pump integration.

## 1.0.0

First release.

* Animated hydraulic scheme with heat pump, buffer tank, hot water,
  photovoltaics, solar thermal and up to four heating circuits.
* Four layouts: `compact`, `single`, `dual`, `full`.
* Pipes coloured by the temperature they carry, with a gradient along the pipe
  when both ends are known.
* Rotating fan and pumps, travelling flow dots, dimmed idle branches.
* Tap and hold actions on every element; switchable entities toggle by default.
* Visual editor with sections for every part of the plant.
* German and English labels, light and dark theme, reduced-motion support.
