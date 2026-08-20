# Troubleshooting

## “Custom element doesn't exist: heatpump-flow-card”

The browser has not loaded the JavaScript.

1. Hard refresh (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>).
2. **Settings → Dashboards → Resources**: there must be an entry pointing at
   the card with type **JavaScript module**. HACS adds it automatically; in YAML
   mode you add it yourself.
3. Open the browser console. `HEATPUMP-FLOW-CARD v…` is logged when the file
   loaded. No line means the resource URL is wrong.

## Everything shows “–”

The card found no state for those entities. Check the entity ids in
**Developer tools → States**; a typo shows as a dash rather than an error. The
same happens while an integration is still starting up.

## A value shows the wrong thing

A `climate` or `water_heater` entity shows its *state* (`heat`) unless the card
knows which attribute you mean. As `target_temp`, `temp` or `room_temp` the
right attribute is picked automatically; anywhere else name it yourself:

```yaml
power:
  entity: climate.circuit_a
  attribute: current_temperature
  unit: "°C"
```

## Nothing moves

* `animation: false` in the configuration?
* The operating system's **reduce motion** setting is on — the card respects it.
* Nothing is actually running: dots only travel through pipes that carry water.
  See below.

## A circuit looks idle although it is heating

The card decides per circuit, in this order:

1. `pump` — if you configured one, it decides, full stop.
2. `mode` — a mode containing *off*, *aus*, *standby*, *idle* or *closed* parks
   the circuit.
3. `valve` — an opening above 0 %.
4. `entity` — its state.
5. Nothing configured? The circuit follows the heat pump.

So a circuit with a pump entity that reports `off` stays idle even while the
heat pump runs — which is usually correct, and is the point: circuit A running
says nothing about circuit D.

## The heat pump never looks like it is running

Without `state_entity` the card falls back to `power` above `power_threshold`
(20 W by default), then `compressor` above 0, then `entity`. A power sensor in
kilowatts needs a lower threshold:

```yaml
heatpump:
  power: sensor.hp_power_kw
  power_threshold: 0.02
```

## Tapping does nothing / the wrong thing

* `controls: false` turns the inline controls off — every tap opens more-info.
* A `sensor` cannot be operated; put the writable entity (`number`, `select`,
  `climate`) in that field instead.
* An element with `tap_action: {action: none}` swallows the tap by design.

## The card is too wide

`layout: full` needs room. In a sections view give the card more columns, or
switch to `compact`. The drawing scales to the column width, so the text gets
smaller rather than clipped.

## The editor shows empty entity pickers

Options written in long form (an object with `entity:`, `attribute:` and so on)
cannot be shown by the form. They are listed as *Configured in YAML* in that
section, are left untouched when you save, and stay editable in the YAML editor.

## Still stuck?

Open an issue with your card YAML, the Home Assistant version and a screenshot:
<https://github.com/Xerolux/heatpump-flow-card/issues>
