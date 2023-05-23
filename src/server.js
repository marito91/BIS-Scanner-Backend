const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Main routes for APIs
const { devices } = require('./routes/devices');
// const { newDevices } = require('./routes/newDevices');
const { books } = require('./routes/books');
const { users } = require('./routes/users');

// npm install --save express-validator
const app = express();
app.use(cors()); // Middleware CORS
app.use(express.json()); // Middleware json
app.use(express.urlencoded({ extended: true }));

// Route distribution
require('dotenv').config();

// APIs
app.use('/users', users);
app.use('/devices', devices);
// app.use('/newDevices', newDevices);
app.use('/books', books);

// Database connection
mongoose
  .connect(process.env.MONGODB_SERVER_URL)
  .then((res) => console.log('Connected to database'))
  .catch((error) => console.log(error));

app.get('/', function (req, res) {
  res.send('Main route');
});

app.listen(5001, () => {
  console.log('Server listening on port 5001');
});
