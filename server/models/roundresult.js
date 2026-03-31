"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RoundResult extends Model {
    static associate(models) {
      RoundResult.belongsTo(models.GameRound, {
        foreignKey: "round_id",
        as: "round",
      });
      RoundResult.belongsTo(models.Result, {
        foreignKey: "result_id",
        as: "result",
      });
    }
  }
  RoundResult.init(
    {
      round_id: DataTypes.INTEGER,
      result_id: DataTypes.INTEGER,
      recalculate_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RoundResult",
    },
  );
  return RoundResult;
};
