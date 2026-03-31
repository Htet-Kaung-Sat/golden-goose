const {
  Bet,
  BetResult,
  BetResultHistory,
  NiuniuRound,
  NiuniuRoundHistory,
  NiuniuPlayerHand,
  NiuniuPlayerHandHistory,
  Result,
  RoundResult,
  RoundResultHistory,
  sequelize,
  Transaction,
  GameRound,
  GameRoundHistory,
  User,
} = require("../../models");
const { response } = require("../../utils/response.js");

const recalculateResult = async (req, res) => {
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
      if (niu === 10) return amount;
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

    /* ------------------ Copy Round Results ------------------ */
    const lastHistoryRecord = await RoundResultHistory.findOne({
      where: { round_id },
      order: [["recalculate_id", "DESC"]],
      transaction: t,
    });
    const nextRecalculateId =
      lastHistoryRecord && lastHistoryRecord.recalculate_id
        ? lastHistoryRecord.recalculate_id + 1
        : 1;
    const existingRoundResults = await RoundResult.findAll({
      where: { round_id },
      transaction: t,
      raw: true,
    });
    if (existingRoundResults.length > 0) {
      const historyData = existingRoundResults.map(({ id, ...rest }) => ({
        ...rest,
        recalculate_id: nextRecalculateId,
      }));
      await RoundResultHistory.bulkCreate(historyData, { transaction: t });
    }
    /* ------------------ Delete Old Round Results ------------------ */
    await RoundResult.destroy({
      where: { round_id: round_id },
      transaction: t,
    });

    /* ------------------ Create New Round Results ------------------ */
    for (const r of resultRecords) {
      await RoundResult.create(
        {
          round_id,
          result_id: r.id,
          recalculate_id: nextRecalculateId,
        },
        { transaction: t },
      );
    }

    /* ------------------ Find all bets in round ------------------ */
    const bets = await Bet.findAll({
      where: { round_id },
      transaction: t,
    });

    /* ------------------ Settlement process ------------------ */
    for (const bet of bets) {
      /* ------------------ Get Recalculate Number of transaction ------------------ */
      const maxRecalculateNo = await Transaction.max("recalculate_no", {
        include: [
          {
            model: BetResult,
            as: "betResult",
            where: { bet_id: bet.id },
            attributes: [],
          },
        ],
      });
      /* ------------------ Find initial amount of user ------------------ */
      const [calculation] = await sequelize.query(
        `
        SELECT 
          b.user_id,
          (MAX(u.balance) + SUM(
            CASE 
              WHEN br.win_lose_flg = 0 AND br.cancel_flg = 0 THEN br.actual_win_lose_amount
              WHEN br.win_lose_flg = 1 AND br.cancel_flg = 0 THEN -br.actual_win_lose_amount
              ELSE 0 
            END
          )) AS recalculate_amount
        FROM Bets b
        INNER JOIN Users u ON b.user_id = u.id
        INNER JOIN BetResults br ON b.id = br.bet_id
        WHERE b.round_id = :round_id AND u.id = :user_id
        GROUP BY b.user_id
      `,
        {
          replacements: {
            round_id: round_id,
            user_id: bet.user_id,
          },
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        },
      );
      let initialAmount = Number(calculation.recalculate_amount);
      /* ------------------ Copy Bet Results ------------------ */
      const existingBetResults = await BetResult.findAll({
        where: { bet_id: bet.id, cancel_flg: false },
        transaction: t,
        raw: true,
      });
      const betResultIds = existingBetResults.map((br) => br.id);
      if (existingBetResults.length > 0) {
        const brHistoryData = existingBetResults.map(({ id, ...rest }) => ({
          ...rest,
          bet_result_id: id,
        }));
        await BetResultHistory.bulkCreate(brHistoryData, { transaction: t });
        /* ------------------ Rebetting state ------------------ */
        const existingTransactions = await Transaction.findAll({
          where: {
            bet_result_id: betResultIds,
            transaction_type: "betting",
            recalculate_no: maxRecalculateNo,
          },
          order: [["id", "ASC"]],
          transaction: t,
          raw: true,
        });
        const newTransactionsData = existingTransactions.map((tx) => {
          const { id, createdAt, updatedAt, ...rest } = tx.get
            ? tx.get({ plain: true })
            : tx;
          const currentBefore = initialAmount;
          const currentAfter = initialAmount - tx.amount;
          initialAmount = currentAfter;
          return {
            ...rest,
            recalculate_no: tx.recalculate_no + 1,
            before_amount: currentBefore,
            after_amount: currentAfter,
          };
        });
        await Transaction.bulkCreate(newTransactionsData, {
          transaction: t,
        });
        /* ------------------ BetResult update initial betting state ------------------ */
        await BetResult.update(
          {
            actual_win_lose_amount: null,
            win_lose_flg: null,
            settle_flg: 0,
            recalculate_flg: 1,
          },
          {
            where: {
              bet_id: bet.id,
              cancel_flg: false,
            },
            transaction: t,
          },
        );
      }
      const user = await User.findByPk(bet.user_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!user) continue;
      /* ------------------ Update recalculate balance of user ------------------ */
      await user.update({ balance: initialAmount }, { transaction: t });
      const betResults = await BetResult.findAll({
        where: {
          bet_id: bet.id,
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
      if (!betResults.length) continue;
      for (const br of betResults) {
        const beforeAmount = Number(user.balance);
        let transactionType = null;
        let transactionAmount = 0;
        let afterAmount = beforeAmount;
        const resultKey = br.result?.key;
        const isNiuDouble = resultKey && DOUBLE_KEYS.includes(resultKey);
        const doubleInfo = isNiuDouble ? getDoubleIndex(resultKey) : null;
        const isTiePush =
          hasTie && ["banker", "player", "dragon", "tiger"].includes(resultKey);
        const isWin =
          !isTiePush && resultRecords.some((r) => r.id === br.result_id);
        /* ================= TIE ================= */
        if (isTiePush) {
          transactionType = "recalculate";
          transactionAmount = Number(br.amount);
          await Transaction.create(
            {
              user_id: user.id,
              bet_result_id: br.id,
              transaction_type: transactionType,
              amount: transactionAmount,
              before_amount: beforeAmount,
              after_amount: beforeAmount + transactionAmount,
              recalculate_no: maxRecalculateNo + 1,
            },
            { transaction: t },
          );
          await br.update(
            {
              win_lose_flg: null,
              actual_win_lose_amount: 0,
              settle_flg: true,
            },
            { transaction: t },
          );
          await user.update(
            { balance: beforeAmount + transactionAmount },
            { transaction: t },
          );
          continue;
        }
        /* ================= LOSE ================= */
        if (!isWin) {
          let loseAmount = 0;
          if (isNiuDouble && doubleInfo) {
            const opponentKey =
              doubleInfo.side === "banker"
                ? `player${doubleInfo.index}`
                : "banker";
            const opponentNiu = niu_value?.[opponentKey] ?? 0;
            if ([7, 8, 9].includes(opponentNiu)) {
              recalculateAmount = Number(br.amount) / 3;
              await Transaction.create(
                {
                  user_id: user.id,
                  bet_result_id: br.id,
                  transaction_type: "recalculate",
                  amount: recalculateAmount,
                  before_amount: beforeAmount,
                  after_amount: beforeAmount + recalculateAmount,
                  recalculate_no: maxRecalculateNo + 1,
                },
                { transaction: t },
              );
              await user.update(
                { balance: beforeAmount + recalculateAmount },
                { transaction: t },
              );
            } else if (opponentNiu !== 10) {
              recalculateAmount = (Number(br.amount) / 3) * 2;
              await Transaction.create(
                {
                  user_id: user.id,
                  bet_result_id: br.id,
                  transaction_type: "recalculate",
                  amount: recalculateAmount,
                  before_amount: beforeAmount,
                  after_amount: beforeAmount + recalculateAmount,
                  recalculate_no: maxRecalculateNo + 1,
                },
                { transaction: t },
              );

              await user.update(
                { balance: beforeAmount + recalculateAmount },
                { transaction: t },
              );
            }
            loseAmount = calcDoubleAmount(Number(br.amount), opponentNiu);
          } else {
            loseAmount = Number(br.amount);
          }
          await br.update(
            {
              win_lose_flg: false,
              actual_win_lose_amount: loseAmount,
              settle_flg: true,
            },
            { transaction: t },
          );
          continue;
        }
        /* ================= WIN ================= */
        let ratio = Number(br.result?.ratio ?? 0);
        let winAmount = 0;
        if (hasSuperSix && br.result?.key === "banker") {
          ratio = ratio / 2;
        }
        if (isNiuDouble && doubleInfo) {
          const selfKey =
            doubleInfo.side === "banker"
              ? "banker"
              : `player${doubleInfo.index}`;
          const selfNiu = niu_value?.[selfKey] ?? 0;
          winAmount = calcDoubleAmount(Number(br.amount), selfNiu);
        } else {
          winAmount = Number(br.amount) * ratio;
        }
        transactionType = "payout";
        transactionAmount = Number(br.amount) + winAmount;
        afterAmount = beforeAmount + transactionAmount;
        await Transaction.create(
          {
            user_id: user.id,
            bet_result_id: br.id,
            transaction_type: transactionType,
            amount: transactionAmount,
            before_amount: beforeAmount,
            after_amount: afterAmount,
            recalculate_no: maxRecalculateNo + 1,
          },
          { transaction: t },
        );
        await br.update(
          {
            win_lose_flg: true,
            actual_win_lose_amount: winAmount,
            settle_flg: true,
          },
          { transaction: t },
        );
        await user.update({ balance: afterAmount }, { transaction: t });
      }
    }
    const currentRound = await GameRound.findByPk(round_id, {
      transaction: t,
    });
    if (currentRound) {
      const { id, ...data } = currentRound.get({ plain: true });
      await GameRoundHistory.create(
        {
          ...data,
          game_round_id: id,
        },
        {
          transaction: t,
          silent: true,
        },
      );
      await currentRound.update(
        {
          status: "finished",
          cards,
        },
        { transaction: t },
      );
    }
    await t.commit();
    response(res, 201, true, "Recalculate successfully");
  } catch (error) {
    await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const recalculateNiuniuResult = async (req, res) => {
  // Start a transaction to ensure data integrity
  const transaction = await sequelize.transaction();

  try {
    const {
      round_id,
      banker_cards,
      banker_niu_value,
      banker_hand_type,
      banker_multiplier,
      players, // Expecting updated player data array
    } = req.body;

    const gameRound = await GameRound.findByPk(round_id);
    if (!gameRound) {
      return response(res, 404, false, "Game round not found");
    }

    // 1. Fetch the existing live data
    const existingRound = await NiuniuRound.findOne({
      where: { game_round_id: round_id },
      include: [{ model: NiuniuPlayerHand, as: "niuniuPlayerHands" }],
    });

    if (!existingRound) {
      await transaction.rollback();
      return response(res, 404, false, "Original Niuniu round not found");
    }

    // 2. Move current NiuniuRound to History
    await NiuniuRoundHistory.create(
      {
        niuniu_round_id: existingRound.id,
        game_round_id: round_id,
        banker_cards: existingRound.banker_cards,
        banker_niu_value: existingRound.banker_niu_value,
        banker_hand_type: existingRound.banker_hand_type,
        banker_multiplier: existingRound.banker_multiplier,
      },
      { transaction },
    );

    // 3. Move all current NiuniuPlayerHands to History
    for (const hand of existingRound.niuniuPlayerHands) {
      await NiuniuPlayerHandHistory.create(
        {
          niuniu_player_hand_id: hand.id, // reference to parent
          niuniu_round_id: hand.niuniu_round_id,
          player_position: hand.player_position,
          cards: hand.cards,
          niu_value: hand.niu_value,
          hand_type: hand.hand_type,
          result: hand.result,
          multiplier: hand.multiplier,
        },
        { transaction },
      );
    }

    // 4. Update the live NiuniuRound with NEW data
    await existingRound.update(
      {
        banker_cards: banker_cards.join(","),
        banker_niu_value,
        banker_hand_type,
        banker_multiplier,
      },
      { transaction },
    );

    // 5. Update the live NiuniuPlayerHands with NEW data
    for (const p of players) {
      await NiuniuPlayerHand.update(
        {
          cards: p.cards.join(","),
          niu_value: p.niu_value,
          hand_type: p.hand_type,
          result: p.result,
          multiplier: p.multiplier,
        },
        {
          where: {
            niuniu_round_id: existingRound.id,
            player_position: p.position,
          },
          transaction,
        },
      );
    }
    await transaction.commit();
    response(res, 200, true, "Niuniu result recalculated and history archived");
  } catch (error) {
    await transaction.rollback();
    response(res, 500, false, "Recalculation failed", { error: error.message });
  }
};

module.exports = {
  recalculateResult,
  recalculateNiuniuResult,
};
