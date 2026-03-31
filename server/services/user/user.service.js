const {
  GameSession,
  GameRound,
  Bet,
  BetResult,
  RoundResult,
  Result,
} = require("../../models");

/**
 * [SLOW-NETWORK FIX] Get last finished round result for a desk and user.
 * Returns { message, data } for the client to apply the result when socket events are lost.
 * @param {string} deskId - desk_id from route
 * @param {string} lastRoundId - last_round_id from route
 * @param {number} userId - authenticated user id
 * @returns {Promise<{ message: string, data: object }>}
 */
const getLastRoundResult = async (deskId, lastRoundId, userId) => {
  const session = await GameSession.findOne({
    where: {
      desk_id: deskId,
      status: "active",
    },
    attributes: ["id"],
  });

  if (!session) {
    return {
      message: "No active session",
      data: {
        round_id: null,
        result: null,
        net_amount: 0,
      },
    };
  }

  const lastFinishedRound = await GameRound.findOne({
    where: {
      session_id: session.id,
      id: lastRoundId,
      status: "finished",
    },
    order: [["round_no", "DESC"]],
    attributes: ["id"],
  });

  if (!lastFinishedRound) {
    return {
      message: "No finished round",
      data: {
        round_id: null,
        result: null,
        net_amount: 0,
      },
    };
  }

  // calculate net amount
  const bet = await Bet.findOne({
    where: {
      round_id: lastFinishedRound.id,
      user_id: userId,
    },
    attributes: ["id"],
  });

  if (!bet) {
    return {
      message: "No bet found",
      data: {
        round_id: null,
        result: null,
        net_amount: 0,
      },
    };
  }

  const winAmount = await BetResult.sum("actual_win_lose_amount", {
    where: {
      bet_id: bet.id,
      cancel_flg: false,
      settle_flg: true,
      win_lose_flg: true,
    },
  });

  const loseAmount = await BetResult.sum("actual_win_lose_amount", {
    where: {
      bet_id: bet.id,
      cancel_flg: false,
      settle_flg: true,
      win_lose_flg: false,
    },
  });

  const netAmount = (winAmount || 0) - (loseAmount || 0);

  // get round results
  const roundResults = await RoundResult.findAll({
    where: { round_id: lastFinishedRound.id },
    include: [{ model: Result, as: "result", attributes: ["key"] }],
  });

  const resultString = roundResults.map((rr) => rr.result.key).join("|");

  return {
    message: "Last round result fetched",
    data: {
      round_id: lastFinishedRound.id,
      result: resultString || null,
      net_amount: netAmount,
    },
  };
};

module.exports = {
  getLastRoundResult,
};
