/**
 * Pre-built scenarios that push generator state toward
 * specific telemetry conditions.
 *
 * Each scenario has overrides for KZ8A and/or TE33A generators.
 * Overrides are applied as persistent targets — the random walk
 * drifts toward them using wider (full) ranges.
 *
 * `normal_run` clears all overrides → values stay in narrow healthy ranges.
 */

const scenarios = {
    normal_run: {
        label: 'Normal run (stable, all green)',
        kz8a: {},
        te33a: {},
    },
    transformer_overheat: {
        label: 'Transformer overheat (KZ8A)',
        kz8a: { transformerTemp: 108, transformerLoad: 92, converterTemp: 85 },
        te33a: {},
    },
    low_brake_pressure: {
        label: 'Low brake pressure (both)',
        kz8a: { brakePressure: 2.3 },
        te33a: { brakePressure: 2.1 },
    },
    fuel_drop: {
        label: 'Low fuel (TE33A)',
        kz8a: {},
        te33a: { fuelLevel: 8, fuelConsumption: 280 },
    },
    engine_overload: {
        label: 'Engine overload (TE33A)',
        kz8a: {},
        te33a: { engineLoad: 96, engineRpm: 1980, speed: 110 },
    },
    voltage_drop: {
        label: 'Low catenary voltage (KZ8A)',
        kz8a: { catenaryVoltage: 19.5, speed: 40 },
        te33a: {},
    },
};

function getScenario(name) {
    return scenarios[name] || null;
}

function listScenarios() {
    return Object.entries(scenarios).map(([key, val]) => ({
        id: key,
        label: val.label,
    }));
}

module.exports = { scenarios, getScenario, listScenarios };
