const amqp = require('amqplib');
const express = require('express');

const bodyParser = require('body-parser');


const app = express();
app.use(bodyParser.json());

const port = 3003;

let channel, connection;

async function connectRabbitMQ(retries = 5, delay = 3000) {
  try {
    connection = await amqp.connect('amqp://rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('TASK_CREATED');
    console.log('Connected to RabbitMQ');

    channel.consume('TASK_CREATED', async (msg) => {
      const messageContent = JSON.parse(msg.content.toString());
      console.log('Received TASK_CREATED message:', messageContent.task);
      channel.ack(msg);
    });
  } catch (error) {
    retries--;
    console.error('Error connecting to RabbitMQ:', error.message);
    if (retries > 0) {
      console.log(`Retrying in ${delay / 1000} seconds...`);
      setTimeout(() => connectRabbitMQ(retries, delay), delay);
    } else {
      console.error('Failed to connect after multiple attempts');
    }
  }
}

connectRabbitMQ();
