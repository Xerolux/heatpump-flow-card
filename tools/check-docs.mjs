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
const changelog = read("CHANGELOG.md");
// Keep a Changelog brackets the version when it links to a tag, and leaves it
// bare when there is none. Both count as the section for this version.
if (!changelog.includes(`## ${cardVersion}`) && !changelog.includes(`## [${cardVersion}]`)) {
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
  // A file is either one card, or a whole dashboard view holding cards.
  const cards = [];
  const collect = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    if (node.type === "custom:heatpump-flow-card") cards.push(node);
    for (const value of Object.values(node)) collect(value);
  };
  collect(config);

  if (!cards.length) {
    problems.push(`${file} contains no heatpump-flow-card`);
  }
  for (const card of cards) {
    if (card.layout && !layouts.has(card.layout)) {
      problems.push(`${file} uses the unknown layout "${card.layout}"`);
    }
    if (Array.isArray(card.circuits) && card.circuits.length > 7) {
      problems.push(`${file} configures ${card.circuits.length} circuits, the card draws seven`);
    }
    const circuitD = Array.isArray(card.circuits)
      ? card.circuits.find(
          (circuit) =>
            circuit?.target_temp === "number.alm6_15_hc_d_room_setpoint_heat_normal"
        )
      : undefined;
    if (circuitD) {
      const expected = {
        flow_temp: "sensor.heizkreis_d_hc_d_flow_temp",
        room_temp: "sensor.heizkreis_d_hc_d_room_temp",
        pump: "binary_sensor.heizkreis_d_pumpe_heizkreis_d_web",
        valve: "sensor.heizkreis_d_mischer_heizkreis_d_web",
      };
      for (const [field, entity] of Object.entries(expected)) {
        if (circuitD[field] !== entity) {
          problems.push(`${file} circuit D must use ${field}: ${entity}`);
        }
      }
    }
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
  const references = [
    ...[...text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]),
    ...[...text.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/srcset="([^"]+)"/g)].map((m) => m[1]),
  ];
  for (const target of references) {
    if (target.startsWith("http")) {
      const remote = target.match(/heatpump-flow-card\/main\/(docs\/(?:images|brand)\/[^)\s"]+)/);
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

/* ---- English is the default language ------------------------------------ */
const GERMAN_MARKERS = [
  "wärme",
  "heizkreis",
  "vorlauf",
  "rücklauf",
  "warmwasser",
  "pufferspeicher",
  "heizkörper",
  "fußboden",
  "betriebsart",
  "solarthermie",
  "kollektor",
  "umwälz",
  "zeitprogramm",
];
const englishFiles = [
  "README.md",
  ...readdirSync(resolve(root, "docs/wiki"))
    .filter((f) => f.endsWith(".md") && !f.endsWith("-de.md"))
    .map((f) => join("docs/wiki", f)),
  ...readdirSync(resolve(root, "examples")).map((f) => join("examples", f)),
  join("docs/site", "index.html"),
  // this file carries the marker list itself
  ...readdirSync(resolve(root, "tools"))
    .filter((f) => f !== "check-docs.mjs")
    .map((f) => join("tools", f)),
];
for (const file of englishFiles) {
  const lines = read(file).split("\n");
  lines.forEach((line, index) => {
    // Entity ids are data, not prose: a German integration names them in
    // German and an example has to quote them exactly.
    const prose = line.toLowerCase().replace(/\b[a-z_]+\.[a-z0-9_]+\b/g, " ");
    const hit = GERMAN_MARKERS.find((word) => prose.includes(word));
    if (hit) problems.push(`${file}:${index + 1} still says "${hit}" - English is the default`);
  });
}

if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}
console.log(`docs ok — v${cardVersion}, ${layouts.size} layouts, ${wikiPages.size} wiki pages`);
