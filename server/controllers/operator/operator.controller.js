const {
  Desk,
  Game,
  GameSession,
  GameRound,
  Result,
  RoundResult,
  NiuniuRound,
  NiuniuPlayerHand,
  Bet,
  BetResult,
  Transaction,
  User,
  Role,
  sequelize,
} = require("../../models");
const { response } = require("../../utils/response.js");
const {
  updateGameRoundSchema,
} = require("../../validations/gameRound.validation.js");
const bcrypt = require("bcryptjs");

const getDesk = async (req, res) => {
  try {
    const { id } = req.params;

    const desk = await Desk.findByPk(id, {
      include: [
        {
          model: Game,
          as: "game",
        },
      ],
    });

    if (!desk) {
      return response(res, 404, false, "Desk not found");
    }

    return response(res, 200, true, "Desk fetched successfully", {
      desk,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", {
      error: error.message,
    });
  }
};

const getGameInfos = async (req, res) => {
  try {
    const desk = await Desk.findByPk(req.params.id, {
      include: [
        {
          model: Game,
          as: "game",
        },
      ],
    });

    if (!desk) return response(res, 404, false, "Desk not found");

    let session = await GameSession.findOne({
      where: {
        desk_id: desk.id,
        status: "active",
      },
    });

    if (!session) {
      return response(res, 404, false, "No active session for this desk");
    }

    const lastRound = await GameRound.findOne({
      where: { session_id: session.id },
      order: [["round_no", "DESC"]],
    });

    const sessionCount = await GameSession.count({
      where: { desk_id: desk.id },
    });

    const rounds = await GameRound.findAll({
      where: { session_id: session.id },
      order: [["round_no", "ASC"]],
    });

    const roundIds = rounds.map((r) => r.id);

    const roundResults = await RoundResult.findAll({
      where: { round_id: roundIds },
      include: [
        {
          model: Result,
          as: "result",
        },
      ],
    });

    const resultsMap = {};

    roundResults.forEach((rr) => {
      if (!resultsMap[rr.round_id]) {
        resultsMap[rr.round_id] = [];
      }
      resultsMap[rr.round_id].push(rr.result.key);
    });

    const results = Object.keys(resultsMap).map((roundId) => ({
      round_id: Number(roundId),
      key: resultsMap[roundId].join("|"),
    }));

    response(res, 200, true, "Desk fetched successfully", {
      desk,
      session,
      lastRound,
      sessionCount,
      results,
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const createResult = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { round_id, result, game_id, baccarat_type, niu_value, cards } =
      req.body;

    /* ------------------ Create RoundResult ------------------ */
    const resultKeys = result.split("|");
    const DOUBLE_KEYS = [
      "banker1Double",
      "banker2Double",
      "banker3Double",
      "player1Double",
      "player2Double",
      "player3Double",
    ];

    const getDoubleIndex = (key) => {
      const match = key.match(/(banker|player)(\d)Double/);
      if (!match) return null;
      return {
        side: match[1],
        index: Number(match[2]),
      };
    };

    const calcDoubleAmount = (amount, niu) => {
      if ([7, 8, 9].includes(niu)) return (amount / 3) * 2;
      return amount / 3;
    };

    const hasTie = resultKeys.includes("tie");
    const hasSuperSix =
      resultKeys.includes("supertwoSix") ||
      resultKeys.includes("superthreeSix");

    const resultRecords = await Result.findAll({
      where: {
        game_id,
        baccarat_type,
        key: resultKeys,
      },
      transaction: t,
    });

    if (!resultRecords.length) {
      await t.rollback();
      return response(res, 404, false, "No matching Result records found");
    }

    /* ------------------ Super 6 upgrade logic ------------------ */
    const hasSuperThreeSix = resultKeys.includes("superthreeSix");

    if (hasSuperThreeSix) {
      const superThreeSixResult = resultRecords.find(
        (r) => r.key === "superthreeSix",
      );

      if (superThreeSixResult) {
        const superTwoSixResult = await Result.findOne({
          where: {
            game_id,
            baccarat_type,
            key: "supertwoSix",
          },
          transaction: t,
        });

        if (superTwoSixResult) {
          const roundBets = await Bet.findAll({
            where: { round_id },
            attributes: ["id"],
            transaction: t,
          });

          const betIds = roundBets.map((b) => b.id);

          if (betIds.length) {
            await BetResult.update(
              {
                result_id: superThreeSixResult.id,
              },
              {
                where: {
                  bet_id: betIds,
                  result_id: superTwoSixResult.id,
                  cancel_flg: false,
                  settle_flg: false,
                },
                transaction: t,
              },
            );
          }
        }
      }
    }

    await RoundResult.bulkCreate(
      resultRecords.map((r) => ({ round_id, result_id: r.id })),
      { transaction: t },
    );

    /* ------------------ Find all bets in round ------------------ */
    const bets = await Bet.findAll({
      where: { round_id },
      transaction: t,
    });

    const userNetMap = new Map();
    if (bets.length > 0) {
      const betIds = bets.map((b) => b.id);
      const userIds = [...new Set(bets.map((b) => b.user_id))];

      /* Load all users with row lock in one query */
      const users = await User.findAll({
        where: { id: userIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      /* Load all unsettled bet results for the round in one query */
      const allBetResults = await BetResult.findAll({
        where: {
          bet_id: betIds,
          cancel_flg: false,
          settle_flg: false,
        },
        include: [
          {
            model: Result,
            as: "result",
            attributes: ["id", "key", "ratio"],
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      /* Attach user_id to each bet result via bet */
      const betById = new Map(bets.map((b) => [b.id, b]));
      const betResultsWithUser = allBetResults
        .map((br) => {
          const bet = betById.get(br.bet_id);
          return bet ? { ...br.toJSON(), user_id: bet.user_id, _br: br } : null;
        })
        .filter(Boolean);

      /* Sort by user_id, bet_id, id for deterministic running balance */
      betResultsWithUser.sort(
        (a, b) => a.user_id - b.user_id || a.bet_id - b.bet_id || a.id - b.id,
      );

      const transactionsToInsert = [];
      const tieBrIds = [];
      const loseBrData = []; // { id, actual_win_lose_amount }
      const winBrData = []; // { id, actual_win_lose_amount }
      const userBalanceDelta = new Map(); // user_id -> delta (can be float)
      const userWinLose = new Map(); // user_id -> { win_amount, lose_amount }

      for (const row of betResultsWithUser) {
        const br = row._br;
        const user = userMap.get(row.user_id);
        if (!user) continue;

        let currentBalance = Number(
          userBalanceDelta.has(row.user_id)
            ? user.balance + userBalanceDelta.get(row.user_id)
            : user.balance,
        );
        if (!userBalanceDelta.has(row.user_id)) {
          userBalanceDelta.set(row.user_id, 0);
          userWinLose.set(row.user_id, { win_amount: 0, lose_amount: 0 });
        }

        const resultKey = row.result?.key;
        const isNiuDouble = resultKey && DOUBLE_KEYS.includes(resultKey);
        const doubleInfo = isNiuDouble ? getDoubleIndex(resultKey) : null;
        const isTiePush =
          hasTie && ["banker", "player", "dragon", "tiger"].includes(resultKey);
        const isWin =
          !isTiePush && resultRecords.some((r) => r.id === row.result_id);
        const amount = Number(row.amount);

        if (isTiePush) {
          const transactionAmount = amount;
          transactionsToInsert.push({
            user_id: row.user_id,
            bet_result_id: br.id,
            transaction_type: "recalculate",
            amount: transactionAmount,
            before_amount: currentBalance,
            after_amount: currentBalance + transactionAmount,
          });
          userBalanceDelta.set(
            row.user_id,
            userBalanceDelta.get(row.user_id) + transactionAmount,
          );
          tieBrIds.push(br.id);
          continue;
        }

        if (!isWin) {
          let loseAmount = 0;
          let recalculateAmount = 0;
          if (isNiuDouble && doubleInfo) {
            // Resolve which hand beat this double bet (banker or player by index).
            const opponentKey =
              doubleInfo.side === "banker"
                ? `player${doubleInfo.index}`
                : "banker";
            const opponentHandTypeKey =
              doubleInfo.side === "banker"
                ? `hand_type${doubleInfo.index}`
                : "banker_hand_type";
            const opponentNiu = niu_value?.[opponentKey] ?? 0;
            const opponentHandType = niu_value?.[opponentHandTypeKey] ?? null;

            // Partial refund: 1/3 if opponent has 牛7/8/9, 2/3 if opponent has no special hand.
            if ([7, 8, 9].includes(opponentNiu)) {
              recalculateAmount = amount / 3;
            } else if (
              !["niuNiu", "bomb", "fiveFace"].includes(opponentHandType)
            ) {
              recalculateAmount = (amount / 3) * 2;
            }

            // Actual loss: full amount when opponent has 牛牛/炸弹/五小, else double multiplier by opponent niu.
            if (["niuNiu", "bomb", "fiveFace"].includes(opponentHandType)) {
              loseAmount = amount;
            } else {
              loseAmount = calcDoubleAmount(amount, opponentNiu);
            }
          } else {
            loseAmount = amount;
          }
          if (recalculateAmount > 0) {
            transactionsToInsert.push({
              user_id: row.user_id,
              bet_result_id: br.id,
              transaction_type: "recalculate",
              amount: recalculateAmount,
              before_amount: currentBalance,
              after_amount: currentBalance + recalculateAmount,
            });
            userBalanceDelta.set(
              row.user_id,
              userBalanceDelta.get(row.user_id) + recalculateAmount,
            );
          }
          userWinLose.get(row.user_id).lose_amount += loseAmount;
          loseBrData.push({ id: br.id, actual_win_lose_amount: loseAmount });
          continue;
        }

        /* WIN */
        let ratio = Number(row.result?.ratio ?? 0);
        if (hasSuperSix && row.result?.key === "banker") {
          ratio = ratio / 2;
        }
        let winAmount = 0;
        if (isNiuDouble && doubleInfo) {
          // Resolve this double bet's hand (banker or player by index) for win calculation.
          const selfKey =
            doubleInfo.side === "banker"
              ? "banker"
              : `player${doubleInfo.index}`;
          const selfNiu = niu_value?.[selfKey] ?? 0;
          const selfHandTypeKey =
            doubleInfo.side === "banker"
              ? "banker_hand_type"
              : `hand_type${doubleInfo.index}`;
          const selfHandType = niu_value?.[selfHandTypeKey] ?? null;
          // Win: full amount for 牛牛/炸弹/五小, else double multiplier by own niu value.
          if (["niuNiu", "bomb", "fiveFace"].includes(selfHandType)) {
            winAmount = amount * ratio;
          } else {
            winAmount = calcDoubleAmount(amount, selfNiu) * ratio;
          }
        } else {
          winAmount = amount * ratio;
        }
        const transactionAmount = amount + winAmount;
        transactionsToInsert.push({
          user_id: row.user_id,
          bet_result_id: br.id,
          transaction_type: "payout",
          amount: transactionAmount,
          before_amount: currentBalance,
          after_amount: currentBalance + transactionAmount,
        });
        userBalanceDelta.set(
          row.user_id,
          userBalanceDelta.get(row.user_id) + transactionAmount,
        );
        userWinLose.get(row.user_id).win_amount += winAmount;
        winBrData.push({ id: br.id, actual_win_lose_amount: winAmount });
      }

      /* Bulk insert transactions */
      if (transactionsToInsert.length > 0) {
        await Transaction.bulkCreate(transactionsToInsert, {
          transaction: t,
        });
      }

      /* Batch update BetResults: tie */
      if (tieBrIds.length > 0) {
        await BetResult.update(
          {
            win_lose_flg: null,
            actual_win_lose_amount: 0,
            settle_flg: true,
          },
          { where: { id: tieBrIds }, transaction: t },
        );
      }

      /* Batch update BetResults: lose (CASE WHEN for per-row amounts) */
      if (loseBrData.length > 0) {
        const loseIds = loseBrData.map((d) => d.id);
        const caseClause = loseBrData
          .map(
            (d) =>
              `WHEN ${Number(d.id)} THEN ${Number(d.actual_win_lose_amount)}`,
          )
          .join(" ");
        const tableName = BetResult.getTableName
          ? BetResult.getTableName()
          : "BetResults";
        await sequelize.query(
          `UPDATE ${tableName} SET win_lose_flg = false, actual_win_lose_amount = CASE id ${caseClause} END, settle_flg = true WHERE id IN (${loseIds.join(",")})`,
          { transaction: t },
        );
      }

      /* Batch update BetResults: win */
      if (winBrData.length > 0) {
        const winIds = winBrData.map((d) => d.id);
        const caseClause = winBrData
          .map(
            (d) =>
              `WHEN ${Number(d.id)} THEN ${Number(d.actual_win_lose_amount)}`,
          )
          .join(" ");
        const tableName = BetResult.getTableName
          ? BetResult.getTableName()
          : "BetResults";
        await sequelize.query(
          `UPDATE ${tableName} SET win_lose_flg = true, actual_win_lose_amount = CASE id ${caseClause} END, settle_flg = true WHERE id IN (${winIds.join(",")})`,
          { transaction: t },
        );
      }

      /* Batch update user balances (single query instead of N updates) */
      const userBalanceUpdates = [];
      for (const u of users) {
        const delta = userBalanceDelta.get(u.id);
        if (delta == null || delta === 0) continue;
        userBalanceUpdates.push({
          id: u.id,
          newBalance: Number(u.balance) + delta,
        });
      }
      if (userBalanceUpdates.length > 0) {
        const userCaseClause = userBalanceUpdates
          .map((ub) => `WHEN ${Number(ub.id)} THEN ${Number(ub.newBalance)}`)
          .join(" ");
        const userIds = userBalanceUpdates.map((ub) => ub.id).join(",");
        const userTableName = User.getTableName ? User.getTableName() : "Users";
        await sequelize.query(
          `UPDATE ${userTableName} SET balance = CASE id ${userCaseClause} END WHERE id IN (${userIds})`,
          { transaction: t },
        );
      }

      /* Build userNetMap for response */
      for (const [userId, { win_amount, lose_amount }] of userWinLose) {
        userNetMap.set(userId, {
          user_id: userId,
          win_amount,
          lose_amount,
          net_amount: win_amount - lose_amount,
        });
      }
    }

    /* ------------------ Finish Round ------------------ */
    const currentRound = await GameRound.findByPk(round_id, {
      transaction: t,
    });

    await currentRound.update(
      {
        status: "finished",
        cards,
      },
      { transaction: t },
    );

    const newRound = await GameRound.create(
      {
        session_id: currentRound.session_id,
        round_no: currentRound.round_no + 1,
        status: "active",
      },
      { transaction: t },
    );

    await t.commit();

    response(res, 201, true, "Round settled successfully", {
      finishedRound: currentRound,
      newRound,
      userNetAmounts: Array.from(userNetMap.values()),
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const createNiuniuResult = async (req, res) => {
  try {
    const {
      round_id,
      banker_cards,
      banker_niu_value,
      banker_hand_type,
      banker_multiplier,
      players,
    } = req.body;

    const gameRound = await GameRound.findByPk(round_id);
    if (!gameRound) {
      return response(res, 404, false, "Game round not found");
    }

    const niuniuRound = await NiuniuRound.create({
      game_round_id: round_id,
      banker_cards: banker_cards.join(","),
      banker_niu_value,
      banker_hand_type,
      banker_multiplier,
    });

    for (const p of players) {
      await NiuniuPlayerHand.create({
        niuniu_round_id: niuniuRound.id,
        player_position: p.position,
        cards: p.cards.join(","),
        niu_value: p.niu_value,
        hand_type: p.hand_type,
        result: p.result,
        multiplier: p.multiplier,
      });
    }

    response(res, 201, true, "Niuniu result created successfully");
  } catch (error) {
    console.error("Create Niuniu Result Error:", error);
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const finishGameSession = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { desk_id } = req.params;

    const { moper, hander, monitor, cutter, shuffle_type, card_color } =
      req.body;

    const desk = await Desk.findByPk(desk_id, { transaction: t });
    if (!desk) {
      await t.rollback();
      return response(res, 404, false, "Desk not found");
    }

    const activeSession = await GameSession.findOne({
      where: {
        desk_id,
        status: "active",
      },
      transaction: t,
    });

    if (!activeSession) {
      await t.rollback();
      return response(res, 400, false, "No active session found");
    }

    await GameSession.update(
      {
        status: "finished",
        end_time: new Date(),
      },
      {
        where: { id: activeSession.id },
        transaction: t,
      },
    );

    const lastRound = await GameRound.findOne({
      where: { session_id: activeSession.id },
      order: [["round_no", "DESC"]],
      transaction: t,
    });

    if (lastRound && lastRound.status !== "finished") {
      await GameRound.update(
        { status: "finished" },
        { where: { id: lastRound.id }, transaction: t },
      );
    }

    const lastSessionNo = await GameSession.max("session_no", {
      where: { desk_id },
      transaction: t,
    });

    const newSession = await GameSession.create(
      {
        desk_id,
        user_id: req.user.id,
        session_no: (lastSessionNo || 0) + 1,
        status: "active",
        start_time: new Date(),
        moper,
        hander,
        monitor,
        cutter,
        shuffle_type,
        card_color,
      },
      { transaction: t },
    );

    const newRound = await GameRound.create(
      {
        session_id: newSession.id,
        round_no: 1,
        status: "active",
      },
      { transaction: t },
    );

    await t.commit();

    return response(
      res,
      200,
      true,
      "Session finished and new session created",
      {
        oldSessionId: activeSession.id,
        newSession,
        newRound,
      },
    );
  } catch (error) {
    await t.rollback();
    return response(res, 500, false, "Server error", {
      error: error.message,
    });
  }
};

const invalidGame = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { round_id } = req.body;

    if (!round_id) {
      await t.rollback();
      return response(res, 400, false, "round_id is required");
    }

    const bets = await Bet.findAll({
      where: { round_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    /* ================= NO BETS ================= */
    if (!bets.length) {
      const round = await GameRound.findByPk(round_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!round) {
        await t.rollback();
        return response(res, 404, false, "Round not found");
      }

      round.status = "active";
      await round.save({ transaction: t });

      await t.commit();
      return response(res, 200, true, "Round reset successfully (no bets)");
    }

    /* ================= GROUP BY USER ================= */
    const userRollbackMap = new Map();

    for (const bet of bets) {
      const betResults = await BetResult.findAll({
        where: { bet_id: bet.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const br of betResults) {
        const transactions = await Transaction.findAll({
          where: { bet_result_id: br.id },
          order: [["id", "ASC"]],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!transactions.length) continue;

        const earliestTx = transactions[0];

        if (!userRollbackMap.has(bet.user_id)) {
          userRollbackMap.set(bet.user_id, earliestTx.before_amount);
        }

        /* delete transactions */
        await Transaction.destroy({
          where: { bet_result_id: br.id },
          transaction: t,
        });
      }

      await BetResult.destroy({
        where: { bet_id: bet.id },
        transaction: t,
      });
    }

    /* ================= RESTORE USER BALANCE (ONCE) ================= */
    for (const [userId, originalBalance] of userRollbackMap.entries()) {
      await User.update(
        { balance: originalBalance },
        {
          where: { id: userId },
          transaction: t,
        },
      );
    }

    /* ================= CLEAN UP ================= */
    await Bet.destroy({ where: { round_id }, transaction: t });
    await RoundResult.destroy({ where: { round_id }, transaction: t });

    const round = await GameRound.findByPk(round_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (round) {
      round.status = "active";
      await round.save({ transaction: t });
    }

    await t.commit();
    response(res, 200, true, "Game invalidated and rolled back correctly");
  } catch (error) {
    await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const confirmAccount = async (req, res) => {
  const { account, password, desk_id } = req.body;

  try {
    const user = await User.findOne({
      where: { account },
      include: [{ model: Role, as: "role" }],
    });

    if (!user) {
      return res.status(401).json({
        message: "请确认帐号密码正确再试一次",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "请确认帐号密码正确再试一次",
      });
    }

    const roleName = user.role?.name;

    if (roleName !== "staff") {
      return res.status(403).json({
        message: "帐号禁止登入",
      });
    }

    const desk = await Desk.findByPk(desk_id);
    if (!desk) {
      return res.status(401).json({
        message: "无效的台号，请确认后再试一次",
      });
    }
    if (user.desk_id !== desk.id) {
      return res.status(403).json({
        message: "此帐号与台号不匹配，请确认后再试一次",
      });
    }

    response(res, 200, true, "Confirm account successfully");
  } catch (error) {
    console.error(error);
    response(res, 500, false, "Server error", { error: error.message });
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
  } catch (err) {
    console.error(err);
    return response(res, 500, false, "Server error", { error: err.message });
  }
};

module.exports = {
  getDesk,
  getGameInfos,
  createResult,
  createNiuniuResult,
  finishGameSession,
  invalidGame,
  confirmAccount,
  updateGameRound,
};
