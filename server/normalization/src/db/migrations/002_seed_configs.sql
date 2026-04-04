-- Seed default thresholds and weights for KZ8A and TE33A

-- ===== KZ8A thresholds =====
INSERT INTO threshold_configs (model_code, metric, warning, critical, direction) VALUES
  ('KZ8A', 'main_transformer_temp_c',      90,    110,   'upper'),
  ('KZ8A', 'traction_converter_temp_c',     80,    100,   'upper'),
  ('KZ8A', 'catenary_voltage_kv',           21,    19,    'lower'),
  ('KZ8A', 'brake_system_pressure_bar',     4.0,   3.0,   'lower'),
  ('KZ8A', 'main_transformer_load_pct',     85,    95,    'upper'),
  ('KZ8A', 'traction_converter_load_pct',   85,    95,    'upper'),
  ('KZ8A', 'speed_kmh',                     140,   160,   'upper')
ON CONFLICT (model_code, metric) DO NOTHING;

-- ===== TE33A thresholds =====
INSERT INTO threshold_configs (model_code, metric, warning, critical, direction) VALUES
  ('TE33A', 'engine_load_pct',              85,    95,    'upper'),
  ('TE33A', 'engine_rpm',                   1900,  2100,  'upper'),
  ('TE33A', 'fuel_level_pct',               25,    15,    'lower'),
  ('TE33A', 'brake_system_pressure_bar',    4.0,   3.0,   'lower'),
  ('TE33A', 'fuel_consumption_lph',         350,   450,   'upper'),
  ('TE33A', 'speed_kmh',                    120,   140,   'upper')
ON CONFLICT (model_code, metric) DO NOTHING;

-- ===== KZ8A weights =====
INSERT INTO weight_configs (model_code, factor, weight) VALUES
  ('KZ8A', 'transformer_thermal',      15),
  ('KZ8A', 'converter_thermal',        10),
  ('KZ8A', 'electrical_supply',        12),
  ('KZ8A', 'brake_pressure',           15),
  ('KZ8A', 'fault_code',               20),
  ('KZ8A', 'communication_loss',       10),
  ('KZ8A', 'component_degradation',    10),
  ('KZ8A', 'overload',                  8)
ON CONFLICT (model_code, factor) DO NOTHING;

-- ===== TE33A weights =====
INSERT INTO weight_configs (model_code, factor, weight) VALUES
  ('TE33A', 'engine_overload',          15),
  ('TE33A', 'fuel_anomaly',             12),
  ('TE33A', 'brake_pressure',           15),
  ('TE33A', 'fault_code',               20),
  ('TE33A', 'communication_loss',       10),
  ('TE33A', 'component_degradation',    10),
  ('TE33A', 'engine_thermal',           10),
  ('TE33A', 'fuel_low',                  8)
ON CONFLICT (model_code, factor) DO NOTHING;
