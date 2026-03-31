const socketAuthMiddleware = require("./auth.middleware.js");
const gameSocket = require("./game.socket.js");
const registerScannerEvents = require("./scanner.socket.js");

module.exports = function mainSocket(io) {
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const user = socket.user;
    const role = user?.role ?? "unknown";
    const id = user?.id ?? user?.account ?? socket.id;
    console.log(`Socket connected: ${socket.id} (${role}: ${id})`.bgCyan.white);
    if (global.logger) {
      global.logger.info({ socketId: socket.id, role, id }, "Socket connected");
    }

    gameSocket(io, socket);
    registerScannerEvents(io, socket);
  });
};
