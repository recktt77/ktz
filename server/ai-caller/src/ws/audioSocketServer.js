const net = require('net');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * AudioSocket TCP server.
 * Asterisk connects here via raw TCP when a call enters the AudioSocket() dialplan app.
 *
 * AudioSocket protocol (Asterisk ↔ us):
 * - Binary frames with 3-byte header: [type(1)] [length(2, big-endian)] [payload]
 * - Type 0x10 = UUID (first message, 36 bytes)
 * - Type 0x11 = Audio (signed linear 16-bit, 8kHz mono)
 * - Type 0x01 = Hangup signal
 */

const TYPE_HANGUP = 0x00;
const TYPE_UUID   = 0x01;
const TYPE_AUDIO  = 0x10;

// Active bridges: audioSocketId → { onAudio, onHangup, onConnected, socket }
const pendingBridges = new Map();

let server = null;

/**
 * Convert 16 raw UUID bytes to string format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
 */
function uuidFromBytes(buf) {
  const hex = buf.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

function start() {
  server = net.createServer((socket) => {
    let bridgeId = null;
    let bridge = null;
    let buffer = Buffer.alloc(0);

    logger.debug('AudioSocket TCP connection received');

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      // Process all complete frames in the buffer
      while (buffer.length >= 3) {
        const type = buffer[0];
        const length = buffer.readUInt16BE(1);
        const frameSize = 3 + length;

        if (buffer.length < frameSize) break; // Incomplete frame, wait for more data

        const payload = buffer.subarray(3, frameSize);
        buffer = buffer.subarray(frameSize);

        switch (type) {
          case TYPE_UUID: {
            bridgeId = uuidFromBytes(payload);
            bridge = pendingBridges.get(bridgeId);

            if (bridge) {
              bridge.socket = socket;
              logger.info({ bridgeId }, 'AudioSocket bridge connected');
              if (bridge.onConnected) bridge.onConnected();
            } else {
              logger.warn({ bridgeId }, 'No pending bridge for AudioSocket UUID');
              socket.end();
            }
            break;
          }

          case TYPE_AUDIO: {
            if (bridge && bridge.onAudio) {
              bridge.onAudio(payload);
            }
            break;
          }

          case TYPE_HANGUP: {
            logger.info({ bridgeId }, 'AudioSocket hangup received');
            if (bridge && bridge.onHangup) bridge.onHangup();
            break;
          }
        }
      }
    });

    socket.on('close', () => {
      logger.debug({ bridgeId }, 'AudioSocket connection closed');
      if (bridge && bridge.onHangup) bridge.onHangup();
      if (bridgeId) pendingBridges.delete(bridgeId);
    });

    socket.on('error', (err) => {
      logger.error({ bridgeId, err: err.message }, 'AudioSocket error');
    });
  });

  server.on('error', (err) => {
    logger.error({ err }, 'AudioSocket server error');
  });

  server.listen(config.audioSocketPort, () => {
    logger.info({ port: config.audioSocketPort }, 'AudioSocket server started');
  });
}

/**
 * Register a pending bridge that the AudioSocket connection will match by UUID.
 */
function registerBridge(audioSocketId, handlers) {
  pendingBridges.set(audioSocketId, handlers);
}

/**
 * Remove a bridge.
 */
function removeBridge(audioSocketId) {
  pendingBridges.delete(audioSocketId);
}

/**
 * Send audio back to Asterisk through AudioSocket.
 * @param {net.Socket} socket - The AudioSocket TCP connection
 * @param {Buffer} pcmPayload - Raw PCM audio bytes (signed linear 16-bit, 8kHz)
 */
function sendAudioToPhone(socket, pcmPayload) {
  if (!socket || socket.destroyed) return;

  const header = Buffer.alloc(3);
  header[0] = TYPE_AUDIO;
  header.writeUInt16BE(pcmPayload.length, 1);

  socket.write(Buffer.concat([header, pcmPayload]));
}

function close() {
  if (server) server.close();
  pendingBridges.clear();
  logger.info('AudioSocket server closed');
}

module.exports = { start, registerBridge, removeBridge, sendAudioToPhone, close };
