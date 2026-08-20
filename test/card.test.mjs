import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

/** Uses the pre-installed Chromium when there is one, otherwise Playwright's own. */
function launchOptions() {
  const candidate = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
  return candidate && existsSync(candidate) ? { executablePath: candidate } : {};
}


const here = dirname(fileURLToPath(import.meta.url));
const previewUrl = `file://${resolve(here, "..", "tools", "preview.html")}`;

let browser;
let page;
const pageErrors = [];

before(async () => {
  browser = await chromium.launch(launchOptions());
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  await page.goto(`${previewUrl}?layout=full`);
  await page.waitForSelector("heatpump-flow-card");
});

after(async () => {
  await browser.close();
});

test("renders every layout without errors", async () => {
  for (const layout of ["compact", "single", "dual", "full"]) {
    await page.goto(`${previewUrl}?layout=${layout}`);
    const boxes = await page.evaluate((name) => {
      const card = document.getElementById(`card-${name}`);
      const svg = card.shadowRoot.querySelector("svg");
      return {
        viewBox: svg.getAttribute("viewBox"),
        panels: svg.querySelectorAll(".hpfc-panel").length,
        pipes: svg.querySelectorAll(".hpfc-pipe").length,
      };
    }, layout);
    assert.ok(boxes.panels > 0, `${layout} draws panels`);
    assert.ok(boxes.pipes > 3, `${layout} draws pipes`);
    assert.match(boxes.viewBox, /^0 0 \d+ \d+$/);
  }
  assert.deepEqual(pageErrors, []);
});

test("tapping the heat pump toggles its entity", async () => {
  await page.goto(`${previewUrl}?layout=dual`);
  await page.evaluate(() => {
    window.serviceCalls = [];
    document.getElementById("card-dual").shadowRoot.querySelector(".hpfc-heatpump").dispatchEvent(
      new MouseEvent("click", { bubbles: true })
    );
  });
  const calls = await page.evaluate(() => window.serviceCalls);
  assert.deepEqual(calls, [
    { domain: "homeassistant", service: "toggle", data: { entity_id: "switch.waermepumpe" } },
  ]);
});

test("tapping a value opens more-info for that entity", async () => {
  await page.goto(`${previewUrl}?layout=dual`);
  const entities = await page.evaluate(() => {
    window.moreInfo = [];
    const svg = document.getElementById("card-dual").shadowRoot;
    svg.querySelectorAll(".hpfc-readout")[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    svg.querySelector(".hpfc-badge").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return window.moreInfo;
  });
  assert.deepEqual(entities, ["sensor.wp_leistung", "sensor.wp_vorlauf"]);
});

test("idle circuits are dimmed and start flowing when the pump turns on", async () => {
  await page.goto(`${previewUrl}?layout=dual`);
  const before = await page.evaluate(() => {
    const root = document.getElementById("card-dual").shadowRoot;
    return root.querySelectorAll(".hpfc-circuit")[1].classList.contains("hpfc-running");
  });
  assert.equal(before, false);

  const after = await page.evaluate(() => {
    const card = document.getElementById("card-dual");
    window.demoStates["binary_sensor.hk2_pumpe"] = {
      entity_id: "binary_sensor.hk2_pumpe",
      state: "on",
      attributes: {},
    };
    card.hass = window.makeHass("de");
    const root = card.shadowRoot;
    return {
      running: root.querySelectorAll(".hpfc-circuit")[1].classList.contains("hpfc-running"),
      idlePipes: root.querySelectorAll(".hpfc-pipe-group.hpfc-idle").length,
    };
  });
  assert.equal(after.running, true);
  assert.equal(after.idlePipes, 0);
});

test("pipes are coloured from the temperatures they carry", async () => {
  await page.goto(`${previewUrl}?layout=dual`);
  const colours = await page.evaluate(() => {
    const root = document.getElementById("card-dual").shadowRoot;
    const gradient = root.querySelectorAll("linearGradient")[0];
    return [
      gradient.children[0].getAttribute("stop-color"),
      gradient.children[1].getAttribute("stop-color"),
    ];
  });
  assert.notEqual(colours[0], colours[1], "flow and return end of the pipe differ");
  assert.match(colours[0], /^rgb\(/);
});

test("works without a buffer tank and without circuits", async () => {
  const result = await page.evaluate(() => {
    const card = document.createElement("heatpump-flow-card");
    card.setConfig({
      type: "custom:heatpump-flow-card",
      layout: "single",
      buffer: false,
      heatpump: { entity: "switch.waermepumpe", flow_temp: "sensor.wp_vorlauf" },
      circuits: [{ type: "fancoil", pump: "binary_sensor.hk1_pumpe" }],
    });
    card.hass = window.makeHass("en");
    document.body.appendChild(card);
    const svg = card.shadowRoot.querySelector("svg");
    return { tanks: svg.querySelectorAll(".hpfc-tank").length, pipes: svg.querySelectorAll(".hpfc-pipe").length };
  });
  assert.equal(result.tanks, 0);
  assert.ok(result.pipes >= 4);
});

test("the editor round-trips a configuration", async () => {
  const result = await page.evaluate(() => {
    const editor = document.createElement("heatpump-flow-card-editor");
    const config = {
      type: "custom:heatpump-flow-card",
      layout: "full",
      heatpump: { entity: "switch.waermepumpe", power: { entity: "sensor.wp_leistung", decimals: 2 } },
      pv: { power: "sensor.pv_leistung" },
      circuits: [{ type: "underfloor", pump: "binary_sensor.hk1_pumpe" }],
    };
    editor.setConfig(config);
    const data = editor._toData(config);
    return { data, roundTrip: editor._toConfig(data) };
  });
  assert.equal(result.data.layout, "full");
  assert.equal(result.data.show_pv, true);
  assert.equal(result.data.circuit_count, 1);
  // object style options are preserved even though the form only shows entity ids
  assert.deepEqual(result.roundTrip.heatpump.power, { entity: "sensor.wp_leistung", decimals: 2 });
  assert.equal(result.roundTrip.circuits[0].type, "underfloor");
  assert.equal(result.roundTrip.pv.power, "sensor.pv_leistung");
});

test("a section switched off in the editor stays off", async () => {
  const result = await page.evaluate(() => {
    const editor = document.createElement("heatpump-flow-card-editor");
    editor.setConfig({ type: "custom:heatpump-flow-card", layout: "dual" });
    const data = editor._toData({ type: "custom:heatpump-flow-card", layout: "dual" });
    data.show_buffer = false;
    return editor._toConfig(data);
  });
  assert.equal(result.buffer, false);
});
