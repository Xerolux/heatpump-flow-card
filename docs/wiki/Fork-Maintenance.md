# Fork maintenance (private fork — jsentveld)

This repository is a private fork of [Xerolux/heatpump-flow-card](https://github.com/Xerolux/heatpump-flow-card),
created to add one thing upstream doesn't have: a **wood stove** — a second,
hand-fed heat source that plumbs into the buffer tank alongside the heat pump.
Everything else (buffer tank, heating circuits, DHW, PV, solar) is used
exactly as upstream ships it — nothing else was touched.

**Why a fork instead of a PR:** kept private and under full control rather
than waiting on an external maintainer's review timeline. Nothing here rules
out proposing it upstream later — see "If you want to upstream it" below.

**Why this is realistically maintainable:** the whole card is one plain
JavaScript file, `dist/heatpump-flow-card.js` — no build step, no TypeScript
source that could drift from what ships. Every change below is either a new,
self-contained function or a one-line addition to an existing list/array.
None of it rewrites logic upstream might also touch, which is what keeps
merge conflicts small and mechanical instead of a real rewrite each time.

## Remotes

```
origin    https://github.com/jsentveld/heatpump-flow-card.git   (this fork)
upstream  https://github.com/Xerolux/heatpump-flow-card.git     (Xerolux's real repo)
```

The wood-stove work lives on the `feature/wood-stove-heat-source` branch,
not `main` — this keeps `main` a clean mirror of upstream, which makes
pulling updates a plain fast-forward instead of a merge every time.

## Pulling an upstream update

```bash
git checkout main
git fetch upstream
git merge upstream/main          # fast-forward, main tracks upstream exactly
git push origin main

git checkout feature/wood-stove-heat-source
git merge main                   # this is the step that can conflict
```

If `npm run check:docs` or `npm test` (see below) still passes after the
merge, you're done. If there's a conflict, it will show up inside one of the
anchor points listed below — every one of them is a small, named block, not
a scattered diff.

## Everywhere the wood-stove change touches `dist/heatpump-flow-card.js`

Search for these anchors by name (not line number — upstream changes will
shift line numbers, but these identifiers are stable):

| Anchor | What's there |
| --- | --- |
| `TEXTS.en` / `TEXTS.de` | one added key each: `wood_stove` |
| `woodStoveRunning` | new function, right after `heatPumpRunning` |
| `drawWoodStove` | new function, right after `drawHeatPump` — the panel, flame icon, status dot |
| `SECTION_FIELDS` | one added key: `wood_stove: [...]` |
| `normalizeConfig` | `wood_stove: null` added to the config object; `"wood_stove"` added to the `for (const key of [...])` loop |
| `GEOMETRY` | `ws: { w, h }` and `hpGapWithWoodStove` added |
| `buildScene` | `wsHeight`/`leftHeight` computed near `hpHeight`; `hpGapWithWoodStove` used in horizontal placement; `wsY` computed near `hpY`; `drawWoodStove(...)` called near the `drawHeatPump(...)` call; a new pipe-wiring block (comment: "A wood stove … plumbs into the buffer") right after the heat pump's own buffer pipes; two `drawBadge` calls for the wood stove's flow/return, right after the heat pump's own badges |
| CSS block | `.hpfc-ws-body`, `.hpfc-flame-outer`, `.hpfc-flame-inner`, `.hpfc-woodstove.hpfc-on …` — added right after the existing `.hpfc-aux.hpfc-on` rules |
| `EDITOR_TEXTS.en` / `.de` | `show_wood_stove` and `wood_stove` keys added |
| `EDITOR_SECTIONS` | one added key: `wood_stove: [...]` |
| `SECTION_ICONS` | one added key: `wood_stove: "mdi:fireplace"` |
| Editor `_computeSchema`, `_toData`, `_toConfig` | all three have the same `["buffer", "dhw", "pv", "solar"]` array — each got `"wood_stove"` appended. If upstream ever changes what lives in that array (unlikely, but possible), re-add `"wood_stove"` to all three, not just one. |

Everywhere else in the file is untouched.

## Also touched, outside the main file

- `tools/demo-hass.js` — three new demo entities (`binary_sensor.wood_stove`,
  `sensor.wood_stove_flow_temperature`, `sensor.wood_stove_return_temperature`),
  added right after the aux-heat demo entities.
- `tools/preview-config.js` — one new preview config, key `"wood-stove"`,
  added at the top of `window.previewConfigs`.
- `test/card.test.mjs` — one new test, `"a wood stove plumbs into the buffer
  alongside the heat pump"`, added right before the defrost test.
- `CHANGELOG.md` — an `### Added (private fork — jsentveld)` entry under
  `[Unreleased]`.
- `docs/wiki/Fork-Maintenance.md` — this file.

None of these can produce a real conflict with upstream (they're either new
keys/entries or a whole new file) — at worst git will ask you to keep both
sides, which is always the right answer here.

## After merging: verify before trusting it

```bash
npm install                      # only needed if package.json changed
npm run check                    # syntax
npm run check:docs               # versions, screenshots, examples, wiki links
npm test                         # renders the real card in a real browser
```

All 48 tests (47 upstream + the 1 wood-stove test) must pass. If Playwright's
browser isn't installed yet on whatever machine is doing this: `npx playwright
install chromium`.

To actually look at it rendered:

```bash
npm run site
open _site/index.html            # or: xdg-open on Linux
```

or, faster, just the one config:

```bash
open "tools/preview.html?layout=wood-stove"
```

## If you want to upstream it

The `wood_stove` section as written is already fairly generic (any hand-fed,
non-compressor heat source, not literally hardcoded to "wood"), which is
probably what a maintainer would want before merging something like this.
Opening it as a PR against `Xerolux/heatpump-flow-card` would mean rebasing
`feature/wood-stove-heat-source` onto their `main` and opening the PR from
that branch — nothing here needs to change first, this is purely a "when you
decide to" step, not a blocker.
