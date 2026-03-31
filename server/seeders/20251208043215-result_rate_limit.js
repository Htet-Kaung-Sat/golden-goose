"use strict";
const { Result, Game, RateLimit } = require("../models");

/**
 * Compute max_bet for a result based on game type, target, range, and result key.
 */
function getMaxBet(gameType, target, rangeItem, resultKey) {
  const max = rangeItem.max_bet;
  switch (gameType) {
    case "NIUNIU":
      if (target === 3 && resultKey.includes("Double"))
        return Math.floor(max / 5);
      return max;
    case "BACCARAT": {
      const isPlayerOrBanker = resultKey === "player" || resultKey === "banker";
      const includesPair = resultKey.includes("Pair");
      if ([1, 2, 5, 6].includes(target)) {
        return isPlayerOrBanker ? max : Math.floor(max / 10);
      }
      if ([3, 4].includes(target)) {
        if (isPlayerOrBanker) return max;
        if (includesPair) return Math.floor(max / 20);
        return Math.floor(max / 10);
      }
      return max;
    }
    case "LONGHU": {
      const isDragonOrTiger = resultKey === "dragon" || resultKey === "tiger";
      if (target === 7) {
        if (isDragonOrTiger) return max;
        if (resultKey === "tie") return Math.floor(max / 5);
        return Math.floor(max / 10);
      }
      return isDragonOrTiger ? max : Math.floor(max / 10);
    }
    default:
      return max;
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    const range = [
      { target: 1, min_bet: 10, max_bet: 5000 },
      { target: 2, min_bet: 100, max_bet: 10000 },
      { target: 3, min_bet: 500, max_bet: 50000 },
      { target: 4, min_bet: 1000, max_bet: 100000 },
      { target: 5, min_bet: 200, max_bet: 20000 },
      { target: 6, min_bet: 300, max_bet: 30000 },
      { target: 7, min_bet: 1000, max_bet: 50000 },
    ];

    const resultsToInsert = [];

    const processGame = async (gameType, targets) => {
      const game = await Game.findOne({ where: { type: gameType } });
      if (!game) throw new Error(`Game ${gameType} not found.`);

      const results = await Result.findAll({ where: { game_id: game.id } });

      for (const target of targets) {
        const rangeItem = range.find((x) => x.target === target);
        if (!rangeItem) throw new Error(`Range target ${target} not found.`);

        const rateLimit = await RateLimit.findOne({
          where: {
            game_id: game.id,
            min_bet: rangeItem.min_bet,
            max_bet: rangeItem.max_bet,
          },
        });
        if (!rateLimit)
          throw new Error(
            `RateLimit for ${gameType} range ${rangeItem.min_bet}-${rangeItem.max_bet} not found.`,
          );

        for (const result of results) {
          const max_bet = getMaxBet(gameType, target, rangeItem, result.key);
          resultsToInsert.push({
            result_id: result.id,
            rate_limit_id: rateLimit.id,
            min_bet: rangeItem.min_bet,
            max_bet,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      }
    };

    // NIUNIU: targets 1, 2, 3
    await processGame("NIUNIU", [1, 2, 3]);

    // BACCARAT: targets 1–6
    await processGame("BACCARAT", [1, 2, 3, 4, 5, 6]);

    // LONGHU: targets 1, 2, 3, 5, 6, 7 (no target 4 in rate_limit seeder for LONGHU)
    await processGame("LONGHU", [1, 2, 3, 5, 6, 7]);

    await queryInterface.bulkInsert("ResultRateLimits", resultsToInsert, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ResultRateLimits", null, {});
  },
};
