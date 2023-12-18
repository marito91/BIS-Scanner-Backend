// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const http = require('http'); // Import http module
// // const socketIo = require('socket.io'); // Import Socket.io

// // Main routes for APIs
// const { devices } = require('./routes/devices');
// const { books } = require('./routes/books');
// const { users } = require('./routes/users');
// const { textbooks } = require('./routes/textbooks');

// // npm install --save express-validator
// // npm install node-cache
// // npm install socket.io
// const app = express();
// app.use(cors()); // Middleware CORS
// app.use(express.json()); // Middleware json
// app.use(express.urlencoded({ extended: true }));

// const checkDatabaseConnection = (req, res, next) => {
//   const db = mongoose.connection;

//   if (db.readyState !== 1) {
//     // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
//     return res.status(500).json({
//       status: 'Error',
//       msg: 'Cannot establish connection to the Database. Please make sure you have a stable network connection.',
//     });
//   }

//   next();
// };

// app.use(checkDatabaseConnection);

// // Route distribution
// require('dotenv').config();

// // Database connection
// mongoose
//   .connect(process.env.MONGODB_SERVER_URL, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then((res) => console.log('Connected to database'))
//   .catch((error) => console.log(error));

// // Create a basic HTTP server
// const server = http.createServer(app);
// // Import and set up socket.io using your socket.js module
// const { setupSocket } = require('./socket');
// const io = setupSocket(server);

// // Pass the 'io' object to your routes through the app
// app.set('io', io);

// // APIs
// app.use('/users', users);
// app.use('/devices', devices);
// app.use('/books', books);
// app.use('/textbooks', textbooks);

// app.get('/', function (req, res) {
//   res.send('Main route');
// });

// server.listen(5001, () => {
//   console.log('Server listening on port 5001');
// });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');

const { devices } = require('./routes/devices');
const { books } = require('./routes/books');
const { users } = require('./routes/users');
const { textbooks } = require('./routes/textbooks');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to check the database connection
const checkDatabaseConnection = (req, res, next) => {
  const db = mongoose.connection;

  if (db.readyState !== 1) {
    return res.status(500).json({
      status: 'Error',
      msg: 'Cannot establish connection to the Database. Please make sure you have a stable network connection.',
    });
  }

  next();
};

app.use(checkDatabaseConnection);

require('dotenv').config();

// Database connection with error handling
mongoose
  .connect(process.env.MONGODB_SERVER_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to the database');

    // Create a basic HTTP server
    const server = http.createServer(app);
    const { setupSocket } = require('./socket');
    const io = setupSocket(server);

    // Pass the 'io' object to your routes through the app
    app.set('io', io);

    // APIs
    app.use('/users', users);
    app.use('/devices', devices);
    app.use('/books', books);
    app.use('/textbooks', textbooks);

    app.get('/', (req, res) => {
      res.send('Main route');
    });

    // Global error handler middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);

      if (
        err instanceof mongoose.Error ||
        err.name === 'MongooseServerSelectionError'
      ) {
        res.status(500).json({
          status: 'Error',
          msg: 'A problem occurred with the database connection.',
        });
      } else {
        res.status(500).json({
          status: 'Error',
          msg: 'Something went wrong.',
        });
      }
    });

    // Start the server
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to the database:', error.message);
  });
