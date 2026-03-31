"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class BetResultHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BetResultHistory.belongsTo(models.Result, {
        foreignKey: "result_id",
        as: "result",
      });
      BetResultHistory.belongsTo(models.Bet, {
        foreignKey: "bet_id",
        as: "bet",
      });
      BetResultHistory.belongsTo(models.BetResult, {
        foreignKey: "bet_result_id",
        as: "betResult",
      });
    }
  }
  BetResultHistory.init(
    {
      result_id: DataTypes.INTEGER,
      bet_id: DataTypes.INTEGER,
      bet_result_id: DataTypes.INTEGER,
      amount: DataTypes.INTEGER,
      actual_win_lose_amount: DataTypes.INTEGER,
      win_lose_flg: DataTypes.BOOLEAN,
      cancel_flg: DataTypes.BOOLEAN,
      settle_flg: DataTypes.BOOLEAN,
      image: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "BetResultHistory",
    },
  );
  return BetResultHistory;
};
