/* Renders every layout to docs/images/*.png with the pre-installed Chromium. */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "..", "docs", "images");
mkdirSync(out, { recursive: true });

const layouts = ["compact", "single", "dual", "dhw-dual", "pv-dual", "full", "advanced", "circuits", "extras"];
const candidate = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const browser = await chromium.launch(existsSync(candidate) ? { executablePath: candidate } : {});
const errors = [];

const darkLayouts = new Set(["dual"]);

for (const theme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 1140, height: 900 }, deviceScaleFactor: 1.5 });
  page.on("pageerror", (error) => errors.push(`${theme}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${theme}: ${message.text()}`);
  });
  for (const layout of layouts) {
    if (theme === "dark" && !darkLayouts.has(layout)) continue;
    const url = `file://${resolve(here, "preview.html")}?layout=${layout}&theme=${theme}`;
    await page.goto(url);
    await page.waitForTimeout(400);
    const card = page.locator(`#card-${layout}`);
    await card.screenshot({ path: resolve(out, `${layout}${theme === "dark" ? "-dark" : ""}.png`) });
  }
  await page.close();
}

// the control panel, opened on a heating circuit
{
  const page = await browser.newPage({ viewport: { width: 1140, height: 900 }, deviceScaleFactor: 1.5 });
  page.on("pageerror", (error) => errors.push(`controls: ${error.message}`));
  await page.goto(`file://${resolve(here, "preview.html")}?layout=full`);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document
      .getElementById("card-full")
      .shadowRoot.querySelector(".hpfc-circuit .hpfc-chip")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(200);
  await page.locator("#card-full").screenshot({ path: resolve(out, "controls.png") });
  await page.close();
}

await browser.close();
if (errors.length) {
  console.error("Errors while rendering:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("screenshots written to docs/images");
