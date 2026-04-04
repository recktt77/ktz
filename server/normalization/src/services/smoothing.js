const config = require('../config');

/**
 * In-memory smoothing buffer.
 * Keeps last N values per metric per locomotive for EMA smoothing.
 */

const buffers = new Map(); // locomotiveId -> { metric -> number[] }

function getKey(locomotiveId, metric) {
  return `${locomotiveId}:${metric}`;
}

/**
 * Add a value and return the smoothed (EMA) result.
 */
function smooth(locomotiveId, metric, value) {
  if (typeof value !== 'number' || isNaN(value)) return value;

  const key = getKey(locomotiveId, metric);
  if (!buffers.has(key)) {
    buffers.set(key, []);
  }

  const buf = buffers.get(key);
  buf.push(value);

  const windowSize = config.processing.smoothingWindow;
  if (buf.length > windowSize) {
    buf.splice(0, buf.length - windowSize);
  }

  // Simple EMA with alpha = 2/(N+1)
  if (buf.length === 1) return value;

  const alpha = 2 / (buf.length + 1);
  let ema = buf[0];
  for (let i = 1; i < buf.length; i++) {
    ema = alpha * buf[i] + (1 - alpha) * ema;
  }

  return Math.round(ema * 100) / 100;
}

/**
 * Deduplication check per locomotive.
 */
const lastTimestamps = new Map(); // locomotiveId -> lastTimestampMs

function isDuplicate(locomotiveId, timestampUtc) {
  const tsMs = new Date(timestampUtc).getTime();
  const last = lastTimestamps.get(locomotiveId);

  if (last && Math.abs(tsMs - last) < config.processing.dedupWindowMs) {
    return true;
  }

  lastTimestamps.set(locomotiveId, tsMs);
  return false;
}

module.exports = { smooth, isDuplicate };
