# Colours and themes

## The temperature ramp

Pipes, tank layers, radiators and value texts all use one scale:

| Temperature | Colour |
| --- | --- |
| −10 °C and below | deep blue |
| 5 °C | blue |
| 15 °C | light blue |
| 22 °C | neutral grey — “lukewarm” |
| 30 °C | amber |
| 40 °C | orange |
| 50 °C and above | red |

Values in between are interpolated. The neutral point around room temperature
is deliberate: it keeps a 25 °C underfloor flow from looking as dramatic as a
55 °C radiator flow.

Where both ends of a pipe are known, the colour runs as a gradient from one end
to the other — the return pipe of a circuit visibly cools down along its way
back to the tank.

**Value texts** only take a colour when it is saturated enough to stay readable
on a light and a dark card. Room temperatures near 22 °C therefore keep the
normal text colour instead of turning pale grey.

```yaml
temperature_colors: false
```

turns the ramp off: flow pipes are red, return pipes blue, solar orange and the
PV line yellow.

## Theme variables

The card takes its surfaces and text from the dashboard theme, so it follows a
custom theme without any configuration:

| Variable | Used for |
| --- | --- |
| `--card-background-color` | Card and tank outlines, pump housings |
| `--primary-text-color` | Titles and values |
| `--secondary-text-color` | Labels, idle pumps, chevrons |
| `--divider-color` | Panel borders, grilles, rails |
| `--primary-color` | Focus ring, active option buttons |
| `--info-color` | Running pumps and the compressor fan |
| `--success-color` | Status dots and active chips |
| `--warning-color` | Unknown status |
| `--error-color` | Error message when a configuration is invalid |

One extra variable belongs to the card itself:

| Variable | Default | Meaning |
| --- | --- | --- |
| `--hpfc-panel-color` | `rgba(127,127,127,0.10)` | Fill of the component panels |

Set it per card with `card_mod`, or globally in your theme:

```yaml
# themes.yaml
my_theme:
  hpfc-panel-color: "rgba(56,189,248,0.08)"
```

## Dark mode

![Dark theme](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/dual-dark.png)

Nothing to configure — the card renders in whatever theme the dashboard uses.

## Motion

```yaml
animation: true    # dots travelling through the pipes
flow_speed: 1.4    # 0.2 (slow) to 3 (fast)
```

The card also honours the operating system's **reduce motion** setting: fans,
pumps and dots stop, colours and values stay.
