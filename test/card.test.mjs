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
    { domain: "homeassistant", service: "toggle", data: { entity_id: "switch.heat_pump" } },
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
  assert.deepEqual(entities, ["sensor.hp_power", "sensor.hp_flow_temperature"]);
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
    window.demoStates["binary_sensor.circuit_b_pump"] = {
      entity_id: "binary_sensor.circuit_b_pump",
      state: "on",
      attributes: {},
    };
    card.hass = window.makeHass("en");
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
      heatpump: { entity: "switch.heat_pump", flow_temp: "sensor.hp_flow_temperature" },
      circuits: [{ type: "fancoil", pump: "binary_sensor.circuit_a_pump" }],
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
      heatpump: { entity: "switch.heat_pump", power: { entity: "sensor.hp_power", decimals: 2 } },
      pv: { power: "sensor.pv_power" },
      circuits: [{ type: "underfloor", pump: "binary_sensor.circuit_a_pump" }],
    };
    editor.setConfig(config);
    const data = editor._toData(config);
    return { data, roundTrip: editor._toConfig(data) };
  });
  assert.equal(result.data.layout, "full");
  assert.equal(result.data.show_pv, true);
  assert.equal(result.data.circuit_count, 1);
  // object style options are preserved even though the form only shows entity ids
  assert.deepEqual(result.roundTrip.heatpump.power, { entity: "sensor.hp_power", decimals: 2 });
  assert.equal(result.roundTrip.circuits[0].type, "underfloor");
  assert.equal(result.roundTrip.pv.power, "sensor.pv_power");
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
  assert.equal(popup.title, "System mode");
  assert.deepEqual(popup.options, [
    "Standby",
    "Automatic",
    "Away",
    "Hot water only",
    "Heating/cooling only",
  ]);
  assert.equal(popup.active, "Automatic");
  assert.equal(popup.hasStepper, false);

  const calls = await page.evaluate(() => {
    window.serviceCalls = [];
    const root = document.getElementById("card-full").shadowRoot;
    [...root.querySelectorAll(".hpfc-pop-options button")]
      .find((b) => b.textContent === "Hot water only")
      .click();
    return window.serviceCalls;
  });
  assert.deepEqual(calls, [
    {
      domain: "select",
      service: "select_option",
      data: { entity_id: "select.system_mode", option: "Hot water only" },
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
  assert.equal(result.value, "55.0 °C");
  assert.deepEqual(result.calls, [
    { domain: "number", service: "set_value", data: { entity_id: "number.dhw_setpoint", value: 55.5 } },
    { domain: "number", service: "set_value", data: { entity_id: "number.dhw_setpoint", value: 54.5 } },
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
    { domain: "button", service: "press", data: { entity_id: "button.dhw_boost" } },
  ]);
});

test("a climate circuit offers its hvac modes and its setpoint, translated", async () => {
  await page.goto(`${previewUrl}?layout=full&lang=de`);
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
    { domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.circuit_a", hvac_mode: "cool" } },
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
      dhw: { temp: "sensor.dhw_temperature", target_temp: "number.dhw_setpoint" },
      circuits: [{ type: "radiator" }],
    });
    card.hass = window.makeHass("en");
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
  assert.deepEqual(result.moreInfo, ["number.dhw_setpoint"]);
  assert.equal(result.affordances, 0);
});

test("draws up to seven heating circuits, A to G", async () => {
  await page.goto(`${previewUrl}?layout=dual`);
  const result = await page.evaluate(() => {
    const types = ["radiator", "underfloor", "radiator", "underfloor", "fancoil", "radiator", "pool"];
    const card = document.createElement("heatpump-flow-card");
    card.setConfig({
      type: "custom:heatpump-flow-card",
      layout: "full",
      pv: false,
      solar: false,
      heatpump: { entity: "switch.heat_pump", flow_temp: "sensor.hp_flow_temperature" },
      buffer: { top: "sensor.buffer_top", bottom: "sensor.buffer_bottom" },
      dhw: { temp: "sensor.dhw_temperature" },
      circuits: types.map((type, index) => ({
        name: `Heating circuit ${String.fromCharCode(65 + index)}`,
        type,
        flow_temp: "sensor.circuit_a_flow",
        pump: "binary_sensor.circuit_a_pump",
      })),
    });
    document.body.appendChild(card);
    card.hass = window.makeHass("en");
    const root = card.shadowRoot;
    const names = [...root.querySelectorAll(".hpfc-circuit .hpfc-title")].map((t) => t.textContent);
    return {
      circuits: root.querySelectorAll(".hpfc-circuit").length,
      names,
      // one flow and one return branch per consumer, circuits plus hot water
      branches: root.querySelectorAll(".hpfc-pipe").length,
    };
  });
  assert.equal(result.circuits, 7);
  assert.equal(result.names[3], "Heating circuit D");
  assert.equal(result.names[6], "Heating circuit G");
  assert.ok(result.branches >= 16, `expected a branch per consumer, got ${result.branches}`);
});

test("an eighth circuit is dropped rather than drawn off canvas", async () => {
  const count = await page.evaluate(() => {
    const card = document.createElement("heatpump-flow-card");
    card.setConfig({
      type: "custom:heatpump-flow-card",
      layout: "dual",
      circuits: Array.from({ length: 9 }, (_, index) => ({ name: `HK ${index}`, type: "radiator" })),
    });
    document.body.appendChild(card);
    card.hass = window.makeHass("en");
    return card.shadowRoot.querySelectorAll(".hpfc-circuit").length;
  });
  assert.equal(count, 7);
});

test("every circuit shows its own state - A running does not mean D is", async () => {
  await page.goto(`${previewUrl}?layout=circuits`);
  const state = await page.evaluate(() => {
    const root = document.getElementById("card-circuits").shadowRoot;
    const pipe = (part) => {
      const node = root.querySelector(`.hpfc-pipe-group[data-part="${part}"]`);
      return node ? !node.classList.contains("hpfc-stopped") : null;
    };
    const panel = (part) => {
      const node = root.querySelector(`.hpfc-circuit[data-part="${part}"]`);
      return node ? node.classList.contains("hpfc-running") : null;
    };
    return {
      flow: [1, 2, 3, 4].map((index) => pipe(`flow-circuit-${index}`)),
      ret: [1, 2, 3, 4].map((index) => pipe(`return-circuit-${index}`)),
      panels: [1, 2, 3, 4].map((index) => panel(`circuit-${index}`)),
      trunk: pipe("flow-trunk"),
      spine: pipe("flow-spine"),
    };
  });
  // A and C are served, B (pump off) and D (mode "Aus") are not
  assert.deepEqual(state.panels, [true, false, true, false]);
  assert.deepEqual(state.flow, [true, false, true, false]);
  assert.deepEqual(state.ret, [true, false, true, false]);
  // the distributor carries water as long as any circuit draws
  assert.equal(state.trunk, true);
  assert.equal(state.spine, true);
});

test("a circuit parked in its off mode stays off while the heat pump runs", async () => {
  const result = await page.evaluate(() => {
    const card = document.createElement("heatpump-flow-card");
    card.setConfig({
      type: "custom:heatpump-flow-card",
      layout: "dual",
      heatpump: { entity: "switch.heat_pump", state_entity: "binary_sensor.compressor" },
      circuits: [
        { name: "no state source", type: "radiator" },
        { name: "parked", type: "radiator", mode: "select.circuit_d_mode" },
      ],
    });
    document.body.appendChild(card);
    card.hass = window.makeHass("en");
    const root = card.shadowRoot;
    return [1, 2].map((index) =>
      root.querySelector(`.hpfc-circuit[data-part="circuit-${index}"]`).classList.contains("hpfc-running")
    );
  });
  // no state source of its own -> follows the heat pump; parked mode -> off
  assert.deepEqual(result, [true, false]);
});

test("every layout preset renders", async () => {
  await page.goto(`${previewUrl}?layout=dual`);
  const layouts = [
    "compact",
    "compact-dual",
    "single",
    "dual",
    "triple",
    "quad",
    "dhw",
    "dhw-dual",
    "dhw-quad",
    "pv-single",
    "pv-dual",
    "pv-dhw-dual",
    "solar-dual",
    "full",
    "full-quad",
    "direct",
    "direct-dual",
    "direct-dhw",
  ];
  const result = await page.evaluate((names) => {
    const report = {};
    for (const layout of names) {
      const card = document.createElement("heatpump-flow-card");
      card.setConfig({
        type: "custom:heatpump-flow-card",
        layout,
        heatpump: { entity: "switch.heat_pump", flow_temp: "sensor.hp_flow_temperature" },
      });
      document.body.appendChild(card);
      card.hass = window.makeHass("en");
      const root = card.shadowRoot;
      report[layout] = {
        circuits: root.querySelectorAll(".hpfc-circuit").length,
        tank: root.querySelectorAll(".hpfc-tank").length,
        dhw: root.querySelectorAll(".hpfc-dhw").length,
        pv: root.querySelectorAll(".hpfc-pv").length,
        solar: root.querySelectorAll(".hpfc-solar").length,
        error: Boolean(root.querySelector(".hpfc-error")),
      };
      card.remove();
    }
    return report;
  }, layouts);

  for (const layout of layouts) {
    assert.equal(result[layout].error, false, `${layout} renders`);
    assert.ok(result[layout].circuits >= 1, `${layout} has circuits`);
  }
  assert.equal(result.quad.circuits, 4);
  assert.equal(result["dhw-quad"].circuits, 4);
  assert.equal(result["dhw-dual"].dhw, 1);
  assert.equal(result["dhw-dual"].pv, 0);
  assert.equal(result["dhw-dual"].solar, 0);
  assert.equal(result["pv-dual"].pv, 1);
  assert.equal(result["pv-dual"].solar, 0);
  assert.equal(result["pv-dual"].dhw, 0);
  assert.equal(result["solar-dual"].solar, 1);
  assert.equal(result["solar-dual"].pv, 0);
  // the direct layouts draw no buffer tank at all
  assert.equal(result.direct.tank, 0);
  assert.equal(result["direct-dual"].tank, 0);
  assert.equal(result["direct-dhw"].tank, 1); // the hot water tank, not a buffer
  assert.equal(result.dual.tank, 1);
});

test("the second heat generator shows up when it engages", async () => {
  await page.goto(`${previewUrl}?layout=extras`);
  const state = await page.evaluate(() => {
    const root = document.getElementById("card-extras").shadowRoot;
    const aux = root.querySelector(".hpfc-aux");
    return {
      present: Boolean(aux),
      running: aux.classList.contains("hpfc-on"),
      value: aux.querySelector(".hpfc-value").textContent,
    };
  });
  assert.equal(state.present, true);
  assert.equal(state.running, true);
  assert.equal(state.value, "3,000 W");

  // switch it off and the row goes quiet, without touching anything else
  const after = await page.evaluate(() => {
    const card = document.getElementById("card-extras");
    window.demoStates["binary_sensor.aux_heat"] = {
      entity_id: "binary_sensor.aux_heat",
      state: "off",
      attributes: {},
    };
    card.hass = window.makeHass("en");
    return card.shadowRoot.querySelector(".hpfc-aux").classList.contains("hpfc-on");
  });
  assert.equal(after, false);
});

test("a defrost cycle is visible on the heat pump", async () => {
  await page.goto(`${previewUrl}?layout=extras`);
  const state = await page.evaluate(() => {
    const root = document.getElementById("card-extras").shadowRoot;
    const hp = root.querySelector(".hpfc-heatpump");
    return {
      defrosting: hp.classList.contains("hpfc-defrost"),
      steam: hp.querySelectorAll(".hpfc-steam path").length,
      chip: hp.querySelector(".hpfc-chip text").textContent,
      chipClass: hp.querySelector(".hpfc-chip").getAttribute("class"),
    };
  });
  assert.equal(state.defrosting, true);
  assert.equal(state.steam, 3);
  assert.equal(state.chip, "Defrost");
  assert.match(state.chipClass, /hpfc-mode-defrost/);

  // back to heating: no vapour, and the chip follows the reported state
  const after = await page.evaluate(() => {
    const card = document.getElementById("card-extras");
    window.demoStates["sensor.hp_status"] = {
      entity_id: "sensor.hp_status",
      state: "heating",
      attributes: {},
    };
    card.hass = window.makeHass("en");
    const hp = card.shadowRoot.querySelector(".hpfc-heatpump");
    return { defrosting: hp.classList.contains("hpfc-defrost"), chip: hp.querySelector(".hpfc-chip text").textContent };
  });
  assert.equal(after.defrosting, false);
  assert.equal(after.chip, "Heating");
});

test("an electric element in the tank is drawn and operable", async () => {
  await page.goto(`${previewUrl}?layout=extras`);
  const state = await page.evaluate(() => {
    window.serviceCalls = [];
    const root = document.getElementById("card-extras").shadowRoot;
    const heater = root.querySelector(".hpfc-heater");
    const value = heater.querySelector(".hpfc-heater-value").textContent;
    heater.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { running: heater.classList.contains("hpfc-on"), value, calls: window.serviceCalls };
  });
  assert.equal(state.running, true);
  assert.equal(state.value, "2,450 W");
  assert.deepEqual(state.calls, [
    { domain: "homeassistant", service: "toggle", data: { entity_id: "switch.tank_heater" } },
  ]);
});

test("several entities in one value: powers add up, shares average", async () => {
  await page.goto(`${previewUrl}?layout=full`);
  const shown = await page.evaluate(() => {
    const root = document.getElementById("card-full").shadowRoot;
    const readouts = [...root.querySelectorAll(".hpfc-pv .hpfc-readout")];
    return readouts.map((r) => [...r.querySelectorAll("text")].map((t) => t.textContent));
  });
  // 1180 + 980 + 760 + 560 W, and (84 + 78) / 2 %
  assert.deepEqual(shown[0], ["Power", "3,480 W"]);
  assert.deepEqual(shown[1], ["Battery", "81%"]);
});

test("a list of entities can be combined explicitly", async () => {
  const values = await page.evaluate(() => {
    const build = (power) => {
      const card = document.createElement("heatpump-flow-card");
      card.setConfig({
        type: "custom:heatpump-flow-card",
        layout: "pv-single",
        pv: { power },
        heatpump: {},
      });
      document.body.appendChild(card);
      card.hass = window.makeHass("en");
      const value = card.shadowRoot.querySelector(".hpfc-pv .hpfc-readout .hpfc-value").textContent;
      card.remove();
      return value;
    };
    return {
      sum: build(["sensor.pv_inverter_1", "sensor.pv_inverter_2"]),
      max: build({
        entities: ["sensor.pv_inverter_1", "sensor.pv_inverter_2"],
        combine: "max",
      }),
      named: build({
        entities: ["sensor.pv_inverter_1", "sensor.pv_inverter_2"],
        name: "Roof",
        decimals: 2,
      }),
      missing: build(["sensor.does_not_exist", "sensor.pv_inverter_2"]),
    };
  });
  assert.equal(values.sum, "2,160 W");
  assert.equal(values.max, "1,180 W");
  assert.equal(values.named, "2,160.00 W");
  // an entity that is not there is skipped rather than poisoning the total
  assert.equal(values.missing, "980 W");
});
