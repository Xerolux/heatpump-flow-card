/* A minimal Home Assistant stand-in used for previews, screenshots and tests. */
window.demoStates = {
  "switch.waermepumpe": { entity_id: "switch.waermepumpe", state: "on", attributes: { friendly_name: "Wärmepumpe" } },
  "binary_sensor.wp_verdichter": { entity_id: "binary_sensor.wp_verdichter", state: "on", attributes: {} },
  "sensor.wp_betriebsart": { entity_id: "sensor.wp_betriebsart", state: "heating", attributes: {} },
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
  "number.ww_soll": { entity_id: "number.ww_soll", state: "55", attributes: { unit_of_measurement: "°C" } },
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

window.serviceCalls = [];

window.makeHass = (language) => ({
  locale: { language: language || "de" },
  themes: {},
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
