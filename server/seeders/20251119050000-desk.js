"use strict";
const { Game } = require("../models");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    const desksData = [
      { game: "NIUNIU", name: "G20", desk_no: 20, position: 1 },
      {
        game: "BACCARAT",
        name: "N6",
        baccarat_type: "N",
        desk_no: 36,
        position: 2,
      },
      {
        game: "BACCARAT",
        name: "N8",
        baccarat_type: "N",
        desk_no: 38,
        position: 3,
      },
      {
        game: "BACCARAT",
        name: "G01",
        baccarat_type: "G",
        desk_no: 1,
        position: 4,
      },
      {
        game: "BACCARAT",
        name: "G02",
        baccarat_type: "G",
        desk_no: 2,
        position: 5,
      },
      {
        game: "BACCARAT",
        name: "G03",
        baccarat_type: "G",
        desk_no: 3,
        position: 6,
      },
      {
        game: "BACCARAT",
        name: "G05",
        baccarat_type: "G",
        desk_no: 5,
        position: 7,
      },
      {
        game: "BACCARAT",
        name: "B1",
        baccarat_type: "B",
        desk_no: 101,
        position: 8,
      },
      {
        game: "BACCARAT",
        name: "B2",
        baccarat_type: "B",
        desk_no: 102,
        position: 9,
      },
      {
        game: "BACCARAT",
        name: "B3",
        baccarat_type: "B",
        desk_no: 103,
        position: 10,
      },
      {
        game: "BACCARAT",
        name: "B5",
        baccarat_type: "B",
        desk_no: 105,
        position: 11,
      },
      { game: "LONGHU", name: "G11", desk_no: 11, position: 12 },
      { game: "LONGHU", name: "G12", desk_no: 12, position: 13 },
      { game: "LONGHU", name: "G13", desk_no: 13, position: 14 },
      { game: "LONGHU", name: "G15", desk_no: 15, position: 15 },
    ];

    const desksToInsert = [];

    for (const desk of desksData) {
      const game = await Game.findOne({ where: { type: desk.game } });
      if (!game) {
        throw new Error(
          `Game ${desk.game} not found. Please run Game seeder first.`
        );
      }

      desksToInsert.push({
        game_id: game.id,
        name: desk.name,
        baccarat_type: desk.baccarat_type || null,
        desk_no: desk.desk_no,
        position: desk.position,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await queryInterface.bulkInsert("Desks", desksToInsert, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Desks", {}, {});
  },
};
