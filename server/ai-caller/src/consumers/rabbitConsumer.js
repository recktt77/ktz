const amqp = require('amqplib');
const config = require('../config');
const logger = require('../utils/logger');

let connection = null;
let channel = null;

async function connect(onCriticalAlert, onAlertResolved) {
  try {
    connection = await amqp.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });

    // Queue for critical alerts
    const alertQ = await channel.assertQueue(config.rabbitmq.queues.criticalAlerts, { durable: true });
    await channel.bindQueue(alertQ.queue, config.rabbitmq.exchange, config.rabbitmq.routingKeys.alertCriticalCreated);
    await channel.prefetch(5);

    channel.consume(alertQ.queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        logger.info({ alert_id: payload.alert_id, locomotive_id: payload.locomotive_id, metric: payload.metric }, 'alert_received');
        await onCriticalAlert(payload);
        channel.ack(msg);
      } catch (err) {
        logger.error({ err }, 'Failed to process critical alert message');
        channel.nack(msg, false, false);
      }
    });

    // Queue for resolved alerts
    const resolvedQ = await channel.assertQueue(config.rabbitmq.queues.resolvedAlerts, { durable: true });
    await channel.bindQueue(resolvedQ.queue, config.rabbitmq.exchange, config.rabbitmq.routingKeys.alertCriticalResolved);

    channel.consume(resolvedQ.queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        logger.info({ alert_id: payload.alert_id, locomotive_id: payload.locomotive_id }, 'alert_resolved');
        await onAlertResolved(payload);
        channel.ack(msg);
      } catch (err) {
        logger.error({ err }, 'Failed to process resolved alert message');
        channel.nack(msg, false, false);
      }
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed, reconnecting...');
      channel = null;
      connection = null;
      setTimeout(() => connect(onCriticalAlert, onAlertResolved), 5_000);
    });

    logger.info('RabbitMQ consumer connected');
  } catch (err) {
    logger.error({ err }, 'Failed to connect RabbitMQ, retrying in 5s');
    setTimeout(() => connect(onCriticalAlert, onAlertResolved), 5_000);
  }
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ consumer closed');
  } catch (err) {
    logger.error({ err }, 'Error closing RabbitMQ consumer');
  }
}

module.exports = { connect, close };
