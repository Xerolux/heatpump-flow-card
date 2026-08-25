# Template sensors

Two of the values the card can draw rarely exist as an entity of their own:
**house consumption** and, on a plant with a DC-coupled battery, the **actual
photovoltaic production**. Both are a subtraction away from entities you
already have, and Home Assistant builds them without any add-on.

Everything below is Home Assistant configuration, not card configuration — the
card only ever reads the finished sensor.

## Making a template sensor

**Through the interface**, no file editing:

*Settings → Devices & Services → Helpers → Create helper → Template → Template
a sensor.* Paste the state template, set the unit to `W`, the device class to
*Power* and the state class to *Measurement*. A helper named `House
consumption` becomes `sensor.house_consumption`.

**Through YAML**, in `configuration.yaml`:

```yaml
template:
  - sensor:
      - name: House consumption
        unique_id: house_consumption
        unit_of_measurement: W
        device_class: power
        state_class: measurement
        state: >
          ...
```

Then *Developer tools → YAML → Template entities* and reload. Without that
reload the sensor does not appear, which is the usual reason a freshly written
template seems to be missing.

To try a template before committing to it, paste it into *Developer tools →
Template* — it evaluates live against your real states.

## House consumption

What the building draws is what the inverters deliver plus what comes in from
the grid:

```
house = inverters (net) + grid import
```

A battery does not appear in the sum when it is DC-coupled, because its
charging and discharging is already inside the inverter's AC figure. Subtract
the wallbox, otherwise the card counts it twice — once as its own node and once
inside the house.

```yaml
template:
  - sensor:
      - name: House consumption
        unique_id: house_consumption
        unit_of_measurement: W
        device_class: power
        state_class: measurement
        availability: >
          {{ has_value('sensor.grid_power') and has_value('sensor.inverter_1') }}
        state: >
          {# set to false if the value comes out negative - see below #}
          {% set import_positive = true %}
          {% set inverters = states('sensor.inverter_1') | float(0)
                           + states('sensor.inverter_2') | float(0) %}
          {% set grid = states('sensor.grid_power') | float(0) %}
          {% set grid = grid if import_positive else -grid %}
          {% set wallbox = states('sensor.wallbox_power') | float(0) %}
          {{ (inverters + grid - wallbox) | round(0) }}
```

Then in the card:

```yaml
pv:
  house: sensor.house_consumption
```

## Which way does the meter count?

Meters disagree, and the card takes import as positive. Some integrations even
offer both directions as separate entities — SolarEdge ships `..._ac_power` and
`..._ac_power_inverted` for exactly this reason.

You do not have to measure anything to find out: **a house consumption cannot
be negative.** If the sensor above sits at a plausible positive figure, the
convention matches. If it mirrors it — a sensible number with a minus in front —
flip both places at once:

* `import_positive` to `false` in the template, and
* `invert: true` on `grid_power` in the card:

```yaml
  grid_power:
    entity: sensor.grid_power
    invert: true
```

Judge it while there is actually something flowing. Around noon, with
production, consumption and a charging battery cancelling each other out, the
meter sits near zero and both variants look alike.

## Photovoltaic production with a DC-coupled battery

On a plant where the battery hangs on the DC side of one inverter, that
inverter's AC power goes *negative* while the battery charges from elsewhere:
it is consuming, not producing. Summing all inverters therefore gives the net
output of the fleet, which is honest but can read below zero at night.

If you would rather see production alone, count the storage inverter only while
it is positive:

```yaml
        state: >
          {% set storage = states('sensor.inverter_1') | float(0) %}
          {{ ([storage, 0] | max
              + states('sensor.inverter_2') | float(0)
              + states('sensor.inverter_3') | float(0)) | round(0) }}
```

and point `pv.power` at that one sensor instead of at the list of inverters.
