/*
 * Renders every demo layout and reports texts that sit on top of each other.
 * Overlapping labels are the one drawing bug a screenshot review keeps missing.
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const preview = `file://${resolve(here, "preview.html")}`;
const candidate = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const browser = await chromium.launch(existsSync(candidate) ? { executablePath: candidate } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

const layouts = ["compact", "single", "dual", "dhw-dual", "pv-dual", "full", "advanced", "circuits", "extras", "electrics"];
const problems = [];

for (const layout of layouts) {
  await page.goto(`${preview}?layout=${layout}`);
  await page.waitForTimeout(250);
  const hits = await page.evaluate((name) => {
    const root = document.getElementById(`card-${name}`).shadowRoot;
    const texts = [...root.querySelectorAll("svg text")].filter((node) => {
      const content = (node.textContent || "").trim();
      if (!content) return false;
      let element = node;
      while (element && element !== root) {
        if (element.style && element.style.display === "none") return false;
        element = element.parentNode;
      }
      return true;
    });
    const boxes = texts.map((node) => ({ node, text: node.textContent, rect: node.getBoundingClientRect() }));
    const overlaps = (a, b) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const found = [];

    // label on label
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (overlaps(boxes[i].rect, boxes[j].rect)) {
          found.push(`"${boxes[i].text}" over "${boxes[j].text}"`);
        }
      }
    }

    // label on a filled plate it does not belong to - pills, badges, chips
    const plates = [...root.querySelectorAll(
      ".hpfc-tank-pill rect, .hpfc-badge rect, .hpfc-chip rect, .hpfc-aux-plate"
    )];
    for (const plate of plates) {
      const plateRect = plate.getBoundingClientRect();
      for (const box of boxes) {
        if (plate.parentNode.contains(box.node)) continue;
        if (overlaps(plateRect, box.rect)) {
          found.push(`"${box.text}" over the ${plate.parentNode.getAttribute("class")} plate`);
        }
      }
    }
    return found;
  }, layout);
  for (const hit of hits) problems.push(`${layout}: ${hit}`);
}

await browser.close();

if (problems.length) {
  console.error(`${problems.length} overlapping label(s):`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}
console.log(`no overlapping labels in ${layouts.length} layouts`);
