# Changelog

The full history lives in
[CHANGELOG.md](https://github.com/Xerolux/heatpump-flow-card/blob/main/CHANGELOG.md)
in the repository, and every tagged version has its own
[release page](https://github.com/Xerolux/heatpump-flow-card/releases) with the
`heatpump-flow-card.js` bundle attached.

## How versions work here

The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

* **Major** — a configuration written for the previous version would have to be
  changed. There has not been one yet.
* **Minor** — new options, new layouts, new things the card can draw or operate.
  Existing configurations keep working untouched.
* **Patch** — fixes and documentation, no new options.

Four places state the version and a release refuses to publish unless they
agree: `CARD_VERSION` in `dist/heatpump-flow-card.js`, `package.json`, the git
tag and the section heading in the changelog.

## Updating

In Home Assistant: **HACS → Dashboard → Heat Pump Flow Card → Redownload**, pick
the version, then reload the browser once (Ctrl+F5) so the new bundle is
actually loaded instead of the cached one. The card prints its version to the
browser console on start, which is the quickest way to check what is running.

## Support

The card is free and stays free. If it helps you and you would like to support
the work, any of these is hugely motivating — and none of them is expected:

* [Buy Me a Coffee](https://buymeacoffee.com/xerolux)
* [Ko-fi](https://ko-fi.com/xerolux)
* [PayPal](https://paypal.me/xerolux)
* [GitHub Sponsors](https://github.com/sponsors/Xerolux)
* [Tesla Referral](https://ts.la/sebastian564489)
* Star the [repository](https://github.com/Xerolux/heatpump-flow-card)

Every contribution is a huge motivation. Thank you!
