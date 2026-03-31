"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("NiuniuRounds", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      game_round_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "GameRounds",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      banker_cards: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      banker_niu_value: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      banker_hand_type: {
        type: Sequelize.STRING,
      },
      banker_multiplier: {
        type: Sequelize.INTEGER,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("NiuniuRounds");
  },
};
