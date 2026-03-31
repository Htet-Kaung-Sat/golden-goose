"use strict";
const { Desk, User } = require("../models");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();
    const desks = await Desk.findAll();

    const gameSessionsToInsert = [];

    for (const desk of desks) {
      const user = await User.findOne({ where: { name: desk.name } });
      if (!user) {
        throw new Error(
          `User ${user.name} not found. Please run User seeder first.`,
        );
      }

      gameSessionsToInsert.push({
        desk_id: desk.id,
        user_id: user.id,
        status: "active",
        session_no: 1,
        start_time: new Date(),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await queryInterface.bulkInsert("GameSessions", gameSessionsToInsert, {});
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
