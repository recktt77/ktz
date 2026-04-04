const Joi = require('joi');

const COMPONENT_STATUSES = ['ok', 'degraded', 'fault', 'offline'];
const COMM_STATUSES = ['online', 'degraded', 'offline'];

// ===== Locomotive CRUD =====
const createLocomotiveSchema = Joi.object({
  id: Joi.string().max(50).required(),
  model_code: Joi.string().valid('KZ8A', 'TE33A').required(),
  name: Joi.string().max(100).allow(null, ''),
  status: Joi.string().valid('active', 'maintenance', 'decommissioned').default('active'),
  track_segment_id: Joi.string().max(50).allow(null, ''),
  position_km: Joi.number().min(0).allow(null),
});

const updateLocomotiveSchema = Joi.object({
  name: Joi.string().max(100).allow(null, ''),
  status: Joi.string().valid('active', 'maintenance', 'decommissioned'),
  track_segment_id: Joi.string().max(50).allow(null, ''),
  position_km: Joi.number().min(0).allow(null),
}).min(1);

// ===== Base telemetry fields (common to both models) =====
const baseTelemetryFields = {
  locomotive_id: Joi.string().max(50).required(),
  locomotive_model: Joi.string().valid('KZ8A', 'TE33A').required(),
  timestamp_utc: Joi.string().isoDate().required(),
  speed_kmh: Joi.number().min(0).required(),
  brake_system_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  brake_system_pressure_bar: Joi.number().min(0).required(),
  fault_code: Joi.string().allow(null, ''),
  communication_status: Joi.string().valid(...COMM_STATUSES).required(),
  control_system_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  // Position fields (optional per telemetry packet)
  track_segment_id: Joi.string().max(50).allow(null, ''),
  position_km: Joi.number().min(0).allow(null),
};

// ===== KZ8A raw telemetry =====
const kz8aRawSchema = Joi.object({
  ...baseTelemetryFields,
  locomotive_model: Joi.string().valid('KZ8A').required(),
  pantograph_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  catenary_voltage_kv: Joi.number().min(0).required(),
  catenary_current_a: Joi.number().min(0).required(),
  main_transformer_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  main_transformer_temp_c: Joi.number().required(),
  main_transformer_load_pct: Joi.number().min(0).max(100).required(),
  tractive_effort_kn: Joi.number().min(0).required(),
  traction_drive_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  traction_converter_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  traction_converter_temp_c: Joi.number().required(),
  traction_converter_load_pct: Joi.number().min(0).max(100).required(),
  regenerative_braking_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  regenerative_braking_power_kw: Joi.number().min(0).required(),
  electrical_brake_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  automatic_pilot_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  energy_meter_kwh: Joi.number().min(0).required(),
  energy_consumption_kw: Joi.number().min(0).required(),
});

// ===== TE33A raw telemetry =====
const te33aRawSchema = Joi.object({
  ...baseTelemetryFields,
  locomotive_model: Joi.string().valid('TE33A').required(),
  engine_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  engine_rpm: Joi.number().min(0).required(),
  engine_load_pct: Joi.number().min(0).max(100).required(),
  fuel_level_pct: Joi.number().min(0).max(100).required(),
  fuel_consumption_lph: Joi.number().min(0).required(),
  propulsion_system_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  dynamic_brake_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  compressor_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  auxiliaries_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  onboard_diagnostic_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  remote_diagnostic_alert: Joi.string().allow(null, ''),
  crew_interface_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  computer_system_status: Joi.string().valid(...COMPONENT_STATUSES).required(),
  communications_status: Joi.string().valid(...COMM_STATUSES).required(),
});

/**
 * Validate raw telemetry based on locomotive_model discriminator.
 */
function validateRawTelemetry(data) {
  if (!data || !data.locomotive_model) {
    return { error: { message: 'locomotive_model is required' } };
  }
  if (data.locomotive_model === 'KZ8A') {
    return kz8aRawSchema.validate(data, { abortEarly: false });
  }
  if (data.locomotive_model === 'TE33A') {
    return te33aRawSchema.validate(data, { abortEarly: false });
  }
  return { error: { message: `Unknown locomotive_model: ${data.locomotive_model}` } };
}

module.exports = {
  createLocomotiveSchema,
  updateLocomotiveSchema,
  kz8aRawSchema,
  te33aRawSchema,
  validateRawTelemetry,
};
