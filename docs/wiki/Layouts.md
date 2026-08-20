# Layouts

`layout` picks the arrangement and the default set of sections. It never locks
anything in: every section you configure is drawn, every section you set to
`false` disappears — regardless of the layout.

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

The two `compact` layouts also draw a shorter tank so the card fits into a
narrow column. `circuits:` always wins over the number a layout brings, up to
seven circuits (A–G).

## compact

![compact](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/compact.png)

## single

![single](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/single.png)

## dual

![dual](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/dual.png)

## dhw-dual

Hot water and two circuits — no PV, no solar thermal.

![dhw-dual](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/dhw-dual.png)

## pv-dual

![pv-dual](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/pv-dual.png)

## full

![full](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/full.png)

## direct

No buffer tank at all — the heat pump feeds the distributor directly.

![without a buffer tank](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/advanced.png)

## Mixing and matching

```yaml
# two circuits plus PV, without hot water
layout: dual
pv:
  power: sensor.pv_power
```

```yaml
# the full plant, but no solar thermal
layout: full
solar: false
```

```yaml
# no buffer tank: the heat pump feeds the circuits directly
buffer: false
```

## How the drawing is laid out

The card computes its own canvas from what you configured:

* **Left column** — PV above, solar thermal below (only when configured).
* **Centre** — the heat pump.
* **Then** — the buffer tank, if there is one.
* **Right column** — hot water first, then the heating circuits, stacked.

Two vertical rails between the tank and the right column act as flow and return
distributors; every consumer branches off them. The card scales to the width of
its dashboard column, so a wide layout in a narrow column simply gets smaller —
if the text becomes too small, pick a smaller layout or give the card more
columns in a sections view.
