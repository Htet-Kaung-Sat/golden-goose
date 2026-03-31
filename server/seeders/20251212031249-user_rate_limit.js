"use strict";

const { User, RateLimit } = require("../models");

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    //
    // FLEXIBLE INPUT DATA
    //
    // You can put account names OR user IDs
    // You can put rate_limit_id OR custom code
    //
    const input = [
      { account: "admin", rate_limit_id: 1 },
      { account: "admin", rate_limit_id: 2 },
      { account: "admin", rate_limit_id: 3 },
      { account: "admin", rate_limit_id: 4 },
      { account: "admin", rate_limit_id: 5 },
      { account: "admin", rate_limit_id: 6 },
      { account: "admin", rate_limit_id: 7 },
      { account: "admin", rate_limit_id: 8 },
      { account: "admin", rate_limit_id: 9 },
      { account: "admin", rate_limit_id: 10 },
      { account: "admin", rate_limit_id: 11 },
      { account: "admin", rate_limit_id: 12 },
      { account: "admin", rate_limit_id: 13 },
      { account: "admin", rate_limit_id: 14 },
      { account: "admin", rate_limit_id: 15 },
      { account: "agent1", rate_limit_id: 1 },
      { account: "agent1", rate_limit_id: 2 },
      { account: "agent1", rate_limit_id: 3 },
      { account: "agent1", rate_limit_id: 4 },
      { account: "agent1", rate_limit_id: 5 },
      { account: "agent1", rate_limit_id: 6 },
      { account: "agent1", rate_limit_id: 7 },
      { account: "agent1", rate_limit_id: 8 },
      { account: "agent1", rate_limit_id: 9 },
      { account: "agent1", rate_limit_id: 10 },
      { account: "agent1", rate_limit_id: 11 },
      { account: "agent1", rate_limit_id: 12 },
      { account: "agent1", rate_limit_id: 13 },
      { account: "agent1", rate_limit_id: 14 },
      { account: "agent1", rate_limit_id: 15 },
      { account: "agent2", rate_limit_id: 1 },
      { account: "agent2", rate_limit_id: 2 },
      { account: "agent2", rate_limit_id: 3 },
      { account: "agent2", rate_limit_id: 4 },
      { account: "agent2", rate_limit_id: 5 },
      { account: "agent2", rate_limit_id: 6 },
      { account: "agent2", rate_limit_id: 7 },
      { account: "agent2", rate_limit_id: 8 },
      { account: "agent2", rate_limit_id: 9 },
      { account: "agent2", rate_limit_id: 10 },
      { account: "agent2", rate_limit_id: 11 },
      { account: "agent2", rate_limit_id: 12 },
      { account: "agent2", rate_limit_id: 13 },
      { account: "agent2", rate_limit_id: 14 },
      { account: "agent2", rate_limit_id: 15 },
      { account: "agent3", rate_limit_id: 1 },
      { account: "agent3", rate_limit_id: 2 },
      { account: "agent3", rate_limit_id: 3 },
      { account: "agent3", rate_limit_id: 4 },
      { account: "agent3", rate_limit_id: 5 },
      { account: "agent3", rate_limit_id: 6 },
      { account: "agent3", rate_limit_id: 7 },
      { account: "agent3", rate_limit_id: 8 },
      { account: "agent3", rate_limit_id: 9 },
      { account: "agent3", rate_limit_id: 10 },
      { account: "agent3", rate_limit_id: 11 },
      { account: "agent3", rate_limit_id: 12 },
      { account: "agent3", rate_limit_id: 13 },
      { account: "agent3", rate_limit_id: 14 },
      { account: "agent3", rate_limit_id: 15 },
      { account: "member1", rate_limit_id: 1 },
      { account: "member1", rate_limit_id: 4 },
      { account: "member1", rate_limit_id: 10 },
      { account: "member2", rate_limit_id: 3 },
      { account: "member2", rate_limit_id: 9 },
      { account: "member2", rate_limit_id: 15 },
    ];

    const rows = [];

    for (const row of input) {
      let userId = row.user_id || row.account_id;

      if (!userId && row.account) {
        const user = await User.findOne({ where: { account: row.account } });
        if (!user) {
          throw new Error(`User with account "${row.account}" not found.`);
        }
        userId = user.id;
      }

      let rateLimitId = row.rate_limit_id;

      const rateLimit = await RateLimit.findOne({
        where: { id: rateLimitId },
      });

      if (!rateLimit) {
        throw new Error(`RateLimit with id "${rateLimitId}" not found.`);
      }

      rows.push({
        user_id: userId,
        rate_limit_id: rateLimitId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await queryInterface.bulkInsert("UserRateLimits", rows, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("UserRateLimits", null, {});
  },
};
