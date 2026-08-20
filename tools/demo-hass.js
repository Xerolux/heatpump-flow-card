/* A minimal Home Assistant stand-in used for previews, screenshots and tests. */
window.demoStates = {
  "switch.waermepumpe": { entity_id: "switch.waermepumpe", state: "on", attributes: { friendly_name: "Wärmepumpe" } },
  "binary_sensor.wp_verdichter": { entity_id: "binary_sensor.wp_verdichter", state: "on", attributes: {} },
  "sensor.wp_betriebsart": { entity_id: "sensor.wp_betriebsart", state: "heating", attributes: {} },
  "select.wp_systemmodus": {
    entity_id: "select.wp_systemmodus",
    state: "Automatik",
    attributes: {
      friendly_name: "Systemmodus",
      options: ["Standby", "Automatik", "Abwesend", "Nur Warmwasser", "Nur Heizen/Kühlen"],
    },
  },
  "sensor.wp_leistung": { entity_id: "sensor.wp_leistung", state: "2140", attributes: { unit_of_measurement: "W", device_class: "power" } },
  "sensor.wp_cop": { entity_id: "sensor.wp_cop", state: "4.3", attributes: {} },
  "sensor.wp_vorlauf": { entity_id: "sensor.wp_vorlauf", state: "38.4", attributes: { unit_of_measurement: "°C", device_class: "temperature" } },
  "sensor.wp_ruecklauf": { entity_id: "sensor.wp_ruecklauf", state: "32.1", attributes: { unit_of_measurement: "°C", device_class: "temperature" } },
  "sensor.aussentemperatur": { entity_id: "sensor.aussentemperatur", state: "-2.5", attributes: { unit_of_measurement: "°C", device_class: "temperature" } },
  "sensor.wp_verdichterlast": { entity_id: "sensor.wp_verdichterlast", state: "72", attributes: { unit_of_measurement: "%" } },

  "sensor.puffer_oben": { entity_id: "sensor.puffer_oben", state: "46.8", attributes: { unit_of_measurement: "°C" } },
  "sensor.puffer_mitte": { entity_id: "sensor.puffer_mitte", state: "39.2", attributes: { unit_of_measurement: "°C" } },
  "sensor.puffer_unten": { entity_id: "sensor.puffer_unten", state: "28.6", attributes: { unit_of_measurement: "°C" } },
  "sensor.puffer_ladung": { entity_id: "sensor.puffer_ladung", state: "68", attributes: { unit_of_measurement: "%" } },

  "switch.warmwasser": { entity_id: "switch.warmwasser", state: "on", attributes: { friendly_name: "Warmwasser" } },
  "sensor.ww_temperatur": { entity_id: "sensor.ww_temperatur", state: "52.4", attributes: { unit_of_measurement: "°C" } },
  "number.ww_soll": {
    entity_id: "number.ww_soll",
    state: "55",
    attributes: { friendly_name: "Warmwasser Soll", unit_of_measurement: "°C", min: 35, max: 65, step: 0.5 },
  },
  "button.ww_boost": { entity_id: "button.ww_boost", state: "unknown", attributes: { friendly_name: "Einmalladung" } },
  "climate.hk1": {
    entity_id: "climate.hk1",
    state: "heat",
    attributes: {
      friendly_name: "Heizkreis EG",
      hvac_modes: ["off", "auto", "heat", "cool"],
      hvac_action: "heating",
      current_temperature: 21.6,
      temperature: 21.5,
      min_temp: 15,
      max_temp: 30,
      target_temp_step: 0.5,
    },
  },
  "binary_sensor.ww_ladepumpe": { entity_id: "binary_sensor.ww_ladepumpe", state: "on", attributes: {} },

  "sensor.pv_leistung": { entity_id: "sensor.pv_leistung", state: "3480", attributes: { unit_of_measurement: "W", device_class: "power" } },
  "sensor.batterie_soc": { entity_id: "sensor.batterie_soc", state: "84", attributes: { unit_of_measurement: "%" } },

  "sensor.kollektor_temperatur": { entity_id: "sensor.kollektor_temperatur", state: "61.5", attributes: { unit_of_measurement: "°C" } },
  "binary_sensor.solarpumpe": { entity_id: "binary_sensor.solarpumpe", state: "on", attributes: {} },
  "sensor.solar_ertrag": { entity_id: "sensor.solar_ertrag", state: "12.4", attributes: { unit_of_measurement: "kWh" } },
  "sensor.solar_ruecklauf": { entity_id: "sensor.solar_ruecklauf", state: "31.0", attributes: { unit_of_measurement: "°C" } },

  "switch.hk1": { entity_id: "switch.hk1", state: "on", attributes: { friendly_name: "Heizkörper" } },
  "sensor.hk1_vorlauf": { entity_id: "sensor.hk1_vorlauf", state: "42.0", attributes: { unit_of_measurement: "°C" } },
  "sensor.hk1_ruecklauf": { entity_id: "sensor.hk1_ruecklauf", state: "34.5", attributes: { unit_of_measurement: "°C" } },
  "binary_sensor.hk1_pumpe": { entity_id: "binary_sensor.hk1_pumpe", state: "on", attributes: {} },
  "sensor.hk1_mischer": { entity_id: "sensor.hk1_mischer", state: "64", attributes: { unit_of_measurement: "%" } },
  "sensor.wohnzimmer_temperatur": { entity_id: "sensor.wohnzimmer_temperatur", state: "21.6", attributes: { unit_of_measurement: "°C" } },

  "switch.hk2": { entity_id: "switch.hk2", state: "on", attributes: { friendly_name: "Fußbodenheizung" } },
  "sensor.hk2_vorlauf": { entity_id: "sensor.hk2_vorlauf", state: "29.8", attributes: { unit_of_measurement: "°C" } },
  "sensor.hk2_ruecklauf": { entity_id: "sensor.hk2_ruecklauf", state: "25.2", attributes: { unit_of_measurement: "°C" } },
  "binary_sensor.hk2_pumpe": { entity_id: "binary_sensor.hk2_pumpe", state: "off", attributes: {} },
  "sensor.hk2_mischer": { entity_id: "sensor.hk2_mischer", state: "30", attributes: { unit_of_measurement: "%" } },
  "sensor.bad_temperatur": { entity_id: "sensor.bad_temperatur", state: "23.4", attributes: { unit_of_measurement: "°C" } },
};

// Four circuits in different states: A and C are being served, B and D are not.
const circuitModes = {
  "select.hk_a_mode": "Normal",
  "select.hk_b_mode": "Zeitprogramm",
  "select.hk_c_mode": "Normal",
  "select.hk_d_mode": "Aus",
};
for (const [entity, state] of Object.entries(circuitModes)) {
  window.demoStates[entity] = {
    entity_id: entity,
    state,
    attributes: {
      friendly_name: `Betriebsart ${entity.slice(-6, -5).toUpperCase()}`,
      options: ["Aus", "Zeitprogramm", "Normal", "Eco", "Manuell Heizen", "Manuell Kühlen"],
    },
  };
}
window.demoStates["binary_sensor.hk_c_pumpe"] = {
  entity_id: "binary_sensor.hk_c_pumpe",
  state: "on",
  attributes: {},
};
window.demoStates["binary_sensor.hk_d_pumpe"] = {
  entity_id: "binary_sensor.hk_d_pumpe",
  state: "off",
  attributes: {},
};
window.demoStates["sensor.hk_c_vorlauf"] = {
  entity_id: "sensor.hk_c_vorlauf",
  state: "35.2",
  attributes: { unit_of_measurement: "°C" },
};
window.demoStates["sensor.hk_d_vorlauf"] = {
  entity_id: "sensor.hk_d_vorlauf",
  state: "24.1",
  attributes: { unit_of_measurement: "°C" },
};

window.serviceCalls = [];

window.makeHass = (language) => ({
  locale: { language: language || "de" },
  themes: {},
  config: { unit_system: { temperature: "°C" } },
  states: window.demoStates,
  callService: (domain, service, data) => {
    window.serviceCalls.push({ domain, service, data });
    return Promise.resolve();
  },
  formatEntityState: (stateObj) => {
    const unit = stateObj.attributes && stateObj.attributes.unit_of_measurement;
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) return stateObj.state;
    const text = value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
    return unit ? `${text} ${unit}` : text;
  },
});
