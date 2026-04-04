/**
 * TE33A Diesel Locomotive telemetry generator.
 *
 * DEFAULT: all values stay in narrow "healthy" ranges → green dashboard.
 * OVERRIDES: admin sets persistent targets via API; the walk drifts toward
 *            those targets using wider (full) ranges, simulating degradation.
 *
 * Overridable params:
 *   speed, engineRpm, engineLoad, fuelLevel, fuelConsumption, brakePressure
 *
 * NOTE: TE33A schema has BOTH `communication_status` (base) and
 *       `communications_status` (model-specific). Both are required.
 */

const VALID_PARAMS = new Set([
    'speed', 'engineRpm', 'engineLoad',
    'fuelLevel', 'fuelConsumption', 'brakePressure',
]);

/* ---------- helpers ---------- */

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function walk(current, step, min, max) {
    return clamp(current + (Math.random() - 0.5) * 2 * step, min, max);
}

function walkToward(current, target, step, min, max) {
    const bias = target > current ? 0.3 : target < current ? 0.7 : 0.5;
    return clamp(current + (Math.random() - bias) * 2 * step, min, max);
}

function round(v, decimals = 0) {
    const f = Math.pow(10, decimals);
    return Math.round(v * f) / f;
}

function compStatus(health) {
    if (health > 75) return 'ok';
    if (health > 40) return 'degraded';
    return 'fault';
}

/* ---------- defaults ---------- */

const HEALTHY_DEFAULTS = {
    speed: 68,
    engineRpm: 1350,
    engineLoad: 55,
    fuelLevel: 92,
    fuelConsumption: 155,
    brakePressure: 5.0,
};

/* ---------- generator ---------- */

class TE33AGenerator {
    constructor(locomotiveId) {
        this.locomotiveId = locomotiveId;
        this._overrides = {};
        Object.assign(this, { ...HEALTHY_DEFAULTS });
    }

    /* ---- override API ---- */

    static get PARAMS() { return [...VALID_PARAMS]; }

    setOverrides(overrides) {
        for (const [k, v] of Object.entries(overrides)) {
            if (VALID_PARAMS.has(k) && typeof v === 'number' && Number.isFinite(v)) {
                this._overrides[k] = v;
            }
        }
    }

    clearOverrides() {
        this._overrides = {};
        Object.assign(this, { ...HEALTHY_DEFAULTS });
    }

    getOverrides() { return { ...this._overrides }; }

    applyOverrides(overrides) {
        if (!overrides) return;
        for (const [key, value] of Object.entries(overrides)) {
            if (key in this) this[key] = value;
        }
    }

    /* ---- walk helper ---- */

    _walk(param, hStep, hMin, hMax, fStep, fMin, fMax) {
        const target = this._overrides[param];
        if (target !== undefined) {
            this[param] = walkToward(this[param], target, fStep, fMin, fMax);
        } else {
            this[param] = walk(this[param], hStep, hMin, hMax);
        }
    }

    /* ---- tick ---- */

    tick() {
        //                  param              hStep hMin  hMax   fStep fMin fMax
        this._walk('speed', 2, 50, 85, 2.5, 0, 140);
        this._walk('engineRpm', 25, 1000, 1600, 50, 600, 2100);
        this._walk('engineLoad', 2, 40, 70, 4, 0, 100);
        this._walk('fuelConsumption', 4, 120, 200, 10, 80, 350);
        this._walk('brakePressure', 0.04, 4.5, 5.5, 0.15, 2, 7);

        // Fuel: very slow drain in healthy mode, override pulls toward target
        if (this._overrides.fuelLevel !== undefined) {
            this.fuelLevel = walkToward(this.fuelLevel, this._overrides.fuelLevel, 0.5, 0, 100);
        } else {
            this.fuelLevel = Math.max(0, this.fuelLevel - 0.002 - Math.random() * 0.005);
        }

        const engineDegraded = this.engineLoad > 90 || this.engineRpm > 1900;

        return {
            locomotive_id: this.locomotiveId,
            locomotive_model: 'TE33A',
            timestamp_utc: new Date().toISOString(),
            speed_kmh: round(this.speed, 1),

            // Base telemetry
            brake_system_status: this.brakePressure < 3 ? 'degraded' : 'ok',
            brake_system_pressure_bar: round(this.brakePressure, 2),
            fault_code: engineDegraded ? 'F-ENG-OVERLOAD' : null,
            communication_status: 'online',
            control_system_status: 'ok',

            // Diesel engine
            engine_status: compStatus(engineDegraded ? 40 : 85),
            engine_rpm: round(this.engineRpm),
            engine_load_pct: round(this.engineLoad),

            // Fuel
            fuel_level_pct: round(this.fuelLevel, 1),
            fuel_consumption_lph: round(this.fuelConsumption),

            // Propulsion & braking
            propulsion_system_status: 'ok',
            dynamic_brake_status: this.speed > 20 ? 'ok' : 'offline',

            // Auxiliary systems
            compressor_status: 'ok',
            auxiliaries_status: 'ok',

            // Diagnostics
            onboard_diagnostic_status: 'ok',
            remote_diagnostic_alert: engineDegraded ? 'Engine overload detected' : null,

            // Crew / computer
            crew_interface_status: 'ok',
            computer_system_status: 'ok',

            // TE33A-specific comms
            communications_status: 'online',
        };
    }
}

module.exports = TE33AGenerator;
