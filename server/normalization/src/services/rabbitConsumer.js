const amqp = require('amqplib');
const config = require('../config');
const logger = require('../utils/logger');

let connection = null;
let channel = null;
let messageHandler = null;

async function connect(handler) {
  messageHandler = handler;

  try {
    connection = await amqp.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    // Bind to the telemetry exchange
    await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
    const q = await channel.assertQueue(config.rabbitmq.queue, { durable: true });

    // Listen for raw telemetry events
    await channel.bindQueue(q.queue, config.rabbitmq.exchange, config.rabbitmq.routingKeys.rawReceived);

    // Prefetch to handle burst
    await channel.prefetch(50);

    channel.consume(q.queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await messageHandler(content);
        channel.ack(msg);
      } catch (err) {
        logger.error('Error processing RabbitMQ message', { error: err.message });
        // Reject and don't requeue malformed messages
        channel.nack(msg, false, false);
      }
    });

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed, will retry...');
      // Clean up old references before reconnecting
      if (connection) {
        connection.removeAllListeners();
      }
      channel = null;
      connection = null;
      setTimeout(() => connect(messageHandler), 5000);
    });

    logger.info(`RabbitMQ consumer connected, listening on ${q.queue}`);
  } catch (err) {
    logger.error('Failed to connect RabbitMQ consumer', { error: err.message });
    setTimeout(() => connect(messageHandler), 5000);
  }
}

/**
 * Publish processed events back to exchange.
 */
function publish(routingKey, payload) {
  if (!channel) {
    logger.warn('RabbitMQ channel not ready, message dropped', { routingKey });
    return false;
  }
  const message = Buffer.from(JSON.stringify(payload));
  channel.publish(config.rabbitmq.exchange, routingKey, message, {
    persistent: true,
    contentType: 'application/json',
  });
  return true;
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ consumer closed');
  } catch (err) {
    logger.error('Error closing RabbitMQ consumer', { error: err.message });
  }
}

module.exports = { connect, publish, close };
