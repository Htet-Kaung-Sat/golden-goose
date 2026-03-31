"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RoundResultHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      RoundResultHistory.belongsTo(models.GameRound, {
        foreignKey: "round_id",
        as: "round",
      });
      RoundResultHistory.belongsTo(models.Result, {
        foreignKey: "result_id",
        as: "result",
      });
    }
  }
  RoundResultHistory.init(
    {
      round_id: DataTypes.INTEGER,
      result_id: DataTypes.INTEGER,
      recalculate_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RoundResultHistory",
    },
  );
  return RoundResultHistory;
};
