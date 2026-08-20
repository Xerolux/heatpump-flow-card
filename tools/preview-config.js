/* The four layouts, wired to the demo entities from demo-hass.js. */
const heatpump = {
  name: "Wärmepumpe",
  entity: "switch.waermepumpe",
  state_entity: "binary_sensor.wp_verdichter",
  mode: "sensor.wp_betriebsart",
  power: "sensor.wp_leistung",
  cop: "sensor.wp_cop",
  flow_temp: "sensor.wp_vorlauf",
  return_temp: "sensor.wp_ruecklauf",
  outside_temp: "sensor.aussentemperatur",
  compressor: "sensor.wp_verdichterlast",
  mode: "select.wp_systemmodus",
};

const buffer = {
  name: "Pufferspeicher",
  top: "sensor.puffer_oben",
  middle: "sensor.puffer_mitte",
  bottom: "sensor.puffer_unten",
  charge: "sensor.puffer_ladung",
};

const radiators = {
  name: "Heizkörper EG",
  type: "radiator",
  entity: "switch.hk1",
  flow_temp: "sensor.hk1_vorlauf",
  return_temp: "sensor.hk1_ruecklauf",
  room_temp: "sensor.wohnzimmer_temperatur",
  pump: "binary_sensor.hk1_pumpe",
  valve: "sensor.hk1_mischer",
  mode: "climate.hk1",
  target_temp: "climate.hk1",
};

const underfloor = {
  name: "Fußbodenheizung OG",
  type: "underfloor",
  entity: "switch.hk2",
  flow_temp: "sensor.hk2_vorlauf",
  return_temp: "sensor.hk2_ruecklauf",
  room_temp: "sensor.bad_temperatur",
  pump: "binary_sensor.hk2_pumpe",
  valve: "sensor.hk2_mischer",
};

window.previewConfigs = {
  advanced: {
    type: "custom:heatpump-flow-card",
    layout: "dual",
    title: "Ohne Puffer, vier Kreise",
    buffer: false,
    flow_speed: 1.4,
    heatpump,
    dhw: {
      name: "Warmwasser",
      entity: "switch.warmwasser",
      temp: "sensor.ww_temperatur",
      target_temp: "number.ww_soll",
      pump: "binary_sensor.ww_ladepumpe",
      boost: "button.ww_boost",
    },
    circuits: [
      radiators,
      underfloor,
      { name: "Konvektor Büro", type: "fancoil", flow_temp: "sensor.hk1_vorlauf", pump: "binary_sensor.hk1_pumpe" },
      { name: "Poolheizung", type: "pool", flow_temp: "sensor.hk2_vorlauf", return_temp: "sensor.hk2_ruecklauf", pump: "binary_sensor.solarpumpe" },
    ],
  },
  compact: {
    type: "custom:heatpump-flow-card",
    layout: "compact",
    title: "Heizung kompakt",
    heatpump,
    buffer,
    circuits: [radiators],
  },
  single: {
    type: "custom:heatpump-flow-card",
    layout: "single",
    heatpump,
    buffer,
    circuits: [underfloor],
  },
  dual: {
    type: "custom:heatpump-flow-card",
    layout: "dual",
    title: "Wärmepumpe & Heizkreise",
    heatpump,
    buffer,
    circuits: [radiators, underfloor],
  },
  full: {
    type: "custom:heatpump-flow-card",
    layout: "full",
    title: "Heizungsanlage",
    heatpump,
    buffer,
    dhw: {
      name: "Warmwasser",
      entity: "switch.warmwasser",
      temp: "sensor.ww_temperatur",
      target_temp: "number.ww_soll",
      pump: "binary_sensor.ww_ladepumpe",
      boost: "button.ww_boost",
    },
    pv: { name: "Photovoltaik", power: "sensor.pv_leistung", battery: "sensor.batterie_soc" },
    solar: {
      name: "Solarthermie",
      collector_temp: "sensor.kollektor_temperatur",
      pump: "binary_sensor.solarpumpe",
      yield: "sensor.solar_ertrag",
      return_temp: "sensor.solar_ruecklauf",
    },
    circuits: [radiators, underfloor],
  },
};
