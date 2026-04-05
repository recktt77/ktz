const WebSocket = require('ws');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Create a GPT Realtime API session via WebSocket.
 * Returns the WebSocket connection + utility methods.
 *
 * GPT Realtime API protocol:
 * - Connect to wss://api.openai.com/v1/realtime?model=<model>
 * - Auth via header: Authorization: Bearer <key>
 * - Send session.update with instructions + audio config
 * - Send input_audio_buffer.append with base64 PCM chunks
 * - Receive response.audio.delta with base64 audio chunks
 */
function createSession(systemPrompt) {
  return new Promise((resolve, reject) => {
    const url = `${config.openai.realtimeUrl}?model=${config.openai.realtimeModel}`;

    const ws = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const session = {
      ws,
      ready: false,
      ended: false,
    };

    ws.on('open', () => {
      logger.debug('GPT Realtime WebSocket connected');

      // Configure session
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: systemPrompt,
          voice: config.openai.voice,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: [
            {
              type: 'function',
              name: 'hang_up_call',
              description: 'Завершить телефонный звонок. Вызови эту функцию когда разговор завершён: информация передана, собеседник подтвердил получение, или попрощался. Не завершай звонок пока собеседник не подтвердил что понял информацию.',
              parameters: {
                type: 'object',
                properties: {
                  reason: {
                    type: 'string',
                    description: 'Причина завершения звонка',
                  },
                },
                required: ['reason'],
              },
            },
          ],
        },
      }));
    });

    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());

        if (event.type === 'session.created' || event.type === 'session.updated') {
          session.ready = true;
          resolve(session);
        }

        if (event.type === 'error') {
          // Ignore harmless cancel-not-active error (barge-in race with server VAD)
          if (event.error?.code === 'response_cancel_not_active') return;
          logger.error({ error: event.error }, 'GPT Realtime error');
          if (!session.ready) reject(new Error(event.error?.message || 'GPT session error'));
        }
      } catch (err) {
        logger.error({ err }, 'Failed to parse GPT Realtime message');
      }
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'GPT Realtime WebSocket error');
      session.ended = true;
      if (!session.ready) reject(err);
    });

    ws.on('close', (code, reason) => {
      logger.info({ code, reason: reason?.toString() }, 'GPT Realtime session closed');
      session.ended = true;
    });

    // Timeout for initial connection
    setTimeout(() => {
      if (!session.ready) {
        ws.close();
        reject(new Error('GPT Realtime session timeout'));
      }
    }, 10_000);
  });
}

/**
 * Send PCM16 audio chunk to GPT Realtime session.
 * Audio must be base64-encoded PCM16 at 24kHz mono.
 */
function sendAudio(session, pcm16Base64) {
  if (session.ended || session.ws.readyState !== WebSocket.OPEN) return;

  session.ws.send(JSON.stringify({
    type: 'input_audio_buffer.append',
    audio: pcm16Base64,
  }));
}

/**
 * Trigger GPT to generate a response (used to initiate the greeting).
 */
function triggerResponse(session) {
  if (session.ended || session.ws.readyState !== WebSocket.OPEN) return;

  session.ws.send(JSON.stringify({
    type: 'response.create',
    response: {
      modalities: ['text', 'audio'],
    },
  }));
}

/**
 * Cancel the current in-progress response (barge-in).
 */
function cancelResponse(session) {
  if (session.ended || session.ws.readyState !== WebSocket.OPEN) return;

  session.ws.send(JSON.stringify({
    type: 'response.cancel',
  }));
}

/**
 * Close GPT Realtime session.
 */
function closeSession(session) {
  if (session && session.ws && session.ws.readyState === WebSocket.OPEN) {
    session.ws.close();
  }
  session.ended = true;
}

module.exports = { createSession, sendAudio, triggerResponse, cancelResponse, closeSession };
