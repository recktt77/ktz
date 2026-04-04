const { getEngine } = require('../engine/SimulatorEngine');
const { listScenarios } = require('../scenarios');
const KZ8AGenerator = require('../generators/KZ8AGenerator');
const TE33AGenerator = require('../generators/TE33AGenerator');

const VALID_LOCOMOTIVES = new Set(['kz8a', 'te33a', 'all']);

const simulatorController = {
    /** POST /simulator/start */
    start(req, res) {
        const engine = getEngine();
        if (engine.state === 'running') {
            return res.status(409).json({ message: 'Already running' });
        }
        engine.start();
        res.json({ message: 'Simulator started', status: engine.getStatus() });
    },

    /** POST /simulator/stop */
    stop(req, res) {
        const engine = getEngine();
        engine.stop();
        res.json({ message: 'Simulator stopped', status: engine.getStatus() });
    },

    /** POST /simulator/pause */
    pause(req, res) {
        const engine = getEngine();
        engine.pause();
        res.json({ message: 'Simulator paused', status: engine.getStatus() });
    },

    /** POST /simulator/resume */
    resume(req, res) {
        const engine = getEngine();
        engine.resume();
        res.json({ message: 'Simulator resumed', status: engine.getStatus() });
    },

    /** GET /simulator/status */
    status(req, res) {
        const engine = getEngine();
        res.json(engine.getStatus());
    },

    /** POST /simulator/scenario { scenario: "transformer_overheat" } */
    setScenario(req, res) {
        const { scenario } = req.body;
        if (!scenario) {
            return res.status(400).json({ error: 'scenario is required' });
        }
        const engine = getEngine();
        const ok = engine.setScenario(scenario);
        if (!ok) {
            return res.status(400).json({
                error: `Unknown scenario "${scenario}"`,
                available: listScenarios(),
            });
        }
        res.json({ message: `Scenario set to "${scenario}"`, status: engine.getStatus() });
    },

    /** GET /simulator/scenarios */
    listScenarios(req, res) {
        res.json(listScenarios());
    },

    /* ---------- Admin Override API ---------- */

    /**
     * POST /simulator/override
     * Body: { locomotive: "kz8a"|"te33a"|"all", overrides: { param: value } }
     */
    setOverride(req, res) {
        const { locomotive, overrides } = req.body;
        if (!locomotive || !overrides || typeof overrides !== 'object') {
            return res.status(400).json({ error: 'locomotive and overrides (object) are required' });
        }
        if (!VALID_LOCOMOTIVES.has(locomotive)) {
            return res.status(400).json({ error: 'locomotive must be kz8a, te33a, or all' });
        }
        const engine = getEngine();
        engine.setOverrides(locomotive, overrides);
        res.json({ message: 'Overrides applied', overrides: engine.getOverrides() });
    },

    /**
     * DELETE /simulator/override/:locomotive
     * Clears overrides and resets to healthy defaults.
     */
    clearOverride(req, res) {
        const { locomotive } = req.params;
        if (!VALID_LOCOMOTIVES.has(locomotive)) {
            return res.status(400).json({ error: 'locomotive must be kz8a, te33a, or all' });
        }
        const engine = getEngine();
        engine.clearOverrides(locomotive);
        res.json({ message: `Overrides cleared for ${locomotive}`, overrides: engine.getOverrides() });
    },

    /** GET /simulator/overrides */
    getOverrides(req, res) {
        const engine = getEngine();
        res.json(engine.getOverrides());
    },

    /** GET /simulator/params — list overridable parameter names per locomotive */
    getParams(req, res) {
        res.json({
            kz8a: KZ8AGenerator.PARAMS,
            te33a: TE33AGenerator.PARAMS,
        });
    },
};

module.exports = simulatorController;
