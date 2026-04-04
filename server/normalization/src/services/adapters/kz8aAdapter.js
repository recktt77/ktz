const { smooth } = require('../smoothing');

/**
 * KZ8A adapter: normalize raw telemetry into a uniform metrics object.
 */
function normalizeKZ8A(raw) {
  const id = raw.locomotive_id;

  return {
    locomotive_id: raw.locomotive_id,
    locomotive_model: 'KZ8A',
    timestamp_utc: raw.timestamp_utc,

    // Common
    speed_kmh:                    smooth(id, 'speed_kmh', raw.speed_kmh),
    brake_system_status:          raw.brake_system_status,
    brake_system_pressure_bar:    smooth(id, 'brake_system_pressure_bar', raw.brake_system_pressure_bar),
    fault_code:                   raw.fault_code || null,
    communication_status:         raw.communication_status,
    control_system_status:        raw.control_system_status,

    // KZ8A-specific
    pantograph_status:            raw.pantograph_status,
    catenary_voltage_kv:          smooth(id, 'catenary_voltage_kv', raw.catenary_voltage_kv),
    catenary_current_a:           smooth(id, 'catenary_current_a', raw.catenary_current_a),
    main_transformer_status:      raw.main_transformer_status,
    main_transformer_temp_c:      smooth(id, 'main_transformer_temp_c', raw.main_transformer_temp_c),
    main_transformer_load_pct:    smooth(id, 'main_transformer_load_pct', raw.main_transformer_load_pct),
    tractive_effort_kn:           smooth(id, 'tractive_effort_kn', raw.tractive_effort_kn),
    traction_drive_status:        raw.traction_drive_status,
    traction_converter_status:    raw.traction_converter_status,
    traction_converter_temp_c:    smooth(id, 'traction_converter_temp_c', raw.traction_converter_temp_c),
    traction_converter_load_pct:  smooth(id, 'traction_converter_load_pct', raw.traction_converter_load_pct),
    regenerative_braking_status:  raw.regenerative_braking_status,
    regenerative_braking_power_kw: smooth(id, 'regenerative_braking_power_kw', raw.regenerative_braking_power_kw),
    electrical_brake_status:      raw.electrical_brake_status,
    automatic_pilot_status:       raw.automatic_pilot_status,
    energy_meter_kwh:             raw.energy_meter_kwh,
    energy_consumption_kw:        smooth(id, 'energy_consumption_kw', raw.energy_consumption_kw),

    // Position
    track_segment_id:             raw.track_segment_id || null,
    position_km:                  raw.position_km ?? null,
  };
}

module.exports = { normalizeKZ8A };
