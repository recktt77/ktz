const config = require('../config');
const logger = require('../lib/logger');
const KZ8AGenerator = require('../generators/KZ8AGenerator');
const TE33AGenerator = require('../generators/TE33AGenerator');
const TelemetrySender = require('../sender/TelemetrySender');
const { getScenario } = require('../scenarios');

/**
 * Singleton engine that orchestrates tick-based telemetry generation
 * and HTTP dispatch to the Locomotive Service.
 */
class SimulatorEngine {
    constructor() {
        this.kz8a = new KZ8AGenerator(config.simulation.kz8aLocomotiveId);
        this.te33a = new TE33AGenerator(config.simulation.te33aLocomotiveId);
        this.sender = new TelemetrySender();

        this.intervalMs = config.simulation.intervalMs;
        this.timer = null;
        this.state = 'stopped'; // stopped | running | paused
        this.scenario = 'normal_run';
        this.tickCount = 0;
    }

    /** Start the simulation loop */
    start() {
        if (this.state === 'running') return;
        this.state = 'running';
        this.sender.resetStats();
        this.tickCount = 0;
        logger.info(`Simulator started — interval ${this.intervalMs}ms, scenario "${this.scenario}"`);
        this._schedule();
    }

    /** Stop the simulation loop */
    stop() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.state = 'stopped';
        logger.info('Simulator stopped');
    }

    /** Pause — keeps state, stops ticking */
    pause() {
        if (this.state !== 'running') return;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.state = 'paused';
        logger.info('Simulator paused');
    }

    /** Resume from paused state */
    resume() {
        if (this.state !== 'paused') return;
        this.state = 'running';
        logger.info('Simulator resumed');
        this._schedule();
    }

    /** Switch to a named scenario (uses persistent overrides) */
    setScenario(name) {
        const sc = getScenario(name);
        if (!sc) return false;
        this.scenario = name;
        // Clear previous overrides, then apply scenario targets
        this.kz8a.clearOverrides();
        this.te33a.clearOverrides();
        if (sc.kz8a && Object.keys(sc.kz8a).length) this.kz8a.setOverrides(sc.kz8a);
        if (sc.te33a && Object.keys(sc.te33a).length) this.te33a.setOverrides(sc.te33a);
        logger.info(`Scenario switched to "${name}"`);
        return true;
    }

    /* ---------- Admin Override API ---------- */

    /** Set persistent parameter overrides for a locomotive */
    setOverrides(locomotive, overrides) {
        if (locomotive === 'kz8a' || locomotive === 'all') {
            this.kz8a.setOverrides(overrides);
        }
        if (locomotive === 'te33a' || locomotive === 'all') {
            this.te33a.setOverrides(overrides);
        }
        this.scenario = 'custom';
        logger.info(`Overrides applied to ${locomotive}: ${JSON.stringify(overrides)}`);
    }

    /** Clear overrides and reset to healthy defaults */
    clearOverrides(locomotive) {
        if (locomotive === 'kz8a' || locomotive === 'all') {
            this.kz8a.clearOverrides();
        }
        if (locomotive === 'te33a' || locomotive === 'all') {
            this.te33a.clearOverrides();
        }
        this.scenario = 'normal_run';
        logger.info(`Overrides cleared for ${locomotive}`);
    }

    /** Get current overrides for both locomotives */
    getOverrides() {
        return {
            kz8a: this.kz8a.getOverrides(),
            te33a: this.te33a.getOverrides(),
        };
    }

    /** Get current engine status */
    getStatus() {
        return {
            state: this.state,
            scenario: this.scenario,
            tickCount: this.tickCount,
            intervalMs: this.intervalMs,
            sender: this.sender.getStats(),
            overrides: this.getOverrides(),
            locomotives: {
                kz8a: config.simulation.kz8aLocomotiveId,
                te33a: config.simulation.te33aLocomotiveId,
            },
        };
    }

    /** Internal: schedule next tick */
    _schedule() {
        this.timer = setTimeout(() => this._tick(), this.intervalMs);
    }

    /** Internal: one tick — generate + send both packets */
    async _tick() {
        if (this.state !== 'running') return;

        this.tickCount++;

        const kz8aPacket = this.kz8a.tick();
        const te33aPacket = this.te33a.tick();

        // Fire-and-forget both sends in parallel
        await Promise.all([
            this.sender.send(kz8aPacket),
            this.sender.send(te33aPacket),
        ]);

        if (this.tickCount % 60 === 0) {
            const stats = this.sender.getStats();
            logger.info(`Tick #${this.tickCount} — sent: ${stats.sent}, errors: ${stats.errors}`);
        }

        // Schedule next
        if (this.state === 'running') {
            this._schedule();
        }
    }
}

// Singleton
let instance = null;

function getEngine() {
    if (!instance) instance = new SimulatorEngine();
    return instance;
}

module.exports = { getEngine };
