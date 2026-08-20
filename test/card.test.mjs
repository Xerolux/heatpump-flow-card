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

test("tapping the operating mode offers the modes of a select entity", async () => {
  await page.goto(`${previewUrl}?layout=full`);
  const popup = await page.evaluate(() => {
    const root = document.getElementById("card-full").shadowRoot;
    root.querySelector(".hpfc-heatpump .hpfc-chip").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const pop = root.querySelector(".hpfc-pop");
    return {
      title: pop.querySelector(".hpfc-pop-title").textContent,
      options: [...pop.querySelectorAll(".hpfc-pop-options button")].map((b) => b.textContent),
      active: pop.querySelector(".hpfc-pop-options button.hpfc-on").textContent,
      hasStepper: Boolean(pop.querySelector(".hpfc-pop-step")),
    };
  });
  assert.equal(popup.title, "Systemmodus");
  assert.deepEqual(popup.options, ["Standby", "Automatik", "Abwesend", "Nur Warmwasser", "Nur Heizen/Kühlen"]);
  assert.equal(popup.active, "Automatik");
  assert.equal(popup.hasStepper, false);

  const calls = await page.evaluate(() => {
    window.serviceCalls = [];
    const root = document.getElementById("card-full").shadowRoot;
    [...root.querySelectorAll(".hpfc-pop-options button")]
      .find((b) => b.textContent === "Nur Warmwasser")
      .click();
    return window.serviceCalls;
  });
  assert.deepEqual(calls, [
    {
      domain: "select",
      service: "select_option",
      data: { entity_id: "select.wp_systemmodus", option: "Nur Warmwasser" },
    },
  ]);
});

test("a setpoint can be nudged straight from the card", async () => {
  await page.goto(`${previewUrl}?layout=full`);
  const result = await page.evaluate(() => {
    window.serviceCalls = [];
    const root = document.getElementById("card-full").shadowRoot;
    const readouts = [...root.querySelectorAll(".hpfc-dhw .hpfc-readout")];
    const target = readouts[1]; // Ist | Soll | Pumpe
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const pop = root.querySelector(".hpfc-pop");
    const value = pop.querySelector(".hpfc-pop-value").textContent;
    const buttons = pop.querySelectorAll(".hpfc-pop-step button");
    buttons[1].click(); // +
    buttons[0].click(); // −
    return { value, calls: window.serviceCalls };
  });
  assert.equal(result.value, "55,0 °C");
  assert.deepEqual(result.calls, [
    { domain: "number", service: "set_value", data: { entity_id: "number.ww_soll", value: 55.5 } },
    { domain: "number", service: "set_value", data: { entity_id: "number.ww_soll", value: 54.5 } },
  ]);
});

test("a button entity is pressed directly, without a popover", async () => {
  await page.goto(`${previewUrl}?layout=full`);
  const result = await page.evaluate(() => {
    window.serviceCalls = [];
    const root = document.getElementById("card-full").shadowRoot;
    const chips = [...root.querySelectorAll(".hpfc-dhw .hpfc-chip")];
    chips[chips.length - 1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { calls: window.serviceCalls, pop: Boolean(root.querySelector(".hpfc-pop")) };
  });
  assert.equal(result.pop, false);
  assert.deepEqual(result.calls, [
    { domain: "button", service: "press", data: { entity_id: "button.ww_boost" } },
  ]);
});

test("a climate circuit offers its hvac modes and its setpoint", async () => {
  await page.goto(`${previewUrl}?layout=full`);
  const result = await page.evaluate(() => {
    window.serviceCalls = [];
    const root = document.getElementById("card-full").shadowRoot;
    root.querySelector(".hpfc-circuit .hpfc-chip").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const pop = root.querySelector(".hpfc-pop");
    const options = [...pop.querySelectorAll(".hpfc-pop-options button")];
    const value = pop.querySelector(".hpfc-pop-value").textContent;
    options.find((b) => b.textContent === "Kühlen").click();
    return { labels: options.map((b) => b.textContent), value, calls: window.serviceCalls };
  });
  assert.deepEqual(result.labels, ["Aus", "Automatik", "Heizen", "Kühlen"]);
  assert.equal(result.value, "21,5 °C");
  assert.deepEqual(result.calls, [
    { domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.hk1", hvac_mode: "cool" } },
  ]);
});

test("values that can be operated are marked", async () => {
  await page.goto(`${previewUrl}?layout=full`);
  const marked = await page.evaluate(() => {
    const root = document.getElementById("card-full").shadowRoot;
    return [...root.querySelectorAll(".hpfc-affordance")].filter(
      (line) => line.style.display !== "none" && Number(line.getAttribute("x2")) > Number(line.getAttribute("x1"))
    ).length;
  });
  assert.ok(marked >= 2, `expected marked values, got ${marked}`);
});

test("controls can be switched off", async () => {
  const result = await page.evaluate(() => {
    window.moreInfo = [];
    const card = document.createElement("heatpump-flow-card");
    card.setConfig({
      type: "custom:heatpump-flow-card",
      layout: "single",
      controls: false,
      dhw: { temp: "sensor.ww_temperatur", target_temp: "number.ww_soll" },
      circuits: [{ type: "radiator" }],
    });
    card.hass = window.makeHass("de");
    document.body.appendChild(card);
    const readouts = [...card.shadowRoot.querySelectorAll(".hpfc-dhw .hpfc-readout")];
    readouts[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return {
      pop: Boolean(card.shadowRoot.querySelector(".hpfc-pop")),
      moreInfo: window.moreInfo,
      affordances: [...card.shadowRoot.querySelectorAll(".hpfc-affordance")].filter(
        (line) => line.style.display !== "none"
      ).length,
    };
  });
  assert.equal(result.pop, false);
  assert.deepEqual(result.moreInfo, ["number.ww_soll"]);
  assert.equal(result.affordances, 0);
});
