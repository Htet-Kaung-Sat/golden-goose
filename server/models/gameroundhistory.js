"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GameRoundHistory extends Model {
    static associate(models) {
      GameRoundHistory.belongsTo(models.GameSession, {
        foreignKey: "session_id",
        as: "gameSession",
      });
      GameRoundHistory.belongsTo(models.GameRound, {
        foreignKey: "game_round_id",
        as: "gameRound",
      });
    }
  }
  GameRoundHistory.init(
    {
      game_round_id: DataTypes.INTEGER,
      session_id: DataTypes.INTEGER,
      round_no: DataTypes.INTEGER,
      status: DataTypes.STRING,
      cards: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: "GameRoundHistory",
    },
  );
  return GameRoundHistory;
};
