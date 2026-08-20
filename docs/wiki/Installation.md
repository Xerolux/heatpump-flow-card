# Installation

## HACS (recommended)

1. Open **HACS** → three dots menu → **Custom repositories**.
2. Repository: `https://github.com/Xerolux/heatpump-flow-card`
   Category: **Dashboard** (older HACS versions call this *Lovelace* or
   *Plugin*).
3. Search for **Heat Pump Flow Card**, install it.
4. Reload your browser with a hard refresh (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd> +
   <kbd>Shift</kbd> + <kbd>R</kbd>).

HACS registers the dashboard resource for you. If your Home Assistant runs in
YAML mode, add the resource yourself as described below.

## Manual

1. Download `heatpump-flow-card.js` from the
   [latest release](https://github.com/Xerolux/heatpump-flow-card/releases/latest)
   or copy it out of `dist/`.
2. Put it in `config/www/`, so the file lives at
   `config/www/heatpump-flow-card.js`.
3. **Settings → Dashboards → three dots → Resources → Add resource**
   * URL: `/local/heatpump-flow-card.js`
   * Type: **JavaScript module**
4. Hard refresh the browser.

In YAML mode add it to your Lovelace configuration instead:

```yaml
lovelace:
  resources:
    - url: /local/heatpump-flow-card.js
      type: module
```

## Adding the card

**Edit dashboard → Add card → search for “Heat Pump Flow Card”.** The card ships
a visual editor: pick a layout, then the entities per section. Everything the
editor offers is also available in YAML — see [Configuration](Configuration).

## Updating

HACS shows updates like any other repository. After updating, hard refresh the
browser: dashboards cache the JavaScript aggressively, and a stale cache is the
most common reason a new option “does not exist”.

## Requirements

* Home Assistant 2024.8 or newer (the card uses `ha-form` sections in the
  editor).
* No other frontend cards or libraries — the file is self contained, has no
  dependencies and loads nothing from the internet.
