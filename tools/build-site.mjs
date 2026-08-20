/* Assembles the GitHub Pages demo into _site/. */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = resolve(root, "_site");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync(resolve(root, "docs/site/index.html"), resolve(out, "index.html"));
cpSync(resolve(root, "dist/heatpump-flow-card.js"), resolve(out, "heatpump-flow-card.js"));
cpSync(resolve(root, "tools/demo-hass.js"), resolve(out, "demo-hass.js"));
cpSync(resolve(root, "tools/preview-config.js"), resolve(out, "preview-config.js"));
cpSync(resolve(root, "docs/images"), resolve(out, "images"), { recursive: true });
for (const asset of ["icon.svg", "icon-256.png", "favicon-32.png", "social-preview.png"]) {
  cpSync(resolve(root, "docs/brand", asset), resolve(out, asset));
}

console.log(`site written to ${out}`);
