/**
 * Pre-built scenarios that push generator state toward
 * specific telemetry conditions.
 *
 * Each scenario has overrides for KZ8A and/or TE33A generators.
 * Overrides are applied once when scenario is activated;
 * the random walk continues from there.
 */

const scenarios = {
    normal_run: {
        label: 'Normal run',
        kz8a: { speed: 80, transformerTemp: 60, converterTemp: 48, brakePressure: 5.2, catenaryVoltage: 25 },
        te33a: { speed: 70, engineLoad: 65, engineRpm: 1400, fuelLevel: 70, brakePressure: 5.0 },
    },
    transformer_overheat: {
        label: 'Transformer overheat (KZ8A)',
        kz8a: { transformerTemp: 108, transformerLoad: 92, converterTemp: 85 },
        te33a: null,
    },
    low_brake_pressure: {
        label: 'Low brake pressure',
        kz8a: { brakePressure: 2.3 },
        te33a: { brakePressure: 2.1 },
    },
    fuel_drop: {
        label: 'Low fuel (TE33A)',
        kz8a: null,
        te33a: { fuelLevel: 8, fuelConsumption: 280 },
    },
    engine_overload: {
        label: 'Engine overload (TE33A)',
        kz8a: null,
        te33a: { engineLoad: 96, engineRpm: 1980, speed: 110 },
    },
    communication_loss: {
        label: 'Communication degraded',
        kz8a: { speed: 45, catenaryVoltage: 20.5 },
        te33a: { speed: 35 },
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
