"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("GameSessions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      desk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Desks",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      session_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
      },
      moper: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      hander: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      monitor: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cutter: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shuffle_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      card_color: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      start_time: {
        type: Sequelize.DATE,
      },
      end_time: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable("GameSessions");
  },
};
