"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GameSession extends Model {
    static associate(models) {
      GameSession.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      GameSession.belongsTo(models.Desk, {
        foreignKey: "desk_id",
        as: "desk",
      });

      GameSession.hasMany(models.GameRound, {
        foreignKey: "session_id",
        as: "gameRounds",
      });
    }
  }
  GameSession.init(
    {
      desk_id: DataTypes.INTEGER,
      user_id: DataTypes.INTEGER,
      session_no: DataTypes.INTEGER,
      status: DataTypes.STRING,
      moper: DataTypes.STRING,
      hander: DataTypes.STRING,
      monitor: DataTypes.STRING,
      cutter: DataTypes.STRING,
      shuffle_type: DataTypes.STRING,
      card_color: DataTypes.STRING,
      start_time: DataTypes.DATE,
      end_time: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "GameSession",
    }
  );
  return GameSession;
};
