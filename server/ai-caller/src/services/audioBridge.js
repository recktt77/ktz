const { v4: uuidv4 } = require('uuid');
const gptRealtime = require('./gptRealtimeService');
const audioSocket = require('../ws/audioSocketServer');
const logger = require('../utils/logger');

/**
 * Resample signed-linear PCM from 8kHz to 24kHz (3x upsample) using linear interpolation.
 * Both are 16-bit LE mono.
 */
function upsample8to24(buf8k) {
  const samples8k = buf8k.length / 2;
  const out = Buffer.alloc(samples8k * 3 * 2);

  for (let i = 0; i < samples8k - 1; i++) {
    const s0 = buf8k.readInt16LE(i * 2);
    const s1 = buf8k.readInt16LE((i + 1) * 2);

    out.writeInt16LE(s0, i * 6);
    out.writeInt16LE(Math.round(s0 + (s1 - s0) / 3), i * 6 + 2);
    out.writeInt16LE(Math.round(s0 + (2 * (s1 - s0)) / 3), i * 6 + 4);
  }

  // Last sample: repeat
  if (samples8k > 0) {
    const last = buf8k.readInt16LE((samples8k - 1) * 2);
    const offset = (samples8k - 1) * 6;
    out.writeInt16LE(last, offset);
    out.writeInt16LE(last, offset + 2);
    out.writeInt16LE(last, offset + 4);
  }

  return out;
}

/**
 * Downsample signed-linear PCM from 24kHz to 8kHz (3x downsample, pick every 3rd).
 */
function downsample24to8(buf24k) {
  const samples24k = buf24k.length / 2;
  const samples8k = Math.floor(samples24k / 3);
  const out = Buffer.alloc(samples8k * 2);

  for (let i = 0; i < samples8k; i++) {
    out.writeInt16LE(buf24k.readInt16LE(i * 6), i * 2);
  }

  return out;
}

/**
 * Create a bidirectional audio bridge between Asterisk AudioSocket and GPT Realtime.
 *
 * Flow:
 *   Phone → Asterisk AudioSocket (PCM16 8kHz) → upsample to 24kHz → GPT Realtime
 *   GPT Realtime (PCM16 24kHz) → downsample to 8kHz → AudioSocket → Phone
 *
 * Returns a promise that resolves when the call ends.
 */
function createBridge(systemPrompt) {
  return new Promise((resolve, reject) => {
    const audioSocketId = uuidv4();
    let gptSession = null;
    let callEnded = false;
    let callStartTime = null;

    function cleanup() {
      if (callEnded) return;
      callEnded = true;

      const duration = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0;

      if (gptSession) gptRealtime.closeSession(gptSession);
      audioSocket.removeBridge(audioSocketId);

      resolve({ audioSocketId, durationSec: duration });
    }

    // Register in AudioSocket server so when Asterisk connects, we're ready
    audioSocket.registerBridge(audioSocketId, {
      audioSocketWs: null,

      async onConnected() {
        callStartTime = Date.now();
        try {
          // Open GPT Realtime session
          gptSession = await gptRealtime.createSession(systemPrompt);

          // Listen for GPT audio output → send to phone
          gptSession.ws.on('message', (data) => {
            try {
              const event = JSON.parse(data.toString());

              if (event.type === 'response.audio.delta' && event.delta) {
                // GPT sends base64 PCM16 24kHz
                const pcm24k = Buffer.from(event.delta, 'base64');
                const pcm8k = downsample24to8(pcm24k);
                const bridge = audioSocket;
                bridge.sendAudioToPhone(this.audioSocketWs, pcm8k);
              }

              if (event.type === 'response.done') {
                logger.debug('GPT response completed');
              }
            } catch (err) {
              logger.error({ err: err.message }, 'Error processing GPT audio');
            }
          });

          // Trigger GPT to speak first (greeting)
          gptRealtime.triggerResponse(gptSession);

          logger.info({ audioSocketId }, 'Audio bridge established');
        } catch (err) {
          logger.error({ err }, 'Failed to create GPT session for bridge');
          cleanup();
          return;
        }
      },

      onAudio(pcm8kBuffer) {
        if (!gptSession || gptSession.ended) return;

        // Upsample 8kHz → 24kHz and send to GPT
        const pcm24k = upsample8to24(pcm8kBuffer);
        gptRealtime.sendAudio(gptSession, pcm24k.toString('base64'));
      },

      onHangup() {
        logger.info({ audioSocketId }, 'Call hangup received');
        cleanup();
      },
    });

    // Timeout: forcefully end call after callTimeout
    const timeout = setTimeout(() => {
      if (!callEnded) {
        logger.warn({ audioSocketId }, 'Call timeout reached, ending');
        cleanup();
      }
    }, (require('../config').asterisk.callTimeout + 5) * 1000);

    // Clear timeout on cleanup
    const origCleanup = cleanup;
    let timeoutCleared = false;
    // Rewrite cleanup to also clear timeout
    resolve = (result) => {
      if (!timeoutCleared) { clearTimeout(timeout); timeoutCleared = true; }
      resolve(result);
    };

    // Return the audioSocketId so the orchestrator can pass it to Asterisk
    return audioSocketId;
  });
}

/**
 * Start a bridge and return { audioSocketId, waitForEnd }.
 * - audioSocketId: pass to Asterisk originate
 * - waitForEnd: promise that resolves with { durationSec } when the call ends
 */
function startBridge(systemPrompt) {
  const audioSocketId = uuidv4();
  let gptSession = null;
  let callEnded = false;
  let callStartTime = null;
  let resolveEnd;
  let playbackTimer = null;

  // Playback buffer: accumulate PCM 8kHz data, drain in 20ms (320-byte) chunks
  const FRAME_SIZE = 320; // 20ms at 8kHz, 16-bit mono = 160 samples × 2 bytes
  const FRAME_INTERVAL_MS = 20;
  let playbackBuffer = Buffer.alloc(0);
  let framesSent = 0;
  let deltasReceived = 0;
  let totalBytesFromGpt = 0;

  const waitForEnd = new Promise((resolve) => { resolveEnd = resolve; });

  function stopPlayback() {
    if (playbackTimer) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }
  }

  function startPlayback() {
    if (playbackTimer) return;
    playbackTimer = setInterval(() => {
      if (callEnded || !bridgeHandlers.socket) {
        stopPlayback();
        return;
      }
      if (playbackBuffer.length >= FRAME_SIZE) {
        const frame = playbackBuffer.subarray(0, FRAME_SIZE);
        playbackBuffer = playbackBuffer.subarray(FRAME_SIZE);
        audioSocket.sendAudioToPhone(bridgeHandlers.socket, frame);
        framesSent++;
        if (framesSent % 50 === 1) {
          logger.debug({ audioSocketId, framesSent, bufferBytes: playbackBuffer.length }, 'audio_frame_sent');
        }
      } else if (playbackBuffer.length > 0) {
        // Send whatever remains (pad with silence)
        const padded = Buffer.alloc(FRAME_SIZE);
        playbackBuffer.copy(padded);
        playbackBuffer = Buffer.alloc(0);
        audioSocket.sendAudioToPhone(bridgeHandlers.socket, padded);
      }
    }, FRAME_INTERVAL_MS);
  }

  function cleanup() {
    if (callEnded) return;
    callEnded = true;

    stopPlayback();
    const duration = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0;
    logger.info({ audioSocketId, framesSent, deltasReceived, totalBytesFromGpt, durationSec: duration }, 'bridge_cleanup_stats');
    if (gptSession) gptRealtime.closeSession(gptSession);
    audioSocket.removeBridge(audioSocketId);
    resolveEnd({ durationSec: duration });
  }

  const bridgeHandlers = {
    socket: null,

    async onConnected() {
      callStartTime = Date.now();
      try {
        gptSession = await gptRealtime.createSession(systemPrompt);

        gptSession.ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString());

            if (event.type === 'response.audio.delta' && event.delta) {
              const pcm24k = Buffer.from(event.delta, 'base64');
              const pcm8k = downsample24to8(pcm24k);
              deltasReceived++;
              totalBytesFromGpt += pcm8k.length;
              // Append to playback buffer; the timer drains it at 20ms intervals
              playbackBuffer = Buffer.concat([playbackBuffer, pcm8k]);
              startPlayback();
              if (deltasReceived % 20 === 1) {
                logger.debug({ audioSocketId, deltasReceived, chunkBytes: pcm8k.length, totalBytesFromGpt, bufferBytes: playbackBuffer.length }, 'gpt_audio_delta');
              }
            }

            // Barge-in: user started speaking → flush playback buffer so AI stops immediately
            if (event.type === 'input_audio_buffer.speech_started') {
              const flushedBytes = playbackBuffer.length;
              playbackBuffer = Buffer.alloc(0);
              gptRealtime.cancelResponse(gptSession);
              logger.info({ audioSocketId, flushedBytes }, 'barge_in: user speaking, buffer flushed');
            }

            if (event.type === 'response.audio.done') {
              logger.debug({ audioSocketId }, 'GPT audio response complete');
            }

            // GPT called hang_up_call function → wait for playback to drain, then end call
            if (event.type === 'response.function_call_arguments.done' && event.name === 'hang_up_call') {
              let reason = 'conversation_complete';
              try { reason = JSON.parse(event.arguments).reason || reason; } catch (_) {}
              logger.info({ audioSocketId, reason }, 'GPT initiated hangup');

              // Send function call output so GPT knows it succeeded
              if (gptSession && !gptSession.ended) {
                gptSession.ws.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: JSON.stringify({ status: 'ok' }),
                  },
                }));
              }

              // Wait for remaining audio to play out, then hang up
              const drainMs = Math.max(500, Math.ceil(playbackBuffer.length / FRAME_SIZE) * FRAME_INTERVAL_MS + 200);
              setTimeout(() => cleanup(), drainMs);
            }
          } catch (err) {
            logger.error({ err: err.message, audioSocketId }, 'Error processing GPT message');
          }
        });

        gptSession.ws.on('close', () => {
          logger.info({ audioSocketId }, 'GPT session closed, ending bridge');
          cleanup();
        });

        // GPT speaks first
        gptRealtime.triggerResponse(gptSession);
        logger.info({ audioSocketId }, 'Audio bridge established');
      } catch (err) {
        logger.error({ err }, 'gpt_session_error');
        cleanup();
      }
    },

    onAudio(pcm8kBuffer) {
      if (!gptSession || gptSession.ended) return;
      const pcm24k = upsample8to24(pcm8kBuffer);
      gptRealtime.sendAudio(gptSession, pcm24k.toString('base64'));
    },

    onHangup() {
      logger.info({ audioSocketId }, 'Call hangup');
      cleanup();
    },
  };

  audioSocket.registerBridge(audioSocketId, bridgeHandlers);

  // Hard timeout
  const timeout = setTimeout(() => {
    if (!callEnded) {
      logger.warn({ audioSocketId }, 'Call timeout, forcing end');
      cleanup();
    }
  }, (require('../config').asterisk.callTimeout + 10) * 1000);

  waitForEnd.then(() => clearTimeout(timeout));

  return { audioSocketId, waitForEnd };
}

module.exports = { startBridge };
