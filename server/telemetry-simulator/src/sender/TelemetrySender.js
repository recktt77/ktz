const axios = require('axios');
const config = require('../config');
const logger = require('../lib/logger');

class TelemetrySender {
    constructor() {
        this.client = axios.create({
            baseURL: config.locomotiveService.baseUrl,
            timeout: config.locomotiveService.timeout,
            headers: { 'Content-Type': 'application/json' },
        });
        this.stats = { sent: 0, errors: 0, lastError: null };
    }

    async send(packet) {
        try {
            const res = await this.client.post(
                config.locomotiveService.telemetryEndpoint,
                packet,
            );
            this.stats.sent++;
            return res.data;
        } catch (err) {
            this.stats.errors++;
            this.stats.lastError = err.message;
            const status = err.response ? err.response.status : 'NETWORK';
            const body = err.response ? JSON.stringify(err.response.data) : '';
            logger.warn(`Send failed [${status}]: ${err.message} ${body}`);
            return null;
        }
    }

    getStats() {
        return { ...this.stats };
    }

    resetStats() {
        this.stats = { sent: 0, errors: 0, lastError: null };
    }
}

module.exports = TelemetrySender;
