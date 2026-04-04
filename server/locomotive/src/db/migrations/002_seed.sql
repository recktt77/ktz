-- Seed locomotive_models and metric_schemas for KZ8A and TE33A

-- Models
INSERT INTO locomotive_models (code, name, description) VALUES
  ('KZ8A',  'КЗ8А',  'Электровоз переменного тока КЗ8А (Alstom Prima T8)'),
  ('TE33A', 'ТЭ33А', 'Тепловоз ТЭ33А (GE Evolution ES44ACi)')
ON CONFLICT (code) DO NOTHING;

-- ===== KZ8A metric schema =====
INSERT INTO metric_schemas (model_code, field_name, data_type, unit, min_value, max_value, description) VALUES
  ('KZ8A', 'speed_kmh',                   'number', 'km/h',  0,    160,  'Скорость'),
  ('KZ8A', 'pantograph_status',            'enum',   NULL,    NULL, NULL, 'Статус токоприёмника'),
  ('KZ8A', 'catenary_voltage_kv',          'number', 'kV',    0,    30,   'Напряжение контактной сети'),
  ('KZ8A', 'catenary_current_a',           'number', 'A',     0,    2000, 'Ток контактной сети'),
  ('KZ8A', 'main_transformer_status',      'enum',   NULL,    NULL, NULL, 'Статус главного трансформатора'),
  ('KZ8A', 'main_transformer_temp_c',      'number', '°C',    0,    150,  'Температура главного трансформатора'),
  ('KZ8A', 'main_transformer_load_pct',    'number', '%',     0,    100,  'Нагрузка трансформатора'),
  ('KZ8A', 'tractive_effort_kn',           'number', 'kN',    0,    500,  'Тяговое усилие'),
  ('KZ8A', 'traction_drive_status',        'enum',   NULL,    NULL, NULL, 'Статус тягового привода'),
  ('KZ8A', 'traction_converter_status',    'enum',   NULL,    NULL, NULL, 'Статус тягового преобразователя'),
  ('KZ8A', 'traction_converter_temp_c',    'number', '°C',    0,    120,  'Температура тягового преобразователя'),
  ('KZ8A', 'traction_converter_load_pct',  'number', '%',     0,    100,  'Нагрузка преобразователя'),
  ('KZ8A', 'regenerative_braking_status',  'enum',   NULL,    NULL, NULL, 'Статус рекуперативного торможения'),
  ('KZ8A', 'regenerative_braking_power_kw','number', 'kW',    0,    5000, 'Мощность рекуперации'),
  ('KZ8A', 'electrical_brake_status',      'enum',   NULL,    NULL, NULL, 'Статус электрического тормоза'),
  ('KZ8A', 'brake_system_status',          'enum',   NULL,    NULL, NULL, 'Статус тормозной системы'),
  ('KZ8A', 'brake_system_pressure_bar',    'number', 'bar',   0,    10,   'Давление тормозной системы'),
  ('KZ8A', 'automatic_pilot_status',       'enum',   NULL,    NULL, NULL, 'Статус автоведения'),
  ('KZ8A', 'energy_meter_kwh',             'number', 'kWh',   0,    NULL, 'Счётчик энергии'),
  ('KZ8A', 'energy_consumption_kw',        'number', 'kW',    0,    NULL, 'Потребление энергии'),
  ('KZ8A', 'fault_code',                   'string', NULL,    NULL, NULL, 'Код неисправности'),
  ('KZ8A', 'communication_status',         'enum',   NULL,    NULL, NULL, 'Статус связи'),
  ('KZ8A', 'control_system_status',        'enum',   NULL,    NULL, NULL, 'Статус системы управления')
ON CONFLICT (model_code, field_name) DO NOTHING;

-- ===== TE33A metric schema =====
INSERT INTO metric_schemas (model_code, field_name, data_type, unit, min_value, max_value, description) VALUES
  ('TE33A', 'speed_kmh',                   'number', 'km/h',  0,    140,  'Скорость'),
  ('TE33A', 'engine_status',               'enum',   NULL,    NULL, NULL, 'Статус двигателя'),
  ('TE33A', 'engine_rpm',                  'number', 'rpm',   0,    2200, 'Обороты двигателя'),
  ('TE33A', 'engine_load_pct',             'number', '%',     0,    100,  'Нагрузка двигателя'),
  ('TE33A', 'fuel_level_pct',              'number', '%',     0,    100,  'Уровень топлива'),
  ('TE33A', 'fuel_consumption_lph',        'number', 'l/h',   0,    500,  'Расход топлива'),
  ('TE33A', 'propulsion_system_status',    'enum',   NULL,    NULL, NULL, 'Статус тяговой системы'),
  ('TE33A', 'dynamic_brake_status',        'enum',   NULL,    NULL, NULL, 'Статус динамического тормоза'),
  ('TE33A', 'brake_system_status',         'enum',   NULL,    NULL, NULL, 'Статус тормозной системы'),
  ('TE33A', 'brake_system_pressure_bar',   'number', 'bar',   0,    10,   'Давление тормозной системы'),
  ('TE33A', 'compressor_status',           'enum',   NULL,    NULL, NULL, 'Статус компрессора'),
  ('TE33A', 'auxiliaries_status',          'enum',   NULL,    NULL, NULL, 'Статус вспомогательных систем'),
  ('TE33A', 'onboard_diagnostic_status',   'enum',   NULL,    NULL, NULL, 'Статус бортовой диагностики'),
  ('TE33A', 'remote_diagnostic_alert',     'string', NULL,    NULL, NULL, 'Удалённый диагностический алерт'),
  ('TE33A', 'crew_interface_status',       'enum',   NULL,    NULL, NULL, 'Статус интерфейса экипажа'),
  ('TE33A', 'computer_system_status',      'enum',   NULL,    NULL, NULL, 'Статус бортового компьютера'),
  ('TE33A', 'communications_status',       'enum',   NULL,    NULL, NULL, 'Статус связи'),
  ('TE33A', 'fault_code',                  'string', NULL,    NULL, NULL, 'Код неисправности'),
  ('TE33A', 'communication_status',        'enum',   NULL,    NULL, NULL, 'Статус связи (общий)'),
  ('TE33A', 'control_system_status',       'enum',   NULL,    NULL, NULL, 'Статус системы управления')
ON CONFLICT (model_code, field_name) DO NOTHING;
