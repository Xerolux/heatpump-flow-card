/*!
 * heatpump-flow-card
 * An animated hydraulic scheme for Home Assistant: heat pump, buffer tank,
 * domestic hot water, PV, solar thermal and up to seven heating circuits.
 *
 * https://github.com/Xerolux/heatpump-flow-card
 * MIT License - Copyright (c) 2026 Xerolux
 */

(() => {
"use strict";

const CARD_VERSION = "1.8.3";

console.info(
  `%c HEATPUMP-FLOW-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#0369a1;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#0369a1;background:#e0f2fe;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px"
);

const SVG_NS = "http://www.w3.org/2000/svg";

/* =========================================================================
 * Generic helpers
 * ========================================================================= */

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

const TOGGLE_DOMAINS = new Set([
  "switch",
  "light",
  "fan",
  "input_boolean",
  "automation",
  "humidifier",
  "siren",
  "valve",
  "script",
]);

const ON_STATES = new Set([
  "on",
  "true",
  "open",
  "opening",
  "active",
  "running",
  "heat",
  "heating",
  "cool",
  "cooling",
  "auto",
  "home",
  "playing",
  "1",
]);

function domainOf(entityId) {
  return typeof entityId === "string" && entityId.includes(".")
    ? entityId.split(".")[0]
    : "";
}

function fireEvent(node, type, detail) {
  const event = new Event(type, { bubbles: true, cancelable: false, composed: true });
  event.detail = detail || {};
  node.dispatchEvent(event);
  return event;
}

/**
 * Config fields accept either a plain entity id or an object with extras:
 *   flow_temp: sensor.vl
 *   flow_temp: { entity: sensor.vl, name: "VL", decimals: 1, attribute: temperature }
 */
function asField(value) {
  if (!value) return null;
  if (typeof value === "string") return { entity: value };
  if (Array.isArray(value)) {
    const entities = value.filter((entry) => typeof entry === "string" && entry.includes("."));
    return entities.length ? { entity: entities[0], entities } : null;
  }
  if (typeof value === "object") {
    if (Array.isArray(value.entities)) {
      const entities = value.entities.filter((entry) => typeof entry === "string");
      if (!entities.length) return null;
      return { ...value, entity: value.entity || entities[0], entities };
    }
    if (value.calculate === true) return { unit: "W", ...value };
    if (value.entity || value.attribute) return { ...value };
  }
  return null;
}

/** Every entity a field reads - one, or a whole string of inverters. */
function fieldEntities(field) {
  if (!field) return [];
  if (field.entities && field.entities.length) return field.entities;
  return field.entity ? [field.entity] : [];
}

function isTemperatureUnit(unit) {
  return typeof unit === "string" && (unit.includes("°") || unit === "K");
}

function isShareLike(unit) {
  return unit === "%" || unit === "°C" || unit === "°F" || unit === "K";
}

/**
 * How several entities become one number. Powers and energies add up, shares
 * and temperatures average - and `combine` overrides both.
 */
function combineValues(values, mode) {
  if (!values.length) return null;
  switch (mode) {
    case "avg":
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "first":
      return values[0];
    default:
      return values.reduce((sum, value) => sum + value, 0);
  }
}

function stateOf(hass, field) {
  if (!hass || !field) return undefined;
  const entities = fieldEntities(field);
  if (!entities.length) return undefined;
  for (const entity of entities) {
    const st = hass.states[entity];
    if (st && !isMissing(st)) return st;
  }
  return hass.states[entities[0]];
}

function isMissing(st) {
  return (
    !st ||
    st.state === undefined ||
    st.state === "unavailable" ||
    st.state === "unknown" ||
    st.state === "none" ||
    st.state === ""
  );
}

/** Raw value of a field, honouring an optional attribute. */
function rawValue(hass, field) {
  const st = stateOf(hass, field);
  if (!st) return undefined;
  if (field.attribute) return st.attributes ? st.attributes[field.attribute] : undefined;
  return st.state;
}

function singleNumber(hass, field) {
  const raw = rawValue(hass, field);
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Numeric value of a field, several entities folded into one. */
function numberValue(hass, field) {
  if (!field) return null;
  const entities = fieldEntities(field);
  if (entities.length < 2) return singleNumber(hass, field);
  const values = entities
    .map((entity) => singleNumber(hass, { ...field, entity, entities: undefined }))
    .filter((value) => value !== null);
  if (!values.length) return null;
  return combineValues(values, field.combine || (isShareLike(unitOf(hass, field)) ? "avg" : "sum"));
}

const POWER_UNIT_FACTORS = { mW: 0.001, W: 1, kW: 1000, MW: 1000000, GW: 1000000000 };

/** Convert one power field to watts before comparing or balancing it. */
function powerWatts(hass, field) {
  if (!field || !field.entity) return null;
  const entities = fieldEntities(field);
  const values = (entities.length ? entities : [field.entity])
    .map((entity) => {
      const single = { ...field, entity, entities: undefined };
      const value = singleNumber(hass, single);
      if (value === null) return null;
      const unit = unitOf(hass, single);
      const factor = POWER_UNIT_FACTORS[unit] === undefined ? 1 : POWER_UNIT_FACTORS[unit];
      return value * factor;
    })
    .filter((value) => value !== null);
  if (!values.length) return null;
  const value = combineValues(values, field.combine || "sum");
  return field.invert ? -value : value;
}

/**
 * Signed power in watts. Meters disagree about which way is positive, so
 * `invert: true` flips the sign of one without touching the entity.
 */
function signedPower(hass, field) {
  return powerWatts(hass, field);
}

/** Truthiness of a field: on-ish states, or a number above the threshold. */
function isActive(hass, field) {
  if (!field) return false;
  const entities = fieldEntities(field);
  if (entities.length > 1) {
    return entities.some((entity) =>
      isActive(hass, { ...field, entity, entities: undefined })
    );
  }
  const raw = rawValue(hass, field);
  if (raw === undefined || raw === null) return false;
  if (typeof raw === "boolean") return raw;
  const num = numberValue(hass, field);
  if (num !== null) return num > (field.threshold !== undefined ? field.threshold : 0);
  return ON_STATES.has(String(raw).toLowerCase());
}

function unitOf(hass, field) {
  if (field && field.unit !== undefined) return field.unit;
  const st = stateOf(hass, field);
  const unit = st && st.attributes ? st.attributes.unit_of_measurement || "" : "";
  if (unit) return unit;
  if (field && field.attribute && String(field.attribute).includes("temp") && hass && hass.config) {
    const system = hass.config.unit_system;
    if (system && system.temperature) return system.temperature;
  }
  return unit;
}

/** Display text of a field, localized through Home Assistant when possible. */
function displayValue(hass, field, fallback) {
  const dash = fallback === undefined ? "–" : fallback;
  if (!hass || !field || !field.entity) return dash;

  // Several entities: show what they add up to (or average to).
  if (fieldEntities(field).length > 1) {
    const total = numberValue(hass, field);
    if (total === null) return dash;
    return formatNumber(hass, total, field) + suffix(unitOf(hass, field));
  }

  const st = hass.states[field.entity];
  if (isMissing(st)) return dash;

  if (field.attribute) {
    const raw = rawValue(hass, field);
    if (raw === undefined || raw === null || raw === "") return dash;
    const num = numberValue(hass, field);
    if (num === null) return String(raw);
    return formatNumber(hass, num, field) + suffix(unitOf(hass, field));
  }

  const num = numberValue(hass, field);
  if (num !== null) {
    if (field.decimals !== undefined || field.unit !== undefined) {
      return formatNumber(hass, num, field) + suffix(unitOf(hass, field));
    }
    if (typeof hass.formatEntityState === "function") {
      try {
        return hass.formatEntityState(st);
      } catch (err) {
        /* fall through to the manual formatter */
      }
    }
    return formatNumber(hass, num, field) + suffix(unitOf(hass, field));
  }

  if (typeof hass.formatEntityState === "function") {
    try {
      return hass.formatEntityState(st);
    } catch (err) {
      /* fall through */
    }
  }
  return String(st.state);
}

function suffix(unit) {
  if (!unit) return "";
  return unit === "%" || unit === "°" ? unit : ` ${unit}`;
}

function formatNumber(hass, value, field) {
  const decimals =
    field && field.decimals !== undefined
      ? field.decimals
      : Math.abs(value) >= 100 || Number.isInteger(value)
        ? 0
        : 1;
  const locale = hass && hass.locale ? hass.locale.language : undefined;
  try {
    return value.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch (err) {
    return value.toFixed(decimals);
  }
}

/* =========================================================================
 * Colours
 * ========================================================================= */

const TEMP_STOPS = [
  [-10, [29, 78, 216]],
  [5, [59, 130, 246]],
  [15, [56, 189, 248]],
  [22, [148, 163, 184]],
  [30, [251, 191, 36]],
  [40, [249, 115, 22]],
  [50, [239, 68, 68]],
  [70, [185, 28, 28]],
];

const COLOR_FLOW = "#ef4444";
const COLOR_RETURN = "#3b82f6";
const COLOR_SOLAR = "#f59e0b";
const COLOR_PV = "#fbbf24";

function tempColor(celsius) {
  if (celsius === null || celsius === undefined || !Number.isFinite(celsius)) return null;
  const stops = TEMP_STOPS;
  if (celsius <= stops[0][0]) return rgb(stops[0][1]);
  if (celsius >= stops[stops.length - 1][0]) return rgb(stops[stops.length - 1][1]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (celsius >= t0 && celsius <= t1) {
      const f = (celsius - t0) / (t1 - t0);
      return rgb([
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ]);
    }
  }
  return rgb(stops[stops.length - 1][1]);
}

function rgb(triplet) {
  return `rgb(${triplet[0]}, ${triplet[1]}, ${triplet[2]})`;
}

/**
 * Temperature colour for text. Near-neutral values (roughly room temperature)
 * keep the theme text colour so they stay readable on light and dark cards.
 */
function tempTextColor(celsius) {
  const color = tempColor(celsius);
  if (!color) return null;
  const parts = color.match(/\d+/g);
  if (!parts) return null;
  const values = parts.map(Number);
  const chroma = Math.max(...values) - Math.min(...values);
  return chroma < 70 ? null : color;
}

/* =========================================================================
 * SVG primitives
 * ========================================================================= */

function svgEl(tag, attrs, children) {
  const node = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const key of Object.keys(attrs)) {
      const value = attrs[key];
      if (value === undefined || value === null || value === false) continue;
      node.setAttribute(key, String(value));
    }
  }
  if (children) {
    for (const child of children) {
      if (child) node.appendChild(child);
    }
  }
  return node;
}

function svgText(x, y, content, attrs) {
  const node = svgEl("text", { x, y, ...(attrs || {}) });
  node.textContent = content === undefined || content === null ? "" : String(content);
  return node;
}

/** Orthogonal polyline with rounded corners. */
function roundedPath(points, radius) {
  const pts = points.filter((point, index) => {
    if (index === 0) return true;
    const prev = points[index - 1];
    return prev[0] !== point[0] || prev[1] !== point[1];
  });
  if (pts.length < 2) return "";
  const r = radius === undefined ? 14 : radius;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const len1 = Math.hypot(cx - px, cy - py);
    const len2 = Math.hypot(nx - cx, ny - cy);
    if (!len1 || !len2) continue;
    const corner = Math.min(r, len1 / 2, len2 / 2);
    const ax = cx - ((cx - px) / len1) * corner;
    const ay = cy - ((cy - py) / len1) * corner;
    const bx = cx + ((nx - cx) / len2) * corner;
    const by = cy + ((ny - cy) / len2) * corner;
    d += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

/* =========================================================================
 * Tap / hold actions
 * ========================================================================= */

const TOGGLE_VIA_HOMEASSISTANT = new Set(["climate", "water_heater", "media_player", "cover"]);
const PRESS_SERVICES = {
  button: ["button", "press"],
  input_button: ["input_button", "press"],
  scene: ["scene", "turn_on"],
  script: ["script", "turn_on"],
};

const HVAC_LABELS = {
  en: {
    off: "Off",
    heat: "Heat",
    cool: "Cool",
    heat_cool: "Heat/Cool",
    auto: "Auto",
    dry: "Dry",
    fan_only: "Fan only",
    eco: "Eco",
    performance: "Boost",
    electric: "Electric",
    heat_pump: "Heat pump",
    gas: "Gas",
    high_demand: "High demand",
  },
  de: {
    off: "Aus",
    heat: "Heizen",
    cool: "Kühlen",
    heat_cool: "Heizen/Kühlen",
    auto: "Automatik",
    dry: "Entfeuchten",
    fan_only: "Nur Lüfter",
    eco: "Eco",
    performance: "Boost",
    electric: "Elektrisch",
    heat_pump: "Wärmepumpe",
    gas: "Gas",
    high_demand: "Hoher Bedarf",
  },
};

/** Human readable label for a select option or an hvac mode. */
function optionLabel(hass, raw) {
  const key = String(raw);
  const language = hass && hass.locale && hass.locale.language ? hass.locale.language : "en";
  const table = String(language).toLowerCase().startsWith("de") ? HVAC_LABELS.de : HVAC_LABELS.en;
  if (table[key.toLowerCase()]) return table[key.toLowerCase()];
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Describes how an entity can be operated straight from the card:
 * a list of options, a setpoint stepper, a toggle, a press - or nothing.
 */
function controlModel(hass, entityId) {
  if (!hass || !entityId) return null;
  const st = hass.states ? hass.states[entityId] : undefined;
  if (!st) return null;
  const domain = domainOf(entityId);
  const attrs = st.attributes || {};
  const model = {
    entityId,
    title: attrs.friendly_name || entityId,
    kind: "none",
    options: null,
    stepper: null,
  };

  const temperatureUnit =
    (hass.config && hass.config.unit_system && hass.config.unit_system.temperature) || "°C";

  if (domain === "number" || domain === "input_number") {
    const value = Number(st.state);
    model.kind = "stepper";
    model.stepper = {
      value: Number.isFinite(value) ? value : 0,
      min: attrs.min !== undefined ? Number(attrs.min) : -50,
      max: attrs.max !== undefined ? Number(attrs.max) : 100,
      step: attrs.step !== undefined ? Number(attrs.step) : 1,
      unit: attrs.unit_of_measurement || "",
      service: [domain, "set_value"],
      field: "value",
    };
  } else if (domain === "select" || domain === "input_select") {
    model.kind = "options";
    model.options = (attrs.options || []).map((option) => ({
      value: option,
      label: optionLabel(hass, option),
      active: st.state === option,
    }));
    model.optionService = [domain, "select_option"];
    model.optionField = "option";
  } else if (domain === "climate") {
    model.kind = "panel";
    model.options = (attrs.hvac_modes || []).map((mode) => ({
      value: mode,
      label: optionLabel(hass, mode),
      active: st.state === mode,
    }));
    model.optionService = ["climate", "set_hvac_mode"];
    model.optionField = "hvac_mode";
    if (attrs.temperature !== undefined && attrs.temperature !== null) {
      model.stepper = {
        value: Number(attrs.temperature),
        min: attrs.min_temp !== undefined ? Number(attrs.min_temp) : 5,
        max: attrs.max_temp !== undefined ? Number(attrs.max_temp) : 35,
        step: attrs.target_temp_step !== undefined ? Number(attrs.target_temp_step) : 0.5,
        unit: temperatureUnit,
        service: ["climate", "set_temperature"],
        field: "temperature",
      };
    }
  } else if (domain === "water_heater") {
    model.kind = "panel";
    model.options = (attrs.operation_list || []).map((mode) => ({
      value: mode,
      label: optionLabel(hass, mode),
      active: st.state === mode,
    }));
    model.optionService = ["water_heater", "set_operation_mode"];
    model.optionField = "operation_mode";
    if (attrs.temperature !== undefined && attrs.temperature !== null) {
      model.stepper = {
        value: Number(attrs.temperature),
        min: attrs.min_temp !== undefined ? Number(attrs.min_temp) : 30,
        max: attrs.max_temp !== undefined ? Number(attrs.max_temp) : 80,
        step: 0.5,
        unit: temperatureUnit,
        service: ["water_heater", "set_temperature"],
        field: "temperature",
      };
    }
  } else if (PRESS_SERVICES[domain]) {
    model.kind = "press";
  } else if (TOGGLE_DOMAINS.has(domain) || TOGGLE_VIA_HOMEASSISTANT.has(domain)) {
    model.kind = "toggle";
  }

  if (model.kind === "panel" && !model.stepper && !(model.options && model.options.length)) {
    model.kind = "none";
  }
  if (model.kind === "options" && !(model.options && model.options.length)) model.kind = "none";
  return model;
}

/** True when tapping this entity does something other than open more-info. */
function isControllable(hass, entityId) {
  const model = controlModel(hass, entityId);
  return Boolean(model && model.kind !== "none");
}

/** True when tapping opens the little control panel (rather than acting at once). */
function opensPanel(hass, entityId) {
  const model = controlModel(hass, entityId);
  if (!model) return false;
  return model.kind === "options" || model.kind === "panel" || model.kind === "stepper";
}

function applyOption(hass, model, option) {
  if (!model || !model.optionService) return;
  hass.callService(model.optionService[0], model.optionService[1], {
    entity_id: model.entityId,
    [model.optionField]: option,
  });
}

function applyStep(hass, model, direction) {
  const stepper = model && model.stepper;
  if (!stepper) return null;
  const step = Number.isFinite(stepper.step) && stepper.step > 0 ? stepper.step : 1;
  const base = Number.isFinite(stepper.min) ? stepper.min : 0;
  const raw = stepper.value + direction * step;
  const snapped = base + Math.round((raw - base) / step) * step;
  const value = Number(clamp(snapped, stepper.min, stepper.max).toFixed(3));
  stepper.value = value;
  hass.callService(stepper.service[0], stepper.service[1], {
    entity_id: model.entityId,
    [stepper.field]: value,
  });
  return value;
}

function defaultActionFor(entityId) {
  return entityId ? { action: "control" } : { action: "none" };
}

function performAction(node, scene, actionConfig, entityId) {
  const hass = scene ? scene.hass() : undefined;
  const config = actionConfig || defaultActionFor(entityId);
  const action = config.action || "more-info";
  const target = config.entity || entityId;

  switch (action) {
    case "none":
      return;
    case "more-info":
      if (target) fireEvent(node, "hass-more-info", { entityId: target });
      return;
    case "control": {
      if (!target || !hass) return;
      if (scene && scene.config && scene.config.controls === false) {
        fireEvent(node, "hass-more-info", { entityId: target });
        return;
      }
      const model = controlModel(hass, target);
      const kind = model ? model.kind : "none";
      if (kind === "toggle") {
        hass.callService("homeassistant", "toggle", { entity_id: target });
      } else if (kind === "press") {
        const service = PRESS_SERVICES[domainOf(target)];
        hass.callService(service[0], service[1], { entity_id: target });
      } else if (kind === "none") {
        fireEvent(node, "hass-more-info", { entityId: target });
      } else if (scene && scene.card) {
        scene.card.openControl(target, node);
      } else {
        fireEvent(node, "hass-more-info", { entityId: target });
      }
      return;
    }
    case "toggle": {
      if (!target || !hass) return;
      const domain = domainOf(target);
      if (TOGGLE_DOMAINS.has(domain) || TOGGLE_VIA_HOMEASSISTANT.has(domain)) {
        hass.callService("homeassistant", "toggle", { entity_id: target });
      } else if (PRESS_SERVICES[domain]) {
        const service = PRESS_SERVICES[domain];
        hass.callService(service[0], service[1], { entity_id: target });
      } else {
        fireEvent(node, "hass-more-info", { entityId: target });
      }
      return;
    }
    case "navigate":
      if (!config.navigation_path) return;
      history.pushState(null, "", config.navigation_path);
      fireEvent(window, "location-changed", { replace: false });
      return;
    case "url":
      if (config.url_path) window.open(config.url_path, config.new_tab === false ? "_self" : "_blank");
      return;
    case "call-service":
    case "perform-action": {
      const call = config.perform_action || config.service;
      if (!hass || !call || !call.includes(".")) return;
      const [domain, service] = call.split(".", 2);
      hass.callService(domain, service, config.data || config.service_data || {}, config.target);
      return;
    }
    default:
      if (target) fireEvent(node, "hass-more-info", { entityId: target });
  }
}

/**
 * Makes an SVG group clickable (mouse, touch and keyboard). A tap operates the
 * entity - toggle, press, or a small popover with modes and setpoints - and
 * holding it opens the more-info dialog.
 */
function attachAction(scene, node, options) {
  const entityId = options && options.entity;
  const tapAction = options && options.tap_action;
  const holdAction = options && options.hold_action;
  if (!entityId && (!tapAction || tapAction.action === "none")) return;
  if (tapAction && tapAction.action === "none" && !holdAction) return;

  node.classList.add("hpfc-clickable");
  node.setAttribute("tabindex", "0");
  node.setAttribute("role", "button");
  if (options && options.label) node.setAttribute("aria-label", options.label);

  const hold = holdAction || (entityId ? { action: "more-info" } : null);
  let holdTimer = null;
  let held = false;

  const start = () => {
    held = false;
    if (!hold) return;
    holdTimer = window.setTimeout(() => {
      held = true;
      performAction(node, scene, hold, entityId);
    }, 500);
  };
  const cancel = () => {
    if (holdTimer) {
      window.clearTimeout(holdTimer);
      holdTimer = null;
    }
  };
  const finish = (event) => {
    cancel();
    if (held) {
      held = false;
      return;
    }
    event.stopPropagation();
    performAction(node, scene, tapAction, entityId);
  };

  node.addEventListener("pointerdown", start);
  node.addEventListener("pointercancel", cancel);
  node.addEventListener("pointerleave", cancel);
  node.addEventListener("click", finish);
  node.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    performAction(node, scene, tapAction, entityId);
  });
}

/* =========================================================================
 * Building blocks
 * ========================================================================= */

/** Rounded container with an optional heading. */
function drawPanel(scene, box, title, options) {
  const opts = options || {};
  const group = svgEl("g", { class: "hpfc-node" });
  group.appendChild(
    svgEl("rect", {
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      rx: 16,
      class: "hpfc-panel",
    })
  );
  if (title) {
    const node = svgText(box.x + 14, box.y + 21, title, { class: "hpfc-title" });
    group.appendChild(node);
    if (opts.titleWidth) fitText(scene, node, title, opts.titleWidth);
  }
  scene.root.appendChild(group);
  if (opts.entity || opts.tap_action) {
    attachAction(scene, group, {
      entity: opts.entity,
      tap_action: opts.tap_action,
      hold_action: opts.hold_action,
      label: title,
    });
  }
  return group;
}

/**
 * Trims a label with an ellipsis so it cannot run into whatever sits next to
 * it. Measured once the card is laid out, which is why it rides along with the
 * updaters.
 */
/** Width of a text node, 0 where the browser cannot measure it. */
function textWidth(node) {
  try {
    return node.getComputedTextLength();
  } catch (err) {
    return 0;
  }
}

/**
 * Shortens a label to the room its neighbour leaves it. Unlike fitText this
 * runs on every update, because the room depends on a value that changes - and
 * on the language: "Zusatzheizung" needs half again the width of "Aux heat".
 */
function shrinkToFit(node, text, maxWidth) {
  node.textContent = text;
  if (!(maxWidth > 0)) return;
  const width = textWidth(node);
  if (!width || width <= maxWidth) return;
  let content = text;
  while (content.length > 1 && textWidth(node) > maxWidth) {
    content = content.slice(0, -1);
    node.textContent = `${content.trimEnd()}…`;
  }
}

function fitText(scene, node, text, maxWidth) {
  let done = false;
  scene.add(() => {
    if (done) return;
    let width = 0;
    try {
      width = node.getComputedTextLength();
    } catch (err) {
      width = 0;
    }
    if (!width) return;
    done = true;
    if (width <= maxWidth) return;
    let content = text;
    while (content.length > 1 && node.getComputedTextLength() > maxWidth) {
      content = content.slice(0, -1);
      node.textContent = `${content.trimEnd()}…`;
    }
  });
}

/** Small "label over value" block. Returns nothing, registers its updater. */
function drawReadout(scene, group, x, y, label, field, options) {
  const opts = options || {};
  const anchor = opts.anchor || "start";
  const block = svgEl("g", { class: "hpfc-readout" });
  block.appendChild(svgText(x, y, label, { class: "hpfc-label", "text-anchor": anchor }));
  const value = svgText(x, y + 16, "–", {
    class: opts.strong ? "hpfc-value hpfc-value-strong" : "hpfc-value",
    "text-anchor": anchor,
  });
  block.appendChild(value);
  const affordance = svgEl("line", {
    class: "hpfc-affordance",
    x1: x,
    y1: y + 21,
    x2: x,
    y2: y + 21,
  });
  block.appendChild(affordance);
  group.appendChild(block);

  if (field && field.entity) {
    attachAction(scene, block, {
      entity: field.entity,
      tap_action: field.tap_action,
      hold_action: field.hold_action,
      label,
    });
  }

  scene.add(() => {
    const hass = scene.hass();
    value.textContent = displayValue(hass, field);
    const st = stateOf(hass, field);
    block.classList.toggle("hpfc-unset", !field || !field.entity || isMissing(st));
    if (opts.colorize) {
      const num = numberValue(hass, field);
      const colored =
        scene.config.temperature_colors !== false && isTemperatureUnit(unitOf(hass, field));
      value.style.fill = (colored ? tempTextColor(num) : null) || "";
    }
    const operable =
      scene.config.controls !== false && field && field.entity && isControllable(hass, field.entity);
    let width = 0;
    if (operable) {
      try {
        width = value.getComputedTextLength();
      } catch (err) {
        width = String(value.textContent).length * 6.6;
      }
    }
    affordance.style.display = operable && width > 0 ? "" : "none";
    if (operable && width > 0) {
      const start = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
      affordance.setAttribute("x1", String(start));
      affordance.setAttribute("x2", String(start + width));
    }
  });
  return block;
}

/** Pill shaped value badge that sits on a pipe. */
function drawBadge(scene, x, y, field, options) {
  const opts = options || {};
  const group = svgEl("g", { class: "hpfc-badge" });
  const rect = svgEl("rect", { x: x - 27, y: y - 11, width: 54, height: 22, rx: 11 });
  const text = svgText(x, y + 4, "–", { "text-anchor": "middle" });
  group.appendChild(rect);
  group.appendChild(text);
  scene.root.appendChild(group);

  if (field && field.entity) {
    attachAction(scene, group, {
      entity: field.entity,
      tap_action: field.tap_action,
      hold_action: field.hold_action,
      label: opts.label,
    });
  }

  scene.add(() => {
    const hass = scene.hass();
    const value = displayValue(hass, field);
    text.textContent = value;
    const width = Math.max(46, value.length * 6.6 + 16);
    rect.setAttribute("x", String(x - width / 2));
    rect.setAttribute("width", String(width));
    const num = numberValue(hass, field);
    const colored =
      scene.config.temperature_colors !== false && isTemperatureUnit(unitOf(hass, field));
    const color = colored ? tempColor(num) : null;
    rect.style.fill = color || "";
    group.classList.toggle("hpfc-badge-plain", !color);
    group.classList.toggle("hpfc-unset", !field || !field.entity || isMissing(stateOf(hass, field)));
  });
  return group;
}

let gradientCounter = 0;

/**
 * A pipe: coloured base line plus a dashed overlay whose dashes travel along
 * the path while the circuit is running.
 *
 * options:
 *   points        orthogonal polyline [[x, y], ...]
 *   role          "flow" | "return" | "solar" | "pv"
 *   from / to     temperature fields for the colour gradient (to is optional)
 *   active        field deciding whether the medium moves
 *   reverse       animate the dashes against the path direction
 */
function drawPipe(scene, options) {
  const points = options.points;
  const d = roundedPath(points, options.radius);
  const group = svgEl("g", {
    class: `hpfc-pipe-group${options.className ? ` ${options.className}` : ""}`,
  });
  if (options.part) group.setAttribute("data-part", options.part);
  if (options.segment) group.setAttribute("data-segment", options.segment);

  const gradientId = `hpfc-grad-${++gradientCounter}`;
  const first = points[0];
  const last = points[points.length - 1];
  const stopA = svgEl("stop", { offset: "0%" });
  const stopB = svgEl("stop", { offset: "100%" });
  const gradient = svgEl(
    "linearGradient",
    {
      id: gradientId,
      gradientUnits: "userSpaceOnUse",
      x1: first[0],
      y1: first[1],
      x2: last[0],
      y2: last[1],
    },
    [stopA, stopB]
  );
  scene.defs.appendChild(gradient);

  const base = svgEl("path", {
    d,
    class: "hpfc-pipe",
    stroke: `url(#${gradientId})`,
    fill: "none",
  });
  const reverseFn = typeof options.reverse === "function" ? options.reverse : null;
  const dots = svgEl("path", {
    d,
    class: `hpfc-dots${options.reverse === true ? " hpfc-dots-reverse" : ""}`,
    fill: "none",
  });
  group.appendChild(base);
  group.appendChild(dots);
  scene.pipeLayer.appendChild(group);

  const fallback =
    options.role === "return"
      ? COLOR_RETURN
      : options.role === "solar"
        ? COLOR_SOLAR
        : options.role === "pv"
          ? COLOR_PV
          : COLOR_FLOW;

  scene.add(() => {
    const hass = scene.hass();
    const colored = scene.config.temperature_colors !== false;
    const cFrom = colored ? tempColor(numberValue(hass, options.from)) : null;
    const cTo = colored ? tempColor(numberValue(hass, options.to)) : null;
    const start = cFrom || fallback;
    const end = cTo || start;
    stopA.setAttribute("stop-color", start);
    stopB.setAttribute("stop-color", end);

    const running =
      options.active === undefined
        ? true
        : typeof options.active === "function"
          ? options.active(hass)
          : isActive(hass, options.active);
    if (reverseFn) dots.classList.toggle("hpfc-dots-reverse", Boolean(reverseFn(hass)));
    group.classList.toggle("hpfc-idle", !running && scene.config.dim_inactive !== false);
    group.classList.toggle("hpfc-stopped", !running);
    dots.style.display = running && scene.config.animation !== false ? "" : "none";
  });

  return group;
}

/* =========================================================================
 * Localisation (only the built-in labels - every name can be overridden)
 * ========================================================================= */

const TEXTS = {
  en: {
    heatpump: "Heat pump",
    power: "Power",
    cop: "COP",
    outside: "Outside",
    flow: "Flow",
    ret: "Return",
    flow_rate: "Flow rate",
    buffer: "Buffer tank",
    dhw: "Hot water",
    pv: "Photovoltaics",
    solar: "Solar thermal",
    collector: "Collector",
    room: "Room",
    target: "Target",
    pump: "Pump",
    mixer: "Mixer",
    circuit: "Heating circuit",
    radiators: "Radiators",
    underfloor: "Underfloor heating",
    yield: "Yield",
    charge: "Charge",
    top: "Top",
    middle: "Middle",
    bottom: "Bottom",
    battery: "Battery",
    grid: "Grid",
    wallbox: "Wallbox",
    house: "House",
    electrics: "Electricity",
    enlarge: "Enlarge",
    shrink: "Back to the dashboard",
    current: "Now",
    mode: "Mode",
    boost: "Boost",
    details: "Details",
    aux_heat: "Aux heat",
    heater: "Element",
    defrosting: "Defrosting",
    heat: "Heating",
    cool: "Cooling",
    water: "Hot water",
    defrost: "Defrost",
    idle: "Standby",
    off: "Off",
  },
  de: {
    heatpump: "Wärmepumpe",
    power: "Leistung",
    cop: "COP",
    outside: "Außen",
    flow: "Vorlauf",
    ret: "Rücklauf",
    flow_rate: "Durchfluss",
    buffer: "Pufferspeicher",
    dhw: "Warmwasser",
    pv: "Photovoltaik",
    solar: "Solarthermie",
    collector: "Kollektor",
    room: "Raum",
    target: "Soll",
    pump: "Pumpe",
    mixer: "Mischer",
    circuit: "Heizkreis",
    radiators: "Heizkörper",
    underfloor: "Fußbodenheizung",
    yield: "Ertrag",
    charge: "Ladung",
    top: "Oben",
    middle: "Mitte",
    bottom: "Unten",
    battery: "Batterie",
    grid: "Netz",
    wallbox: "Wallbox",
    house: "Haus",
    electrics: "Strom",
    enlarge: "Vergrößern",
    shrink: "Zurück zum Dashboard",
    current: "Ist",
    mode: "Betriebsart",
    boost: "Boost",
    details: "Details",
    aux_heat: "Zusatzheizung",
    heater: "Heizstab",
    defrosting: "Abtauen",
    heat: "Heizen",
    cool: "Kühlen",
    water: "Warmwasser",
    defrost: "Abtauen",
    idle: "Bereitschaft",
    off: "Aus",
  },
};

function textsFor(hass) {
  const language = hass && hass.locale && hass.locale.language ? hass.locale.language : "en";
  return language.toLowerCase().startsWith("de") ? TEXTS.de : TEXTS.en;
}

/* =========================================================================
 * Small graphical primitives
 * ========================================================================= */

/**
 * Rotating group. The invisible circle pins the bounding box so that
 * transform-box: fill-box rotates around the real centre.
 */
function spinner(cx, cy, radius, children, className) {
  const inner = svgEl("g", { class: `hpfc-spin${className ? ` ${className}` : ""}` }, [
    svgEl("circle", { cx: 0, cy: 0, r: radius, fill: "none", stroke: "none" }),
    ...children,
  ]);
  const outer = svgEl("g", { transform: `translate(${cx} ${cy})` }, [inner]);
  return { outer, inner };
}

function fanBlades(radius) {
  const blades = [];
  for (let i = 0; i < 3; i++) {
    blades.push(
      svgEl("path", {
        class: "hpfc-blade",
        transform: `rotate(${i * 120})`,
        d: `M 0 -2 C ${radius * 0.35} -${radius * 0.7} ${radius * 0.9} -${radius * 0.65} ${radius} -${radius * 0.15} C ${radius * 0.6} 0 ${radius * 0.25} ${radius * 0.25} 0 2 Z`,
      })
    );
  }
  return blades;
}

/** Circulation pump: housing plus a spinning impeller. */
function drawPump(scene, group, cx, cy, field, options) {
  const opts = options || {};
  const radius = opts.radius || 15;
  const wrap = svgEl("g", { class: "hpfc-pump" });
  wrap.appendChild(svgEl("circle", { cx, cy, r: radius, class: "hpfc-pump-body" }));
  const vanes = [];
  for (let i = 0; i < 3; i++) {
    vanes.push(
      svgEl("path", {
        class: "hpfc-vane",
        transform: `rotate(${i * 120})`,
        d: `M 0 0 Q ${radius * 0.55} -${radius * 0.2} ${radius * 0.72} -${radius * 0.6} Q ${radius * 0.25} -${radius * 0.5} 0 0 Z`,
      })
    );
  }
  const spin = spinner(cx, cy, radius - 3, vanes, "hpfc-impeller");
  wrap.appendChild(spin.outer);
  group.appendChild(wrap);

  if (field && field.entity) {
    attachAction(scene, wrap, {
      entity: field.entity,
      tap_action: field.tap_action,
      hold_action: field.hold_action,
      label: opts.label,
    });
  }

  scene.add(() => {
    const hass = scene.hass();
    const running =
      field && field.entity
        ? isActive(hass, field)
        : opts.running
          ? opts.running(hass)
          : Boolean(opts.fallbackRunning);
    wrap.classList.toggle("hpfc-running", running);
    spin.inner.style.animationDuration = `${opts.duration || 1.4}s`;
  });
  return wrap;
}

/** Status LED in the top right corner of a panel. */
function drawStatusDot(scene, group, cx, cy, resolver) {
  const dot = svgEl("circle", { cx, cy, r: 5, class: "hpfc-status" });
  group.appendChild(dot);
  scene.add(() => {
    const state = resolver(scene.hass());
    dot.setAttribute("class", `hpfc-status hpfc-status-${state}`);
  });
  return dot;
}

/** One or two readouts along the bottom edge of a panel. */
function drawBottomReadouts(scene, group, box, items) {
  const usable = items.filter(Boolean);
  if (!usable.length) return;
  const columns = Math.min(usable.length, 2);
  const width = (box.w - 28) / columns;
  usable.slice(0, 2).forEach((item, index) => {
    drawReadout(
      scene,
      group,
      box.x + 14 + width * index,
      box.y + box.h - 30,
      item.label,
      item.field,
      { colorize: item.colorize, strong: index === 0 }
    );
  });
}


/**
 * Small rounded label. When its entity can be operated the chip becomes a
 * button and shows a chevron.
 */
function drawChip(scene, group, box, field, options) {
  const opts = options || {};
  const chip = svgEl("g", { class: "hpfc-chip" });
  const rect = svgEl("rect", { x: box.x, y: box.y, width: box.w, height: box.h, rx: box.h / 2 });
  const text = svgText(box.x + box.w / 2, box.y + box.h / 2 + 4, opts.text || "", {
    "text-anchor": "middle",
  });
  const chevron = svgEl("path", {
    class: "hpfc-chevron",
    fill: "none",
    d: `M ${box.x + box.w - 17} ${box.y + box.h / 2 - 2} l 4 4.5 l 4 -4.5`,
  });
  chip.appendChild(rect);
  chip.appendChild(text);
  chip.appendChild(chevron);
  group.appendChild(chip);

  if (field && field.entity) {
    attachAction(scene, chip, {
      entity: field.entity,
      tap_action: field.tap_action,
      hold_action: field.hold_action,
      label: opts.label,
    });
  }

  scene.add(() => {
    const hass = scene.hass();
    const info = opts.resolve ? opts.resolve(hass) : {};
    const label = info.text !== undefined ? info.text : opts.text || displayValue(hass, field, "");
    text.textContent = label;
    const controls = scene.config.controls !== false && field && field.entity;
    const operable = Boolean(controls && isControllable(hass, field.entity));
    const menu = Boolean(controls && opensPanel(hass, field.entity));
    const classes = ["hpfc-chip"];
    if (info.mode) classes.push(`hpfc-mode-${info.mode}`);
    if (info.active) classes.push("hpfc-chip-active");
    if (operable) classes.push("hpfc-chip-operable");
    chip.setAttribute("class", classes.join(" "));
    chevron.style.display = menu ? "" : "none";
    text.setAttribute("x", String(box.x + box.w / 2 - (menu ? 7 : 0)));
  });
  return chip;
}

/* =========================================================================
 * Components
 * ========================================================================= */

const MODE_PATTERNS = [
  ["defrost", ["defrost", "abtau", "enteis"]],
  ["water", ["water", "wasser", "dhw", "brauch", "ww"]],
  ["cool", ["cool", "kühl", "kuehl", "klima"]],
  ["heat", ["heat", "heiz", "warm"]],
  ["auto", ["automat", "auto", "zeitprogramm", "time program", "normal"]],
  ["idle", ["idle", "standby", "bereit", "pause", "ready"]],
  ["off", ["off", "aus", "unavailable"]],
];

/**
 * Label for a mode chip: the entity's own (already translated) state, unless
 * that state is a technical token such as "heating" - then our own wording.
 */
function modeLabel(hass, field, fallback) {
  if (!field || !field.entity) return fallback;
  const raw = rawValue(hass, field);
  const text = displayValue(hass, field, "");
  if (raw === undefined || raw === null || text === "") return fallback;
  const technical = /^[a-z][a-z0-9_]*$/.test(String(raw));
  return technical ? fallback : text;
}

function heatPumpMode(hass, cfg) {
  // An explicit defrost signal beats everything else.
  if (cfg.defrost && cfg.defrost.entity && isActive(hass, cfg.defrost)) return "defrost";
  // `status` is what the heat pump is doing, `mode` is what it was told to do.
  const source = cfg.status && cfg.status.entity ? cfg.status : cfg.mode;
  if (source && source.entity) {
    const st = stateOf(hass, source);
    if (!isMissing(st)) {
      const raw = String(
        source.attribute
          ? rawValue(hass, source)
          : st.attributes && st.attributes.hvac_action
            ? st.attributes.hvac_action
            : st.state
      ).toLowerCase();
      for (const [mode, needles] of MODE_PATTERNS) {
        if (needles.some((needle) => raw.includes(needle))) return mode;
      }
      return "heat";
    }
  }
  return heatPumpRunning(hass, cfg) ? "heat" : "idle";
}

function heatPumpRunning(hass, cfg) {
  if (cfg.state_entity && cfg.state_entity.entity) return isActive(hass, cfg.state_entity);
  if (cfg.power && cfg.power.entity) {
    const value = powerWatts(hass, cfg.power);
    if (value !== null) return value > (cfg.power_threshold === undefined ? 20 : cfg.power_threshold);
  }
  if (cfg.compressor && cfg.compressor.entity) {
    const value = numberValue(hass, cfg.compressor);
    if (value !== null) return value > 0;
  }
  if (cfg.entity) return isActive(hass, { entity: cfg.entity });
  if (cfg.mode && cfg.mode.entity) {
    const mode = String(rawValue(hass, cfg.mode) || "").toLowerCase();
    return !["off", "aus", "idle", "standby", "unavailable", "unknown"].some((needle) =>
      mode.includes(needle)
    );
  }
  return false;
}

function drawHeatPump(scene, box, cfg) {
  const texts = textsFor(scene.hass());
  const group = drawPanel(scene, box, cfg.name || texts.heatpump, {
    entity: cfg.entity,
    tap_action: cfg.tap_action,
    hold_action: cfg.hold_action,
  });
  group.classList.add("hpfc-heatpump");

  drawStatusDot(scene, group, box.x + box.w - 16, box.y + 16, (hass) => {
    if (cfg.entity && isMissing(hass && hass.states ? hass.states[cfg.entity] : undefined)) {
      return "unknown";
    }
    return heatPumpRunning(hass, cfg) ? "on" : "off";
  });

  // Outdoor unit with fan
  const unit = { x: box.x + 14, y: box.y + 52, w: 80, h: 80 };
  group.appendChild(
    svgEl("rect", { ...{ x: unit.x, y: unit.y, width: unit.w, height: unit.h }, rx: 12, class: "hpfc-hp-body" })
  );
  for (let i = 0; i < 4; i++) {
    group.appendChild(
      svgEl("line", {
        x1: unit.x + 10,
        x2: unit.x + unit.w - 10,
        y1: unit.y + unit.h - 26 + i * 6,
        y2: unit.y + unit.h - 26 + i * 6,
        class: "hpfc-grille",
      })
    );
  }
  const fanCenter = { x: unit.x + unit.w / 2, y: unit.y + 32 };
  group.appendChild(
    svgEl("circle", { cx: fanCenter.x, cy: fanCenter.y, r: 27, class: "hpfc-fan-ring" })
  );
  const fan = spinner(fanCenter.x, fanCenter.y, 26, fanBlades(24), "hpfc-fan");
  group.appendChild(fan.outer);
  group.appendChild(svgEl("circle", { cx: fanCenter.x, cy: fanCenter.y, r: 5, class: "hpfc-hub" }));

  // Vapour off the coil while the heat pump defrosts
  const steam = svgEl("g", { class: "hpfc-steam" });
  for (let i = 0; i < 3; i++) {
    steam.appendChild(
      svgEl("path", {
        style: `animation-delay:${i * 0.8}s`,
        fill: "none",
        d: `M ${unit.x + 16 + i * 24} ${unit.y - 3} c -6 -6 6 -10 0 -16`,
      })
    );
  }
  group.appendChild(steam);

  // Readouts on the right
  const rows = [
    cfg.power ? { label: texts.power, field: cfg.power } : null,
    cfg.cop ? { label: texts.cop, field: cfg.cop } : null,
    cfg.outside_temp ? { label: texts.outside, field: cfg.outside_temp, colorize: true } : null,
    cfg.compressor ? { label: cfg.compressor.name || "Kompressor", field: cfg.compressor } : null,
  ].filter(Boolean);
  const startY = box.y + 52;
  rows.slice(0, 3).forEach((row, index) => {
    drawReadout(scene, group, box.x + 108, startY + index * 38, row.label, row.field, {
      colorize: row.colorize,
      strong: index === 0,
    });
  });

  // Second heat generator: the bit that quietly switches in on cold days
  if (cfg.aux_heat || cfg.aux_heat_power) {
    const auxY = box.y + box.h - 58;
    const aux = svgEl("g", { class: "hpfc-aux" });
    aux.appendChild(
      svgEl("rect", { x: box.x + 14, y: auxY - 13, width: box.w - 28, height: 26, rx: 9, class: "hpfc-aux-plate" })
    );
    aux.appendChild(
      svgEl("path", {
        class: "hpfc-coil",
        fill: "none",
        d: `M ${box.x + 26} ${auxY} l 5 -7 l 5 14 l 5 -14 l 5 14 l 5 -7`,
      })
    );
    const auxLabelX = box.x + 58;
    const auxLabel = svgText(auxLabelX, auxY + 4, texts.aux_heat, { class: "hpfc-label" });
    aux.appendChild(auxLabel);
    const auxValue = svgText(box.x + box.w - 24, auxY + 4, "", {
      class: "hpfc-value",
      "text-anchor": "end",
    });
    aux.appendChild(auxValue);
    group.appendChild(aux);

    const auxField = cfg.aux_heat || cfg.aux_heat_power;
    attachAction(scene, aux, {
      entity: auxField.entity,
      tap_action: auxField.tap_action,
      hold_action: auxField.hold_action,
      label: texts.aux_heat,
    });

    scene.add(() => {
      const hass = scene.hass();
      const power = numberValue(hass, cfg.aux_heat_power);
      const running = cfg.aux_heat ? isActive(hass, cfg.aux_heat) : power !== null && power > 0;
      aux.classList.toggle("hpfc-on", running);
      auxValue.textContent = cfg.aux_heat_power
        ? displayValue(hass, cfg.aux_heat_power, "")
        : displayValue(hass, cfg.aux_heat, "");
      const room = box.x + box.w - 24 - textWidth(auxValue) - 10 - auxLabelX;
      shrinkToFit(auxLabel, textsFor(hass).aux_heat, room);
    });
  }

  // Mode chip - tapping it offers the operating modes when the entity has any
  drawChip(
    scene,
    group,
    { x: box.x + 14, y: box.y + box.h - 36, w: box.w - 28, h: 24 },
    cfg.mode,
    {
      label: cfg.name || texts.heatpump,
      resolve: (hass) => {
        const localized = textsFor(hass);
        const mode = heatPumpMode(hass, cfg);
        const fallback = localized[mode] || localized.idle;
        // While the heat pump reports something of its own - defrosting, hot
        // water - that beats the mode it was set to.
        const source = cfg.status && cfg.status.entity ? cfg.status : cfg.mode;
        return { text: modeLabel(hass, source, fallback), mode };
      },
    }
  );

  scene.add(() => {
    const hass = scene.hass();
    group.classList.toggle("hpfc-running", heatPumpRunning(hass, cfg));
    group.classList.toggle("hpfc-defrost", heatPumpMode(hass, cfg) === "defrost");
    const load = numberValue(hass, cfg.compressor);
    const duration = load !== null ? clamp(3.2 - (load / 100) * 2.4, 0.6, 3.2) : 1.5;
    fan.inner.style.animationDuration = `${duration}s`;
  });

  return { group, running: (hass) => heatPumpRunning(hass, cfg) };
}

/** Vertical tank with a temperature gradient - used for buffer and DHW. */
function drawTank(scene, box, cfg, options) {
  const opts = options || {};
  const group = svgEl("g", { class: "hpfc-node hpfc-tank" });
  scene.root.appendChild(group);

  const titleHeight = opts.title ? (opts.subtitle ? 44 : 26) : 0;
  const tank = { x: box.x, y: box.y + titleHeight, w: box.w, h: box.h - titleHeight };
  const gradientId = `hpfc-tank-${++gradientCounter}`;
  const stops = [
    svgEl("stop", { offset: "0%" }),
    svgEl("stop", { offset: "50%" }),
    svgEl("stop", { offset: "100%" }),
  ];
  scene.defs.appendChild(
    svgEl("linearGradient", { id: gradientId, x1: "0", y1: "0", x2: "0", y2: "1" }, stops)
  );

  if (opts.title) {
    group.appendChild(
      svgText(box.x + box.w / 2, box.y + 16, opts.title, {
        class: "hpfc-title",
        "text-anchor": "middle",
      })
    );
  }
  if (opts.subtitle) {
    const subtitle = svgText(box.x + box.w / 2, box.y + 34, "", {
      class: "hpfc-subtitle",
      "text-anchor": "middle",
    });
    group.appendChild(subtitle);
    if (opts.subtitle.field && opts.subtitle.field.entity) {
      attachAction(scene, subtitle, {
        entity: opts.subtitle.field.entity,
        tap_action: opts.subtitle.field.tap_action,
        label: opts.subtitle.label,
      });
    }
    scene.add(() => {
      const value = displayValue(scene.hass(), opts.subtitle.field, "");
      subtitle.textContent = value ? `${opts.subtitle.label} ${value}` : "";
    });
  }
  group.appendChild(
    svgEl("rect", {
      x: tank.x,
      y: tank.y,
      width: tank.w,
      height: tank.h,
      rx: opts.radius === undefined ? 26 : opts.radius,
      class: "hpfc-tank-fill",
      fill: `url(#${gradientId})`,
    })
  );
  group.appendChild(
    svgEl("rect", {
      x: tank.x,
      y: tank.y,
      width: tank.w,
      height: tank.h,
      rx: opts.radius === undefined ? 26 : opts.radius,
      class: "hpfc-tank-outline",
    })
  );

  // Heat exchanger coil (drawn when a solar circuit feeds the tank)
  if (opts.coil) {
    const coilTop = tank.y + tank.h - 52;
    const points = [];
    for (let i = 0; i <= 5; i++) {
      points.push(`${tank.x + 16 + (i % 2) * (tank.w - 32)},${coilTop + i * 9}`);
    }
    group.appendChild(svgEl("polyline", { points: points.join(" "), class: "hpfc-coil" }));
  }

  // Electric element in the tank - an AC-Thor, a booster, a backup heater
  if (opts.heater) {
    const heaterY = tank.y + tank.h * 0.55;
    const heater = svgEl("g", { class: "hpfc-heater" });
    const coilStart = tank.x + tank.w * 0.42;
    const step = (tank.w * 0.58 - 12) / 5;
    let coil = `M ${coilStart} ${heaterY}`;
    for (let i = 0; i < 5; i++) {
      coil += ` l ${step / 2} ${i % 2 ? 8 : -8} l ${step / 2} ${i % 2 ? -8 : 8}`;
    }
    heater.appendChild(
      svgEl("line", { x1: tank.x + 8, y1: heaterY, x2: coilStart, y2: heaterY, class: "hpfc-heater-rod" })
    );
    heater.appendChild(svgEl("path", { d: coil, fill: "none", class: "hpfc-heater-rod" }));
    // A caption only fits under the element in a full height tank.
    const roomy = tank.h >= 150;
    const heaterName = roomy
      ? svgText(tank.x + tank.w / 2, heaterY + 17, "", {
          class: "hpfc-heater-name",
          "text-anchor": "middle",
        })
      : null;
    const heaterValue = svgText(tank.x + tank.w / 2, heaterY + (roomy ? 31 : 17), "", {
      class: "hpfc-heater-value",
      "text-anchor": "middle",
    });
    if (heaterName) heater.appendChild(heaterName);
    heater.appendChild(heaterValue);
    group.appendChild(heater);

    // Tapping it operates the mode when there is one - off, auto, boost -
    // and the element itself otherwise.
    const control = opts.heaterMode || opts.heater;
    attachAction(scene, heater, {
      entity: control.entity,
      tap_action: control.tap_action,
      hold_action: control.hold_action,
      label: opts.heaterLabel,
    });

    scene.add(() => {
      const hass = scene.hass();
      const power = numberValue(hass, opts.heaterPower);
      const running = isActive(hass, opts.heater) || (power !== null && power > 0);
      heater.classList.toggle("hpfc-on", running);

      const parts = [];
      if (opts.heaterPower) parts.push(displayValue(hass, opts.heaterPower, ""));
      if (opts.heaterTemp) parts.push(displayValue(hass, opts.heaterTemp, ""));
      heaterValue.textContent = parts.filter(Boolean).join(" · ");

      if (heaterName) {
        const name =
          (opts.heater && opts.heater.name) || opts.heaterLabel || textsFor(hass).heater;
        // A plain switch that is on says only that the element is *allowed* to
        // run. Whether it is running is already in the glow and in the watts,
        // and an "on" next to 0 W reads like a contradiction. Off is worth the
        // word, because nothing else in the drawing shows it.
        let mode = "";
        if (opts.heaterMode && opts.heaterMode.entity) {
          const domain = domainOf(opts.heaterMode.entity);
          const plainSwitch = domain === "switch" || domain === "input_boolean";
          const raw = String(rawValue(hass, opts.heaterMode) || "").toLowerCase();
          if (!plainSwitch || raw === "off") {
            mode = displayValue(hass, opts.heaterMode, "");
          }
        }
        heaterName.textContent = mode ? `${name} · ${mode}` : name;
      }
    });
  }

  const layers = opts.layers || [];
  const positions =
    layers.length === 1 ? [0.5] : layers.length === 2 ? [0.26, 0.7] : [0.18, 0.47, 0.75];
  layers.forEach((layer, index) => {
    if (layer.pill === false) return;
    const y = tank.y + tank.h * positions[index];
    const pill = svgEl("g", { class: "hpfc-tank-pill" });
    const rect = svgEl("rect", { x: tank.x + 8, y: y - 12, width: tank.w - 16, height: 24, rx: 12 });
    const text = svgText(tank.x + tank.w / 2, y + 5, "–", { "text-anchor": "middle" });
    pill.appendChild(rect);
    pill.appendChild(text);
    group.appendChild(pill);
    if (layer.field && layer.field.entity) {
      attachAction(scene, pill, {
        entity: layer.field.entity,
        tap_action: layer.field.tap_action,
        hold_action: layer.field.hold_action,
        label: layer.label,
      });
    }
    scene.add(() => {
      const hass = scene.hass();
      text.textContent = displayValue(hass, layer.field);
      pill.classList.toggle("hpfc-unset", !layer.field || isMissing(stateOf(hass, layer.field)));
    });
  });

  if (opts.entity || opts.tap_action) {
    attachAction(scene, group, {
      entity: opts.entity,
      tap_action: opts.tap_action,
      hold_action: opts.hold_action,
      label: opts.title,
    });
  }

  scene.add(() => {
    const hass = scene.hass();
    const colored = scene.config.temperature_colors !== false;
    const values = layers.map((layer) => numberValue(hass, layer.field));
    const known = values.filter((value) => value !== null);
    const top = values[0] !== null && values[0] !== undefined ? values[0] : known[0];
    const bottom =
      values[values.length - 1] !== null && values[values.length - 1] !== undefined
        ? values[values.length - 1]
        : known[known.length - 1];
    const middle = values.length === 3 && values[1] !== null ? values[1] : null;
    const fallbackTop = colored ? tempColor(top) : null;
    const fallbackBottom = colored ? tempColor(bottom) : null;
    stops[0].setAttribute("stop-color", fallbackTop || "var(--hpfc-tank-warm)");
    stops[1].setAttribute(
      "stop-color",
      (colored ? tempColor(middle) : null) ||
        mixFallback(fallbackTop, fallbackBottom) ||
        "var(--hpfc-tank-mid)"
    );
    stops[2].setAttribute("stop-color", fallbackBottom || "var(--hpfc-tank-cold)");
  });

  return { group, tank };
}

function mixFallback(a, b) {
  if (!a || !b) return a || b;
  const pa = a.match(/\d+/g);
  const pb = b.match(/\d+/g);
  if (!pa || !pb) return a;
  return `rgb(${Math.round((+pa[0] + +pb[0]) / 2)}, ${Math.round((+pa[1] + +pb[1]) / 2)}, ${Math.round((+pa[2] + +pb[2]) / 2)})`;
}

function drawPv(scene, box, cfg) {
  const texts = textsFor(scene.hass());
  const group = drawPanel(scene, box, cfg.name || texts.pv, {
    entity: cfg.entity || (cfg.power ? cfg.power.entity : undefined),
    tap_action: cfg.tap_action,
    hold_action: cfg.hold_action,
  });
  group.classList.add("hpfc-pv");

  const panelArea = { x: box.x + 12, y: box.y + 34, w: 78, h: 46 };
  group.appendChild(
    svgEl("path", {
      class: "hpfc-pv-panel",
      d: `M ${panelArea.x + 10} ${panelArea.y} L ${panelArea.x + panelArea.w} ${panelArea.y} L ${panelArea.x + panelArea.w - 10} ${panelArea.y + panelArea.h} L ${panelArea.x} ${panelArea.y + panelArea.h} Z`,
    })
  );
  for (let i = 1; i < 4; i++) {
    const fx = panelArea.x + (panelArea.w / 4) * i;
    group.appendChild(
      svgEl("line", {
        class: "hpfc-pv-cell",
        x1: fx + 8,
        y1: panelArea.y,
        x2: fx - 2,
        y2: panelArea.y + panelArea.h,
      })
    );
  }
  group.appendChild(
    svgEl("line", {
      class: "hpfc-pv-cell",
      x1: panelArea.x + 5,
      y1: panelArea.y + panelArea.h / 2,
      x2: panelArea.x + panelArea.w - 5,
      y2: panelArea.y + panelArea.h / 2,
    })
  );

  const sun = svgEl("g", { class: "hpfc-sun" });
  const sunCenter = { x: box.x + box.w - 32, y: box.y + 52 };
  sun.appendChild(svgEl("circle", { cx: sunCenter.x, cy: sunCenter.y, r: 11, class: "hpfc-sun-core" }));
  const rays = svgEl("g", { class: "hpfc-rays" });
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    rays.appendChild(
      svgEl("line", {
        x1: sunCenter.x + Math.cos(angle) * 15,
        y1: sunCenter.y + Math.sin(angle) * 15,
        x2: sunCenter.x + Math.cos(angle) * 20,
        y2: sunCenter.y + Math.sin(angle) * 20,
      })
    );
  }
  sun.appendChild(rays);
  group.appendChild(sun);

  drawBottomReadouts(scene, group, box, [
    { label: texts.power, field: cfg.power },
    cfg.battery
      ? { label: cfg.battery.name || texts.battery, field: cfg.battery }
      : cfg.grid
        ? { label: cfg.grid.name || texts.grid, field: cfg.grid }
        : null,
  ]);

  const producing = (hass) => {
    if (cfg.power && cfg.power.entity) {
      const value = powerWatts(hass, cfg.power);
      if (value !== null) return value > (cfg.threshold === undefined ? 5 : cfg.threshold);
    }
    return cfg.entity ? isActive(hass, { entity: cfg.entity }) : false;
  };

  scene.add(() => {
    group.classList.toggle("hpfc-running", producing(scene.hass()));
  });

  return { group, producing };
}

/* ---- the electrical side ------------------------------------------------
 * Where the current actually goes. Photovoltaics feed a bus; the battery, the
 * grid, a wallbox, the house, the heat pump and an element in a tank hang off
 * it, and each one decides for itself which way its own energy is travelling.
 */

/** The nodes that have an entity behind them, in the order they are drawn. */
function electricNodes(config) {
  const pv = config.pv || {};
  const tankHeater =
    (config.buffer && config.buffer.heater_power) ||
    (config.dhw && config.dhw.heater_power) ||
    null;
  const nodes = [
    { key: "pv", kind: "source", field: pv.power, text: "pv", name: pv.name },
    { key: "battery", kind: "battery", field: pv.battery_power, soc: pv.battery, text: "battery" },
    { key: "grid", kind: "grid", field: pv.grid_power || pv.grid, text: "grid" },
    { key: "wallbox", kind: "sink", field: pv.wallbox, text: "wallbox" },
    {
      key: "house",
      kind: "sink",
      field: pv.house,
      text: "house",
      calculate:
        pv.house && pv.house.calculate === true
          ? (hass) => calculatedHousePower(hass, config)
          : null,
    },
    {
      key: "heatpump",
      kind: "sink",
      field: config.heatpump.power,
      text: "heatpump",
      name: config.heatpump.name,
    },
    { key: "heater", kind: "sink", field: tankHeater, text: "heater" },
  ];
  return nodes.filter((node) => node.field && (node.field.entity || node.calculate));
}

/**
 * The strip is only worth drawing once there is something to route to: a
 * battery, the grid as a power reading, a wallbox or the house. A card that
 * only names its photovoltaic power keeps the single line to the heat pump.
 */
function hasElectrics(config) {
  const pv = config.pv;
  if (!pv || config.electrics === false) return false;
  return Boolean(pv.battery_power || pv.grid_power || pv.wallbox || pv.house);
}

/**
 * Residual building consumption from net inverter output and the normalized
 * grid meter. A DC-coupled battery is already reflected in inverter AC power;
 * the wallbox is subtracted because it has its own node on the bus.
 */
function calculatedHousePower(hass, config) {
  const pv = config.pv || {};
  const production = signedPower(hass, pv.power);
  const grid = signedPower(hass, pv.grid_power || pv.grid);
  if (production === null || grid === null) return null;
  const wallbox = signedPower(hass, pv.wallbox);
  return production + grid - Math.max(0, wallbox === null ? 0 : wallbox);
}

function electricNodePower(hass, node) {
  return node.calculate ? node.calculate(hass) : signedPower(hass, node.field);
}

/**
 * Which way the energy of one node travels: "in" towards the bus, "out" from
 * the bus into the node, or null while it is carrying nothing.
 */
function electricDirection(node) {
  return (hass) => {
    const value = electricNodePower(hass, node);
    if (value === null) return null;
    const threshold = node.field.threshold === undefined ? 5 : node.field.threshold;
    if (node.kind === "source") return value > threshold ? "in" : null;
    if (node.kind === "sink") return value > threshold ? "out" : null;
    if (Math.abs(value) <= threshold) return null;
    // A battery counts charging as positive, a meter counts importing as
    // positive; `invert: true` on the entity settles a plant that disagrees.
    if (node.kind === "battery") return value > 0 ? "out" : "in";
    if (node.kind === "grid") return value > 0 ? "in" : "out";
    return null;
  };
}

function electricGlyph(node, x, y) {
  const g = svgEl("g", { class: `hpfc-eglyph hpfc-eglyph-${node.key}` });
  if (node.key === "pv") {
    g.appendChild(
      svgEl("path", { class: "hpfc-pv-panel", d: `M ${x + 4} ${y - 8} L ${x + 18} ${y - 8} L ${x + 14} ${y + 8} L ${x} ${y + 8} Z` })
    );
  } else if (node.key === "battery") {
    g.appendChild(svgEl("rect", { class: "hpfc-battery-cap", x: x + 5, y: y - 12, width: 6, height: 3, rx: 1 }));
    g.appendChild(svgEl("rect", { class: "hpfc-battery-fill", x: x + 3, y: y - 6, width: 10, height: 12, rx: 1.5 }));
    g.appendChild(svgEl("rect", { class: "hpfc-battery-shell", x, y: y - 9, width: 16, height: 18, rx: 3 }));
  } else if (node.key === "grid") {
    // a pylon: two legs leaning together, braced, with the crossarms the
    // lines hang from
    g.appendChild(
      svgEl("path", {
        class: "hpfc-pylon",
        d:
          `M ${x + 1} ${y + 10} L ${x + 7} ${y - 10} ` +
          `M ${x + 17} ${y + 10} L ${x + 11} ${y - 10} ` +
          `M ${x + 3} ${y + 3} L ${x + 15} ${y + 3} ` +
          `M ${x + 3} ${y + 3} L ${x + 14} ${y - 4} ` +
          `M ${x + 15} ${y + 3} L ${x + 4} ${y - 4}`,
      })
    );
    g.appendChild(svgEl("line", { class: "hpfc-pylon", x1: x - 1, y1: y - 4, x2: x + 19, y2: y - 4 }));
    g.appendChild(svgEl("line", { class: "hpfc-pylon", x1: x + 2, y1: y - 10, x2: x + 16, y2: y - 10 }));
  } else if (node.key === "wallbox") {
    g.appendChild(svgEl("rect", { class: "hpfc-wallbox-body", x: x + 1, y: y - 10, width: 12, height: 20, rx: 3 }));
    g.appendChild(
      svgEl("path", { class: "hpfc-wallbox-bolt", d: `M ${x + 8} ${y - 5} L ${x + 4} ${y + 1} L ${x + 7} ${y + 1} L ${x + 5} ${y + 6}` })
    );
    g.appendChild(
      svgEl("path", { class: "hpfc-wallbox-cable", d: `M ${x + 13} ${y + 4} Q ${x + 19} ${y + 6} ${x + 18} ${y - 4}` })
    );
  } else if (node.key === "house") {
    g.appendChild(
      svgEl("path", { class: "hpfc-house", d: `M ${x} ${y + 1} L ${x + 9} ${y - 9} L ${x + 18} ${y + 1} L ${x + 18} ${y + 9} L ${x} ${y + 9} Z` })
    );
  } else if (node.key === "heater") {
    g.appendChild(
      svgEl("path", { class: "hpfc-eheater", d: `M ${x} ${y - 6} L ${x + 6} ${y - 6} L ${x + 3} ${y} L ${x + 9} ${y} L ${x + 6} ${y + 6} L ${x + 16} ${y + 6}` })
    );
  } else {
    g.appendChild(svgEl("circle", { class: "hpfc-fan-ring", cx: x + 9, cy: y, r: 9 }));
    g.appendChild(svgEl("circle", { class: "hpfc-hub", cx: x + 9, cy: y, r: 2.5 }));
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 * i) / 3;
      g.appendChild(
        svgEl("line", {
          class: "hpfc-grille",
          x1: x + 9,
          y1: y,
          x2: x + 9 + Math.cos(a) * 7,
          y2: y + Math.sin(a) * 7,
        })
      );
    }
  }
  return g;
}

function drawElectrics(scene, box, nodes) {
  const texts = textsFor(scene.hass());
  const busY = box.y + 10;
  const tileY = box.y + 40;
  const tileH = 56;
  const gap = 14;
  const tileW = Math.min(150, Math.max(96, (box.w - gap * (nodes.length - 1)) / nodes.length));
  const span = tileW * nodes.length + gap * (nodes.length - 1);
  const startX = box.x + Math.max(0, (box.w - span) / 2);

  const placed = nodes.map((node, index) => {
    const x = startX + index * (tileW + gap);
    return { ...node, x, cx: x + tileW / 2, direction: electricDirection(node) };
  });

  // the bus everything hangs off
  if (placed.length > 1) {
    drawPipe(scene, {
      points: [
        [placed[0].cx, busY],
        [placed[placed.length - 1].cx, busY],
      ],
      role: "pv",
      className: "hpfc-energy",
      part: "power-bus",
      active: (hass) => placed.some((node) => node.direction(hass) !== null),
    });
  }

  for (const node of placed) {
    drawPipe(scene, {
      points: [
        [node.cx, busY],
        [node.cx, tileY],
      ],
      role: "pv",
      className: "hpfc-energy",
      part: `power-${node.key}`,
      active: (hass) => node.direction(hass) !== null,
      reverse: (hass) => node.direction(hass) === "in",
    });

    const group = svgEl("g", { class: `hpfc-node hpfc-enode hpfc-enode-${node.key}` });
    group.appendChild(
      svgEl("rect", { x: node.x, y: tileY, width: tileW, height: tileH, rx: 14, class: "hpfc-panel" })
    );
    group.appendChild(electricGlyph(node, node.x + 12, tileY + tileH / 2));
    const label = svgText(node.x + 40, tileY + 24, "", { class: "hpfc-label" });
    const value = svgText(node.x + 40, tileY + 42, "–", { class: "hpfc-value" });
    group.appendChild(label);
    group.appendChild(value);
    scene.root.appendChild(group);
    if (node.field.entity) {
      attachAction(scene, group, {
        entity: node.field.entity,
        tap_action: node.field.tap_action,
        hold_action: node.field.hold_action,
        label: node.name || texts[node.text],
      });
    }

    const fill = group.querySelector(".hpfc-battery-fill");
    scene.add(() => {
      const hass = scene.hass();
      const t = textsFor(hass);
      let title = node.name || node.field.name || t[node.text] || node.key;
      if (node.soc && node.soc.entity) {
        const soc = displayValue(hass, node.soc, "");
        if (soc && soc !== "–") title += ` · ${soc}`;
      }
      label.textContent = title;
      fitText(scene, label, title, tileW - 52);
      const calculated = node.calculate ? node.calculate(hass) : null;
      value.textContent = node.calculate
        ? calculated === null
          ? "–"
          : formatNumber(hass, calculated, node.field) + suffix(node.field.unit || "W")
        : displayValue(hass, node.field);
      const direction = node.direction(hass);
      group.classList.toggle("hpfc-running", direction !== null);
      group.classList.toggle("hpfc-feeding", direction === "in");
      if (fill) {
        const soc = node.soc ? numberValue(hass, node.soc) : null;
        const level = soc === null ? 100 : Math.max(0, Math.min(100, soc));
        const filled = Math.max(1, (12 * level) / 100);
        fill.setAttribute("height", filled);
        fill.setAttribute("y", tileY + tileH / 2 - 6 + 12 - filled);
      }
    });
  }
}

function drawSolar(scene, box, cfg) {
  const texts = textsFor(scene.hass());
  const group = drawPanel(scene, box, cfg.name || texts.solar, {
    entity: cfg.entity || (cfg.collector_temp ? cfg.collector_temp.entity : undefined),
    tap_action: cfg.tap_action,
    hold_action: cfg.hold_action,
  });
  group.classList.add("hpfc-solar");

  const area = { x: box.x + 12, y: box.y + 34, w: box.w - 46, h: 42 };
  const body = svgEl("rect", {
    x: area.x,
    y: area.y,
    width: area.w,
    height: area.h,
    rx: 6,
    class: "hpfc-collector",
  });
  group.appendChild(body);
  for (let i = 1; i < 5; i++) {
    group.appendChild(
      svgEl("line", {
        class: "hpfc-absorber",
        x1: area.x + (area.w / 5) * i,
        y1: area.y + 5,
        x2: area.x + (area.w / 5) * i,
        y2: area.y + area.h - 5,
      })
    );
  }
  const sun = svgEl("g", { class: "hpfc-sun" });
  sun.appendChild(
    svgEl("circle", { cx: box.x + box.w - 26, cy: box.y + 46, r: 10, class: "hpfc-sun-core" })
  );
  group.appendChild(sun);

  drawBottomReadouts(scene, group, box, [
    { label: cfg.collector_temp ? cfg.collector_temp.name || texts.collector : texts.collector, field: cfg.collector_temp, colorize: true },
    cfg.yield ? { label: cfg.yield.name || texts.yield, field: cfg.yield } : null,
  ]);

  const running = (hass) => {
    if (cfg.pump && cfg.pump.entity) return isActive(hass, cfg.pump);
    if (cfg.yield && cfg.yield.entity) {
      const value = numberValue(hass, cfg.yield);
      if (value !== null) return value > 0;
    }
    const collector = numberValue(hass, cfg.collector_temp);
    return collector !== null ? collector > 35 : false;
  };

  scene.add(() => {
    const hass = scene.hass();
    group.classList.toggle("hpfc-running", running(hass));
    const colored = scene.config.temperature_colors !== false;
    const color = colored ? tempColor(numberValue(hass, cfg.collector_temp)) : null;
    body.style.fill = color || "";
  });

  return { group, running };
}

/* --------------------------- heat emitters ------------------------------ */

function drawEmitter(scene, group, area, type, options) {
  const opts = options || {};
  const wrap = svgEl("g", { class: `hpfc-emitter hpfc-emitter-${type}` });
  group.appendChild(wrap);
  const parts = [];

  if (type === "underfloor") {
    wrap.appendChild(
      svgEl("rect", {
        x: area.x,
        y: area.y + area.h - 10,
        width: area.w,
        height: 10,
        rx: 3,
        class: "hpfc-floor",
      })
    );
    const inset = 8;
    const points = [
      [area.x + inset, area.y + 8],
      [area.x + area.w - inset, area.y + 8],
      [area.x + area.w - inset, area.y + 20],
      [area.x + inset, area.y + 20],
      [area.x + inset, area.y + 32],
      [area.x + area.w - inset, area.y + 32],
    ];
    const d = roundedPath(points, 6);
    const base = svgEl("path", { d, class: "hpfc-emitter-line", fill: "none" });
    const dots = svgEl("path", { d, class: "hpfc-dots hpfc-dots-slim", fill: "none" });
    wrap.appendChild(base);
    wrap.appendChild(dots);
    parts.push({ node: base, kind: "stroke" }, { node: dots, kind: "dots" });
  } else if (type === "fancoil") {
    wrap.appendChild(
      svgEl("rect", { x: area.x, y: area.y, width: area.w, height: area.h, rx: 8, class: "hpfc-emitter-box" })
    );
    const fanX = area.x + 28;
    const spin = spinner(fanX, area.y + area.h / 2, 15, fanBlades(14), "hpfc-fancoil-fan");
    wrap.appendChild(spin.outer);
    parts.push({ node: spin.inner, kind: "spin" });
    const gridStart = fanX + 26;
    const columns = Math.max(3, Math.floor((area.x + area.w - 10 - gridStart) / 14));
    for (let i = 0; i < columns; i++) {
      const line = svgEl("rect", {
        x: gridStart + i * 14,
        y: area.y + 10,
        width: 6,
        height: area.h - 20,
        rx: 3,
        class: "hpfc-fin",
      });
      wrap.appendChild(line);
      parts.push({ node: line, kind: "fill" });
    }
  } else if (type === "pool") {
    wrap.appendChild(
      svgEl("path", {
        class: "hpfc-emitter-box",
        d: `M ${area.x} ${area.y} L ${area.x + 10} ${area.y + area.h} L ${area.x + area.w - 10} ${area.y + area.h} L ${area.x + area.w} ${area.y} Z`,
      })
    );
    for (let i = 0; i < 2; i++) {
      const y = area.y + 16 + i * 12;
      wrap.appendChild(
        svgEl("path", {
          class: "hpfc-wave",
          fill: "none",
          d: `M ${area.x + 14} ${y} q 12 -7 24 0 t 24 0 t 24 0 t 24 0`,
        })
      );
    }
  } else {
    // radiator (default) - vertical fins between two rails
    const top = area.y + 14;
    const finHeight = area.h - 16;
    const count = clamp(Math.floor(area.w / 18), 4, 9);
    const gap = (area.w - 8) / count;
    for (let i = 0; i < count; i++) {
      const fin = svgEl("rect", {
        x: area.x + 4 + i * gap,
        y: top,
        width: Math.max(6, gap - 7),
        height: finHeight,
        rx: 3,
        class: "hpfc-fin",
      });
      wrap.appendChild(fin);
      parts.push({ node: fin, kind: "fill" });
    }
    [top + 5, top + finHeight - 5].forEach((y) => {
      wrap.appendChild(
        svgEl("line", { x1: area.x, y1: y, x2: area.x + area.w, y2: y, class: "hpfc-rail" })
      );
    });
    for (let i = 0; i < 3; i++) {
      wrap.appendChild(
        svgEl("path", {
          class: "hpfc-heatwave",
          style: `animation-delay:${i * 0.7}s`,
          fill: "none",
          d: `M ${area.x + 24 + i * (area.w / 3)} ${top - 2} q 5 -4 0 -8 q -5 -4 0 -8`,
        })
      );
    }
  }

  scene.add(() => {
    const hass = scene.hass();
    const running = opts.running ? opts.running(hass) : false;
    wrap.classList.toggle("hpfc-running", running);
    const colored = scene.config.temperature_colors !== false;
    const color = (colored ? tempColor(numberValue(hass, opts.temp)) : null) || COLOR_FLOW;
    for (const part of parts) {
      if (part.kind === "fill") part.node.style.fill = color;
      if (part.kind === "stroke" || part.kind === "dots") part.node.style.stroke = color;
      if (part.kind === "dots") part.node.style.display = running && scene.config.animation !== false ? "" : "none";
    }
    wrap.style.setProperty("--hpfc-emitter-color", color);
  });

  return wrap;
}

const OFF_MODE_WORDS = [
  "off",
  "aus",
  "standby",
  "idle",
  "closed",
  "inaktiv",
  "geschlossen",
  "out of service",
  "no demand",
  "keine anforderung",
  "abgeschaltet",
  "deaktiviert",
  "disabled",
  "gesperrt",
  "blocked",
];

/** Whether a mode-like field names one of the states that mean "parked". */
function modeSaysOff(hass, field) {
  if (!field || !field.entity) return false;
  const raw = rawValue(hass, field);
  if (raw === undefined || raw === null || raw === "") return false;
  const text = String(raw).toLowerCase();
  return OFF_MODE_WORDS.some((word) => text.includes(word));
}

/**
 * Whether a single circuit is being served right now. Every circuit answers
 * this for itself - circuit A running says nothing about circuit D - and only
 * a circuit without any state source of its own follows the heat pump.
 */
function circuitRunning(scene, cfg) {
  return (hass) => {
    if (cfg.pump && cfg.pump.entity) return isActive(hass, cfg.pump);

    // A mode set to "off" wins over everything below: that circuit is parked.
    let modeRaw = null;
    if (cfg.mode && cfg.mode.entity) {
      const raw = rawValue(hass, cfg.mode);
      if (raw !== undefined && raw !== null && raw !== "") {
        modeRaw = String(raw).toLowerCase();
        if (OFF_MODE_WORDS.some((word) => modeRaw.includes(word))) return false;
      }
    }

    if (cfg.valve && cfg.valve.entity) {
      const value = numberValue(hass, cfg.valve);
      if (value !== null) return value > 0;
    }
    if (cfg.entity) return isActive(hass, { entity: cfg.entity });
    // A mode is what the circuit was told to do, not what it is doing: on its
    // own it says nothing, so such a circuit follows the plant.
    return scene.flags.heatpumpRunning ? scene.flags.heatpumpRunning(hass) : false;
  };
}

function drawCircuit(scene, box, cfg) {
  const texts = textsFor(scene.hass());
  const fallbackName =
    cfg.type === "underfloor" ? texts.underfloor : cfg.type === "radiator" ? texts.radiators : texts.circuit;
  const group = drawPanel(scene, box, cfg.name || fallbackName, {
    entity: cfg.entity,
    tap_action: cfg.tap_action,
    hold_action: cfg.hold_action,
    titleWidth: box.w - (cfg.mode ? 170 : 44),
  });
  group.classList.add("hpfc-circuit");

  const running = circuitRunning(scene, cfg);
  drawStatusDot(scene, group, box.x + box.w - 16, box.y + 16, (hass) => (running(hass) ? "on" : "off"));

  if (cfg.mode) {
    drawChip(scene, group, { x: box.x + box.w - 142, y: box.y + 8, w: 114, h: 21 }, cfg.mode, {
      label: `${cfg.name || fallbackName} – ${texts.mode}`,
      resolve: (hass) => ({
        text: modeLabel(hass, cfg.mode, optionLabel(hass, rawValue(hass, cfg.mode) || "")),
        active: isActive(hass, cfg.mode),
      }),
    });
  }

  const columns = [
    cfg.flow_temp ? { label: texts.flow, field: cfg.flow_temp, colorize: true } : null,
    cfg.return_temp ? { label: texts.ret, field: cfg.return_temp, colorize: true } : null,
    cfg.room_temp ? { label: cfg.room_temp.name || texts.room, field: cfg.room_temp } : null,
    cfg.target_temp ? { label: texts.target, field: cfg.target_temp } : null,
    cfg.humidity ? { label: cfg.humidity.name || "rH", field: cfg.humidity } : null,
  ].filter(Boolean);
  const columnWidth = (box.w - 28) / Math.max(columns.length, 1);
  columns.slice(0, 4).forEach((column, index) => {
    drawReadout(scene, group, box.x + 14 + columnWidth * index, box.y + 46, column.label, column.field, {
      colorize: column.colorize,
      strong: index === 0,
    });
  });

  // Pump, mixer and emitter along the bottom
  const baseY = box.y + box.h - 34;
  let cursor = box.x + 30;
  drawPump(scene, group, cursor, baseY, cfg.pump, {
    label: `${cfg.name || fallbackName} – ${texts.pump}`,
    running,
  });
  cursor += 34;

  if (cfg.valve) {
    const valve = svgEl("g", { class: "hpfc-valve" });
    valve.appendChild(
      svgEl("path", {
        class: "hpfc-valve-body",
        d: `M ${cursor - 12} ${baseY - 11} L ${cursor} ${baseY} L ${cursor - 12} ${baseY + 11} Z M ${cursor + 12} ${baseY - 11} L ${cursor} ${baseY} L ${cursor + 12} ${baseY + 11} Z`,
      })
    );
    const valveText = svgText(cursor, baseY + 26, "", { "text-anchor": "middle", class: "hpfc-label" });
    valve.appendChild(valveText);
    group.appendChild(valve);
    attachAction(scene, valve, {
      entity: cfg.valve.entity,
      tap_action: cfg.valve.tap_action,
      label: texts.mixer,
    });
    scene.add(() => {
      const hass = scene.hass();
      valveText.textContent = displayValue(hass, cfg.valve, "");
      valve.classList.toggle("hpfc-running", isActive(hass, cfg.valve));
    });
    cursor += 30;
  }

  const emitterArea = {
    x: cursor + 8,
    y: box.y + box.h - 58,
    w: box.x + box.w - 14 - (cursor + 8),
    h: 46,
  };
  drawEmitter(scene, group, emitterArea, cfg.type || "radiator", {
    running,
    temp: cfg.flow_temp || cfg.room_temp,
  });

  scene.add(() => {
    group.classList.toggle("hpfc-running", running(scene.hass()));
  });

  return { group, running };
}

function drawDhw(scene, box, cfg) {
  const texts = textsFor(scene.hass());
  const group = drawPanel(scene, box, cfg.name || texts.dhw, {
    entity: cfg.entity,
    tap_action: cfg.tap_action,
    hold_action: cfg.hold_action,
    titleWidth: box.w - 44 - (cfg.mode ? 126 : 0) - (cfg.boost ? 74 : 0),
  });
  group.classList.add("hpfc-dhw");

  const running = (hass) => {
    // A mode that says off parks the tank, whatever anything else reports.
    if (modeSaysOff(hass, cfg.mode)) return false;
    if (cfg.pump && cfg.pump.entity) return isActive(hass, cfg.pump);
    if (cfg.charge && cfg.charge.entity) {
      const value = numberValue(hass, cfg.charge);
      if (value !== null) return value > 0;
    }
    if (cfg.entity) {
      const domain = domainOf(cfg.entity);
      if (domain === "climate" || domain === "water_heater") {
        // Their state is the selected mode. "off" is off; anything else only
        // says the thermostat is enabled, so the temperatures decide below.
        const raw = String(rawValue(hass, { entity: cfg.entity }) || "").toLowerCase();
        if (!raw || raw === "off" || raw === "unavailable" || raw === "unknown") return false;
      } else {
        return isActive(hass, { entity: cfg.entity });
      }
    }
    const current = numberValue(hass, cfg.temp);
    const target = numberValue(hass, cfg.target_temp);
    if (current !== null && target !== null) return current < target - 1;
    return false;
  };
  drawStatusDot(scene, group, box.x + box.w - 16, box.y + 16, (hass) => (running(hass) ? "on" : "off"));

  let chipRight = box.x + box.w - 28;
  if (cfg.boost) {
    chipRight -= 66;
    drawChip(scene, group, { x: chipRight, y: box.y + 8, w: 66, h: 21 }, cfg.boost, {
      text: cfg.boost.name || texts.boost,
      label: texts.boost,
      resolve: (hass) => ({
        text: cfg.boost.name || textsFor(hass).boost,
        active: isActive(hass, cfg.boost),
      }),
    });
    chipRight -= 8;
  }
  if (cfg.mode) {
    drawChip(scene, group, { x: chipRight - 114, y: box.y + 8, w: 114, h: 21 }, cfg.mode, {
      label: `${cfg.name || texts.dhw} – ${texts.mode}`,
      resolve: (hass) => ({
        text: modeLabel(hass, cfg.mode, optionLabel(hass, rawValue(hass, cfg.mode) || "")),
        active: isActive(hass, cfg.mode),
      }),
    });
  }

  drawTank(
    scene,
    { x: box.x + 14, y: box.y + 32, w: 46, h: box.h - 46 },
    cfg,
    {
      radius: 16,
      layers: [{ label: texts.dhw, field: cfg.temp, pill: false }],
      heater: cfg.heater,
      heaterPower: cfg.heater_power,
      heaterTemp: cfg.heater_temp,
      heaterMode: cfg.heater_mode,
      heaterLabel: texts.heater,
      entity: cfg.entity,
      tap_action: cfg.tap_action,
    }
  );

  const columns = [
    { label: cfg.temp && cfg.temp.name ? cfg.temp.name : texts.current, field: cfg.temp, colorize: true },
    cfg.target_temp ? { label: texts.target, field: cfg.target_temp } : null,
    cfg.charge ? { label: cfg.charge.name || texts.charge, field: cfg.charge } : null,
    cfg.pump ? { label: texts.pump, field: cfg.pump } : null,
  ].filter(Boolean);
  const width = (box.w - 90) / Math.max(columns.length, 1);
  columns.slice(0, 3).forEach((column, index) => {
    drawReadout(scene, group, box.x + 76 + width * index, box.y + 50, column.label, column.field, {
      colorize: column.colorize,
      strong: index === 0,
    });
  });

  scene.add(() => {
    group.classList.toggle("hpfc-running", running(scene.hass()));
  });

  return { group, running };
}

/* =========================================================================
 * Configuration
 * ========================================================================= */

/**
 * How far the enlarged view may scale the drawing down before it stops. Below
 * this the labels stop being readable, and scrolling is the better answer.
 */
const MIN_ZOOM_SCALE = 0.75;

/**
 * And how far up. A 4K screen is filled comfortably within this; past it the
 * drawing would only get bigger, not more readable, which on an 8K panel means
 * finger-thick pipes. Beyond the cap the card is centred instead.
 */
const MAX_ZOOM_SCALE = 3;

/** IDM and friends address their circuits A-G, so seven is the practical ceiling. */
const MAX_CIRCUITS = 7;

/**
 * Ready made plants. A layout only decides what is drawn *by default* - any
 * section can still be added or removed per card.
 */
const LAYOUT_PRESETS = {
  // heat pump, buffer tank, heating circuits
  compact: { sections: ["buffer"], circuits: 1, dense: true },
  "compact-dual": { sections: ["buffer"], circuits: 2, dense: true },
  single: { sections: ["buffer"], circuits: 1 },
  dual: { sections: ["buffer"], circuits: 2 },
  triple: { sections: ["buffer"], circuits: 3 },
  quad: { sections: ["buffer"], circuits: 4 },
  // ... plus domestic hot water
  dhw: { sections: ["buffer", "dhw"], circuits: 1 },
  "dhw-dual": { sections: ["buffer", "dhw"], circuits: 2 },
  "dhw-quad": { sections: ["buffer", "dhw"], circuits: 4 },
  // ... plus photovoltaics, without solar thermal
  "pv-single": { sections: ["buffer", "pv"], circuits: 1 },
  "pv-dual": { sections: ["buffer", "pv"], circuits: 2 },
  "pv-dhw-dual": { sections: ["buffer", "pv", "dhw"], circuits: 2 },
  // ... plus solar thermal
  "solar-dual": { sections: ["buffer", "solar", "dhw"], circuits: 2 },
  full: { sections: ["buffer", "pv", "solar", "dhw"], circuits: 2 },
  "full-quad": { sections: ["buffer", "pv", "solar", "dhw"], circuits: 4 },
  // no buffer tank: the heat pump feeds the circuits directly
  direct: { sections: [], circuits: 1 },
  "direct-dual": { sections: [], circuits: 2 },
  "direct-dhw": { sections: ["dhw"], circuits: 2 },
};

const SECTION_FIELDS = {
  heatpump: [
    "power",
    "cop",
    "outside_temp",
    "flow_temp",
    "return_temp",
    "compressor",
    "mode",
    "status",
    "state_entity",
    "aux_heat",
    "aux_heat_power",
    "defrost",
    "flow_rate",
  ],
  pv: ["power", "battery", "grid", "battery_power", "grid_power", "wallbox", "house"],
  solar: ["collector_temp", "pump", "yield", "return_temp", "flow_temp"],
  buffer: ["top", "middle", "bottom", "charge", "heater", "heater_power", "heater_temp", "heater_mode"],
  dhw: [
    "temp",
    "target_temp",
    "charge",
    "pump",
    "mode",
    "boost",
    "heater",
    "heater_power",
    "heater_temp",
    "heater_mode",
  ],
  circuit: [
    "flow_temp",
    "return_temp",
    "room_temp",
    "target_temp",
    "pump",
    "valve",
    "humidity",
    "mode",
  ],
};

const FIELD_ALIASES = {
  outdoor_temp: "outside_temp",
  outside_temperature: "outside_temp",
  ambient_temp: "outside_temp",
  flow_temperature: "flow_temp",
  return_temperature: "return_temp",
  temp_top: "top",
  temp_middle: "middle",
  temp_bottom: "bottom",
  temperature: "temp",
  target: "target_temp",
  setpoint: "target_temp",
  room_temperature: "room_temp",
  collector: "collector_temp",
  mixer: "valve",
};

const PASSTHROUGH_KEYS = ["name", "entity", "type", "tap_action", "hold_action", "power_threshold", "threshold"];

/**
 * A climate or water_heater entity carries its temperatures in attributes, so
 * `target_temp: climate.hc_a` should show the setpoint rather than "heat".
 */
const AUTO_ATTRIBUTES = {
  target_temp: { climate: "temperature", water_heater: "temperature" },
  temp: { climate: "current_temperature", water_heater: "current_temperature" },
  room_temp: { climate: "current_temperature" },
};

function normalizeSection(raw, fields) {
  if (!raw || typeof raw !== "object") return {};
  const result = {};
  for (const key of PASSTHROUGH_KEYS) {
    if (raw[key] !== undefined) result[key] = raw[key];
  }
  for (const key of Object.keys(raw)) {
    const target = FIELD_ALIASES[key] || key;
    if (!fields.includes(target)) continue;
    const field = asField(raw[key]);
    if (!field) continue;
    const auto = AUTO_ATTRIBUTES[target];
    if (auto && !field.attribute && field.entity) {
      const attribute = auto[domainOf(field.entity)];
      if (attribute) field.attribute = attribute;
    }
    result[target] = field;
  }
  return result;
}

function sectionEnabled(raw, key, preset) {
  const value = raw[key];
  if (value === false || value === null) return false;
  if (value === undefined) return preset.sections.includes(key);
  return true;
}

function normalizeConfig(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid configuration");
  const layout = LAYOUT_PRESETS[raw.layout] ? raw.layout : "dual";
  const preset = LAYOUT_PRESETS[layout];

  const config = {
    type: raw.type,
    title: raw.title,
    layout,
    dense: Boolean(preset.dense),
    animation: raw.animation !== false,
    flow_speed: Number.isFinite(Number(raw.flow_speed)) ? clamp(Number(raw.flow_speed), 0.1, 5) : 1,
    temperature_colors: raw.temperature_colors !== false,
    controls: raw.controls !== false,
    dim_inactive: raw.dim_inactive !== false,
    zoom: raw.zoom !== false,
    electrics: raw.electrics !== false,
    heatpump: normalizeSection(raw.heatpump || {}, SECTION_FIELDS.heatpump),
    pv: null,
    solar: null,
    buffer: null,
    dhw: null,
    circuits: [],
  };

  if (raw.heatpump && raw.heatpump.power_threshold !== undefined) {
    config.heatpump.power_threshold = raw.heatpump.power_threshold;
  }

  for (const key of ["pv", "solar", "buffer", "dhw"]) {
    if (!sectionEnabled(raw, key, preset)) continue;
    const source = typeof raw[key] === "object" && raw[key] !== null ? raw[key] : {};
    config[key] = normalizeSection(source, SECTION_FIELDS[key]);
  }

  let circuits = raw.circuits;
  if (circuits === undefined || circuits === null) {
    circuits = [];
    for (let i = 0; i < preset.circuits; i++) {
      circuits.push({ type: i % 2 === 0 ? "radiator" : "underfloor" });
    }
  } else if (circuits === false) {
    circuits = [];
  } else if (!Array.isArray(circuits)) {
    circuits = [circuits];
  }
  config.circuits = circuits
    .filter((circuit) => circuit && circuit !== true)
    .slice(0, MAX_CIRCUITS)
    .map((circuit) => {
      const normalized = normalizeSection(circuit, SECTION_FIELDS.circuit);
      if (!normalized.type) normalized.type = "radiator";
      return normalized;
    });

  return config;
}

/* =========================================================================
 * Scene / layout
 * ========================================================================= */

const GEOMETRY = {
  pad: 14,
  hp: { w: 200, h: 190 },
  pv: { w: 170, h: 118 },
  solar: { w: 170, h: 122 },
  buffer: { w: 126, min: 250, max: 330 },
  sourceGap: 74,
  hpGap: 110,
  railGap: 92,
  gapY: 16,
};

function buildScene(card) {
  const config = card._config;
  const G = GEOMETRY;
  const consumerWidth = config.dense ? 268 : 304;
  const circuitHeight = config.dense ? 118 : 134;
  const dhwHeight = 118;
  const showSources = Boolean(config.pv || config.solar);
  const hpHeight =
    config.heatpump.aux_heat || config.heatpump.aux_heat_power ? G.hp.h + 34 : G.hp.h;

  // ---- horizontal placement -------------------------------------------
  let x = G.pad;
  const srcX = x;
  if (showSources) x += G.pv.w + G.sourceGap;
  const hpX = x;
  x += G.hp.w + G.hpGap;
  let bufX = null;
  if (config.buffer) {
    bufX = x;
    x += G.buffer.w + G.railGap;
  }
  const rightX = x;
  const width = rightX + consumerWidth + G.pad;

  // ---- vertical placement ---------------------------------------------
  const consumers = [];
  if (config.dhw) consumers.push({ kind: "dhw", cfg: config.dhw, h: dhwHeight });
  for (const circuit of config.circuits) {
    consumers.push({ kind: "circuit", cfg: circuit, h: circuitHeight });
  }

  const rightH = consumers.length
    ? consumers.reduce((sum, item) => sum + item.h, 0) + G.gapY * (consumers.length - 1)
    : 0;
  const sourcesH =
    (config.pv ? G.pv.h : 0) +
    (config.solar ? G.solar.h : 0) +
    (config.pv && config.solar ? G.gapY : 0);
  const bufferMin = config.dense ? 200 : G.buffer.min;
  const contentH = Math.max(rightH, hpHeight + 30, sourcesH, config.buffer ? bufferMin : 0);

  const hpY = G.pad + (contentH - hpHeight) / 2;
  const srcY = G.pad + (contentH - sourcesH) / 2;
  const bufH = Math.min(contentH, G.buffer.max);
  const bufY = G.pad + (contentH - bufH) / 2;
  let cursorY = G.pad + (contentH - rightH) / 2;
  for (const item of consumers) {
    item.y = cursorY;
    cursorY += item.h + G.gapY;
  }

  const solarLanes = config.solar && config.buffer;
  const electrics = hasElectrics(config) ? electricNodes(config) : [];
  const showElectrics = electrics.length > 1;
  const stripY = G.pad + contentH + (solarLanes ? 88 : G.pad);
  const height = stripY + (showElectrics ? 110 : 0);
  const laneA = G.pad + contentH + 20;
  const laneB = G.pad + contentH + 54;

  // ---- scene scaffolding ----------------------------------------------
  const svg = svgEl("svg", {
    viewBox: `0 0 ${Math.round(width)} ${Math.round(height)}`,
    preserveAspectRatio: "xMidYMid meet",
    class: "hpfc-svg",
    role: "img",
  });
  const defs = svgEl("defs");
  const pipeLayer = svgEl("g", { class: "hpfc-pipes" });
  const nodeLayer = svgEl("g", { class: "hpfc-nodes" });
  svg.appendChild(defs);
  svg.appendChild(pipeLayer);
  svg.appendChild(nodeLayer);

  const scene = {
    card,
    config,
    svg,
    defs,
    pipeLayer,
    root: nodeLayer,
    updaters: [],
    flags: {},
    hass: () => card._hass,
    add(fn) {
      this.updaters.push(fn);
    },
  };

  // ---- nodes ------------------------------------------------------------
  const heatpump = drawHeatPump(scene, { x: hpX, y: hpY, w: G.hp.w, h: hpHeight }, config.heatpump);
  scene.flags.heatpumpRunning = heatpump.running;

  let pv = null;
  let solar = null;
  if (config.pv) {
    pv = drawPv(scene, { x: srcX, y: srcY, w: G.pv.w, h: G.pv.h }, config.pv);
  }
  if (config.solar) {
    const solarY = srcY + (config.pv ? G.pv.h + G.gapY : 0);
    solar = drawSolar(scene, { x: srcX, y: solarY, w: G.solar.w, h: G.solar.h }, config.solar);
    solar.box = { x: srcX, y: solarY, w: G.solar.w, h: G.solar.h };
  }

  if (config.buffer) {
    const texts = textsFor(scene.hass());
    const keys = ["top", "middle", "bottom"];
    const configured = keys.filter((key) => config.buffer[key]);
    const used = configured.length ? configured : keys;
    drawTank(scene, { x: bufX, y: bufY, w: G.buffer.w, h: bufH }, config.buffer, {
      heater: config.buffer.heater,
      heaterPower: config.buffer.heater_power,
      heaterTemp: config.buffer.heater_temp,
      heaterMode: config.buffer.heater_mode,
      heaterLabel: texts.heater,
      title: config.buffer.name || texts.buffer,
      subtitle: config.buffer.charge ? { label: texts.charge, field: config.buffer.charge } : null,
      coil: Boolean(config.solar),
      entity: config.buffer.entity,
      tap_action: config.buffer.tap_action,
      layers: used.map((key) => ({ label: texts[key], field: config.buffer[key] })),
    });
  }

  consumers.forEach((item, index) => {
    const box = { x: rightX, y: item.y, w: consumerWidth, h: item.h };
    const drawn =
      item.kind === "dhw" ? drawDhw(scene, box, item.cfg) : drawCircuit(scene, box, item.cfg);
    drawn.group.setAttribute(
      "data-part",
      item.kind === "dhw" ? "dhw" : `circuit-${index + (config.dhw ? 0 : 1)}`
    );
    item.running = drawn.running;
    item.inletY = item.y + 40;
    item.outletY = item.y + item.h - 30;
  });

  // ---- pipes ------------------------------------------------------------
  const hpRight = hpX + G.hp.w;
  const hpFlowY = hpY + 66;
  const hpReturnY = hpY + 130;
  const anyConsumer = (hass) => consumers.some((item) => item.running && item.running(hass));

  const sourceRight = config.buffer ? bufX + G.buffer.w : hpRight;
  const flowRailX = sourceRight + 34;
  const returnRailX = sourceRight + 64;
  const bufferFlowY = config.buffer ? bufY + 56 : hpFlowY;
  const bufferReturnY = config.buffer ? bufY + bufH - 56 : hpReturnY;

  if (config.buffer) {
    const mid = hpRight + 55;
    drawPipe(scene, {
      points: [
        [hpRight, hpFlowY],
        [mid, hpFlowY],
        [mid, bufferFlowY],
        [bufX, bufferFlowY],
      ],
      role: "flow",
      from: config.heatpump.flow_temp,
      to: config.buffer.top,
      active: heatpump.running,
    });
    drawPipe(scene, {
      points: [
        [bufX, bufferReturnY],
        [mid + 26, bufferReturnY],
        [mid + 26, hpReturnY],
        [hpRight, hpReturnY],
      ],
      role: "return",
      from: config.buffer.bottom,
      to: config.heatpump.return_temp,
      active: heatpump.running,
    });
  } else if (consumers.length) {
    drawPipe(scene, {
      points: [
        [hpRight, hpFlowY],
        [flowRailX, hpFlowY],
      ],
      role: "flow",
      from: config.heatpump.flow_temp,
      to: null,
      active: heatpump.running,
    });
    drawPipe(scene, {
      points: [
        [returnRailX, hpReturnY],
        [hpRight, hpReturnY],
      ],
      role: "return",
      from: null,
      to: config.heatpump.return_temp,
      active: heatpump.running,
    });
  }

  if (config.heatpump.flow_temp) {
    drawBadge(scene, hpRight + 28, hpFlowY - 16, config.heatpump.flow_temp, {
      label: textsFor(scene.hass()).flow,
    });
  }
  if (config.heatpump.return_temp) {
    drawBadge(scene, hpRight + 28, hpReturnY + 17, config.heatpump.return_temp, {
      label: textsFor(scene.hass()).ret,
    });
  }
  if (config.heatpump.flow_rate) {
    drawBadge(scene, hpRight + 28, hpFlowY + 17, config.heatpump.flow_rate, {
      label: textsFor(scene.hass()).flow_rate,
    });
  }

  // distribution spines and branches
  const inlets = consumers.map((item) => item.inletY);
  const outlets = consumers.map((item) => item.outletY);
  const flowSpan = [Math.min(bufferFlowY, ...inlets), Math.max(bufferFlowY, ...inlets)];
  const returnSpan = [Math.min(bufferReturnY, ...outlets), Math.max(bufferReturnY, ...outlets)];

  if (config.buffer && consumers.length) {
    drawPipe(scene, {
      points: [
        [bufX + G.buffer.w, bufferFlowY],
        [flowRailX, bufferFlowY],
      ],
      role: "flow",
      part: "flow-trunk",
      from: config.buffer.top,
      active: anyConsumer,
    });
    drawPipe(scene, {
      points: [
        [returnRailX, bufferReturnY],
        [bufX + G.buffer.w, bufferReturnY],
      ],
      role: "return",
      part: "return-trunk",
      from: consumers[0] ? consumers[0].cfg.return_temp : null,
      to: config.buffer.bottom,
      active: anyConsumer,
    });
  }

  // A distributor can have consumers above and below the buffer connection.
  // One path through the whole rail cannot animate both directions at once,
  // so each side gets its own path and activity state.
  const flowAbove = consumers.filter((item) => item.inletY < bufferFlowY - 2);
  const flowBelow = consumers.filter((item) => item.inletY > bufferFlowY + 2);
  const returnAbove = consumers.filter((item) => item.outletY < bufferReturnY - 2);
  const returnBelow = consumers.filter((item) => item.outletY > bufferReturnY + 2);
  const segmentRunning = (items) => (hass) =>
    items.some((item) => item.running && item.running(hass));

  if (flowAbove.length) {
    drawPipe(scene, {
      points: [
        [flowRailX, bufferFlowY],
        [flowRailX, flowSpan[0]],
      ],
      role: "flow",
      part: "flow-spine",
      segment: "upper",
      from: config.buffer ? config.buffer.top : config.heatpump.flow_temp,
      active: segmentRunning(flowAbove),
    });
  }
  if (flowBelow.length) {
    drawPipe(scene, {
      points: [
        [flowRailX, bufferFlowY],
        [flowRailX, flowSpan[1]],
      ],
      role: "flow",
      part: "flow-spine",
      segment: "lower",
      from: config.buffer ? config.buffer.top : config.heatpump.flow_temp,
      active: segmentRunning(flowBelow),
    });
  }
  if (returnAbove.length) {
    drawPipe(scene, {
      points: [
        [returnRailX, returnSpan[0]],
        [returnRailX, bufferReturnY],
      ],
      role: "return",
      part: "return-spine",
      segment: "upper",
      from: returnAbove[0].cfg.return_temp || returnAbove[0].cfg.flow_temp,
      to: config.buffer ? config.buffer.bottom : config.heatpump.return_temp,
      active: segmentRunning(returnAbove),
    });
  }
  if (returnBelow.length) {
    drawPipe(scene, {
      points: [
        [returnRailX, returnSpan[1]],
        [returnRailX, bufferReturnY],
      ],
      role: "return",
      part: "return-spine",
      segment: "lower",
      from: returnBelow[0].cfg.return_temp || returnBelow[0].cfg.flow_temp,
      to: config.buffer ? config.buffer.bottom : config.heatpump.return_temp,
      active: segmentRunning(returnBelow),
    });
  }

  consumers.forEach((item, index) => {
    const part = item.kind === "dhw" ? "dhw" : `circuit-${index + (config.dhw ? 0 : 1)}`;
    drawPipe(scene, {
      points: [
        [flowRailX, item.inletY],
        [rightX, item.inletY],
      ],
      role: "flow",
      part: `flow-${part}`,
      from: config.buffer ? config.buffer.top : config.heatpump.flow_temp,
      to: item.cfg.flow_temp || item.cfg.temp,
      active: item.running,
    });
    drawPipe(scene, {
      points: [
        [rightX, item.outletY],
        [returnRailX, item.outletY],
      ],
      role: "return",
      part: `return-${part}`,
      from: item.cfg.return_temp || item.cfg.flow_temp,
      to: config.buffer ? config.buffer.bottom : config.heatpump.return_temp,
      active: item.running,
    });
  });

  // solar thermal circuit
  if (solar && config.buffer) {
    const collectorBottom = solar.box.y + solar.box.h;
    const tankCenter = bufX + G.buffer.w / 2;
    drawPipe(scene, {
      points: [
        [srcX + G.solar.w - 42, collectorBottom],
        [srcX + G.solar.w - 42, laneA],
        [tankCenter - 18, laneA],
        [tankCenter - 18, bufY + bufH - 12],
      ],
      role: "solar",
      from: config.solar.collector_temp,
      to: config.buffer.bottom,
      active: solar.running,
    });
    drawPipe(scene, {
      points: [
        [tankCenter + 18, bufY + bufH - 12],
        [tankCenter + 18, laneB],
        [srcX + G.solar.w - 76, laneB],
        [srcX + G.solar.w - 76, collectorBottom],
      ],
      role: "return",
      from: config.solar.return_temp || config.buffer.bottom,
      to: config.solar.return_temp || config.buffer.bottom,
      active: solar.running,
    });

    // What the collector sends down and what comes back up
    const solarTexts = textsFor(scene.hass());
    const solarBadgeX = (srcX + G.solar.w - 42 + tankCenter - 18) / 2;
    if (config.solar.flow_temp || config.solar.collector_temp) {
      drawBadge(scene, solarBadgeX, laneA - 16, config.solar.flow_temp || config.solar.collector_temp, {
        label: solarTexts.flow,
      });
    }
    if (config.solar.return_temp) {
      drawBadge(scene, solarBadgeX, laneB + 16, config.solar.return_temp, { label: solarTexts.ret });
    }
  }

  // The electrical side. With a battery, a meter, a wallbox or the house it is
  // a bus of its own, because that is where the current goes when the heat
  // pump is not asking for any. Without them a single line to the heat pump
  // says enough - but only while the heat pump is actually drawing.
  if (showElectrics) {
    drawElectrics(scene, { x: G.pad, y: stripY, w: width - G.pad * 2, h: 110 }, electrics);
  } else if (pv) {
    drawPipe(scene, {
      points: [
        [srcX + G.pv.w, srcY + 62],
        [srcX + G.pv.w + 26, srcY + 62],
        [srcX + G.pv.w + 26, hpY + 96],
        [hpX, hpY + 96],
      ],
      role: "pv",
      className: "hpfc-energy",
      radius: 10,
      active: (hass) =>
        pv.producing(hass) &&
        (scene.flags.heatpumpRunning ? scene.flags.heatpumpRunning(hass) : true),
    });
  }

  return scene;
}

/* =========================================================================
 * Styles
 * ========================================================================= */

const CARD_STYLES = `
:host { display: block; }
ha-card { overflow: hidden; padding: 10px 8px 6px; }
ha-card.hpfc-has-title { padding-top: 4px; }
.hpfc-header {
  font-size: var(--ha-card-header-font-size, 22px);
  font-weight: 400;
  color: var(--ha-card-header-color, var(--primary-text-color));
  padding: 10px 12px 2px;
  line-height: 1.2;
}
.hpfc-error { padding: 16px; color: var(--error-color, #db4437); font-size: 14px; }
.hpfc-stage { position: relative; }
.hpfc-zoom {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--divider-color, #d5d5d5);
  background: var(--card-background-color, #fff);
  color: var(--secondary-text-color, #757575);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}
.hpfc-zoom:hover, .hpfc-zoom:focus-visible { opacity: 1; }
.hpfc-zoom svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
}
/* dropping the upright stroke turns the plus into a minus */
.hpfc-zoom-open .hpfc-zoom-plus { display: none; }
.hpfc-zoom-shell {
  position: absolute;
  inset: 0;
  display: flex;
  /* centring is done with the child's auto margins: centring with
     justify-content would make the overflow on the left unreachable when the
     drawing is wider than the screen */
  align-items: flex-start;
  justify-content: flex-start;
  overflow: auto;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.72);
}
.hpfc-stage-zoom {
  margin: auto;
  padding: 8px;
  border-radius: 16px;
  background: var(--card-background-color, #fff);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}
.hpfc-backdrop { position: absolute; inset: 0; z-index: 1; }
.hpfc-pop {
  position: absolute;
  z-index: 2;
  min-width: 156px;
  max-width: 264px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--divider-color, #d5d5d5);
  background: var(--card-background-color, #fff);
  color: var(--primary-text-color, #212121);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3);
}
.hpfc-pop-title { font-size: 12px; font-weight: 600; opacity: 0.7; margin-bottom: 8px; }
.hpfc-pop-step { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hpfc-pop-step button {
  width: 34px;
  height: 34px;
  flex: none;
  border: none;
  border-radius: 50%;
  font-size: 19px;
  line-height: 1;
  cursor: pointer;
  background: var(--primary-color, #03a9f4);
  color: var(--text-primary-color, #fff);
}
.hpfc-pop-step button:disabled { opacity: 0.4; cursor: default; }
.hpfc-pop-value { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.hpfc-pop-options { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.hpfc-pop-options button {
  padding: 5px 10px;
  border-radius: 14px;
  border: 1px solid var(--divider-color, #d5d5d5);
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}
.hpfc-pop-options button.hpfc-on {
  background: var(--primary-color, #03a9f4);
  border-color: transparent;
  color: var(--text-primary-color, #fff);
}
.hpfc-pop-more {
  margin-top: 8px;
  width: 100%;
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--primary-color, #03a9f4);
  font-size: 12px;
  cursor: pointer;
}
.hpfc-svg {
  display: block;
  width: 100%;
  height: auto;
  font-family: var(--paper-font-body1_-_font-family, var(--ha-font-family-body, Roboto, sans-serif));
  --hpfc-stroke: var(--divider-color, #d5d5d5);
  --hpfc-text: var(--primary-text-color, #212121);
  --hpfc-muted: var(--secondary-text-color, #757575);
  --hpfc-surface: var(--card-background-color, #fff);
  --hpfc-panel-bg: var(--hpfc-panel-color, rgba(127, 127, 127, 0.10));
  --hpfc-tank-warm: #f97316;
  --hpfc-tank-mid: #eab308;
  --hpfc-tank-cold: #3b82f6;
}

/* panels ---------------------------------------------------------------- */
.hpfc-panel { fill: var(--hpfc-panel-bg); stroke: var(--hpfc-stroke); stroke-width: 1; }
.hpfc-title { font-size: 13px; font-weight: 600; fill: var(--hpfc-text); }
.hpfc-label {
  font-size: 9.5px;
  fill: var(--hpfc-muted);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.hpfc-value { font-size: 13px; font-weight: 600; fill: var(--hpfc-text); }
.hpfc-subtitle { font-size: 11px; fill: var(--hpfc-muted); }
.hpfc-value-strong { font-size: 14px; }
.hpfc-unset { opacity: 0.42; }

.hpfc-clickable { cursor: pointer; outline: none; }
.hpfc-clickable:hover { filter: brightness(1.12); }
.hpfc-clickable:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }

/* pipes ----------------------------------------------------------------- */
.hpfc-pipe {
  stroke-width: 8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.8s ease, opacity 0.4s ease;
}
.hpfc-dots {
  stroke: #ffffff;
  stroke-opacity: 0.9;
  stroke-width: 3.6;
  stroke-linecap: round;
  stroke-dasharray: 0.1 17.9;
  animation: hpfc-dash var(--hpfc-dash, 4s) linear infinite;
}
.hpfc-dots-reverse { animation-direction: reverse; }
.hpfc-pipe-group.hpfc-idle .hpfc-pipe { opacity: 0.32; }
.hpfc-pipe-group.hpfc-stopped .hpfc-dots { display: none; }
.hpfc-energy .hpfc-pipe { stroke-width: 5; stroke-dasharray: 8 5; }
.hpfc-energy .hpfc-dots { stroke: #fff8dc; stroke-width: 3; }
@keyframes hpfc-dash { to { stroke-dashoffset: -180; } }

/* rotating parts -------------------------------------------------------- */
.hpfc-spin {
  transform-origin: center;
  transform-box: fill-box;
  animation: hpfc-spin 2s linear infinite;
  animation-play-state: paused;
}
.hpfc-running .hpfc-spin { animation-play-state: running; }
@keyframes hpfc-spin { to { transform: rotate(360deg); } }

/* heat pump ------------------------------------------------------------- */
.hpfc-hp-body { fill: rgba(127, 127, 127, 0.14); stroke: var(--hpfc-stroke); }
.hpfc-grille { stroke: var(--hpfc-stroke); stroke-width: 2; opacity: 0.7; stroke-linecap: round; }
.hpfc-fan-ring { fill: var(--hpfc-surface); stroke: var(--hpfc-stroke); }
.hpfc-blade { fill: var(--hpfc-muted); transition: fill 0.5s ease; }
.hpfc-running .hpfc-blade { fill: var(--info-color, #39b0e5); }
.hpfc-hub { fill: var(--hpfc-muted); }

/* defrost vapour */
.hpfc-steam path {
  stroke: #bae6fd;
  stroke-width: 3.4;
  stroke-linecap: round;
  opacity: 0;
}
.hpfc-defrost .hpfc-steam path { animation: hpfc-steam 2.6s ease-out infinite; }
.hpfc-defrost .hpfc-fan-ring { stroke: #7dd3fc; }
@keyframes hpfc-steam {
  0% { opacity: 0; transform: translateY(6px) scale(0.9); }
  25% { opacity: 0.85; }
  100% { opacity: 0; transform: translateY(-14px) scale(1.15); }
}

/* second heat generator */
.hpfc-aux-plate { fill: rgba(127, 127, 127, 0.14); stroke: none; transition: fill 0.5s ease; }
.hpfc-aux .hpfc-coil { stroke: var(--hpfc-muted); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.hpfc-aux .hpfc-value { font-size: 12px; }
.hpfc-aux.hpfc-on .hpfc-aux-plate { fill: rgba(249, 115, 22, 0.18); }
.hpfc-aux.hpfc-on .hpfc-coil { stroke: #f97316; animation: hpfc-glow 1.6s ease-in-out infinite; }
.hpfc-aux.hpfc-on .hpfc-value { fill: #f97316; }
@keyframes hpfc-glow { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }

/* electric element in a tank */
.hpfc-heater-rod {
  stroke: rgba(255, 255, 255, 0.55);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  transition: stroke 0.5s ease;
}
.hpfc-heater-name { font-size: 10px; font-weight: 600; fill: #ffffff; opacity: 0.8; }
.hpfc-heater-value { font-size: 11px; font-weight: 700; fill: #ffffff; opacity: 0.9; }
.hpfc-heater.hpfc-on .hpfc-heater-rod { stroke: #fff3c4; animation: hpfc-glow 1.4s ease-in-out infinite; }

.hpfc-status { fill: var(--hpfc-muted); opacity: 0.4; }
.hpfc-status-on { fill: var(--success-color, #43a047); opacity: 1; }
.hpfc-status-unknown { fill: var(--warning-color, #ffa726); opacity: 0.9; }

.hpfc-chip rect { fill: rgba(127, 127, 127, 0.18); }
.hpfc-chip text { font-size: 11px; font-weight: 600; fill: var(--hpfc-muted); }
.hpfc-chip-operable rect { stroke: var(--hpfc-stroke); stroke-width: 1; }
.hpfc-chip-active rect { fill: rgba(67, 160, 71, 0.22); }
.hpfc-chip-active text { fill: var(--success-color, #43a047); }
.hpfc-chevron { stroke: var(--hpfc-muted); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.hpfc-affordance { stroke: var(--hpfc-muted); stroke-width: 1.2; stroke-dasharray: 2 2; opacity: 0.55; }
.hpfc-mode-heat rect { fill: rgba(249, 115, 22, 0.2); } .hpfc-mode-heat text { fill: #f97316; }
.hpfc-mode-cool rect { fill: rgba(14, 165, 233, 0.2); } .hpfc-mode-cool text { fill: #0ea5e9; }
.hpfc-mode-water rect { fill: rgba(245, 158, 11, 0.2); } .hpfc-mode-water text { fill: #d97706; }
.hpfc-mode-defrost rect { fill: rgba(56, 189, 248, 0.2); } .hpfc-mode-defrost text { fill: #38bdf8; }

/* badges ---------------------------------------------------------------- */
.hpfc-badge rect {
  fill: var(--hpfc-muted);
  stroke: var(--hpfc-surface);
  stroke-width: 2;
  transition: fill 0.8s ease;
}
.hpfc-badge text { font-size: 11px; font-weight: 700; fill: #ffffff; }
.hpfc-badge-plain rect { fill: rgba(127, 127, 127, 0.22); }
.hpfc-badge-plain text { fill: var(--hpfc-text); }

/* tanks ----------------------------------------------------------------- */
.hpfc-tank-fill { transition: fill 1s ease; }
.hpfc-tank-outline { fill: none; stroke: var(--hpfc-stroke); stroke-width: 1.5; }
.hpfc-tank-pill rect { fill: rgba(0, 0, 0, 0.34); }
.hpfc-tank-pill text { font-size: 11px; font-weight: 700; fill: #ffffff; }
.hpfc-coil { fill: none; stroke: rgba(255, 255, 255, 0.7); stroke-width: 3; stroke-linecap: round; }

/* sources --------------------------------------------------------------- */
.hpfc-pv-panel { fill: #1e3a8a; stroke: var(--hpfc-stroke); }
.hpfc-battery-shell { fill: none; stroke: var(--hpfc-stroke); stroke-width: 1.5; }
.hpfc-battery-cap { fill: var(--hpfc-muted); }
.hpfc-battery-fill { fill: #22c55e; opacity: 0.85; transition: height 0.6s ease, y 0.6s ease; }
.hpfc-pylon { fill: none; stroke: var(--hpfc-muted); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.hpfc-wallbox-body { fill: var(--hpfc-surface); stroke: var(--hpfc-stroke); stroke-width: 1.5; }
.hpfc-wallbox-bolt { fill: none; stroke: #f59e0b; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.hpfc-wallbox-cable { fill: none; stroke: var(--hpfc-muted); stroke-width: 1.6; stroke-linecap: round; }
.hpfc-house { fill: rgba(127, 127, 127, 0.2); stroke: var(--hpfc-stroke); stroke-width: 1.4; stroke-linejoin: round; }
.hpfc-eheater { fill: none; stroke: #ef4444; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hpfc-enode .hpfc-panel { transition: stroke 0.5s ease; }
.hpfc-enode.hpfc-running .hpfc-panel { stroke: var(--hpfc-accent, #f59e0b); }
.hpfc-pv-cell { stroke: rgba(255, 255, 255, 0.35); stroke-width: 1; }
.hpfc-sun-core { fill: #fbbf24; }
.hpfc-rays line { stroke: #fbbf24; stroke-width: 2; stroke-linecap: round; }
.hpfc-sun { opacity: 0.35; transition: opacity 0.6s ease; transform-origin: center; transform-box: fill-box; }
.hpfc-running .hpfc-sun { opacity: 1; animation: hpfc-pulse 2.8s ease-in-out infinite; }
@keyframes hpfc-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
.hpfc-collector { fill: #334155; stroke: var(--hpfc-stroke); transition: fill 1s ease; }
.hpfc-absorber { stroke: rgba(255, 255, 255, 0.3); stroke-width: 1.5; }

/* emitters -------------------------------------------------------------- */
.hpfc-fin { fill: #94a3b8; transition: fill 1s ease, opacity 0.5s ease; }
.hpfc-emitter:not(.hpfc-running) .hpfc-fin { opacity: 0.45; }
.hpfc-rail { stroke: var(--hpfc-stroke); stroke-width: 3; stroke-linecap: round; }
.hpfc-heatwave { stroke: var(--hpfc-emitter-color, #ef4444); stroke-width: 2; opacity: 0; }
.hpfc-emitter.hpfc-running .hpfc-heatwave { animation: hpfc-rise 2.8s ease-out infinite; }
@keyframes hpfc-rise {
  0% { opacity: 0; transform: translateY(6px); }
  25% { opacity: 0.85; }
  100% { opacity: 0; transform: translateY(-12px); }
}
.hpfc-floor { fill: rgba(127, 127, 127, 0.35); }
.hpfc-emitter-line { stroke-width: 6; stroke-linecap: round; opacity: 0.9; }
.hpfc-emitter:not(.hpfc-running) .hpfc-emitter-line { opacity: 0.4; }
.hpfc-dots-slim { stroke-width: 2.8; stroke-dasharray: 0.1 13.9; }
.hpfc-emitter-box { fill: rgba(127, 127, 127, 0.16); stroke: var(--hpfc-stroke); }
.hpfc-wave { stroke: var(--hpfc-emitter-color, #38bdf8); stroke-width: 2.5; stroke-linecap: round; }

/* pump & valve ---------------------------------------------------------- */
.hpfc-pump-body { fill: var(--hpfc-surface); stroke: var(--hpfc-stroke); stroke-width: 1.5; transition: stroke 0.5s ease; }
.hpfc-vane { fill: var(--hpfc-muted); transition: fill 0.5s ease; }
.hpfc-pump.hpfc-running .hpfc-vane { fill: var(--info-color, #39b0e5); }
.hpfc-pump.hpfc-running .hpfc-pump-body { stroke: var(--info-color, #39b0e5); }
.hpfc-valve-body { fill: var(--hpfc-muted); transition: fill 0.5s ease; }
.hpfc-valve.hpfc-running .hpfc-valve-body { fill: var(--info-color, #39b0e5); }

@media (prefers-reduced-motion: reduce) {
  .hpfc-spin, .hpfc-dots, .hpfc-heatwave, .hpfc-sun { animation: none !important; }
}
`;

/* =========================================================================
 * The card
 * ========================================================================= */

class HeatpumpFlowCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("heatpump-flow-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:heatpump-flow-card",
      layout: "dual",
      heatpump: {},
      buffer: {},
      circuits: [{ type: "radiator" }, { type: "underfloor" }],
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._scene = null;
    this._hass = undefined;
    this._language = undefined;
    this._control = null;
    this._popover = null;
    this._backdrop = null;
    this._onKeyDown = (event) => {
      if (event.key === "Escape") this.closeControl();
    };
  }

  setConfig(config) {
    this._rawConfig = config;
    this._config = normalizeConfig(config);
    this._scene = null;
    if (this._hass) this._render();
  }

  set hass(hass) {
    const language = hass && hass.locale ? hass.locale.language : undefined;
    this._hass = hass;
    if (!this._config) return;
    if (!this._scene || language !== this._language) {
      this._language = language;
      this._render();
      return;
    }
    this._update();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    if (this._config && this._hass && !this._scene) {
      this._render();
      return;
    }
    // Re-measure text once the card is actually laid out.
    this._update();
  }

  _render() {
    this.closeZoom();
    const root = this.shadowRoot;
    this._control = null;
    this._popover = null;
    this._backdrop = null;
    root.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = CARD_STYLES;
    root.appendChild(style);

    const card = document.createElement("ha-card");
    root.appendChild(card);

    if (this._config.title) {
      card.classList.add("hpfc-has-title");
      const header = document.createElement("div");
      header.className = "hpfc-header";
      header.textContent = this._config.title;
      card.appendChild(header);
    }

    try {
      this._scene = buildScene(this);
    } catch (err) {
      this._scene = null;
      const error = document.createElement("div");
      error.className = "hpfc-error";
      error.textContent = `heatpump-flow-card: ${err && err.message ? err.message : err}`;
      card.appendChild(error);
      // eslint-disable-next-line no-console
      console.error("heatpump-flow-card", err);
      return;
    }

    this._scene.svg.style.setProperty("--hpfc-dash", `${(4 / this._config.flow_speed).toFixed(2)}s`);
    this._stage = document.createElement("div");
    this._stage.className = "hpfc-stage";
    this._stage.appendChild(this._scene.svg);
    if (this._config.zoom !== false) this._stage.appendChild(this._buildZoomButton());
    card.appendChild(this._stage);
    this._update();
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => this._update());
    }
  }

  _update() {
    if (!this._scene || !this._hass) return;
    for (const updater of this._scene.updaters) {
      try {
        updater();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("heatpump-flow-card update failed", err);
      }
    }
    this._refreshControl();
  }

  /* ---- inline controls ---- */

  /** Opens the small control panel for an entity, or closes it when it is open. */
  openControl(entityId, anchor) {
    if (this._control && this._control.entityId === entityId) {
      this.closeControl();
      return;
    }
    this._control = { entityId, anchor, signature: null };
    this._renderControl();
  }

  closeControl() {
    this._control = null;
    if (this._popover) {
      this._popover.remove();
      this._popover = null;
    }
    if (this._backdrop) {
      this._backdrop.remove();
      this._backdrop = null;
    }
    this.removeEventListener("keydown", this._onKeyDown);
  }

  _refreshControl() {
    if (!this._control) return;
    const st = this._hass.states[this._control.entityId];
    if (!st) {
      this.closeControl();
      return;
    }
    const signature = `${st.state}|${st.attributes ? st.attributes.temperature : ""}`;
    if (signature !== this._control.signature) this._renderControl();
  }

  _renderControl() {
    if (!this._control || !this._stage || !this._hass) return;
    const hass = this._hass;
    const model = controlModel(hass, this._control.entityId);
    if (!model || model.kind === "none") {
      this.closeControl();
      return;
    }
    const st = hass.states[this._control.entityId];
    this._control.signature = `${st.state}|${st.attributes ? st.attributes.temperature : ""}`;

    if (!this._backdrop) {
      this._backdrop = document.createElement("div");
      this._backdrop.className = "hpfc-backdrop";
      this._backdrop.addEventListener("click", () => this.closeControl());
      this._stage.appendChild(this._backdrop);
    }
    if (!this._popover) {
      this._popover = document.createElement("div");
      this._popover.className = "hpfc-pop";
      this._popover.addEventListener("click", (event) => event.stopPropagation());
      this._stage.appendChild(this._popover);
      this.addEventListener("keydown", this._onKeyDown);
    }

    const pop = this._popover;
    pop.innerHTML = "";
    const title = document.createElement("div");
    title.className = "hpfc-pop-title";
    title.textContent = model.title;
    pop.appendChild(title);

    if (model.stepper) {
      const stepper = model.stepper;
      const row = document.createElement("div");
      row.className = "hpfc-pop-step";
      const decimals = String(stepper.step).includes(".")
        ? String(stepper.step).split(".")[1].length
        : 0;
      const value = document.createElement("span");
      value.className = "hpfc-pop-value";
      let decrease;
      let increase;
      const refresh = () => {
        value.textContent =
          formatNumber(hass, stepper.value, { decimals }) + suffix(stepper.unit);
        decrease.disabled = stepper.value <= stepper.min;
        increase.disabled = stepper.value >= stepper.max;
      };
      const makeButton = (label, direction) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.setAttribute("aria-label", `${model.title} ${label}`);
        button.addEventListener("click", () => {
          applyStep(this._hass, model, direction);
          refresh();
        });
        return button;
      };
      decrease = makeButton("\u2212", -1);
      increase = makeButton("+", 1);
      refresh();
      row.appendChild(decrease);
      row.appendChild(value);
      row.appendChild(increase);
      pop.appendChild(row);
    }

    if (model.options && model.options.length) {
      const list = document.createElement("div");
      list.className = "hpfc-pop-options";
      for (const option of model.options) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = option.label;
        if (option.active) button.classList.add("hpfc-on");
        button.addEventListener("click", () => applyOption(this._hass, model, option.value));
        list.appendChild(button);
      }
      pop.appendChild(list);
    }

    const more = document.createElement("button");
    more.type = "button";
    more.className = "hpfc-pop-more";
    more.textContent = textsFor(hass).details;
    more.addEventListener("click", () => {
      const entityId = this._control.entityId;
      this.closeControl();
      fireEvent(this, "hass-more-info", { entityId });
    });
    pop.appendChild(more);

    this._positionControl();
  }

  _positionControl() {
    const pop = this._popover;
    const anchor = this._control ? this._control.anchor : null;
    if (!pop || !this._stage) return;
    const stageRect = this._stage.getBoundingClientRect();
    const anchorRect =
      anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : stageRect;
    const width = pop.offsetWidth;
    const height = pop.offsetHeight;
    let left = anchorRect.left - stageRect.left + anchorRect.width / 2 - width / 2;
    left = clamp(left, 8, Math.max(8, stageRect.width - width - 8));
    let top = anchorRect.bottom - stageRect.top + 8;
    if (top + height > stageRect.height - 4) {
      top = anchorRect.top - stageRect.top - height - 8;
    }
    top = clamp(top, 4, Math.max(4, stageRect.height - height - 4));
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  /* ---- enlarging the card ---- */

  /**
   * A dashboard column is often narrower than the scheme was drawn for - on a
   * phone in portrait the whole plant ends up thumbnail sized. The button in
   * the corner lifts the *live* scene out into a full screen layer, so it is
   * the same card with the same animations, only as large as the screen
   * allows.
   */
  _buildZoomButton() {
    const button = document.createElement("button");
    button.className = "hpfc-zoom";
    button.type = "button";
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="10.5" cy="10.5" r="6.2" /><line x1="15.2" y1="15.2" x2="20.5" y2="20.5" />' +
      '<line class="hpfc-zoom-plus" x1="10.5" y1="7.6" x2="10.5" y2="13.4" />' +
      '<line x1="7.6" y1="10.5" x2="13.4" y2="10.5" /></svg>';
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleZoom();
    });
    this._zoomButton = button;
    this._labelZoomButton();
    return button;
  }

  _labelZoomButton() {
    if (!this._zoomButton) return;
    const texts = textsFor(this._hass);
    const label = this._zoomHost ? texts.shrink : texts.enlarge;
    this._zoomButton.setAttribute("aria-label", label);
    this._zoomButton.setAttribute("title", label);
    this._zoomButton.classList.toggle("hpfc-zoom-open", Boolean(this._zoomHost));
  }

  toggleZoom() {
    if (this._zoomHost) this.closeZoom();
    else this.openZoom();
  }

  openZoom() {
    if (this._zoomHost || !this._stage) return;
    this.closeControl();

    const host = document.createElement("div");
    host.className = "heatpump-flow-card-zoom";
    host.style.cssText = "position:fixed;inset:0;z-index:9999";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CARD_STYLES;
    root.appendChild(style);

    const shell = document.createElement("div");
    shell.className = "hpfc-zoom-shell";
    shell.addEventListener("click", (event) => {
      if (event.target === shell) this.closeZoom();
    });
    shell.appendChild(this._stage);
    root.appendChild(shell);
    document.body.appendChild(host);

    this._zoomHost = host;
    this._zoomShell = shell;
    this._stage.classList.add("hpfc-stage-zoom");
    this._onZoomKey = (event) => {
      if (event.key === "Escape") this.closeZoom();
    };
    this._onZoomResize = () => this._fitZoom();
    document.addEventListener("keydown", this._onZoomKey);
    window.addEventListener("resize", this._onZoomResize);
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener("change", this._onZoomResize);
    }
    this._fitZoom();
    // A drawing wider than the screen opens in the middle rather than at one
    // edge; both sides stay reachable by scrolling. The scroll extent only
    // exists once the browser has laid the layer out.
    const centre = () => {
      shell.scrollLeft = Math.max(0, (shell.scrollWidth - shell.clientWidth) / 2);
      shell.scrollTop = Math.max(0, (shell.scrollHeight - shell.clientHeight) / 2);
    };
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(centre);
    else centre();
    this._labelZoomButton();
    if (this._zoomButton) this._zoomButton.focus();
  }

  closeZoom() {
    if (!this._zoomHost) return;
    document.removeEventListener("keydown", this._onZoomKey);
    window.removeEventListener("resize", this._onZoomResize);
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.removeEventListener("change", this._onZoomResize);
    }
    const card = this.shadowRoot ? this.shadowRoot.querySelector("ha-card") : null;
    this._stage.classList.remove("hpfc-stage-zoom");
    if (this._scene) {
      this._scene.svg.style.width = "";
      this._scene.svg.style.height = "";
    }
    if (card) card.appendChild(this._stage);
    this._zoomHost.remove();
    this._zoomHost = null;
    this._zoomShell = null;
    this._labelZoomButton();
  }

  /**
   * Fills the screen, but never shrinks the drawing below the size it was
   * designed at: on a narrow screen it stays readable and scrolls sideways
   * instead of becoming a thumbnail again.
   */
  _fitZoom() {
    if (!this._zoomHost || !this._scene) return;
    const box = this._scene.svg.viewBox.baseVal;
    if (!box || !box.width || !box.height) return;
    const available = { w: window.innerWidth - 32, h: window.innerHeight - 32 };
    const fit = Math.min(available.w / box.width, available.h / box.height);
    const scale = clamp(fit, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE);
    this._scene.svg.style.width = `${Math.round(box.width * scale)}px`;
    this._scene.svg.style.height = "auto";
  }

  disconnectedCallback() {
    this.closeZoom();
  }

  getCardSize() {
    if (!this._config) return 6;
    const consumers = this._config.circuits.length + (this._config.dhw ? 1 : 0);
    return Math.max(5, 3 + consumers * 2);
  }

  getGridOptions() {
    const consumers = this._config ? this._config.circuits.length + (this._config.dhw ? 1 : 0) : 2;
    return {
      columns: "full",
      min_columns: 6,
      rows: Math.max(5, 3 + consumers * 2),
    };
  }
}

if (!customElements.get("heatpump-flow-card")) {
  customElements.define("heatpump-flow-card", HeatpumpFlowCard);
}

/* =========================================================================
 * Visual editor
 * ========================================================================= */

const EDITOR_TEXTS = {
  en: {
    title: "Card title",
    layout: "Layout",
    animation: "Animate the flow",
    temperature_colors: "Colour pipes by temperature",
    controls: "Operate entities from the card",
    zoom: "Button to enlarge the card",
    flow_speed: "Flow speed",
    show_buffer: "Show buffer tank",
    show_dhw: "Show domestic hot water",
    show_pv: "Show photovoltaics",
    show_solar: "Show solar thermal",
    circuit_count: "Heating circuits",
    heatpump: "Heat pump",
    buffer: "Buffer tank",
    dhw: "Domestic hot water",
    pv: "Photovoltaics",
    solar: "Solar thermal",
    circuit: "Heating circuit",
    name: "Name",
    entity: "Entity (tap to switch)",
    state_entity: "Running (binary sensor)",
    mode: "Operating mode (select / climate)",
    status: "Reported state (defrost, hot water …)",
    boost: "Boost (button / switch)",
    aux_heat: "Second heat generator",
    aux_heat_power: "Second heat generator, power",
    defrost: "Defrosting (binary sensor)",
    heater: "Element in the tank",
    heater_power: "Element power",
    heater_temp: "Element temperature",
    heater_mode: "Element mode",
    power: "Power",
    cop: "COP / efficiency",
    flow_temp: "Flow temperature",
    return_temp: "Return temperature",
    outside_temp: "Outside temperature",
    compressor: "Compressor load",
    flow_rate: "Flow rate",
    top: "Top temperature",
    middle: "Middle temperature",
    bottom: "Bottom temperature",
    charge: "Charge level",
    temp: "Temperature",
    target_temp: "Target temperature",
    pump: "Circulation pump",
    valve: "Mixing valve",
    room_temp: "Room temperature",
    battery: "Battery",
    battery_power: "Battery power (+ charging)",
    grid: "Grid",
    grid_power: "Grid power (+ import)",
    wallbox: "Wallbox power",
    house: "House consumption",
    collector_temp: "Collector temperature",
    yield: "Yield",
    type: "Emitter type",
    humidity: "Humidity",
    yaml_only: "Configured in YAML",
    layouts: {
      compact: "Compact · tank · 1 circuit",
      "compact-dual": "Compact · tank · 2 circuits",
      single: "Tank · 1 circuit",
      dual: "Tank · 2 circuits",
      triple: "Tank · 3 circuits",
      quad: "Tank · 4 circuits",
      dhw: "Tank · hot water · 1 circuit",
      "dhw-dual": "Tank · hot water · 2 circuits",
      "dhw-quad": "Tank · hot water · 4 circuits",
      "pv-single": "PV · tank · 1 circuit",
      "pv-dual": "PV · tank · 2 circuits",
      "pv-dhw-dual": "PV · tank · hot water · 2 circuits",
      "solar-dual": "Solar thermal · tank · hot water · 2 circuits",
      full: "Everything · PV · solar thermal · hot water · 2 circuits",
      "full-quad": "Everything · 4 circuits",
      direct: "Without a tank · 1 circuit",
      "direct-dual": "Without a tank · 2 circuits",
      "direct-dhw": "Without a tank · hot water · 2 circuits",
    },
    types: {
      radiator: "Radiators",
      underfloor: "Underfloor heating",
      fancoil: "Fan coil",
      pool: "Pool / swimming pool",
      generic: "Generic",
    },
  },
  de: {
    title: "Kartentitel",
    layout: "Layout",
    animation: "Fluss animieren",
    temperature_colors: "Rohre nach Temperatur einfärben",
    controls: "Entitäten direkt in der Karte bedienen",
    zoom: "Schaltfläche zum Vergrößern",
    flow_speed: "Fließgeschwindigkeit",
    show_buffer: "Pufferspeicher anzeigen",
    show_dhw: "Warmwasser anzeigen",
    show_pv: "Photovoltaik anzeigen",
    show_solar: "Solarthermie anzeigen",
    circuit_count: "Heizkreise",
    heatpump: "Wärmepumpe",
    buffer: "Pufferspeicher",
    dhw: "Warmwasser",
    pv: "Photovoltaik",
    solar: "Solarthermie",
    circuit: "Heizkreis",
    name: "Name",
    entity: "Entität (Klick schaltet)",
    state_entity: "Läuft (Binärsensor)",
    mode: "Betriebsart (select / climate)",
    status: "Gemeldeter Zustand (Abtauen, Warmwasser …)",
    boost: "Boost (button / switch)",
    aux_heat: "Zweiter Wärmeerzeuger",
    aux_heat_power: "Zweiter Wärmeerzeuger, Leistung",
    defrost: "Abtauen (Binärsensor)",
    heater: "Heizstab im Speicher",
    heater_power: "Leistung des Heizstabs",
    heater_temp: "Temperatur des Heizstabs",
    heater_mode: "Betriebsart des Heizstabs",
    power: "Leistung",
    cop: "COP / Arbeitszahl",
    flow_temp: "Vorlauftemperatur",
    return_temp: "Rücklauftemperatur",
    outside_temp: "Außentemperatur",
    compressor: "Verdichterlast",
    flow_rate: "Volumenstrom",
    top: "Temperatur oben",
    middle: "Temperatur Mitte",
    bottom: "Temperatur unten",
    charge: "Ladezustand",
    temp: "Temperatur",
    target_temp: "Solltemperatur",
    pump: "Umwälzpumpe",
    valve: "Mischer",
    room_temp: "Raumtemperatur",
    battery: "Batterie",
    battery_power: "Batterieleistung (+ laden)",
    grid: "Netz",
    grid_power: "Netzleistung (+ Bezug)",
    wallbox: "Wallbox-Leistung",
    house: "Hausverbrauch",
    collector_temp: "Kollektortemperatur",
    yield: "Ertrag",
    type: "Heizflächen-Typ",
    humidity: "Luftfeuchte",
    yaml_only: "In YAML konfiguriert",
    layouts: {
      compact: "Kompakt · Speicher · 1 Heizkreis",
      "compact-dual": "Kompakt · Speicher · 2 Heizkreise",
      single: "Speicher · 1 Heizkreis",
      dual: "Speicher · 2 Heizkreise",
      triple: "Speicher · 3 Heizkreise",
      quad: "Speicher · 4 Heizkreise",
      dhw: "Speicher · Warmwasser · 1 Heizkreis",
      "dhw-dual": "Speicher · Warmwasser · 2 Heizkreise",
      "dhw-quad": "Speicher · Warmwasser · 4 Heizkreise",
      "pv-single": "PV · Speicher · 1 Heizkreis",
      "pv-dual": "PV · Speicher · 2 Heizkreise",
      "pv-dhw-dual": "PV · Speicher · Warmwasser · 2 Heizkreise",
      "solar-dual": "Solarthermie · Speicher · Warmwasser · 2 Heizkreise",
      full: "Alles · PV · Solarthermie · Warmwasser · 2 Heizkreise",
      "full-quad": "Alles · 4 Heizkreise",
      direct: "Ohne Speicher · 1 Heizkreis",
      "direct-dual": "Ohne Speicher · 2 Heizkreise",
      "direct-dhw": "Ohne Speicher · Warmwasser · 2 Heizkreise",
    },
    types: {
      radiator: "Heizkörper",
      underfloor: "Fußbodenheizung",
      fancoil: "Gebläsekonvektor",
      pool: "Pool / Schwimmbad",
      generic: "Allgemein",
    },
  },
};

const EDITOR_SECTIONS = {
  heatpump: [
    "state_entity",
    "mode",
    "status",
    "power",
    "cop",
    "flow_temp",
    "return_temp",
    "outside_temp",
    "compressor",
    "aux_heat",
    "aux_heat_power",
    "defrost",
    "flow_rate",
  ],
  buffer: ["top", "middle", "bottom", "charge", "heater", "heater_power", "heater_temp", "heater_mode"],
  dhw: [
    "temp",
    "target_temp",
    "mode",
    "boost",
    "pump",
    "charge",
    "heater",
    "heater_power",
    "heater_temp",
    "heater_mode",
  ],
  pv: ["power", "battery", "battery_power", "grid_power", "wallbox", "house", "grid"],
  solar: ["collector_temp", "pump", "yield", "return_temp", "flow_temp"],
};
const EDITOR_CIRCUIT_FIELDS = [
  "flow_temp",
  "return_temp",
  "room_temp",
  "target_temp",
  "mode",
  "pump",
  "valve",
  "humidity",
];
const SECTION_ICONS = {
  heatpump: "mdi:heat-pump",
  buffer: "mdi:storage-tank",
  dhw: "mdi:water-boiler",
  pv: "mdi:solar-power-variant",
  solar: "mdi:solar-panel",
  circuit: "mdi:radiator",
};

class HeatpumpFlowCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._preserved = {};
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    const language = hass && hass.locale ? hass.locale.language : undefined;
    const relabel = language !== this._editorLanguage;
    this._hass = hass;
    this._editorLanguage = language;
    if (this._form && !relabel) {
      this._form.hass = hass;
      return;
    }
    this._render();
  }

  get _texts() {
    const language = this._hass && this._hass.locale ? this._hass.locale.language : "en";
    return String(language).toLowerCase().startsWith("de") ? EDITOR_TEXTS.de : EDITOR_TEXTS.en;
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._form) {
      const style = document.createElement("style");
      style.textContent = ".hpfc-editor { display: block; }";
      this.shadowRoot.appendChild(style);
      this._form = document.createElement("ha-form");
      this._form.className = "hpfc-editor";
      this._form.addEventListener("value-changed", (event) => this._valueChanged(event));
      this.shadowRoot.appendChild(this._form);
    }
    const texts = this._texts;
    this._form.hass = this._hass;
    this._form.data = this._toData(this._config);
    this._form.schema = this._schema(this._form.data, texts);
    this._form.computeLabel = (schema) => texts[schema.name] || schema.label || schema.name;
  }

  _schema(data, texts) {
    const entitySelector = { entity: {} };
    const sectionSchema = (key, fields) => {
      const rows = [
        { name: "name", selector: { text: {} } },
        { name: "entity", selector: entitySelector },
        { name: "", type: "grid", schema: fields.map((field) => ({ name: field, selector: entitySelector })) },
      ];
      const preserved = Object.keys(this._preserved)
        .filter((path) => path.startsWith(`${key}.`))
        .map((path) => path.split(".")[1]);
      if (preserved.length) {
        rows.unshift({
          name: `${key}_yaml`,
          type: "constant",
          label: texts.yaml_only,
          value: preserved.join(", "),
        });
      }
      return rows;
    };

    const schema = [
      { name: "title", selector: { text: {} } },
      {
        name: "layout",
        selector: {
          select: {
            mode: "dropdown",
            options: Object.keys(LAYOUT_PRESETS).map((value) => ({
              value,
              label: texts.layouts[value] || value,
            })),
          },
        },
      },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "animation", selector: { boolean: {} } },
          { name: "temperature_colors", selector: { boolean: {} } },
          { name: "controls", selector: { boolean: {} } },
          { name: "zoom", selector: { boolean: {} } },
        ],
      },
      { name: "flow_speed", selector: { number: { min: 0.2, max: 3, step: 0.1, mode: "slider" } } },
      {
        name: "heatpump",
        type: "expandable",
        title: texts.heatpump,
        icon: SECTION_ICONS.heatpump,
        schema: sectionSchema("heatpump", EDITOR_SECTIONS.heatpump),
      },
    ];

    for (const key of ["buffer", "dhw", "pv", "solar"]) {
      schema.push({ name: `show_${key}`, selector: { boolean: {} } });
      if (data[`show_${key}`]) {
        schema.push({
          name: key,
          type: "expandable",
          title: texts[key],
          icon: SECTION_ICONS[key],
          schema: sectionSchema(key, EDITOR_SECTIONS[key]),
        });
      }
    }

    schema.push({
      name: "circuit_count",
      selector: { number: { min: 0, max: MAX_CIRCUITS, step: 1, mode: "box" } },
    });
    for (let index = 1; index <= (data.circuit_count || 0); index++) {
      schema.push({
        name: `circuit_${index}`,
        type: "expandable",
        title: `${texts.circuit} ${index}`,
        icon: SECTION_ICONS.circuit,
        schema: [
          { name: "name", selector: { text: {} } },
          {
            name: "type",
            selector: {
              select: {
                mode: "dropdown",
                options: Object.keys(texts.types).map((value) => ({ value, label: texts.types[value] })),
              },
            },
          },
          { name: "entity", selector: { entity: {} } },
          {
            name: "",
            type: "grid",
            schema: EDITOR_CIRCUIT_FIELDS.map((field) => ({ name: field, selector: { entity: {} } })),
          },
        ],
      });
    }
    return schema;
  }

  /** Config -> form data. Object style fields are parked in this._preserved. */
  _toData(config) {
    this._preserved = {};
    const layout = LAYOUT_PRESETS[config.layout] ? config.layout : "dual";
    const preset = LAYOUT_PRESETS[layout];
    const data = {
      title: config.title || "",
      layout,
      animation: config.animation !== false,
      temperature_colors: config.temperature_colors !== false,
      controls: config.controls !== false,
      zoom: config.zoom !== false,
      flow_speed: config.flow_speed === undefined ? 1 : config.flow_speed,
    };

    const simplify = (raw, path) => {
      const result = {};
      if (!raw || typeof raw !== "object") return result;
      for (const key of Object.keys(raw)) {
        const value = raw[key];
        if (typeof value === "string" || typeof value === "number") {
          result[key] = value;
        } else if (value && typeof value === "object") {
          this._preserved[`${path}.${key}`] = value;
        }
      }
      return result;
    };

    data.heatpump = simplify(config.heatpump, "heatpump");
    for (const key of ["buffer", "dhw", "pv", "solar"]) {
      const raw = config[key];
      data[`show_${key}`] =
        raw === false || raw === null ? false : raw !== undefined ? true : preset.sections.includes(key);
      data[key] = simplify(typeof raw === "object" ? raw : {}, key);
    }

    let circuits = config.circuits;
    if (circuits && !Array.isArray(circuits)) circuits = [circuits];
    if (!circuits) {
      circuits = [];
      for (let i = 0; i < preset.circuits; i++) {
        circuits.push({ type: i % 2 === 0 ? "radiator" : "underfloor" });
      }
    }
    data.circuit_count = Math.min(circuits.length, MAX_CIRCUITS);
    circuits.slice(0, MAX_CIRCUITS).forEach((circuit, index) => {
      data[`circuit_${index + 1}`] = simplify(circuit, `circuit_${index + 1}`);
      if (!data[`circuit_${index + 1}`].type) data[`circuit_${index + 1}`].type = "radiator";
    });
    return data;
  }

  /** Form data -> config. */
  _toConfig(data) {
    const config = { type: this._config.type || "custom:heatpump-flow-card" };
    if (data.title) config.title = data.title;
    config.layout = data.layout || "dual";
    if (data.animation === false) config.animation = false;
    if (data.temperature_colors === false) config.temperature_colors = false;
    if (data.controls === false) config.controls = false;
    if (data.zoom === false) config.zoom = false;
    if (data.flow_speed !== undefined && Number(data.flow_speed) !== 1) {
      config.flow_speed = Number(data.flow_speed);
    }

    const preset = LAYOUT_PRESETS[config.layout];
    const clean = (raw, path) => {
      const result = {};
      for (const key of Object.keys(raw || {})) {
        const value = raw[key];
        if (value === "" || value === undefined || value === null) continue;
        result[key] = value;
      }
      for (const preservedPath of Object.keys(this._preserved)) {
        if (!preservedPath.startsWith(`${path}.`)) continue;
        const key = preservedPath.slice(path.length + 1);
        if (result[key] === undefined) result[key] = this._preserved[preservedPath];
      }
      return result;
    };

    config.heatpump = clean(data.heatpump, "heatpump");
    for (const key of ["buffer", "dhw", "pv", "solar"]) {
      if (!data[`show_${key}`]) {
        if (preset.sections.includes(key)) config[key] = false;
        continue;
      }
      config[key] = clean(data[key], key);
    }

    const circuits = [];
    for (let index = 1; index <= (data.circuit_count || 0); index++) {
      const circuit = clean(data[`circuit_${index}`], `circuit_${index}`);
      if (!circuit.type) circuit.type = "radiator";
      circuits.push(circuit);
    }
    config.circuits = circuits;
    return config;
  }

  _valueChanged(event) {
    event.stopPropagation();
    const data = event.detail.value;
    if (!data) return;
    const config = this._toConfig(data);
    this._config = config;
    fireEvent(this, "config-changed", { config });
    this._render();
  }
}

if (!customElements.get("heatpump-flow-card-editor")) {
  customElements.define("heatpump-flow-card-editor", HeatpumpFlowCardEditor);
}

/* =========================================================================
 * Card picker registration
 * ========================================================================= */

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "heatpump-flow-card")) {
  window.customCards.push({
    type: "heatpump-flow-card",
    name: "Heat Pump Flow Card",
    description:
      "Animated hydraulic scheme for a heat pump with buffer tank, hot water, PV, solar thermal and up to seven heating circuits.",
    preview: true,
    documentationURL: "https://github.com/Xerolux/heatpump-flow-card",
  });
}

})();
