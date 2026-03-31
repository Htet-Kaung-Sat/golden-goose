const {
  Game,
  Desk,
  Camera,
  Result,
  NiuniuRound,
  NiuniuPlayerHand,
  UserRateLimit,
  RateLimit,
  ResultRateLimit,
  Bet,
  BetResult,
  Role,
  User,
  GameRound,
  Transaction,
  GameSession,
  RoundResult,
  Announce,
  sequelize,
} = require("../../models");
const { response } = require("../../utils/response.js");
const {
  updateGameRoundSchema,
} = require("../../validations/gameRound.validation.js");
const { Op } = require("sequelize");
const moment = require("moment");
const userService = require("../../services/user/user.service.js");

const getGames = async (req, res) => {
  try {
    const games = await Game.findAll({
      include: [
        {
          model: Desk,
          as: "desks",
        },
        {
          model: Result,
          as: "results",
        },
      ],
      order: [["id", "ASC"]],
    });

    return response(res, 200, true, "Games fetched successfully", {
      games,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", {
      error: error.message,
    });
  }
};

const getDesks = async (req, res) => {
  try {
    const desks = await Desk.findAll({
      include: [
        {
          model: Game,
          as: "game",
        },
      ],
      order: [["position", "ASC"]],
    });

    const enrichedDesks = await Promise.all(
      desks.map(async (desk) => {
        let session = await GameSession.findOne({
          where: {
            desk_id: desk.id,
            status: "active",
          },
        });

        let lastRound = null;
        let results = [];

        if (session) {
          // Get last round
          lastRound = await GameRound.findOne({
            where: { session_id: session.id },
            order: [["round_no", "DESC"]],
          });

          const rounds = await GameRound.findAll({
            where: { session_id: session.id },
            order: [["round_no", "ASC"]],
          });

          const roundIds = rounds.map((r) => r.id);

          if (roundIds.length > 0) {
            // Get round results
            const roundResults = await RoundResult.findAll({
              where: { round_id: roundIds },
              include: [
                {
                  model: Result,
                  as: "result",
                },
              ],
            });

            // Build results map
            const resultsMap = {};
            roundResults.forEach((rr) => {
              if (!resultsMap[rr.round_id]) {
                resultsMap[rr.round_id] = [];
              }
              resultsMap[rr.round_id].push(rr.result.key);
            });

            results = Object.keys(resultsMap).map((roundId) => ({
              round_id: Number(roundId),
              key: resultsMap[roundId].join("|"),
            }));
          }
        }

        return {
          ...desk.toJSON(),
          session,
          last_round: lastRound,
          results,
        };
      }),
    );

    return response(res, 200, true, "Desks fetched successfully", {
      desks: enrichedDesks,
    });
  } catch (error) {
    return response(res, 500, false, "Server error", {
      error: error.message,
    });
  }
};

const getLastRoundStatus = async (req, res) => {
  try {
    let session = await GameSession.findOne({
      where: {
        desk_id: req.params.desk_id,
        status: "active",
      },
      attributes: ["id"],
    });

    const lastRound = await GameRound.findOne({
      where: { session_id: session.id },
      order: [["round_no", "DESC"]],
      attributes: ["status"],
    });

    return response(res, 200, true, "Last round fetched successfully", {
      lastRound,
    });
  } catch (error) {
    return response(res, 500, false, "Server error", {
      error: error.message,
    });
  }
};

// [SLOW-NETWORK FIX] Polling fallback API for user panel.
// Returns { round_id, result } for the last finished round on a desk,
// so the client can apply the result even when socket events are lost.
const getLastRoundResult = async (req, res) => {
  try {
    const { desk_id, last_round_id } = req.params;
    const result = await userService.getLastRoundResult(
      desk_id,
      last_round_id,
      req.user.id,
    );
    return response(res, 200, true, result.message, result.data);
  } catch (error) {
    return response(res, 500, false, "Server error", {
      error: error.message,
    });
  }
};

const getCameras = async (req, res) => {
  try {
    const cameras = await Camera.findAll({
      where: {
        status: "ACTIVE",
      },
      include: [
        {
          model: Desk,
          as: "desk",
        },
      ],
    });

    return response(res, 200, true, "Active cameras fetched successfully", {
      cameras,
    });
  } catch (error) {
    return response(res, 500, false, "Server error", {
      error: error.message,
    });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role, as: "role" },
        {
          model: UserRateLimit,
          as: "userRateLimits",
          include: [
            {
              model: RateLimit,
              as: "rateLimit",
              include: [{ model: ResultRateLimit, as: "results" }],
            },
          ],
        },
      ],
    });

    if (!user) return response(res, 404, false, "User not found");

    response(res, 200, true, "User fetched successfully", { user });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ["password"],
      },
      include: [
        {
          model: UserRateLimit,
          as: "userRateLimits",
          include: [
            {
              model: RateLimit,
              as: "rateLimit",
              include: [
                { model: Game, as: "game", attributes: ["id", "name", "type"] },
              ],
            },
          ],
        },
      ],
    });

    if (!user) return response(res, 404, false, "User not found");

    response(res, 200, true, "Profile fetched successfully", { user });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getResultsByDesk = async (req, res) => {
  try {
    const desk = await Desk.findByPk(req.params.id);

    if (!desk) return response(res, 404, false, "Desk not found");

    const results = await Result.findAll({
      where: { game_id: desk.game_id, baccarat_type: desk.baccarat_type },
      order: [["position", "ASC"]],
    });

    response(res, 200, true, "Result fetched successfully", { results });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getNiuniuResultsByDesk = async (req, res) => {
  try {
    const { desk_id } = req.params;

    const session = await GameSession.findOne({
      where: {
        desk_id,
        status: "active",
      },
    });

    if (!session) {
      return response(res, 404, false, "No active game session found");
    }

    const rounds = await GameRound.findAll({
      where: {
        session_id: session.id,
        status: "finished",
      },
      attributes: ["id"],
    });

    if (!rounds.length) {
      return response(res, 200, true, "No niuniu results", {
        niuniuResults: [],
        winCount: { player1: 0, player2: 0, player3: 0 },
      });
    }

    const roundIds = rounds.map((r) => r.id);

    const niuniuRounds = await NiuniuRound.findAll({
      where: {
        game_round_id: roundIds,
      },
      raw: true,
    });

    if (!niuniuRounds.length) {
      return response(res, 200, true, "No niuniu results", {
        niuniuResults: [],
        winCount: { player1: 0, player2: 0, player3: 0 },
      });
    }

    const niuniuRoundIds = niuniuRounds.map((n) => n.id);

    const playerHands = await NiuniuPlayerHand.findAll({
      where: {
        niuniu_round_id: niuniuRoundIds,
      },
      raw: true,
    });

    const formatNiuValue = (niuValue, handType) => {
      if (handType === "bomb") return "炸弹";
      if (handType === "fiveFace") return "5公";
      return niuValue === 0 ? "N" : niuValue;
    };

    let winCount = {
      player1: 0,
      player2: 0,
      player3: 0,
    };

    const niuniuResults = niuniuRounds.map((niu) => {
      const hands = playerHands.filter((h) => h.niuniu_round_id === niu.id);

      const result = {
        banker: formatNiuValue(niu.banker_niu_value, niu.banker_hand_type),
        player1: null,
        player2: null,
        player3: null,
        player1Win: false,
        player2Win: false,
        player3Win: false,
      };

      hands.forEach((hand) => {
        const niuValue = formatNiuValue(hand.niu_value, hand.hand_type);
        const isWin = hand.result === "win";

        if (hand.player_position === "player1") {
          result.player1 = niuValue;
          result.player1Win = isWin;
          if (isWin) winCount.player1++;
        }

        if (hand.player_position === "player2") {
          result.player2 = niuValue;
          result.player2Win = isWin;
          if (isWin) winCount.player2++;
        }

        if (hand.player_position === "player3") {
          result.player3 = niuValue;
          result.player3Win = isWin;
          if (isWin) winCount.player3++;
        }
      });

      return result;
    });

    return response(res, 200, true, "Niuniu results fetched successfully", {
      niuniuResults,
      winCount,
    });
  } catch (error) {
    console.error("Get Niuniu Results Error:", error);
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getConfirmedBets = async (req, res) => {
  try {
    const user_id = req.user.id;

    const bet = await Bet.findOne({
      where: {
        round_id: req.params.last_round,
        user_id,
      },
    });

    if (!bet) {
      return response(res, 200, true, "No bet found", {});
    }

    const totalBetAmount = await BetResult.sum("amount", {
      where: {
        bet_id: bet.id,
        cancel_flg: false,
      },
    });

    const confirmedBetsRaw = await BetResult.findAll({
      where: {
        bet_id: bet.id,
        cancel_flg: false,
      },
      include: [
        {
          model: Result,
          as: "result",
          attributes: [],
        },
      ],
      attributes: [
        "result_id",
        [sequelize.col("result.key"), "result_key"],
        [sequelize.fn("SUM", sequelize.col("amount")), "amount"],
        [
          sequelize.literal(`(
            SELECT br2.image
            FROM BetResults br2
            WHERE br2.result_id = BetResult.result_id
              AND br2.bet_id = ${bet.id}
              AND br2.cancel_flg = false
            ORDER BY br2.id DESC
            LIMIT 1
          )`),
          "image",
        ],
      ],
      group: ["result_id", "result.key"],
      raw: true,
    });

    const DOUBLE_KEYS = [
      "banker1Double",
      "banker2Double",
      "banker3Double",
      "player1Double",
      "player2Double",
      "player3Double",
    ];

    const confirmedBets = {};

    for (const b of confirmedBetsRaw) {
      const isDouble = DOUBLE_KEYS.includes(b.result_key);

      confirmedBets[b.result_key] = {
        result_id: b.result_id,
        amount: isDouble ? Number(b.amount) / 3 : Number(b.amount),
        image: b.image,
      };
    }

    return response(res, 200, true, "Confirmed bets fetched successfully", {
      confirmedBets,
      totalBetAmount,
    });
  } catch (error) {
    return response(res, 500, false, "Server error", {
      error: error.message,
    });
  }
};

const createBetResult = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { last_round, bets } = req.body;
    const user_id = req.user.id;
    const ip_address = req.user.ip_address;

    if (!bets?.length) {
      await t.rollback();
      return response(res, 400, false, "No bets provided");
    }

    const totalBetAmountFromRequest = bets.reduce(
      (sum, b) => sum + Number(b.amount || 0),
      0,
    );

    const user = await User.findByPk(user_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!user) {
      await t.rollback();
      return response(res, 404, false, "User not found");
    }
    if (Number(user.balance) < totalBetAmountFromRequest) {
      await t.rollback();
      return response(res, 400, false, "Insufficient balance");
    }

    let bet = await Bet.findOne({
      where: { round_id: last_round, user_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!bet) {
      bet = await Bet.create(
        { round_id: last_round, user_id, ip_address },
        { transaction: t },
      );
    }

    const betResultRows = await BetResult.bulkCreate(
      bets.map((b) => ({
        bet_id: bet.id,
        result_id: b.result_id,
        amount: b.amount,
        cancel_flg: false,
        settle_flg: false,
        image: b.image,
      })),
      { transaction: t },
    );

    let runningBalance = Number(user.balance);
    const transactionRows = betResultRows.map((betResult, i) => {
      const amount = Number(bets[i].amount || 0);
      const before_amount = runningBalance;
      runningBalance -= amount;
      return {
        user_id,
        bet_result_id: betResult.id,
        transaction_type: "betting",
        amount,
        before_amount,
        after_amount: runningBalance,
      };
    });
    await Transaction.bulkCreate(transactionRows, { transaction: t });

    await user.update({ balance: runningBalance }, { transaction: t });

    const totalBetAmount = await BetResult.sum("amount", {
      where: {
        bet_id: bet.id,
        cancel_flg: false,
      },
      transaction: t,
    });

    const confirmedBetsRaw = await BetResult.findAll({
      where: {
        bet_id: bet.id,
        cancel_flg: false,
      },
      include: [
        {
          model: Result,
          as: "result",
          attributes: [],
        },
      ],
      attributes: [
        "result_id",
        [sequelize.col("result.key"), "result_key"],
        [sequelize.fn("SUM", sequelize.col("amount")), "amount"],
        [
          sequelize.literal(`(
            SELECT br2.image
            FROM BetResults br2
            WHERE br2.result_id = BetResult.result_id
              AND br2.bet_id = :betId
              AND br2.cancel_flg = false
            ORDER BY br2.id DESC
            LIMIT 1
          )`),
          "image",
        ],
      ],
      group: ["result_id", "result.key"],
      replacements: { betId: bet.id },
      transaction: t,
      raw: true,
    });

    const DOUBLE_KEYS = [
      "banker1Double",
      "banker2Double",
      "banker3Double",
      "player1Double",
      "player2Double",
      "player3Double",
    ];

    const confirmedBets = {};

    for (const b of confirmedBetsRaw) {
      const isDouble = DOUBLE_KEYS.includes(b.result_key);

      confirmedBets[b.result_key] = {
        result_id: b.result_id,
        amount: isDouble ? Number(b.amount) / 3 : Number(b.amount),
        image: b.image,
      };
    }

    await t.commit();

    return response(res, 200, true, "Bet results saved successfully", {
      totalBetAmount: Number(totalBetAmount || 0),
      remainingBalance: Number(runningBalance),
      confirmedBets,
    });
  } catch (error) {
    await t.rollback();
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateBetResult = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { last_round, results } = req.body;
    const user_id = req.user.id;

    const bet = await Bet.findOne({
      where: { round_id: last_round, user_id },
      transaction: t,
    });

    if (!bet)
      return response(res, 404, false, "Bet not found for this round and user");

    const user = await User.findByPk(user_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const bet_results = await BetResult.findAll({
      where: {
        bet_id: bet.id,
        cancel_flg: false,
      },
      include: [
        {
          model: Result,
          as: "result",
          attributes: ["ratio", "id"],
        },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const transactions = await Transaction.findAll({
      where: { bet_result_id: bet_results.map((br) => br.id) },
      order: [["id", "ASC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const brById = new Map();
    for (const br of bet_results) brById.set(br.id, br);

    const incomingByResultId = new Map();
    for (const r of results) incomingByResultId.set(r.result_id, r);

    if (transactions.length === 0) {
      await t.commit();
      return response(res, 200, true, "No transactions found for this bet");
    }

    let runningBalance = Number(transactions[0].before_amount);

    for (let i = 0; i < transactions.length; i++) {
      const tr = transactions[i];
      const br = brById.get(tr.bet_result_id);

      if (!br) {
        if (Number(tr.before_amount) !== runningBalance) {
          await tr.update(
            { before_amount: runningBalance },
            { transaction: t },
          );
        }
        await tr.update({ after_amount: runningBalance }, { transaction: t });
        continue;
      }

      const incoming = incomingByResultId.get(br.result_id);

      if (!incoming) {
        if (Number(tr.before_amount) !== runningBalance) {
          await tr.update(
            { before_amount: runningBalance },
            { transaction: t },
          );
        }
        await tr.update({ after_amount: runningBalance }, { transaction: t });
        continue;
      }

      let actualAmount = 0;
      let transactionType = null;
      if (incoming.win_lose_flg === false) {
        actualAmount = Number(br.amount);
        transactionType = "lose";
        await br.update(
          {
            win_lose_flg: false,
            actual_win_lose_amount: actualAmount,
            settle_flg: true,
          },
          { transaction: t },
        );

        if (Number(tr.before_amount) !== runningBalance) {
          await tr.update(
            { before_amount: runningBalance },
            { transaction: t },
          );
        }

        const after = runningBalance - actualAmount;
        await tr.update(
          { transaction_type: transactionType, after_amount: after },
          { transaction: t },
        );

        runningBalance = after;
      } else {
        const ratio =
          br.result && br.result.ratio ? Number(br.result.ratio) : 0;
        actualAmount = Number(br.amount) * ratio;
        transactionType = "win";

        await br.update(
          {
            win_lose_flg: true,
            actual_win_lose_amount: actualAmount,
            settle_flg: true,
          },
          { transaction: t },
        );

        if (Number(tr.before_amount) !== runningBalance) {
          await tr.update(
            { before_amount: runningBalance },
            { transaction: t },
          );
        }

        const after = runningBalance + actualAmount;
        await tr.update(
          { transaction_type: transactionType, after_amount: after },
          { transaction: t },
        );

        runningBalance = after;
      }

      if (i + 1 < transactions.length) {
        const nextTr = transactions[i + 1];
        if (Number(nextTr.before_amount) !== runningBalance) {
          await nextTr.update(
            { before_amount: runningBalance },
            { transaction: t },
          );
        }
      }
    }

    await user.update({ balance: runningBalance }, { transaction: t });

    await t.commit();
    return response(
      res,
      200,
      true,
      "BetResult, Transactions and User Balance updated successfully",
    );
  } catch (error) {
    await t.rollback();
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const cancelBetResult = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { last_round } = req.body;
    const user_id = req.user.id;

    const bet = await Bet.findOne({
      where: { round_id: last_round, user_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!bet) {
      await t.rollback();
      return response(res, 200, true, "No bet found to cancel");
    }

    const betResults = await BetResult.findAll({
      where: {
        bet_id: bet.id,
        cancel_flg: false,
      },
      order: [["id", "ASC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (betResults.length === 0) {
      await t.rollback();
      return response(res, 200, true, "No bet results to cancel");
    }

    const totalCancelAmount = betResults.reduce(
      (sum, br) => sum + Number(br.amount),
      0,
    );

    const user = await User.findByPk(user_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const beforeAmount = Number(user.balance);
    const afterAmount = beforeAmount + totalCancelAmount;

    await BetResult.update(
      { cancel_flg: true },
      {
        where: { id: betResults.map((br) => br.id) },
        transaction: t,
      },
    );

    const lastBetResultId = betResults.at(-1).id;

    await Transaction.create(
      {
        user_id,
        bet_result_id: lastBetResultId,
        transaction_type: "cancel",
        amount: totalCancelAmount,
        before_amount: beforeAmount,
        after_amount: afterAmount,
      },
      { transaction: t },
    );

    await user.update({ balance: afterAmount }, { transaction: t });

    await t.commit();

    return response(res, 200, true, "Bet cancelled and balance restored");
  } catch (error) {
    await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateBetKey = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { last_round, result_id, new_result_id } = req.body;
    const user_id = req.user.id;

    const bet = await Bet.findOne({
      where: {
        round_id: last_round,
        user_id,
      },
      transaction: t,
    });

    if (!bet) {
      await t.rollback();
      return response(res, 200, false, "Bet not found");
    }

    const betResult = await BetResult.findOne({
      where: {
        bet_id: bet.id,
        result_id,
      },
      transaction: t,
    });

    if (!betResult) {
      await t.rollback();
      return response(res, 200, false, "Bet result not found");
    }

    await betResult.update({ result_id: new_result_id }, { transaction: t });

    await t.commit();

    return response(res, 200, true, "Bet Result updated successfully");
  } catch (error) {
    await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateGameRound = async (req, res) => {
  try {
    const { error, value } = updateGameRoundSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const round = await GameRound.findByPk(req.params.id);
    if (!round) return response(res, 404, false, "Game round not found");

    await round.update(value);
    response(res, 200, true, "Game round updated successfully", { round });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

/** GET /api/user/announce - Latest user-facing announcement (type 1) for members. */
const getAnnounce = async (req, res) => {
  try {
    const announces = await Announce.findAll({
      where: { type: 1 },
      include: [{ model: User, as: "user" }],
      order: [["updatedAt", "DESC"]],
      limit: 1,
    });
    response(res, 200, true, "Announce fetched successfully", { announces });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const user_id = req.user.id;
    if (!user_id) {
      return response(res, 400, false, "User ID is required");
    }
    const filter = req.query.filter;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let startDate = moment().startOf("day").add(8, "hours");
    let endDate = moment().add(1, "day").startOf("day").add(8, "hours");
    if (filter === "yesterday") {
      startDate = moment().subtract(1, "days").startOf("day").add(8, "hours");
      endDate = moment().startOf("day").add(8, "hours");
    } else if (filter === "7days") {
      startDate = moment().subtract(7, "days").startOf("day").add(8, "hours");
    }
    const { count, rows } = await Transaction.findAndCountAll({
      attributes: [
        [
          sequelize.fn("LPAD", sequelize.col("bet_result_id"), 8, "0"),
          "bet_result_id",
        ],
        [sequelize.fn("LPAD", sequelize.col("topup_no"), 8, "0"), "topup_no"],
        [
          sequelize.fn("LPAD", sequelize.col("recalculate_no"), 8, "0"),
          "recalculate_no",
        ],
        "transaction_type",
        "amount",
        "after_amount",
        "before_amount",
        "createdAt",
      ],
      where: {
        user_id,
        createdAt: {
          [Op.gte]: startDate.toDate(),
          [Op.lt]: endDate.toDate(),
        },
      },
      order: [["id", "DESC"]],
      limit: limit,
      offset: offset,
    });
    const totals = await Transaction.findOne({
      attributes: [
        [
          sequelize.literal(
            `SUM(CASE WHEN transaction_type = 'betting' THEN amount ELSE 0 END)`,
          ),
          "totalBet",
        ],
        [
          sequelize.literal(
            `SUM(CASE WHEN transaction_type = 'payout' OR transaction_type = 'recalculate' OR transaction_type = 'cancel' THEN amount WHEN transaction_type = 'betting' THEN -amount ELSE 0 END)`,
          ),
          "totalWinLoss",
        ],
      ],
      where: {
        user_id,
        createdAt: {
          [Op.gte]: startDate.toDate(),
          [Op.lt]: endDate.toDate(),
        },
      },
      raw: true,
    });
    response(res, 200, true, "Transactions retrieved successfully", {
      transactions: rows,
      summary: {
        totalBet: Number(totals.totalBet) || 0,
        totalWinLoss: Number(totals.totalWinLoss) || 0,
      },
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getUserBetResults = async (req, res) => {
  try {
    const userId = req.user.id;
    const filterDateValue = req.query.date || "";
    const commonSql = `COALESCE(
                  CASE
                    WHEN br.cancel_flg = TRUE OR br.settle_flg = FALSE THEN 0
                    WHEN d.name LIKE "%N%" OR d.name = "G20" THEN 0
                    WHEN r.key IN ("big", "small", "dragonSingle", "dragonDouble", "tigerDouble", "tigerSingle") THEN 0
                    WHEN br.win_lose_flg IS NULL THEN 0
                    WHEN r.key IN ("banker", "player", "dragon", "tiger") THEN
                      COALESCE(
                        (SELECT
                          CASE
                            WHEN u.bonus_type = "single" THEN
                              CASE WHEN br.win_lose_flg = FALSE AND br.amount > COALESCE(opp.amount, 0)
                              THEN (br.amount - COALESCE(opp.amount, 0)) * (u.bonus_rate / 100) ELSE 0 END
                            WHEN u.bonus_type = "both" THEN
                              CASE WHEN br.amount > COALESCE(opp.amount, 0)
                              THEN (br.amount - COALESCE(opp.amount, 0)) * (u.bonus_rate / 100) ELSE 0 END
                            ELSE 0
                          END
                        FROM BetResults opp
                        JOIN Results r_opp ON opp.result_id = r_opp.id
                        WHERE opp.bet_id = br.bet_id
                          AND r_opp.key IN ("banker", "player", "dragon", "tiger")
                          AND r_opp.key != r.key
                        LIMIT 1
                        ),
                        CASE
                          WHEN (u.bonus_type = "single" AND br.win_lose_flg = FALSE) OR u.bonus_type = "both"
                          THEN br.amount * (u.bonus_rate / 100)
                          ELSE 0
                        END
                      )
                    ELSE
                      CASE
                        WHEN (u.bonus_type = "single" AND br.win_lose_flg = FALSE) OR u.bonus_type = "both"
                        THEN (br.amount * (u.bonus_rate / 100))
                        ELSE 0
                      END
                  END, 0
                )`;
    const query = `
      SELECT DATE(DATE_SUB(br.createdAt, INTERVAL 8 HOUR)) AS report_date,
            CONCAT(
                COALESCE(SUM(CASE WHEN br.cancel_flg = TRUE OR (br.cancel_flg = FALSE AND br.settle_flg = TRUE OR br.settle_flg = FALSE) THEN br.amount ELSE 0 END), 0), 
                '\n',
                COALESCE(SUM(CASE WHEN br.cancel_flg = FALSE AND br.win_lose_flg IS NOT NULL THEN br.amount ELSE 0 END), 0)
            ) AS amount_summary,
            SUM(
                CASE WHEN br.cancel_flg = FALSE AND br.settle_flg = TRUE AND br.win_lose_flg IS NOT NULL
                  THEN
                    CASE WHEN br.win_lose_flg = TRUE
                      THEN br.actual_win_lose_amount
                      ELSE -br.actual_win_lose_amount
                    END
                  ELSE 0
                END
            ) AS win_lose_total_amount,
            CONCAT(
              SUM(
               ${commonSql}
              ),
            '\n',
              COALESCE(
                SUM(
                  CASE 
                    WHEN br.cancel_flg = TRUE OR br.settle_flg = FALSE THEN 0
                    WHEN d.name LIKE '%N%' OR d.name = 'G20' THEN 0
                    WHEN r.key IN ('big', 'small', 'dragonSingle', 'dragonDouble', 'tigerDouble', 'tigerSingle') THEN 0
                    WHEN br.win_lose_flg IS NULL THEN 0
                    WHEN r.key IN ('banker', 'player') THEN
                      COALESCE(
                        (SELECT 
                          CASE 
                            WHEN u.bonus_type = 'single' THEN
                              CASE 
                                WHEN br.win_lose_flg = FALSE 
                                  AND br.amount > COALESCE(opp.amount, 0)
                                THEN br.amount - COALESCE(opp.amount, 0)
                                ELSE 0
                              END
                            WHEN u.bonus_type = 'both' THEN
                              CASE 
                                WHEN br.amount > COALESCE(opp.amount, 0)
                                THEN br.amount - COALESCE(opp.amount, 0)
                                ELSE 0
                              END
                            ELSE 0
                          END
                        FROM BetResults opp
                        JOIN Results r_opp ON opp.result_id = r_opp.id
                        WHERE opp.bet_id = br.bet_id 
                          AND r_opp.key IN ('banker', 'player') 
                          AND r_opp.key != r.key
                        LIMIT 1
                        ),
                        CASE 
                          WHEN (u.bonus_type = 'single' AND br.win_lose_flg = FALSE) OR u.bonus_type = 'both' 
                            THEN br.amount
                          ELSE 0 
                        END
                      )
                    WHEN r.key IN ('dragon', 'tiger') THEN 
                      COALESCE(
                        (SELECT 
                          CASE 
                            WHEN u.bonus_type = 'single' THEN
                              CASE 
                                WHEN br.win_lose_flg = FALSE 
                                  AND br.amount > COALESCE(opp.amount, 0)
                              THEN (br.amount - COALESCE(opp.amount, 0)) * (u.bonus_rate / 100)
                              ELSE 0
                            END
                          WHEN u.bonus_type = 'both' THEN
                            CASE 
                              WHEN br.amount > COALESCE(opp.amount, 0)
                              THEN (br.amount - COALESCE(opp.amount, 0)) * (u.bonus_rate / 100)
                              ELSE 0
                            END
                          ELSE 0
                        END
                        FROM BetResults opp
                        JOIN Results r_opp ON opp.result_id = r_opp.id
                        WHERE opp.bet_id = br.bet_id 
                          AND r_opp.key IN ('dragon', 'tiger') 
                          AND r_opp.key != r.key
                        LIMIT 1
                        ),
                        CASE 
                          WHEN (u.bonus_type = 'single' AND br.win_lose_flg = FALSE) OR u.bonus_type = 'both' 
                            THEN br.amount
                          ELSE 0 
                        END
                      )
                    ELSE 
                      CASE 
                        WHEN (u.bonus_type = 'single' AND br.win_lose_flg = FALSE) OR u.bonus_type = 'both' 
                          THEN br.amount
                        ELSE 0 
                      END
                    END
                ), 0
              )
        ) AS commission_summary,
        (
          SUM(
            CASE WHEN br.cancel_flg = FALSE AND br.settle_flg = TRUE AND br.win_lose_flg IS NOT NULL
              THEN
                CASE WHEN br.win_lose_flg = TRUE
                  THEN br.actual_win_lose_amount
                  ELSE -br.actual_win_lose_amount
                END
              ELSE 0
            END
          ) 
          + 
          SUM(
            ${commonSql}
          )
        ) AS total_net_win_lose     
        FROM BetResults AS br
        LEFT JOIN Bets AS b ON b.id = br.bet_id
        LEFT JOIN GameRounds gr ON b.round_id = gr.id
        LEFT JOIN GameSessions gs ON gr.session_id = gs.id
        LEFT JOIN Desks d ON gs.desk_id = d.id
        LEFT JOIN Users AS u ON b.user_id = u.id
        LEFT JOIN Results r ON br.result_id = r.id
          WHERE u.id = :userId 
            AND (
              CASE 
                WHEN :filterDateValue = 'today' THEN 
                  DATE(DATE_SUB(br.createdAt, INTERVAL 8 HOUR)) = CURDATE()
                
                WHEN :filterDateValue = 'yesterday' THEN 
                  DATE(DATE_SUB(br.createdAt, INTERVAL 8 HOUR)) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                
                WHEN :filterDateValue = '7days' THEN 
                  DATE(DATE_SUB(br.createdAt, INTERVAL 8 HOUR)) > DATE_SUB(CURDATE(), INTERVAL 7 DAY)
              END
            )
          GROUP BY DATE(DATE_SUB(br.createdAt, INTERVAL 8 HOUR))
          ORDER BY report_date DESC`;
    const userBetResults = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { userId, filterDateValue },
    });
    response(res, 200, true, "Bet results fetched successfully", {
      userBetResults,
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getBetDetailsByDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (!date) {
      return response(res, 400, false, "Date is required");
    }
    const commissionSql = `
      CASE            
        WHEN br.cancel_flg = TRUE OR br.settle_flg = FALSE THEN 0
        WHEN d.name LIKE "%N%" OR d.name = "G20" THEN 0
        WHEN res.key IN ("big", "small", "dragonSingle", "dragonDouble", "tigerDouble", "tigerSingle") THEN 0
        WHEN br.win_lose_flg IS NULL THEN 0
        WHEN res.key IN ("banker", "player", "dragon", "tiger") THEN
          COALESCE(
            (SELECT 
               CASE 
                 WHEN u.bonus_type = "single" THEN
                   CASE WHEN opp.win_lose_flg = FALSE AND opp.amount > br.amount
                   THEN (opp.amount - br.amount) * (u.bonus_rate / 100) ELSE 0 END
                 WHEN u.bonus_type = "both" THEN
                   CASE WHEN opp.amount > br.amount
                   THEN (opp.amount - br.amount) * (u.bonus_rate / 100) ELSE 0 END
                 ELSE 0
               END
             FROM BetResults opp
             JOIN Results r_opp ON opp.result_id = r_opp.id
             WHERE opp.bet_id = br.bet_id 
               AND r_opp.key IN ("banker", "player", "dragon", "tiger") 
               AND r_opp.key != res.key
             LIMIT 1
            ),
            CASE 
              WHEN (u.bonus_type = "single" AND br.win_lose_flg = FALSE) OR u.bonus_type = "both"
              THEN br.amount * (u.bonus_rate / 100)
              ELSE 0 
            END
          )
        ELSE 
          CASE 
            WHEN (u.bonus_type = "single" AND br.win_lose_flg = FALSE) OR u.bonus_type = "both"
            THEN (br.amount * (u.bonus_rate / 100))
            ELSE 0 
          END
      END`;

    const query = `
          SELECT 
              b.id AS bet_id,
              gr.id AS round_id,
              gs.id AS session_id,
              br.id AS bet_result_id,
              d.name AS desk_name,
              CONCAT(gs.session_no, '-', gr.round_no) AS shoe_round_no,
              MAX(t.after_amount) AS after_balance,
              MAX(t.before_amount) AS before_balance,
              CASE 
                  WHEN br.cancel_flg = TRUE THEN 0
                  WHEN br.settle_flg = TRUE AND br.win_lose_flg = TRUE AND t.transaction_type = 'payout' THEN br.actual_win_lose_amount
                  WHEN br.settle_flg = TRUE AND t.transaction_type = 'recalculate' THEN -br.actual_win_lose_amount
                  ELSE -br.amount
              END AS trans_amount,
              CASE 
                  WHEN br.cancel_flg = TRUE THEN 'cancel'
                  ELSE t.transaction_type
              END AS transaction_type,
              MAX(t.createdAt) AS transaction_time,
              br.amount AS bet_amount,
              br.actual_win_lose_amount,
              br.win_lose_flg,
              br.settle_flg,
              br.cancel_flg,
              (${commissionSql}) AS commission,
              CASE 
                  WHEN br.cancel_flg = TRUE THEN '取消下注'
                  WHEN t.transaction_type = 'recalculate' THEN '已结算'
                  WHEN br.settle_flg = TRUE AND br.win_lose_flg IS NOT NULL THEN '已结算'
                  ELSE '未结算'
              END AS status_text
          FROM Transactions AS t
          JOIN BetResults AS br ON t.bet_result_id = br.id
          LEFT JOIN Bets AS b ON br.bet_id = b.id
          LEFT JOIN Users AS u ON t.user_id = u.id
          LEFT JOIN Results AS res ON br.result_id = res.id
          LEFT JOIN GameRounds gr ON b.round_id = gr.id
          LEFT JOIN GameSessions gs ON gr.session_id = gs.id
          LEFT JOIN Desks AS d ON gs.desk_id = d.id
          WHERE t.user_id = :userId 
            AND DATE(DATE_SUB(t.createdAt, INTERVAL 8 HOUR)) = :selectedDate
            AND (
                (t.transaction_type = 'betting'
                  AND NOT EXISTS (
                    SELECT 1 
                    FROM Transactions t2 
                    WHERE t2.bet_result_id = br.id 
                      AND t2.transaction_type IN ('cancel', 'recalculate', 'payout')
                  )
                )
                OR (t.transaction_type != 'betting')
            )
          GROUP BY br.id, t.transaction_type 
          ORDER BY br.id DESC, transaction_time DESC
          LIMIT :limit OFFSET :offset`;
    const betDetails = await sequelize.query(query, {
      replacements: {
        userId,
        selectedDate: date,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
      type: sequelize.QueryTypes.SELECT,
    });

    const summaryQuery = `
    SELECT 
        COUNT(*) as totalCount,
        SUM(net_amount) as totalWinLoss,
        SUM(bet_amount) as totalBet
    FROM (
        SELECT 
            br.id AS bet_result_id,
            t.transaction_type,
            CASE 
              WHEN br.cancel_flg = TRUE THEN 0
              WHEN br.settle_flg = TRUE AND br.win_lose_flg = TRUE AND t.transaction_type = 'payout' THEN br.actual_win_lose_amount
              WHEN br.settle_flg = TRUE AND t.transaction_type = 'recalculate' THEN -br.actual_win_lose_amount
              ELSE -br.amount
            END as net_amount,
            br.amount as bet_amount
        FROM Transactions t
        JOIN BetResults br ON t.bet_result_id = br.id
        WHERE t.user_id = :userId 
          AND DATE(DATE_SUB(t.createdAt, INTERVAL 8 HOUR)) = :selectedDate
          AND (
              (t.transaction_type = 'betting'
                AND NOT EXISTS (
                  SELECT 1 
                  FROM Transactions t2 
                  WHERE t2.bet_result_id = br.id 
                    AND t2.transaction_type IN ('cancel', 'recalculate', 'payout')
                )
              )
              OR (t.transaction_type != 'betting')
          )
        GROUP BY br.id, t.transaction_type
    ) AS grouped_transactions`;

    const [summary] = await sequelize.query(summaryQuery, {
      replacements: { userId, selectedDate: date },
      type: sequelize.QueryTypes.SELECT,
    });
    const count = summary?.totalCount || 0;

    response(res, 200, true, "Success", {
      betDetails,
      summary,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getResultCardByRound = async (req, res) => {
  try {
    const { betResultId } = req.query;

    const query = `
      SELECT 
        br.amount AS bet_amount,
        (CASE WHEN br.cancel_flg = FALSE && br.settle_flg = TRUE && br.win_lose_flg IS NOT NULL
              THEN 
                CASE WHEN br.win_lose_flg = TRUE 
                  THEN br.actual_win_lose_amount
                  ELSE -br.actual_win_lose_amount 
                END
              ELSE 0
            END) AS actual_win_lose_amount,
        res.name AS result_name,
        res.ratio AS result_ratio,
        gr.cards AS game_round_cards,
        g.type AS game_type,
        d.baccarat_type AS baccarat_type
      FROM BetResults br
      JOIN Transactions t ON t.bet_result_id = br.id
      JOIN Results res ON br.result_id = res.id
      JOIN Bets b ON br.bet_id = b.id
      JOIN GameRounds gr ON b.round_id = gr.id
      JOIN GameSessions gs ON gr.session_id = gs.id
      JOIN Desks d ON gs.desk_id = d.id
      JOIN Games g ON d.game_id = g.id
      WHERE br.id = :betResultId
      GROUP BY br.id
    `;
    const resultCards = await sequelize.query(query, {
      replacements: { betResultId },
      type: sequelize.QueryTypes.SELECT,
    });
    response(res, 200, true, "Success", { resultCards });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

/** Change password for the logged-in user. New password: 6-32 alphanumeric. */
const changePassword = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { new_password } = req.body;
    if (!new_password || typeof new_password !== "string") {
      await t.rollback();
      return response(res, 400, false, "新密码不能为空");
    }
    const trimmed = new_password.trim();
    if (!/^[A-Za-z0-9]{6,32}$/.test(trimmed)) {
      await t.rollback();
      return response(res, 400, false, "只能由6-32位数字和字母组成");
    }
    const user = await User.findByPk(req.user.id);
    if (!user) {
      await t.rollback();
      return response(res, 404, false, "User not found");
    }
    await user.update({ password: trimmed }, { transaction: t });
    await t.commit();
    response(res, 200, true, "修改成功");
  } catch (error) {
    await t.rollback();
    response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getGames,
  getDesks,
  getCameras,
  getUser,
  getProfile,
  getAnnounce,
  getResultsByDesk,
  getNiuniuResultsByDesk,
  getConfirmedBets,
  createBetResult,
  updateBetResult,
  cancelBetResult,
  updateBetKey,
  updateGameRound,
  getUserBetResults,
  getBetDetailsByDate,
  getTransactions,
  getResultCardByRound,
  getLastRoundStatus,
  getLastRoundResult,
  changePassword,
};
