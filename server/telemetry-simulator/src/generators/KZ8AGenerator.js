/**
 * KZ8A Electric Locomotive telemetry generator.
 * Uses random-walk state machine matching the Joi kz8aRawSchema
 * in the Locomotive Service.
 */

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function walk(current, step, min, max) {
    return clamp(current + (Math.random() - 0.5) * 2 * step, min, max);
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

class KZ8AGenerator {
    constructor(locomotiveId) {
        this.locomotiveId = locomotiveId;

        // Walk state
        this.speed = 75;
        this.catenaryVoltage = 25;
        this.catenaryCurrent = 310;
        this.transformerTemp = 65;
        this.transformerLoad = 55;
        this.converterTemp = 50;
        this.converterLoad = 48;
        this.tractiveEffort = 180;
        this.regenPower = 0;
        this.energyMeter = 12480;
        this.energyConsumption = 1850;
        this.brakePressure = 5.1;
    }

    /** Apply a named scenario's overrides to the walk parameters */
    applyOverrides(overrides) {
        if (!overrides) return;
        for (const [key, value] of Object.entries(overrides)) {
            if (key in this) this[key] = value;
        }
    }

    tick() {
        this.speed = walk(this.speed, 3, 0, 160);
        this.catenaryVoltage = walk(this.catenaryVoltage, 0.3, 19, 29);
        this.catenaryCurrent = walk(this.catenaryCurrent, 15, 0, 800);
        this.transformerTemp = walk(this.transformerTemp, 1.5, 30, 120);
        this.transformerLoad = walk(this.transformerLoad, 3, 0, 100);
        this.converterTemp = walk(this.converterTemp, 1, 25, 100);
        this.converterLoad = walk(this.converterLoad, 2, 0, 100);
        this.tractiveEffort = walk(this.tractiveEffort, 10, 0, 400);
        this.regenPower = Math.random() < 0.3
            ? walk(this.regenPower, 50, 0, 1200)
            : 0;
        this.energyConsumption = walk(this.energyConsumption, 100, 500, 4000);
        this.energyMeter += this.energyConsumption / 3600;
        this.brakePressure = walk(this.brakePressure, 0.1, 2, 7);

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
