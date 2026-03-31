"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Result extends Model {
    static associate(models) {
      Result.belongsTo(models.Game, {
        foreignKey: "game_id",
        as: "game",
      });
      Result.hasMany(models.RoundResult, {
        foreignKey: 'result_id',
        as: 'result'
      });
      Result.hasMany(models.ResultRateLimit, {
        foreignKey: "result_id",
        as: "rate_limits"
      });
    }
  }

  Result.init(
    {
      game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      baccarat_type: DataTypes.STRING,
      position:  {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      key: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: DataTypes.STRING,
      ratio: DataTypes.DECIMAL,
    },
    {
      sequelize,
      modelName: "Result",
      timestamps: false, 
    }
  );

  return Result;
};
