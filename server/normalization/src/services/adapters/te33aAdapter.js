const { smooth } = require('../smoothing');

/**
 * TE33A adapter: normalize raw telemetry into a uniform metrics object.
 */
function normalizeTE33A(raw) {
  const id = raw.locomotive_id;

  return {
    locomotive_id: raw.locomotive_id,
    locomotive_model: 'TE33A',
    timestamp_utc: raw.timestamp_utc,

    // Common
    speed_kmh:                    smooth(id, 'speed_kmh', raw.speed_kmh),
    brake_system_status:          raw.brake_system_status,
    brake_system_pressure_bar:    smooth(id, 'brake_system_pressure_bar', raw.brake_system_pressure_bar),
    fault_code:                   raw.fault_code || null,
    communication_status:         raw.communication_status,
    control_system_status:        raw.control_system_status,

    // TE33A-specific
    engine_status:                raw.engine_status,
    engine_rpm:                   smooth(id, 'engine_rpm', raw.engine_rpm),
    engine_load_pct:              smooth(id, 'engine_load_pct', raw.engine_load_pct),
    fuel_level_pct:               smooth(id, 'fuel_level_pct', raw.fuel_level_pct),
    fuel_consumption_lph:         smooth(id, 'fuel_consumption_lph', raw.fuel_consumption_lph),
    propulsion_system_status:     raw.propulsion_system_status,
    dynamic_brake_status:         raw.dynamic_brake_status,
    compressor_status:            raw.compressor_status,
    auxiliaries_status:           raw.auxiliaries_status,
    onboard_diagnostic_status:    raw.onboard_diagnostic_status,
    remote_diagnostic_alert:      raw.remote_diagnostic_alert || null,
    crew_interface_status:        raw.crew_interface_status,
    computer_system_status:       raw.computer_system_status,
    communications_status:        raw.communications_status,

    // Position
    track_segment_id:             raw.track_segment_id || null,
    position_km:                  raw.position_km ?? null,
  };
}

module.exports = { normalizeTE33A };
