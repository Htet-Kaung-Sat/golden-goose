"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Roles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      desk_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      account: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING,
      },
      creator_account: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      level: {
        allowNull: true,
        unique: false,
        type: Sequelize.INTEGER,
      },
      state: {
        allowNull: false,
        defaultValue: "normal",
        type: Sequelize.STRING,
      },
      locking: {
        defaultValue: "normal",
        type: Sequelize.STRING,
      },
      balance: {
        defaultValue: 0,
        type: Sequelize.INTEGER,
      },
      bonus_type: {
        type: Sequelize.STRING,
      },
      bonus_rate: {
        type: Sequelize.DECIMAL(10, 2),
      },
      display_bonus: {
        type: Sequelize.BOOLEAN,
      },
      share_type: {
        type: Sequelize.BOOLEAN,
      },
      share_rate: {
        type: Sequelize.INTEGER,
      },
      permission: {
        type: Sequelize.STRING,
        defaultValue: null,
      },
      day_limit: {
        type: Sequelize.INTEGER,
        defaultValue: null,
      },
      token_version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      ip_address: {
        type: Sequelize.STRING,
        defaultValue: null,
      },
      login_flg: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
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
    await queryInterface.dropTable("Users");
  },
};
