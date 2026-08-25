/*
 * Prints the changelog section for one version, for the release body.
 * Shell quoting and awk regexes are a poor place for this: the pattern has to
 * survive YAML, bash and ERE, and when it does not the failure is silent - it
 * matches everything and the release ships the whole file.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const version = (process.argv[2] || "").replace(/^v/, "");
if (!version) {
  console.error("usage: node tools/release-notes.mjs <version>");
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lines = readFileSync(resolve(root, "CHANGELOG.md"), "utf8").split("\n");

const isHeading = (line) => line.startsWith("## ");
/** "## [1.8.2] - 2026-08-25" and a bare "## 1.8.2" both name this version. */
const namesVersion = (line) => {
  if (!isHeading(line)) return false;
  const rest = line.slice(3).trim();
  return (
    rest === version ||
    rest.startsWith(`${version} `) ||
    rest === `[${version}]` ||
    rest.startsWith(`[${version}]`)
  );
};

const body = [];
let inside = false;
for (const line of lines) {
  if (namesVersion(line)) {
    inside = true;
    continue;
  }
  if (inside && isHeading(line)) break;
  if (inside) body.push(line);
}

while (body.length && !body[0].trim()) body.shift();
while (body.length && !body[body.length - 1].trim()) body.pop();

if (!body.length) {
  console.error(`CHANGELOG.md has no section for ${version}.`);
  process.exit(1);
}
process.stdout.write(`${body.join("\n")}\n`);
