# Changelog

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
