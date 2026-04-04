/**
 * KZ8A Electric Locomotive telemetry generator.
 *
 * DEFAULT: all values stay in narrow "healthy" ranges → green dashboard.
 * OVERRIDES: admin sets persistent targets via API; the walk drifts toward
 *            those targets using wider (full) ranges, simulating degradation.
 *
 * Overridable params:
 *   speed, catenaryVoltage, catenaryCurrent, transformerTemp,
 *   transformerLoad, converterTemp, converterLoad, tractiveEffort,
 *   regenPower, energyConsumption, brakePressure
 */

const VALID_PARAMS = new Set([
    'speed', 'catenaryVoltage', 'catenaryCurrent',
    'transformerTemp', 'transformerLoad',
    'converterTemp', 'converterLoad',
    'tractiveEffort', 'regenPower',
    'energyConsumption', 'brakePressure',
]);

/* ---------- helpers ---------- */

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function walk(current, step, min, max) {
    return clamp(current + (Math.random() - 0.5) * 2 * step, min, max);
}

/** Biased walk — 70 % of the random component pushes toward `target`. */
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
    speed: 78,
    catenaryVoltage: 25,
    catenaryCurrent: 310,
    transformerTemp: 38,
    transformerLoad: 42,
    converterTemp: 38,
    converterLoad: 35,
    tractiveEffort: 180,
    regenPower: 0,
    energyMeter: 12480,
    energyConsumption: 1800,
    brakePressure: 5.2,
};

/* ---------- generator ---------- */

class KZ8AGenerator {
    constructor(locomotiveId) {
        this.locomotiveId = locomotiveId;
        this._overrides = {};           // persistent admin targets
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

    /** Legacy — used by setScenario (one-shot value set). */
    applyOverrides(overrides) {
        if (!overrides) return;
        for (const [key, value] of Object.entries(overrides)) {
            if (key in this) this[key] = value;
        }
    }

    /* ---- walk helper ---- */

    /**
     * @param {string} param      state key
     * @param {number} hStep      healthy step (small)
     * @param {number} hMin       healthy min
     * @param {number} hMax       healthy max
     * @param {number} fStep      full step (larger)
     * @param {number} fMin       full min
     * @param {number} fMax       full max
     */
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
        this._walk('speed', 2, 60, 95, 3, 0, 160);
        this._walk('catenaryVoltage', 0.15, 24, 26, 0.5, 19, 29);
        this._walk('catenaryCurrent', 8, 250, 400, 15, 0, 800);
        this._walk('transformerTemp', 0.3, 30, 44, 2, 30, 120);
        this._walk('transformerLoad', 1.5, 30, 55, 3, 0, 100);
        this._walk('converterTemp', 0.3, 28, 50, 1.5, 25, 100);
        this._walk('converterLoad', 1, 25, 48, 2, 0, 100);
        this._walk('tractiveEffort', 5, 140, 240, 10, 0, 400);
        this._walk('energyConsumption', 40, 1400, 2200, 100, 500, 4000);
        this._walk('brakePressure', 0.04, 4.5, 5.8, 0.15, 2, 7);

        // Regen braking
        if (this._overrides.regenPower !== undefined) {
            this.regenPower = walkToward(this.regenPower, this._overrides.regenPower, 50, 0, 1200);
        } else {
            this.regenPower = Math.random() < 0.15
                ? walk(this.regenPower, 20, 0, 300)
                : 0;
        }

        this.energyMeter += this.energyConsumption / 3600;

        return {
            locomotive_id: this.locomotiveId,
            locomotive_model: 'KZ8A',
            timestamp_utc: new Date().toISOString(),
            speed_kmh: round(this.speed, 1),

            // Base telemetry
            brake_system_status: this.brakePressure < 3 ? 'degraded' : 'ok',
            brake_system_pressure_bar: round(this.brakePressure, 2),
            fault_code: this.transformerTemp > 100 ? 'F-TRF-OVERHEAT' : null,
            communication_status: 'online',
            control_system_status: 'ok',

            // Catenary / pantograph
            pantograph_status: this.catenaryVoltage < 20 ? 'degraded' : 'ok',
            catenary_voltage_kv: round(this.catenaryVoltage, 1),
            catenary_current_a: round(this.catenaryCurrent),

            // Transformer
            main_transformer_status: compStatus(100 - this.transformerTemp + 20),
            main_transformer_temp_c: round(this.transformerTemp),
            main_transformer_load_pct: round(this.transformerLoad),

            // Traction
            tractive_effort_kn: round(this.tractiveEffort),
            traction_drive_status: 'ok',
            traction_converter_status: compStatus(100 - this.converterTemp + 30),
            traction_converter_temp_c: round(this.converterTemp),
            traction_converter_load_pct: round(this.converterLoad),

            // Regenerative braking
            regenerative_braking_status: this.regenPower > 0 ? 'ok' : 'offline',
            regenerative_braking_power_kw: round(this.regenPower),
            electrical_brake_status: 'ok',

            // Control / energy
            automatic_pilot_status: 'ok',
            energy_meter_kwh: round(this.energyMeter),
            energy_consumption_kw: round(this.energyConsumption),
        };
    }
}

module.exports = KZ8AGenerator;
