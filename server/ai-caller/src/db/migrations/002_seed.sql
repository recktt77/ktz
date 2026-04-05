-- Seed call routing rules
-- Maps metrics/components to target roles

-- ═══ COMMON (both KZ8A and TE33A) ═══
INSERT INTO call_routing_rules (model_code, metric_pattern, component, target_role, priority) VALUES
  (NULL, 'speed_kmh',                    'speed',              'driver',     100),
  (NULL, 'brake_system_pressure_bar',    'brake_system',       'driver',     100);

-- ═══ KZ8A specific ═══
INSERT INTO call_routing_rules (model_code, metric_pattern, component, target_role, priority) VALUES
  ('KZ8A', 'main_transformer_temp_c',      'main_transformer',   'engineer',    90),
  ('KZ8A', 'traction_converter_temp_c',     'traction_converter', 'engineer',    90),
  ('KZ8A', 'catenary_voltage_kv',           'electrical_supply',  'engineer',    90),
  ('KZ8A', 'main_transformer_load_pct',     'main_transformer',   'engineer',    80),
  ('KZ8A', 'traction_converter_load_pct',   'traction_converter', 'engineer',    80);

-- ═══ TE33A specific ═══
INSERT INTO call_routing_rules (model_code, metric_pattern, component, target_role, priority) VALUES
  ('TE33A', 'engine_load_pct',       'engine',       'engineer',    90),
  ('TE33A', 'engine_rpm',            'engine',       'engineer',    90),
  ('TE33A', 'fuel_level_pct',        'fuel_system',  'dispatcher',  85),
  ('TE33A', 'fuel_consumption_lph',  'fuel_system',  'dispatcher',  85);

-- ═══ Fault codes → always dispatcher ═══
INSERT INTO call_routing_rules (model_code, metric_pattern, component, target_role, priority) VALUES
  (NULL, 'fault_code', NULL, 'dispatcher', 110);

-- Seed demo staff assignments for simulator locomotives
INSERT INTO staff_assignments (user_id, locomotive_id, role, phone_number) VALUES
  (1, 'KTZ-4021', 'driver',     '6001'),
  (2, 'KTZ-4021', 'engineer',   '6002'),
  (3, 'KTZ-4021', 'dispatcher', '6003'),
  (4, 'KTZ-7015', 'driver',     '6004'),
  (5, 'KTZ-7015', 'engineer',   '6005'),
  (3, 'KTZ-7015', 'dispatcher', '6003');
