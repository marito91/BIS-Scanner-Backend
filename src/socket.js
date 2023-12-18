const socketIo = require('socket.io');

let io; // This will hold the socket.io instance

function setupSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('New socket connection!');
    // You can add more socket-related logic here if needed
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error(
      'Socket.io has not been initialized. Call setupSocket first.'
    );
  }
  return io;
}

module.exports = {
  setupSocket,
  getIo,
};
