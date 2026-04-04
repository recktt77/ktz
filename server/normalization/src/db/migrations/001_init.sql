-- Normalization Service schema migration 001
-- Tables: telemetry_normalized, derived_metrics, health_snapshots, threshold_configs, weight_configs

CREATE TABLE IF NOT EXISTS telemetry_normalized (
  id              BIGSERIAL,
  locomotive_id   VARCHAR(50) NOT NULL,
  model_code      VARCHAR(20) NOT NULL,
  timestamp_utc   TIMESTAMPTZ NOT NULL,
  metrics         JSONB NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, timestamp_utc)
);

CREATE INDEX IF NOT EXISTS idx_norm_loco_ts
  ON telemetry_normalized(locomotive_id, timestamp_utc DESC);

CREATE TABLE IF NOT EXISTS derived_metrics (
  id              BIGSERIAL,
  locomotive_id   VARCHAR(50) NOT NULL,
  model_code      VARCHAR(20) NOT NULL,
  timestamp_utc   TIMESTAMPTZ NOT NULL,
  health_index    SMALLINT NOT NULL,
  health_status   VARCHAR(20) NOT NULL,
  payload         JSONB NOT NULL,
  PRIMARY KEY (id, timestamp_utc)
);

CREATE INDEX IF NOT EXISTS idx_derived_loco_ts
  ON derived_metrics(locomotive_id, timestamp_utc DESC);

CREATE TABLE IF NOT EXISTS health_snapshots (
  id              BIGSERIAL,
  locomotive_id   VARCHAR(50) NOT NULL,
  timestamp_utc   TIMESTAMPTZ NOT NULL,
  health_index    SMALLINT NOT NULL,
  health_status   VARCHAR(20) NOT NULL,
  top_factors     JSONB,
  formula_version VARCHAR(20) NOT NULL DEFAULT 'v1',
  PRIMARY KEY (id, timestamp_utc)
);

CREATE INDEX IF NOT EXISTS idx_health_loco_ts
  ON health_snapshots(locomotive_id, timestamp_utc DESC);

CREATE TABLE IF NOT EXISTS threshold_configs (
  id          SERIAL PRIMARY KEY,
  model_code  VARCHAR(20) NOT NULL,
  metric      VARCHAR(100) NOT NULL,
  warning     DOUBLE PRECISION,
  critical    DOUBLE PRECISION,
  direction   VARCHAR(10) NOT NULL DEFAULT 'upper',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_code, metric)
);

CREATE TABLE IF NOT EXISTS weight_configs (
  id          SERIAL PRIMARY KEY,
  model_code  VARCHAR(20) NOT NULL,
  factor      VARCHAR(100) NOT NULL,
  weight      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_code, factor)
);

CREATE TABLE IF NOT EXISTS alerts (
  id              VARCHAR(50) PRIMARY KEY,
  locomotive_id   VARCHAR(50) NOT NULL,
  model_code      VARCHAR(20) NOT NULL,
  severity        VARCHAR(20) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT,
  component       VARCHAR(100),
  metric          VARCHAR(100),
  value           DOUBLE PRECISION,
  threshold       DOUBLE PRECISION,
  timestamp_utc   TIMESTAMPTZ NOT NULL,
  acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_loco
  ON alerts(locomotive_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_active
  ON alerts(resolved_at) WHERE resolved_at IS NULL;
