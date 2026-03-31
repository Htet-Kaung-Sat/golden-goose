"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("NiuniuPlayerHands", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      niuniu_round_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "NiuniuRounds",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      player_position: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      cards: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      niu_value: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      hand_type: {
        type: Sequelize.STRING,
      },
      result: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      multiplier: {
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
    await queryInterface.dropTable("NiuniuPlayerHands");
  },
};
