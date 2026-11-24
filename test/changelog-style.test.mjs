/*
 * Release-notes style contract for the changelog, in the shape the iDM
 * heat-pump integration established (tests/test_changelog_style.py there).
 *
 * The changelog section of a version is the release notes users read in the
 * HACS update dialog — the release workflow extracts it verbatim. Since the
 * 1.16.0 stable cut the contract is mechanical: every section that is not
 * yet released history opens with the ⚠️ Upgrade notes block, uses only the
 * emoji headers defined in docs/wiki/Development.md and keeps bullets at
 * about 60 words. Sections already released keep the shape they were
 * published with — the rule applies to the Unreleased section and to every
 * version newer than the baseline only, so an editorial pass never rewrites
 * history.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(resolve(root, relative), "utf8");

/** The last version published before the style rule landed. */
const STYLE_BASELINE = "1.16.0";
/** Longest allowed bullet, counted in whitespace-separated words. */
const MAX_BULLET_WORDS = 60;
/** Most bullets allowed in the upgrade-notes block. */
const MAX_UPGRADE_BULLETS = 5;
const UPGRADE_HEADER = "⚠️ Upgrade notes";

/* ---- parsing ------------------------------------------------------------ */

/** "1.16.1" and "1.11.0-beta.1" parse; "Unreleased" and older shapes do not. */
const parseVersion = (label) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-(\S+))?$/.exec(label);
  if (!match) return null;
  return { major: +match[1], minor: +match[2], patch: +match[3], pre: match[4] ?? null };
};

/** True when the label names a version newer than the baseline. */
const newerThanBaseline = (label) => {
  const version = parseVersion(label);
  if (!version) return false;
  const base = parseVersion(STYLE_BASELINE);
  for (const key of ["major", "minor", "patch"]) {
    if (version[key] !== base[key]) return version[key] > base[key];
  }
  // Same numbers: a prerelease of the baseline itself is not newer.
  return false;
};

const isStable = (label) => {
  const version = parseVersion(label);
  return version !== null && version.pre === null;
};

/** One "###" block: its header text and the bullets below it. */
const parseCategory = () => ({ name: "", bullets: [] });

/**
 * One "## [version]" section with its "###" blocks in file order.
 * Continuation lines are folded into their bullet, as the iDM test does.
 */
const parseSection = (label, body) => {
  const section = { label, categories: [] };
  let category = null;
  let bullet = null;

  const flushBullet = () => {
    if (bullet !== null && category !== null) {
      const joined = bullet.map((line) => line.trim()).join(" ").trim();
      category.bullets.push(joined.replace(/^- /, ""));
    }
    bullet = null;
  };

  for (const line of body.split("\n")) {
    if (line.startsWith("### ")) {
      flushBullet();
      category = { name: line.slice(4).trim(), bullets: [] };
      section.categories.push(category);
    } else if (line.trimStart().startsWith("- ")) {
      flushBullet();
      if (category === null) {
        category = parseCategory();
        section.categories.push(category);
      }
      bullet = [line];
    } else if (bullet !== null && (line.startsWith(" ") || !line.trim())) {
      bullet.push(line);
    } else {
      flushBullet();
    }
  }
  flushBullet();
  return section;
};

const parseSections = (text) => {
  const matches = [...text.matchAll(/^## \[[^\]]+\].*$/gm)].map((m) => m[0]);
  const sections = [];
  for (const heading of matches) {
    const start = text.indexOf(heading);
    const end = text.indexOf("\n## ", start);
    const body = text.slice(start, end === -1 ? text.length : end);
    const label = heading.replace(/^## \[|\].*$/g, "");
    // Start after the heading's own line: its date would leak in as a bullet.
    sections.push(parseSection(label, body.slice(body.indexOf("\n") + 1)));
  }
  return sections;
};

const sectionBullets = (section) =>
  section.categories.flatMap((category) => category.bullets);

/* ---- the contract ------------------------------------------------------- */

/**
 * The closed header set, derived from the development wiki so doc and test
 * cannot drift. Throws when the page stops defining it.
 */
const allowedHeaders = (development) => {
  const at = development.indexOf("## Release Notes Style");
  assert.ok(at !== -1, "docs/wiki/Development.md must carry a Release Notes Style section");
  const rest = development.slice(at);
  const stop = rest.indexOf("\n## ");
  const styleText = stop === -1 ? rest : rest.slice(0, stop);
  return [...new Set([...styleText.matchAll(/`### ([^`]+)`/g)].map((m) => m[1]))];
};

/**
 * The sections the style rule governs: the head of the file only. A fossil
 * "## [Unreleased]" heading would sit deep inside the released history;
 * everything from the first released stable heading down is history and
 * keeps the shape it was published with.
 */
const checkedSections = (text) => {
  const checked = [];
  for (const section of parseSections(text)) {
    if (section.label === "Unreleased" || newerThanBaseline(section.label)) {
      checked.push(section);
    }
    if (isStable(section.label)) break;
  }
  return checked;
};

const headerProblems = (text, headers) => {
  const allowed = new Set(headers);
  return checkedSections(text)
    .flatMap((section) =>
      section.categories
        .filter((category) => category.name && !allowed.has(category.name))
        .map((category) => `${section.label}: '${category.name}'`)
    );
};

const wordProblems = (text) => {
  const over = [];
  for (const section of checkedSections(text)) {
    for (const category of section.categories) {
      for (const bullet of category.bullets) {
        const words = bullet.split(/\s+/).filter(Boolean).length;
        if (words > MAX_BULLET_WORDS) {
          const lead = bullet.split(/\s+/).slice(0, 6).join(" ");
          over.push(`${section.label} (${words} words): ${lead}…`);
        }
      }
    }
  }
  return over;
};

const upgradeProblems = (text) => {
  const problems = [];
  for (const section of checkedSections(text)) {
    if (sectionBullets(section).length === 0) continue; // nothing to upgrade yet
    const blocks = section.categories.filter((c) => c.name === UPGRADE_HEADER);
    if (blocks.length !== 1) {
      problems.push(`${section.label}: ${blocks.length} upgrade blocks, expected exactly one`);
      continue;
    }
    if (section.categories[0].name !== UPGRADE_HEADER) {
      problems.push(`${section.label}: the upgrade block is not the first section heading`);
    }
    const count = blocks[0].bullets.length;
    if (count < 1 || count > MAX_UPGRADE_BULLETS) {
      problems.push(
        `${section.label}: ${count} upgrade bullets, expected 1..${MAX_UPGRADE_BULLETS}`
      );
    }
  }
  return problems;
};

/* ---- samples, the way the iDM test pins its own rules ------------------- */

/** A changelog in the post-baseline style plus a released section that
 *  breaks every rule and must not be flagged: released sections keep the
 *  shape they were published with. */
const SAMPLE = `# Changelog

## [Unreleased]

### ⚠️ Upgrade notes

- Rollback to 1.17.0 keeps working.

### ✨ New

- Short feature bullet.

## [1.16.1] - 2026-11-24

### ⚠️ Upgrade notes

- Nothing resets; rollback to 1.16.0 keeps working.

### 🐛 Bugfixes

- Bug fix bullet.

## [1.16.0] - 2026-11-24

### Added

- ${Array.from({ length: 61 }, () => "published").join(" ")}

### Notes

- Released section prose stays as published even when the headers and bullet
  lengths predate the style rule, because history is never rewritten.
`;

const HEADERS = [UPGRADE_HEADER, "✨ New", "🐛 Bugfixes", "💼 Maintenance", "❤️ Thanks"];

test("the development wiki defines the closed header set", () => {
  assert.deepEqual([...allowedHeaders(read("docs/wiki/Development.md"))].sort(), [...HEADERS].sort());
});

test("section headers come from the documented set", () => {
  const problems = headerProblems(read("CHANGELOG.md"), HEADERS);
  assert.deepEqual(problems, []);
});

test("bullets stay within the word budget", () => {
  const problems = wordProblems(read("CHANGELOG.md"));
  assert.deepEqual(problems, []);
});

test("the upgrade-notes block leads every section", () => {
  const problems = upgradeProblems(read("CHANGELOG.md"));
  assert.deepEqual(problems, []);
});

test("released sections keep their published shape", () => {
  assert.deepEqual(headerProblems(SAMPLE, HEADERS), []);
  assert.deepEqual(wordProblems(SAMPLE), []);
  assert.deepEqual(upgradeProblems(SAMPLE), []);
});

test("new sections are word checked", () => {
  const long = SAMPLE.replace("- Short feature bullet.", `- ${Array.from({ length: 61 }, () => "word").join(" ")}`);
  const problems = wordProblems(long);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /61 words/);
});

test("new sections reject headers outside the set", () => {
  const problems = headerProblems(SAMPLE.replace("### ✨ New", "### Added"), HEADERS);
  assert.deepEqual(problems, ["Unreleased: 'Added'"]);
});

test("new sections need the upgrade block first", () => {
  const missing = upgradeProblems(
    SAMPLE.replace("### ⚠️ Upgrade notes\n\n- Rollback to 1.17.0 keeps working.\n\n", "")
  );
  assert.deepEqual(missing, ["Unreleased: 0 upgrade blocks, expected exactly one"]);

  const late = upgradeProblems(
    SAMPLE.replace(
      "### ⚠️ Upgrade notes\n\n- Nothing resets; rollback to 1.16.0 keeps working.\n\n### 🐛 Bugfixes\n\n- Bug fix bullet.",
      "### 🐛 Bugfixes\n\n- Bug fix bullet.\n\n### ⚠️ Upgrade notes\n\n- Nothing resets; rollback to 1.16.0 keeps working."
    )
  );
  assert.deepEqual(late, ["1.16.1: the upgrade block is not the first section heading"]);
});
