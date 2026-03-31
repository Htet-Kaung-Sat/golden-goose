"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Roles", [
      {
        name: "developer",
        chinese_name: "开发者",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "admin",
        chinese_name: "管理员",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "manager",
        chinese_name: "经理",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "staff",
        chinese_name: "员工",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "member",
        chinese_name: "会员",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "agent",
        chinese_name: "代理",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "sub_account",
        chinese_name: "子帐号",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Roles", null, {});
  },
};
