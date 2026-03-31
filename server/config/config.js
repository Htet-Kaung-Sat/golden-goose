"use strict";

/**
 * Sequelize config loaded from environment variables.
 * No credentials are stored in this file. See config.example.json for required env vars.
 */
require("dotenv").config();
const env = process.env.NODE_ENV || "development";
const base = {
  dialect: "mysql",
  timezone: "+08:00",
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
};

const development = {
  ...base,
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || "kinpo_development",
  host: process.env.DB_HOST || "127.0.0.1",
};

const test = {
  ...base,
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || "kinpo_test",
  host: process.env.DB_HOST || "127.0.0.1",
};

const production = {
  ...base,
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || "kinpo_production",
  host: process.env.DB_HOST || "127.0.0.1",
};

module.exports = {
  development,
  test,
  production,
};
