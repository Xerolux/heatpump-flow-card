# Development

The card is a single file of plain JavaScript, `dist/heatpump-flow-card.js`.
There is no build step and no dependency at runtime — what is in the repository
is what Home Assistant loads.

```bash
git clone https://github.com/Xerolux/heatpump-flow-card
cd heatpump-flow-card
npm install          # playwright, for the tests and screenshots
```

## Preview in a plain browser

```bash
npm run site         # assembles _site/
xdg-open _site/index.html
```

![The demo page](https://raw.githubusercontent.com/Xerolux/heatpump-flow-card/main/docs/images/demo-site.png)

The same page is published to
[GitHub Pages](https://xerolux.github.io/heatpump-flow-card/) on every push to
`main`.

`tools/preview.html` is the smaller variant used by the tests. Both load
`tools/demo-hass.js`, a Home Assistant stand-in with a full set of demo
entities, and `tools/preview-config.js`, which holds one configuration per
layout.

Query parameters of `preview.html`:

| Parameter | Values |
| --- | --- |
| `layout` | `compact`, `single`, `dual`, `full`, `advanced`, `circuits` |
| `theme` | `light` (default) or `dark` |
| `lang` | `de` (default) or `en` |

## Tests

```bash
npm run check        # syntax
npm run check:docs   # versions, screenshots, examples, wiki links
npm test             # renders the card in Chromium and checks behaviour
```

The tests drive the real card in a real browser: every layout renders without
console errors, taps toggle, press, open option lists and steppers, idle
circuits stay idle, pipes get their colours, and the editor round-trips a
configuration without losing YAML-only options.

## Screenshots

```bash
npm run screenshots  # regenerates docs/images/*.png
```

Every image in the README and the wiki comes from this script, so they never
drift away from the actual rendering.

## Layout of the source

| Section | What lives there |
| --- | --- |
| Helpers | state access, number formatting, temperature colours |
| Actions | tap and hold, the control model per entity domain |
| Building blocks | panels, readouts, badges, chips, pipes |
| Components | heat pump, tank, hot water, PV, solar, circuits |
| Configuration | normalisation, layout presets, field aliases |
| Scene | geometry, pipe routing |
| Card | the custom element, the popover |
| Editor | `ha-form` schema and the config round-trip |

Drawing happens once; afterwards only the registered update functions run on
every state change, so animations never restart.

## Releasing

1. Bump `CARD_VERSION` in `dist/heatpump-flow-card.js` and `version` in
   `package.json`, add a CHANGELOG entry.
2. Merge to `main`.
3. `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`

The release workflow checks that tag, `CARD_VERSION` and `package.json` agree,
then publishes the release with the card attached.
