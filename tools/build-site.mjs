/* Assembles the GitHub Pages demo into _site/. */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = resolve(root, "_site");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Stamp the card version onto every asset URL: browsers hold on to a demo
// page for a long time, and a stale bundle looks like a bug in the card.
const version = readFileSync(resolve(root, "dist/heatpump-flow-card.js"), "utf8").match(
  /CARD_VERSION = "([^"]+)"/
)[1];
const page = readFileSync(resolve(root, "docs/site/index.html"), "utf8").replace(
  /\.\/(heatpump-flow-card\.js|demo-hass\.js|preview-config\.js|icon\.svg|icon-256\.png|social-preview\.png)/g,
  `./$1?v=${version}`
);
writeFileSync(resolve(out, "index.html"), page);
cpSync(resolve(root, "dist/heatpump-flow-card.js"), resolve(out, "heatpump-flow-card.js"));
cpSync(resolve(root, "tools/demo-hass.js"), resolve(out, "demo-hass.js"));
cpSync(resolve(root, "tools/preview-config.js"), resolve(out, "preview-config.js"));
cpSync(resolve(root, "docs/images"), resolve(out, "images"), { recursive: true });
for (const asset of ["icon.svg", "icon-256.png", "favicon-32.png", "social-preview.png"]) {
  cpSync(resolve(root, "docs/brand", asset), resolve(out, asset));
}

console.log(`site written to ${out} (v${version})`);
