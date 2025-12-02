const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.json());


// Use environment variable for Mongo URI
const mongoUri = process.env.MONGO_URI || 'mongodb://user-service:27017/tasks';
console.log('Connecting to MongoDB at:', mongoUri);

mongoose.connect(mongoUri, {})
  .then(() => console.log('MongoDB connection established'))
  .catch(err => console.error('MongoDB connection error:', err));

const taskSchema = new mongoose.Schema({
  task: String,
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // reference to User
  createdAt: { type: Date, default: Date.now },
});
const Task = mongoose.model('Task', taskSchema);



const port = 3002;

let channel, connection;

async function connectRabbitMQ(retries=5, delay=3000) {
  try {
    const amqp = require('amqplib');
    connection = await amqp.connect('amqp://rabbitmq_node:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('TASK_CREATED');
    console.log('Connected to RabbitMQ');
  } catch (error) {
    retries--;
    if (retries > 0) {
      console.log(`RabbitMQ connection failed. Retrying in ${delay / 1000} seconds...`);
      setTimeout(() => connectRabbitMQ(retries, delay), delay);
    } else {
      console.error('Failed to connect to RabbitMQ after multiple attempts:', error);
    }
  }
}

connectRabbitMQ();



app.get('/tasks', async (req, res) => {
  const tasks = await Task.find();
  res.status(200).send(tasks);
});


app.post('/tasks', async (req, res) => {
  const { task, description, userId } = req.body;
  try {
    if (!task || !description || !userId) {
      return res.status(400).send('Task, description, and userId are required');
    }

    // Call User service to check if user exists
    const response = await axios.get(`http://user-service:3001/users/${userId}`);
    if (!response.data) {
      return res.status(404).send('User not found');
    }


    const newTask = new Task({ task, description, createdBy: response.data._id });
    await newTask.save();
    const message = {
      taskId: newTask._id,
      userId: response.data._id,
      task: newTask.task,};
    if (!channel) {
      return res.status(503).json('RabbitMQ channel is not established');
    }

    channel.sendToQueue('TASK_CREATED', Buffer.from(JSON.stringify(message)));
     

    res.status(201).send(newTask);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Task Microservice listening at http://localhost:${port}`);
});

module.exports = app;
