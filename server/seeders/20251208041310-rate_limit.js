'use strict';
const { Game } = require("../models");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
  const timestamp = new Date();

  const resultsData = [
      // NIUNIU
      { game: "NIUNIU",  min_bet: 10, max_bet: 5000 },
      { game: "NIUNIU",  min_bet: 100, max_bet: 10000 },
      { game: "NIUNIU",  min_bet: 500, max_bet: 50000 },
      
      // BACCARAT
      { game: "BACCARAT",  min_bet: 10, max_bet: 5000 },
      { game: "BACCARAT",  min_bet: 100, max_bet: 10000 },
      { game: "BACCARAT",  min_bet: 500, max_bet: 50000 },
      { game: "BACCARAT",  min_bet: 1000, max_bet: 100000 },
      { game: "BACCARAT",  min_bet: 200, max_bet: 20000 },
      { game: "BACCARAT",  min_bet: 300, max_bet: 30000 },

       // LONGHU 
      { game: "LONGHU",  min_bet: 10, max_bet: 5000 },
      { game: "LONGHU",  min_bet: 100, max_bet: 10000 },
      { game: "LONGHU",  min_bet: 500, max_bet: 50000 },
      { game: "LONGHU",  min_bet: 1000, max_bet: 50000 },
      { game: "LONGHU",  min_bet: 200, max_bet: 20000 },
      { game: "LONGHU",  min_bet: 300, max_bet: 30000 },

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
            min_bet: r.min_bet,
            max_bet: r.max_bet,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
        await queryInterface.bulkInsert("RateLimits", resultsToInsert, {});
  },

  async down (queryInterface, Sequelize) {
      await queryInterface.bulkDelete("RateLimits", null, {});
  }
};
