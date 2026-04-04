const telemetryRepo = require('../models/telemetryRepo');
const locomotiveRepo = require('../models/locomotiveRepo');
const { validateRawTelemetry } = require('../validators/schemas');
const rabbitPublisher = require('./rabbitPublisher');
const config = require('../config');
const logger = require('../utils/logger');

const telemetryService = {
  /**
   * Ingest a single raw telemetry packet.
   * 1. Validate envelope
   * 2. Determine locomotive and model
   * 3. Save raw telemetry
   * 4. Extract and store fault events
   * 5. Update locomotive position
   * 6. Publish event to queue
   */
  async ingestRaw(data) {
    // 1. Validate
    const { error, value } = validateRawTelemetry(data);
    if (error) {
      const details = error.details
        ? error.details.map(d => d.message)
        : [error.message];

      // Publish invalid event
      rabbitPublisher.publish(config.rabbitmq.routingKeys.rawInvalid, {
        reason: details,
        payload: data,
        timestamp: new Date().toISOString(),
      });

      const err = new Error('Telemetry validation failed');
      err.statusCode = 400;
      err.details = details;
      throw err;
    }

    // 2. Verify locomotive exists
    const loco = await locomotiveRepo.findById(value.locomotive_id);
    if (!loco) {
      const err = new Error(`Locomotive ${value.locomotive_id} not found`);
      err.statusCode = 404;
      throw err;
    }

    // Verify model matches
    if (loco.model_code !== value.locomotive_model) {
      const err = new Error(
        `Model mismatch: locomotive ${value.locomotive_id} is ${loco.model_code}, got ${value.locomotive_model}`
      );
      err.statusCode = 400;
      throw err;
    }

    // 3. Save raw telemetry
    const record = await telemetryRepo.insertRaw(
      value.locomotive_id,
      value.locomotive_model,
      value.timestamp_utc,
      value
    );

    // 4. Extract fault events
    if (value.fault_code) {
      await telemetryRepo.insertFault(
        value.locomotive_id,
        value.fault_code,
        value.fault_text || null,
        value.timestamp_utc,
        value
      );
    }

    // 5. Update position if provided
    if (value.track_segment_id != null || value.position_km != null) {
      await locomotiveRepo.updatePosition(
        value.locomotive_id,
        value.track_segment_id || loco.track_segment_id,
        value.position_km ?? loco.position_km
      );
    }

    // 6. Publish to RabbitMQ
    const event = {
      event: 'telemetry.raw.received',
      locomotive_id: value.locomotive_id,
      model: value.locomotive_model,
      timestamp_utc: value.timestamp_utc,
      received_at: record.received_at,
      payload: value,
    };
    rabbitPublisher.publish(config.rabbitmq.routingKeys.rawReceived, event);

    logger.debug('Telemetry ingested', {
      locomotive_id: value.locomotive_id,
      timestamp: value.timestamp_utc,
    });

    return record;
  },

  /**
   * Ingest a bulk array of raw telemetry packets.
   */
  async ingestBulk(items) {
    const results = { accepted: 0, rejected: 0, errors: [] };

    for (const item of items) {
      try {
        await this.ingestRaw(item);
        results.accepted++;
      } catch (err) {
        results.rejected++;
        results.errors.push({
          locomotive_id: item.locomotive_id || 'unknown',
          timestamp_utc: item.timestamp_utc || 'unknown',
          error: err.message,
          details: err.details || [],
        });
      }
    }

    return results;
  },

  /**
   * Get raw telemetry history for a locomotive.
   */
  async getRawHistory(locomotiveId, { from, to, limit } = {}) {
    return telemetryRepo.findByLocomotive(locomotiveId, { from, to, limit });
  },

  /**
   * Get latest raw telemetry for a locomotive.
   */
  async getLatestRaw(locomotiveId) {
    return telemetryRepo.findLatest(locomotiveId);
  },
};

module.exports = telemetryService;
