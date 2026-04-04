-- Seed two locomotive instances
INSERT INTO locomotives (id, model_code, name, status, track_segment_id, position_km) VALUES
  ('KTZ-4021', 'KZ8A',  'КЗ8А-4021 Электровоз', 'active', 'SEG-ASTANA-ALMATY-01', 142.3),
  ('KTZ-7015', 'TE33A', 'ТЭ33А-7015 Тепловоз',  'active', 'SEG-KARAGANDA-ASTANA-01', 87.6)
ON CONFLICT (id) DO NOTHING;
