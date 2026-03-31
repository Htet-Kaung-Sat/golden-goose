"use strict";

const bcrypt = require("bcryptjs");
const { Role, Desk } = require("../models");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    const usersData = [
      {
        account: "dev",
        name: "Developer User",
        roleName: "developer",
        password: "dev12345",
        level: 1,
      },
      {
        account: "admin",
        name: "Admin User",
        roleName: "admin",
        password: "admin123",
        level: 1,
      },
      {
        account: "manager",
        name: "Manager User",
        roleName: "manager",
        password: "manager123",
        level: 2,
      },
      {
        account: "000020",
        name: "G20",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000036",
        name: "N6",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000038",
        name: "N8",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000001",
        name: "G01",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000002",
        name: "G02",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000003",
        name: "G03",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000005",
        name: "G05",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000101",
        name: "B1",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000102",
        name: "B2",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000103",
        name: "B3",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000105",
        name: "B5",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000011",
        name: "G11",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000012",
        name: "G12",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000013",
        name: "G13",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "000015",
        name: "G15",
        roleName: "staff",
        password: "123456",
      },
      {
        account: "agent1",
        name: "Agent User1",
        roleName: "agent",
        password: "agent123",
        creator_account: "admin",
        state: "normal",
        balance: "2000000",
        bonus_type: "both",
        bonus_rate: 0.9,
        share_type: true,
        share_rate: 100,
        level: 3,
      },
      {
        account: "agent2",
        name: "Agent User2",
        roleName: "agent",
        password: "agent123",
        creator_account: "agent1",
        state: "normal",
        balance: "0",
        bonus_type: "both",
        bonus_rate: 0.9,
        share_type: true,
        share_rate: 90,
        level: 4,
      },
      {
        account: "member1",
        name: "Member1",
        roleName: "member",
        password: "member123",
        creator_account: "agent1",
        state: "normal",
        balance: "0",
        bonus_type: "both",
        bonus_rate: 0.9,
        display_bonus: true,
        level: 4,
      },
      {
        account: "agent3",
        name: "Agent3",
        roleName: "agent",
        password: "agent123",
        creator_account: "agent2",
        state: "normal",
        balance: "0",
        bonus_type: "both",
        bonus_rate: 0.9,
        share_type: false,
        share_rate: 0,
        level: 5,
      },
      {
        account: "member2",
        name: "Member2",
        roleName: "member",
        password: "member123",
        creator_account: "agent2",
        state: "normal",
        balance: "0",
        bonus_type: "both",
        bonus_rate: 0.9,
        display_bonus: true,
        level: 5,
      },
    ];

    const usersToInsert = [];

    for (const u of usersData) {
      const role = await Role.findOne({ where: { name: u.roleName } });
      if (!role) {
        throw new Error(
          `Role ${u.roleName} not found. Please run Role seeder first.`,
        );
      }

      const hashedPassword = await bcrypt.hash(u.password, 10);

      let desk_id = null;
      if (u.roleName === "staff") {
        const desk = await Desk.findOne({ where: { name: u.name } });
        if (desk) desk_id = desk.id;
      }

      usersToInsert.push({
        role_id: role.id,
        desk_id,
        account: u.account,
        creator_account: u.creator_account || null,
        name: u.name,
        password: hashedPassword,
        level: u.level,
        state: "normal",
        locking: "normal",
        balance: u.balance ?? 0,
        bonus_type: u.bonus_type,
        bonus_rate: u.bonus_rate,
        display_bonus: u.display_bonus ?? null,
        share_type: u.share_type ?? null,
        share_rate: u.share_rate ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await queryInterface.bulkInsert("Users", usersToInsert, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      "Users",
      {
        account: ["dev", "admin", "manager", "staff", "player"],
      },
      {},
    );
  },
};
