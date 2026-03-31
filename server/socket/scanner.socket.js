module.exports = function registerScannerEvents(io, socket) {

  socket.on("scanner:scan", (payload) => {

    const token = socket.handshake.auth?.token;

    if (token !== process.env.SCANNER_TOKEN) {
      console.warn("Unauthorized scanner attempt:", socket.id);
      return;
    }
 
    const { desk_no, cardCode, position } = payload;

    io.emit(`desk:${desk_no}:rawScan`, {
      cardCode,
      position
    });
  });
};
