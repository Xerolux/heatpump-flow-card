import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = resolve(root, "tools", "release-notes.mjs");
const notes = (version) =>
  execFileSync(process.execPath, [script, version], { cwd: root, encoding: "utf8" });
const fails = (version) => {
  try {
    execFileSync(process.execPath, [script, version], { cwd: root, stdio: "pipe" });
    return false;
  } catch (error) {
    return error.status === 1;
  }
};

const currentVersion = readFileSync(resolve(root, "dist/heatpump-flow-card.js"), "utf8").match(
  /CARD_VERSION = "([^"]+)"/
)[1];

test("the release notes are the changelog section for that version", () => {
  const body = notes(currentVersion);
  assert.ok(body.trim().length > 40, "the section should carry some prose");
  // it stops at the next version rather than running to the end of the file
  assert.ok(!body.includes("## ["), `the slice ran into another section:\n${body}`);
  // and it starts at the content, not at the blank line under the heading
  assert.ok(!/^\s/.test(body), "leading blank lines should be trimmed");
});

test("a v prefix is accepted, the way a tag writes it", () => {
  assert.equal(notes(`v${currentVersion}`), notes(currentVersion));
});

test("a version with no section fails instead of shipping the whole file", () => {
  assert.equal(fails("9.9.9"), true, "an unknown version must fail");
  // the trap that shipped the funding badges: a prefix of a real version
  assert.equal(fails(currentVersion.split(".").slice(0, 2).join(".")), true);
});
