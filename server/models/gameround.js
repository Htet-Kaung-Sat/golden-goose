"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GameRound extends Model {
    static associate(models) {
      GameRound.belongsTo(models.GameSession, {
        foreignKey: "session_id",
        as: "gameSession",
      });
      GameRound.hasMany(models.GameRoundHistory, {
        foreignKey: "game_round_id",
        as: "gameRoundHistories",
      });
      GameRound.hasMany(models.RoundResult, {
        foreignKey: "round_id",
        as: "gameround",
      });
      GameRound.hasMany(models.Bet, {
        foreignKey: "round_id",
        as: "bets",
      });
    }
  }
  GameRound.init(
    {
      session_id: DataTypes.INTEGER,
      round_no: DataTypes.INTEGER,
      status: DataTypes.STRING,
      cards: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "GameRound",
    },
  );
  return GameRound;
};
