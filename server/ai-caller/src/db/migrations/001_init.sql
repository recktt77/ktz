-- AI-Caller schema and tables

-- Staff assignments: who is responsible for which locomotive
CREATE TABLE staff_assignments (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL,
    locomotive_id   VARCHAR(20) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('driver', 'engineer', 'dispatcher')),
    phone_number    VARCHAR(30) NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),
    unassigned_at   TIMESTAMPTZ,
    UNIQUE(locomotive_id, role, is_active)
);

CREATE INDEX idx_staff_loco_role ON staff_assignments (locomotive_id, role) WHERE is_active = true;

-- Call routing rules: which metric → which role
CREATE TABLE call_routing_rules (
    id              SERIAL PRIMARY KEY,
    model_code      VARCHAR(10),
    metric_pattern  VARCHAR(100) NOT NULL,
    component       VARCHAR(50),
    target_role     VARCHAR(20) NOT NULL CHECK (target_role IN ('driver', 'engineer', 'dispatcher')),
    priority        INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT true
);

-- Call log
CREATE TABLE call_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id         UUID NOT NULL,
    locomotive_id    VARCHAR(20) NOT NULL,
    target_role      VARCHAR(20) NOT NULL,
    target_user_id   INT,
    call_status      VARCHAR(20) NOT NULL DEFAULT 'initiated'
                     CHECK (call_status IN ('initiated', 'ringing', 'answered', 'no_answer', 'failed', 'completed')),
    initiated_at     TIMESTAMPTZ DEFAULT NOW(),
    answered_at      TIMESTAMPTZ,
    ended_at         TIMESTAMPTZ,
    duration_sec     INT,
    retry_count      INT DEFAULT 0,
    asterisk_call_id VARCHAR(100),
    error_message    TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_log_alert ON call_log (alert_id);
CREATE INDEX idx_call_log_loco ON call_log (locomotive_id, created_at DESC);

-- Alert call state: cooldown tracker to avoid spamming
CREATE TABLE alert_call_state (
    alert_id        UUID PRIMARY KEY,
    locomotive_id   VARCHAR(20) NOT NULL,
    target_role     VARCHAR(20) NOT NULL,
    first_call_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_call_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_retry_at   TIMESTAMPTZ,
    total_retries   INT DEFAULT 0,
    max_retries     INT DEFAULT 5,
    resolved        BOOLEAN DEFAULT false
);

CREATE INDEX idx_alert_state_retry ON alert_call_state (next_retry_at)
    WHERE resolved = false AND next_retry_at IS NOT NULL;
