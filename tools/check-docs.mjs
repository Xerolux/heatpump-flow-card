/*
 * Guards the things that silently drift apart: versions, screenshots, example
 * configurations, layout names and wiki links.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const yaml = createRequire(import.meta.url)("js-yaml");

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const problems = [];
const read = (relative) => readFileSync(resolve(root, relative), "utf8");

/* ---- versions agree ---------------------------------------------------- */
const source = read("dist/heatpump-flow-card.js");
const cardVersion = source.match(/CARD_VERSION = "([^"]+)"/)[1];
const packageVersion = JSON.parse(read("package.json")).version;
if (cardVersion !== packageVersion) {
  problems.push(`CARD_VERSION is ${cardVersion} but package.json says ${packageVersion}`);
}
if (!read("CHANGELOG.md").includes(`## ${cardVersion}`)) {
  problems.push(`CHANGELOG.md has no section for ${cardVersion}`);
}

/* ---- known layouts ----------------------------------------------------- */
const presetBlock = source.slice(
  source.indexOf("const LAYOUT_PRESETS = {"),
  source.indexOf("const SECTION_FIELDS")
);
const layouts = new Set([...presetBlock.matchAll(/^\s{2}"?([a-z][a-z-]*)"?:\s*\{/gm)].map((m) => m[1]));
if (layouts.size < 4) problems.push("could not read the layout presets from the card");

/* ---- example configurations -------------------------------------------- */
for (const file of readdirSync(resolve(root, "examples")).filter((f) => f.endsWith(".yaml"))) {
  let config;
  try {
    config = yaml.load(read(join("examples", file)));
  } catch (error) {
    problems.push(`${file} is not valid YAML: ${error.message}`);
    continue;
  }
  if (config.type !== "custom:heatpump-flow-card") {
    problems.push(`${file} does not declare the card type`);
  }
  if (config.layout && !layouts.has(config.layout)) {
    problems.push(`${file} uses the unknown layout "${config.layout}"`);
  }
  if (Array.isArray(config.circuits) && config.circuits.length > 7) {
    problems.push(`${file} configures ${config.circuits.length} circuits, the card draws seven`);
  }
}

/* ---- images and links -------------------------------------------------- */
const markdown = [
  "README.md",
  "README.de.md",
  "CHANGELOG.md",
  ...readdirSync(resolve(root, "docs/wiki")).map((f) => join("docs/wiki", f)),
];
const wikiPages = new Set(
  readdirSync(resolve(root, "docs/wiki"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
);

for (const file of markdown) {
  const text = read(file);
  for (const [, target] of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
    if (target.startsWith("http")) {
      const remote = target.match(/heatpump-flow-card\/main\/(docs\/images\/[^)\s]+)/);
      if (remote && !existsSync(resolve(root, remote[1]))) {
        problems.push(`${file} links the missing image ${remote[1]}`);
      }
      continue;
    }
    if (!existsSync(resolve(root, target))) problems.push(`${file} links the missing image ${target}`);
  }
  if (!file.startsWith("docs/wiki")) continue;
  for (const [, target] of text.matchAll(/\[[^\]]+\]\(([A-Z_][A-Za-z0-9-]*)\)/g)) {
    if (!wikiPages.has(target)) problems.push(`${file} links the missing wiki page ${target}`);
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}
console.log(`docs ok — v${cardVersion}, ${layouts.size} layouts, ${wikiPages.size} wiki pages`);
