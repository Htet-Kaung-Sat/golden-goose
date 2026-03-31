"use strict";

const { Game } = require("../models");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const resultsData = [
      // NIUNIU
      { game: "NIUNIU",  position: 1, key: "banker1Double", name: "庄1翻倍", ratio: 1 },
      { game: "NIUNIU",  position: 2, key: "banker1Even", name: "庄1平倍", ratio: 1 },
      { game: "NIUNIU",  position: 3, key: "banker2Double", name: "庄2翻倍", ratio: 1 },
      { game: "NIUNIU",  position: 4, key: "banker2Even", name: "庄2平倍", ratio: 1 },
      { game: "NIUNIU",  position: 5, key: "banker3Double", name: "庄3翻倍", ratio: 1 },
      { game: "NIUNIU",  position: 6, key: "banker3Even", name: "庄3平倍", ratio: 1 },
      { game: "NIUNIU",  position: 7, key: "player1Double", name: "闲1翻倍", ratio: 1 },
      { game: "NIUNIU",  position: 8, key: "player1Even", name: "闲1平倍", ratio: 1 },
      { game: "NIUNIU",  position: 9, key: "player2Double", name: "闲2翻倍", ratio: 1 },
      { game: "NIUNIU",  position: 10, key: "player2Even", name: "闲2平倍", ratio: 1 },
      { game: "NIUNIU",  position: 11, key: "player3Double", name: "闲3翻倍", ratio: 1 },
      { game: "NIUNIU",  position: 12, key: "player3Even", name: "闲3平倍", ratio: 1 },

      // LONGHU 
      { game: "LONGHU", position: 1, key: "dragonSingle", name: "龙单", ratio: 0.75 },
      { game: "LONGHU", position: 2, key: "dragonDouble", name: "龙双", ratio: 1.05 },
      { game: "LONGHU", position: 3, key: "dragon", name: "龙", ratio: 0.97 },
      { game: "LONGHU", position: 4, key: "tie", name: "和", ratio: 8 },
      { game: "LONGHU", position: 5, key: "tiger", name: "虎", ratio: 0.97 },
      { game: "LONGHU", position: 6, key: "tigerDouble", name: "虎双", ratio: 1.05 },
      { game: "LONGHU", position: 7, key: "tigerSingle", name: "虎单", ratio: 0.75 },

      // BACCARAT N
      { game: "BACCARAT", baccarat_type: "N", position: 1, key: "playerPair", name: "闲对", ratio: 11 },
      { game: "BACCARAT", baccarat_type: "N", position: 2, key: "player", name: "闲", ratio: 1 },
      { game: "BACCARAT", baccarat_type: "N", position: 3, key: "tie", name: "和", ratio: 8 },
      { game: "BACCARAT", baccarat_type: "N", position: 4, key: "supertwoSix", name: "超6", ratio: 12 },
      { game: "BACCARAT", baccarat_type: "N", position: 5, key: "superthreeSix", name: "超6", ratio: 20 },
      { game: "BACCARAT", baccarat_type: "N", position: 6, key: "banker", name: "庄", ratio: 1 },
      { game: "BACCARAT", baccarat_type: "N", position: 7, key: "bankerPair", name: "庄对", ratio: 11 },

      // BACCARAT G
      { game: "BACCARAT", baccarat_type: "G", position: 1, key: "big", name: "大", ratio: 0.5 },
      { game: "BACCARAT", baccarat_type: "G", position: 2, key: "anyPair", name: "任意对子", ratio: 5 },
      { game: "BACCARAT", baccarat_type: "G", position: 3, key: "playerPair", name: "闲对", ratio: 11 },
      { game: "BACCARAT", baccarat_type: "G", position: 4, key: "player", name: "闲", ratio: 1 },
      { game: "BACCARAT", baccarat_type: "G", position: 5, key: "tie", name: "和", ratio: 8 },
      { game: "BACCARAT", baccarat_type: "G", position: 6, key: "banker", name: "庄", ratio: 0.95 },
      { game: "BACCARAT", baccarat_type: "G", position: 7, key: "bankerPair", name: "庄对", ratio: 11 },
      { game: "BACCARAT", baccarat_type: "G", position: 8, key: "small", name: "小", ratio: 1.5 },
      { game: "BACCARAT", baccarat_type: "G", position: 9, key: "perfectPair", name: "完美对子", ratio: 20 },

      // BACCARAT B
      { game: "BACCARAT", baccarat_type: "B", position: 1, key: "playerPair", name: "闲对", ratio: 11 },
      { game: "BACCARAT", baccarat_type: "B", position: 2, key: "player", name: "闲", ratio: 1 },
      { game: "BACCARAT", baccarat_type: "B", position: 3, key: "tie", name: "和", ratio: 8 },
      { game: "BACCARAT", baccarat_type: "B", position: 4, key: "banker", name: "庄", ratio: 0.95 },
      { game: "BACCARAT", baccarat_type: "B", position: 5, key: "bankerPair", name: "庄对", ratio: 11 },

    ];

    const resultsToInsert = [];

    for (const r of resultsData) {
      const game = await Game.findOne({ where: { type: r.game } });

      if (!game) {
        throw new Error(
          `Game ${r.game} not found. Please seed Game table first.`
        );
      }

      resultsToInsert.push({
        game_id: game.id,
        key: r.key,
        name: r.name,
        ratio: r.ratio,
        position: r.position,
        baccarat_type: r.baccarat_type || null
      });
    }

    await queryInterface.bulkInsert("Results", resultsToInsert, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Results", null, {});
  },
};
