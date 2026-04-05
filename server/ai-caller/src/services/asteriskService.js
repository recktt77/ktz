const ariClient = require('ari-client');
const config = require('../config');
const logger = require('../utils/logger');

let ari = null;
let connected = false;

// Pending call handlers: channelId → { onAnswer, onHangup }
const pendingCalls = new Map();

async function connect() {
  try {
    ari = await ariClient.connect(
      config.asterisk.ariUrl,
      config.asterisk.ariUser,
      config.asterisk.ariPassword,
    );

    ari.on('StasisStart', (event, channel) => {
      logger.info({ channelId: channel.id }, 'Stasis channel started (call answered)');
      const handler = pendingCalls.get(channel.id);
      if (handler && handler.onAnswer) {
        handler.onAnswer(channel);
      }
    });

    ari.on('StasisEnd', (event, channel) => {
      logger.debug({ channelId: channel.id }, 'Stasis channel ended');
      const handler = pendingCalls.get(channel.id);
      if (handler && handler.onHangup) {
        handler.onHangup();
      }
      pendingCalls.delete(channel.id);
    });

    ari.on('ChannelStateChange', (event, channel) => {
      logger.debug({ channelId: channel.id, state: channel.state }, 'Channel state change');
    });

    ari.start('ai-caller');
    connected = true;
    logger.info('Asterisk ARI connected');
  } catch (err) {
    logger.error({ err }, 'Failed to connect Asterisk ARI, retrying in 5s');
    connected = false;
    setTimeout(connect, 5_000);
  }
}

/**
 * Detect if a number is a real phone number (vs internal SIP extension).
 */
function isRealNumber(extension) {
  return extension.startsWith('+7') || extension.startsWith('87') || extension.length > 6;
}

/**
 * Build the endpoint string for origination.
 * Real numbers → route through Beeline trunk.
 * Internal extensions (6XXX) → direct PJSIP.
 */
function buildEndpoint(extension) {
  if (isRealNumber(extension)) {
    // Strip + prefix, Beeline expects 7XXXXXXXXXX
    let num = extension;
    if (num.startsWith('+')) num = num.substring(1);
    if (num.startsWith('8') && num.length === 11) num = '7' + num.substring(1);
    return { endpoint: `PJSIP/${num}@beeline-endpoint`, dialNum: num };
  }
  return { endpoint: `PJSIP/${extension}`, dialNum: extension };
}

/**
 * Originate an outbound call.
 *
 * For real phone numbers (via Beeline trunk):
 *   ARI originates into Stasis app → on answer → channel.continueInDialplan() 
 *   to AudioSocket context.
 *
 * For internal SIP extensions:
 *   ARI originates into dialplan context directly with AudioSocket.
 */
async function originateCall(extension, audioSocketId) {
  if (!ari || !connected) {
    throw new Error('Asterisk ARI not connected');
  }

  const { endpoint, dialNum } = buildEndpoint(extension);

  if (isRealNumber(extension)) {
    // Real number: originate into Stasis app, redirect to AudioSocket on answer
    return new Promise((resolve, reject) => {
      const channel = ari.Channel();
      const actualChannelId = channel.id;

      const timeout = setTimeout(() => {
        pendingCalls.delete(actualChannelId);
        reject(new Error('Call timeout — no answer'));
      }, config.asterisk.callTimeout * 1000);

      pendingCalls.set(actualChannelId, {
        onAnswer: async (ch) => {
          clearTimeout(timeout);
          try {
            // Redirect answered channel to AudioSocket dialplan
            await ch.setChannelVar({ variable: 'AUDIOSOCKET_UUID', value: audioSocketId });
            await ch.continueInDialplan({
              context: 'audiosocket-bridge',
              extension: 's',
              priority: 1,
            });
            logger.info({ channelId: actualChannelId, extension, audioSocketId }, 'Call answered, redirected to AudioSocket');
            resolve({ channelId: actualChannelId, channel: ch });
          } catch (err) {
            logger.error({ err, channelId: actualChannelId }, 'Failed to redirect channel to AudioSocket');
            reject(err);
          }
        },
        onHangup: () => {
          clearTimeout(timeout);
          pendingCalls.delete(actualChannelId);
        },
      });

      channel.originate({
        endpoint,
        app: 'ai-caller',
        timeout: config.asterisk.callTimeout,
        callerId: '9902',
      }, (err) => {
        if (err) {
          clearTimeout(timeout);
          pendingCalls.delete(actualChannelId);
          reject(err);
        }
      });

      logger.info({ channelId: actualChannelId, endpoint, audioSocketId }, 'call_originated_via_trunk');
    });
  } else {
    // Internal SIP: originate to dialplan with AudioSocket directly
    const channel = ari.Channel();
    const internalChannelId = channel.id;
    await channel.originate({
      endpoint,
      context: config.asterisk.context,
      extension,
      priority: 1,
      timeout: config.asterisk.callTimeout,
      variables: {
        AUDIOSOCKET_UUID: audioSocketId,
      },
    });

    logger.info({ channelId: internalChannelId, extension, audioSocketId }, 'call_originated_internal');
    return { channelId: internalChannelId, channel };
  }
}

async function hangup(channelId) {
  if (!ari || !connected) return;
  try {
    const channel = ari.Channel();
    channel.id = channelId;
    await channel.hangup();
    logger.info({ channelId }, 'Channel hung up');
  } catch (err) {
    // Channel may already be gone
    logger.debug({ channelId, err: err.message }, 'Hangup failed (channel may be gone)');
  }
}

function isConnected() {
  return connected;
}

async function close() {
  if (ari) {
    try {
      ari.stop();
    } catch (_) { /* ignore */ }
  }
  connected = false;
  logger.info('Asterisk ARI disconnected');
}

module.exports = { connect, originateCall, hangup, isConnected, close };
