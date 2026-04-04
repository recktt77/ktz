-- Locomotive Service schema migration 001
-- Creates: locomotive_models, metric_schemas, locomotives, telemetry_raw, fault_events_raw

CREATE TABLE IF NOT EXISTS locomotive_models (
  code        VARCHAR(20) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metric_schemas (
  id          SERIAL PRIMARY KEY,
  model_code  VARCHAR(20) NOT NULL REFERENCES locomotive_models(code) ON DELETE CASCADE,
  field_name  VARCHAR(100) NOT NULL,
  data_type   VARCHAR(20) NOT NULL DEFAULT 'number',
  unit        VARCHAR(30),
  min_value   DOUBLE PRECISION,
  max_value   DOUBLE PRECISION,
  description TEXT,
  UNIQUE(model_code, field_name)
);

CREATE TABLE IF NOT EXISTS locomotives (
  id               VARCHAR(50) PRIMARY KEY,
  model_code       VARCHAR(20) NOT NULL REFERENCES locomotive_models(code),
  name             VARCHAR(100),
  status           VARCHAR(20) NOT NULL DEFAULT 'active',
  track_segment_id VARCHAR(50),
  position_km      DOUBLE PRECISION,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locomotives_model ON locomotives(model_code);
CREATE INDEX IF NOT EXISTS idx_locomotives_status ON locomotives(status);

CREATE TABLE IF NOT EXISTS telemetry_raw (
  id              BIGSERIAL,
  locomotive_id   VARCHAR(50) NOT NULL REFERENCES locomotives(id),
  model_code      VARCHAR(20) NOT NULL,
  timestamp_utc   TIMESTAMPTZ NOT NULL,
  payload         JSONB NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, timestamp_utc)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_raw_loco_ts
  ON telemetry_raw(locomotive_id, timestamp_utc DESC);

CREATE TABLE IF NOT EXISTS fault_events_raw (
  id              BIGSERIAL PRIMARY KEY,
  locomotive_id   VARCHAR(50) NOT NULL REFERENCES locomotives(id),
  fault_code      VARCHAR(50) NOT NULL,
  fault_text      TEXT,
  timestamp_utc   TIMESTAMPTZ NOT NULL,
  payload         JSONB,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fault_events_loco_ts
  ON fault_events_raw(locomotive_id, timestamp_utc DESC);
