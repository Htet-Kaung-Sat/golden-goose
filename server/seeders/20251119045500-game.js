"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    const games = [
      { name: "牛牛", type: "NIUNIU" },
      { name: "百家乐", type: "BACCARAT" },
      { name: "龙虎斗", type: "LONGHU" },
    ];

    const payload = games.map(g => ({
      name: g.name,
      type: g.type,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await queryInterface.bulkInsert("Games", payload, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Games", null, {});
  }
};
