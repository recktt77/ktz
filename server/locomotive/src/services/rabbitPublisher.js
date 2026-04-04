const amqp = require('amqplib');
const config = require('../config');
const logger = require('../utils/logger');

let connection = null;
let channel = null;

async function connect() {
  try {
    connection = await amqp.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    // Declare a topic exchange for telemetry events
    await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed, will retry...');
      channel = null;
      connection = null;
      setTimeout(connect, 5000);
    });

    logger.info('RabbitMQ connected');
  } catch (err) {
    logger.error('Failed to connect to RabbitMQ', { error: err.message });
    // Retry after delay
    setTimeout(connect, 5000);
  }
}

/**
 * Publish a message to the telemetry exchange.
 * @param {string} routingKey - e.g. 'telemetry.raw.received'
 * @param {object} payload - message payload
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
    timestamp: Date.now(),
  });

  return true;
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ connection closed gracefully');
  } catch (err) {
    logger.error('Error closing RabbitMQ', { error: err.message });
  }
}

module.exports = { connect, publish, close };
