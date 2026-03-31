import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MODE = import.meta.env.MODE;

export const getSocket = () => {
  if (!socket) {
    socket =
      MODE === "development"
        ? io(API_BASE_URL, {
            withCredentials: true,
            transports: ["polling", "websocket"],
          })
        : io({
            path: "/socket.io",
            withCredentials: true,
            transports: ["websocket", "polling"],
          });
  }

  return socket;
};

/** Disconnects the socket gracefully. */
// disconnectSocket is used to disconnect the socket when the user logs out
export const disconnectSocket = () => {
  if (!socket) return;
  if (socket.connected) {
    socket.disconnect();
    socket = null;
    return;
  }

  // disconnect once the socket is connected
  const s = socket;
  socket = null;
  s.once("connect", () => s.disconnect());
};
