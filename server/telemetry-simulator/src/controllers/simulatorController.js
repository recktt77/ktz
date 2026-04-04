const { getEngine } = require('../engine/SimulatorEngine');
const { listScenarios } = require('../scenarios');

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
};

module.exports = simulatorController;
