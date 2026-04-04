/**
 * TE33A Diesel Locomotive telemetry generator.
 * Uses random-walk state machine matching the Joi te33aRawSchema
 * in the Locomotive Service.
 *
 * NOTE: TE33A schema has BOTH `communication_status` (base) and
 *       `communications_status` (model-specific). Both are required.
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

class TE33AGenerator {
    constructor(locomotiveId) {
        this.locomotiveId = locomotiveId;

        // Walk state
        this.speed = 65;
        this.engineRpm = 1450;
        this.engineLoad = 72;
        this.fuelLevel = 68;
        this.fuelConsumption = 185;
        this.brakePressure = 4.8;
    }

    applyOverrides(overrides) {
        if (!overrides) return;
        for (const [key, value] of Object.entries(overrides)) {
            if (key in this) this[key] = value;
        }
    }

    tick() {
        this.speed = walk(this.speed, 2.5, 0, 140);
        this.engineRpm = walk(this.engineRpm, 50, 600, 2100);
        this.engineLoad = walk(this.engineLoad, 4, 0, 100);
        this.fuelLevel = Math.max(0, this.fuelLevel - 0.01 - Math.random() * 0.02);
        this.fuelConsumption = walk(this.fuelConsumption, 10, 80, 350);
        this.brakePressure = walk(this.brakePressure, 0.1, 2, 7);

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

            // TE33A-specific comms (additional to base communication_status)
            communications_status: 'online',
        };
    }
}

module.exports = TE33AGenerator;
