const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Use environment variable for Mongo URI
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/users';
console.log('Connecting to MongoDB at:', mongoUri);

mongoose.connect(mongoUri, {})
  .then(() => console.log('MongoDB connection established'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
});
const User = mongoose.model('User', userSchema);

const port = 3001;

app.get('/users', async (req, res) => {
  const users = await User.find();
  res.status(200).send(users);
});
//get user by id
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});
app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    if (!name || !email) {
      return res.status(400).send('Name and email are required');
    }
    const user = new User({ name, email });
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`User Microservice listening at http://localhost:${port}`);
});

module.exports = app;
