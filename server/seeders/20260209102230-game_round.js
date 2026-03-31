"use strict";
const { GameSession } = require("../models");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();
    const gameSessions = await GameSession.findAll();

    const gameRoundsToInsert = [];

    for (const gameSession of gameSessions) {
      gameRoundsToInsert.push({
        session_id: gameSession.id,
        round_no: 1,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await queryInterface.bulkInsert("GameRounds", gameRoundsToInsert, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("GameRounds", {}, {});
  },
};
