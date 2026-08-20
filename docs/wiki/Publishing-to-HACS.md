# Publishing to HACS

The card is installable through HACS as a **custom repository** today, and it
meets every requirement for the HACS default store. This page is the checklist
and the submission procedure.

## Installing it as a custom repository

Nothing has to be published for this — see [Installation](Installation).

## What the default store requires

| Requirement | Where it stands |
| --- | --- |
| Public GitHub repository, not archived | ✅ |
| Description on the repository | ✅ |
| Topics on the repository | ✅ `home-assistant`, `hacs`, `lovelace`, `lovelace-card`, `custom-card`, `dashboard`, `heat-pump`, `heating`, `cooling` |
| Issues enabled | ✅ |
| A license GitHub recognises | ✅ MIT |
| `hacs.json` with at least a `name` | ✅ also `filename`, `render_readme`, `homeassistant` |
| A `.js` file named after the repository, in the root or in `dist/` | ✅ `dist/heatpump-flow-card.js` |
| Images in the README | ✅ the gallery |
| At least one GitHub release, created after the checks pass | ✅ every release attaches `heatpump-flow-card.js` |
| The HACS action passes | ✅ runs on every push and pull request in `validate.yml` |

## Cutting a release

1. Bump `CARD_VERSION` in `dist/heatpump-flow-card.js` and `version` in
   `package.json`, and add a CHANGELOG section for that version.
2. Merge to `main`.
3. **Actions → Release → Run workflow**, or push a tag `vX.Y.Z`.

The workflow refuses to publish unless the card, `package.json`, the tag and the
CHANGELOG all agree, then creates the tag and publishes the release with
`heatpump-flow-card.js` attached. HACS hands users that asset.

## Submitting it to the default store

1. Make sure the latest release is green — `validate.yml` must have passed on
   the commit the release points at.
2. Fork [`hacs/default`](https://github.com/hacs/default).
3. Add `Xerolux/heatpump-flow-card` to the `plugin` file, **in alphabetical
   order**, on a new branch.
4. Open a pull request from that branch. It has to be editable by maintainers,
   and you have to be the repository owner — which you are.
5. The HACS bot runs its checks (repository, releases, images, hacs.json,
   archived, owner). Everything on the list above is what it looks at.

Once merged, the card shows up in HACS for everyone without adding a custom
repository.

## After publishing

* Keep releasing through the workflow — HACS shows users the last five
  releases.
* `hacs.json` pins `homeassistant: 2024.8.0`; raise it only when the card
  actually starts needing something newer, because HACS hides the card from
  anyone on an older version.
* The repository description and the README are what people read in the HACS
  store, so they are worth keeping current.
