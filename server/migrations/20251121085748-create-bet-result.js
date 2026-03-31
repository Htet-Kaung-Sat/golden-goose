"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("BetResults", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      result_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Results",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      bet_id: {
        allowNull: false,
        references: {
          model: "Bets",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        type: Sequelize.INTEGER,
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      actual_win_lose_amount: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      win_lose_flg: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      cancel_flg: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      settle_flg: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      recalculate_flg: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.dropTable("BetResults");
  },
};
