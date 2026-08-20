/* A minimal Home Assistant stand-in used for previews, screenshots and tests. */
window.demoStates = {
  "switch.heat_pump": { entity_id: "switch.heat_pump", state: "on", attributes: { friendly_name: "Heat pump" } },
  "binary_sensor.compressor": { entity_id: "binary_sensor.compressor", state: "on", attributes: {} },
  "sensor.hp_operating_mode": { entity_id: "sensor.hp_operating_mode", state: "heating", attributes: {} },
  "select.system_mode": {
    entity_id: "select.system_mode",
    state: "Automatic",
    attributes: {
      friendly_name: "System mode",
      options: ["Standby", "Automatic", "Away", "Hot water only", "Heating/cooling only"],
    },
  },
  "sensor.hp_power": { entity_id: "sensor.hp_power", state: "2140", attributes: { unit_of_measurement: "W", device_class: "power" } },
  "sensor.hp_cop": { entity_id: "sensor.hp_cop", state: "4.3", attributes: {} },
  "sensor.hp_flow_temperature": { entity_id: "sensor.hp_flow_temperature", state: "38.4", attributes: { unit_of_measurement: "°C", device_class: "temperature" } },
  "sensor.hp_return_temperature": { entity_id: "sensor.hp_return_temperature", state: "32.1", attributes: { unit_of_measurement: "°C", device_class: "temperature" } },
  "sensor.outside_temperature": { entity_id: "sensor.outside_temperature", state: "-2.5", attributes: { unit_of_measurement: "°C", device_class: "temperature" } },
  "sensor.compressor_load": { entity_id: "sensor.compressor_load", state: "72", attributes: { unit_of_measurement: "%" } },

  "sensor.buffer_top": { entity_id: "sensor.buffer_top", state: "46.8", attributes: { unit_of_measurement: "°C" } },
  "sensor.buffer_middle": { entity_id: "sensor.buffer_middle", state: "39.2", attributes: { unit_of_measurement: "°C" } },
  "sensor.buffer_bottom": { entity_id: "sensor.buffer_bottom", state: "28.6", attributes: { unit_of_measurement: "°C" } },
  "sensor.buffer_charge": { entity_id: "sensor.buffer_charge", state: "68", attributes: { unit_of_measurement: "%" } },

  "switch.hot_water": { entity_id: "switch.hot_water", state: "on", attributes: { friendly_name: "Hot water" } },
  "sensor.dhw_temperature": { entity_id: "sensor.dhw_temperature", state: "52.4", attributes: { unit_of_measurement: "°C" } },
  "number.dhw_setpoint": {
    entity_id: "number.dhw_setpoint",
    state: "55",
    attributes: { friendly_name: "Hot water setpoint", unit_of_measurement: "°C", min: 35, max: 65, step: 0.5 },
  },
  "button.dhw_boost": { entity_id: "button.dhw_boost", state: "unknown", attributes: { friendly_name: "One-time charge" } },
  "climate.circuit_a": {
    entity_id: "climate.circuit_a",
    state: "heat",
    attributes: {
      friendly_name: "Heating circuit A",
      hvac_modes: ["off", "auto", "heat", "cool"],
      hvac_action: "heating",
      current_temperature: 21.6,
      temperature: 21.5,
      min_temp: 15,
      max_temp: 30,
      target_temp_step: 0.5,
    },
  },
  "binary_sensor.dhw_pump": { entity_id: "binary_sensor.dhw_pump", state: "on", attributes: {} },

  "sensor.pv_power": { entity_id: "sensor.pv_power", state: "3480", attributes: { unit_of_measurement: "W", device_class: "power" } },
  "sensor.battery_soc": { entity_id: "sensor.battery_soc", state: "84", attributes: { unit_of_measurement: "%" } },

  "sensor.collector_temperature": { entity_id: "sensor.collector_temperature", state: "61.5", attributes: { unit_of_measurement: "°C" } },
  "binary_sensor.solar_pump": { entity_id: "binary_sensor.solar_pump", state: "on", attributes: {} },
  "sensor.solar_yield": { entity_id: "sensor.solar_yield", state: "12.4", attributes: { unit_of_measurement: "kWh" } },
  "sensor.solar_return_temperature": { entity_id: "sensor.solar_return_temperature", state: "31.0", attributes: { unit_of_measurement: "°C" } },

  "switch.circuit_a": { entity_id: "switch.circuit_a", state: "on", attributes: { friendly_name: "Radiators" } },
  "sensor.circuit_a_flow": { entity_id: "sensor.circuit_a_flow", state: "42.0", attributes: { unit_of_measurement: "°C" } },
  "sensor.circuit_a_return": { entity_id: "sensor.circuit_a_return", state: "34.5", attributes: { unit_of_measurement: "°C" } },
  "binary_sensor.circuit_a_pump": { entity_id: "binary_sensor.circuit_a_pump", state: "on", attributes: {} },
  "sensor.circuit_a_mixer": { entity_id: "sensor.circuit_a_mixer", state: "64", attributes: { unit_of_measurement: "%" } },
  "sensor.living_room_temperature": { entity_id: "sensor.living_room_temperature", state: "21.6", attributes: { unit_of_measurement: "°C" } },

  "switch.circuit_b": { entity_id: "switch.circuit_b", state: "on", attributes: { friendly_name: "Underfloor heating" } },
  "sensor.circuit_b_flow": { entity_id: "sensor.circuit_b_flow", state: "29.8", attributes: { unit_of_measurement: "°C" } },
  "sensor.circuit_b_return": { entity_id: "sensor.circuit_b_return", state: "25.2", attributes: { unit_of_measurement: "°C" } },
  "binary_sensor.circuit_b_pump": { entity_id: "binary_sensor.circuit_b_pump", state: "off", attributes: {} },
  "sensor.circuit_b_mixer": { entity_id: "sensor.circuit_b_mixer", state: "30", attributes: { unit_of_measurement: "%" } },
  "sensor.bathroom_temperature": { entity_id: "sensor.bathroom_temperature", state: "23.4", attributes: { unit_of_measurement: "°C" } },
};

// Four circuits in different states: A and C are being served, B and D are not.
const circuitModes = {
  "select.circuit_a_mode": "Normal",
  "select.circuit_b_mode": "Time program",
  "select.circuit_c_mode": "Normal",
  "select.circuit_d_mode": "Off",
};
for (const [entity, state] of Object.entries(circuitModes)) {
  window.demoStates[entity] = {
    entity_id: entity,
    state,
    attributes: {
      friendly_name: `Mode circuit ${entity.slice(-6, -5).toUpperCase()}`,
      options: ["Off", "Time program", "Normal", "Eco", "Manual heating", "Manual cooling"],
    },
  };
}
window.demoStates["binary_sensor.circuit_c_pump"] = {
  entity_id: "binary_sensor.circuit_c_pump",
  state: "on",
  attributes: {},
};
window.demoStates["binary_sensor.circuit_d_pump"] = {
  entity_id: "binary_sensor.circuit_d_pump",
  state: "off",
  attributes: {},
};
window.demoStates["sensor.circuit_c_flow"] = {
  entity_id: "sensor.circuit_c_flow",
  state: "35.2",
  attributes: { unit_of_measurement: "°C" },
};
window.demoStates["sensor.circuit_d_flow"] = {
  entity_id: "sensor.circuit_d_flow",
  state: "24.1",
  attributes: { unit_of_measurement: "°C" },
};

window.serviceCalls = [];

window.makeHass = (language) => ({
  locale: { language: language || "en" },
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
    const text = value.toLocaleString(language || "en", { maximumFractionDigits: 1 });
    return unit ? `${text} ${unit}` : text;
  },
});
