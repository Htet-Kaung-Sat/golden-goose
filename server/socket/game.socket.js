// [SECURITY FIX] Role-based authorization: only operators (staff) can emit desk events,
// only admins can emit admin events; scanner role can emit scanner events.

// Action names for desk events (client emits desk:id:action, e.g. desk:5:startTimer)
const OPERATOR_EVENTS = [
  "startTimer",
  "status",
  "result",
  "dealCard",
  "deleteLastCard",
  "finish-session",
  "invalid-game",
];
// Suffixes used to match event names (e.g. "desk:5:startTimer" ends with ":startTimer")
const OPERATOR_EVENT_SUFFIXES = OPERATOR_EVENTS.map((s) => ":" + s);

// Admin events are identified by prefix (e.g. online_player:123:logout)
const ADMIN_EVENT_PREFIXES = [
  "online_player:",
  "user_announcement:",
  "member_topup:",
];
const ADMIN_ALLOWED_ROLES = [
  "admin",
  "developer",
  "sub_account",
  "agent",
  "manager",
];

/** Returns true if the event is an operator-only desk event (staff role). */
function isOperatorEvent(event) {
  // Special case: desk:id:user:userId:net-amount
  if (
    event.startsWith("desk:") &&
    event.includes(":user:") &&
    event.endsWith(":net-amount")
  ) {
    return true;
  }
  return OPERATOR_EVENT_SUFFIXES.some(
    (suffix) => event.includes("desk:") && event.endsWith(suffix),
  );
}

/** Returns true if the event is an admin-only event. */
function isAdminEvent(event) {
  return ADMIN_EVENT_PREFIXES.some((prefix) => event.startsWith(prefix));
}

/** Returns true if the socket's role is allowed to emit this event. */
function canEmit(socket, event) {
  const role = socket.user?.role;
  if (!role) return false;
  if (event.startsWith("scanner:") && role === "scanner") return true;
  if (isOperatorEvent(event)) return role === "staff";
  if (isAdminEvent(event)) return ADMIN_ALLOWED_ROLES.includes(role);
  return false;
}

/** Game socket handler: authorizes emits by role, then forwards allowed events to all clients. */
module.exports = function gameSocket(io, socket) {
  socket.onAny((event, payload) => {
    if (!canEmit(socket, event)) {
      console.warn(
        `[Socket] Unauthorized emit ignored: ${event} from ${socket.id} (role: ${socket.user?.role ?? "none"})`,
      );
      return;
    }

    // --- Operator events: desk control (timer, status, result, cards, session) ---

    // Start Timer: operator sets countdown for betting/dealing phase
    if (event.startsWith("desk:") && event.endsWith(":startTimer")) {
      const deskId = event.split(":")[1];
      io.emit(`desk:${deskId}:updateTimer`, payload);
    }

    // Status Change: operator sets desk state (betting, dealing, active, finished, etc.)
    if (event.startsWith("desk:") && event.endsWith(":status")) {
      const deskId = event.split(":")[1];
      io.emit(`desk:${deskId}:updateStatus`, payload);
    }

    // Result Update: operator broadcasts round result to all clients
    if (event.startsWith("desk:") && event.endsWith(":result")) {
      const deskId = event.split(":")[1];
      io.emit(`desk:${deskId}:updateResult`, payload);
    }

    // Deal Card: operator adds a card to the desk (e.g. baccarat, niuniu)
    if (event.startsWith("desk:") && event.endsWith(":dealCard")) {
      const deskId = event.split(":")[1];
      io.emit(`desk:${deskId}:dealCard`, payload);
    }

    // Delete Last Card: operator removes the last dealt card
    if (event.startsWith("desk:") && event.endsWith(":deleteLastCard")) {
      const deskId = event.split(":")[1];
      io.emit(`desk:${deskId}:deleteLastCard`, payload);
    }

    // Finish Session: operator ends the current desk session
    if (event.startsWith("desk:") && event.endsWith(":finish-session")) {
      const deskId = event.split(":")[1];
      io.emit(`desk:${deskId}:finish-session`, payload);
    }

    // Net Amount: operator updates net win/loss for a user on a desk (broadcast to clients)
    if (
      event.startsWith("desk:") &&
      event.includes(":user:") &&
      event.endsWith(":net-amount")
    ) {
      const parts = event.split(":");
      const deskId = parts[1];
      const userId = parts[3];

      io.emit(`desk:${deskId}:user:${userId}:net-amount`, payload);
    }

    // Invalid Game: operator marks current round as invalid (e.g. misdeal)
    if (event.startsWith("desk:") && event.endsWith(":invalid-game")) {
      const deskId = event.split(":")[1];
      io.emit(`desk:${deskId}:invalid-game`);
    }

    // --- Admin events: user management, announcements, top-up ---

    // Force Logout: admin kicks an online player
    if (event.startsWith("online_player:") && event.endsWith(":logout")) {
      io.emit(`online_player:force_logout`, payload);
    }

    // User Announcement: admin updates announcement (broadcast to clients)
    if (event.startsWith("user_announcement:") && event.endsWith(":change")) {
      io.emit(`user_announcement:change`, payload);
    }

    // Member Top-up: admin triggers top-up refresh for clients
    if (event.startsWith("member_topup:") && event.endsWith(":change")) {
      io.emit(`member_topup:change`);
    }
  });
};
