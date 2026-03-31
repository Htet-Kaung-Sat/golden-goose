"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BetResult extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BetResult.belongsTo(models.Result, {
        foreignKey: "result_id",
        as: "result",
      });
      BetResult.belongsTo(models.Bet, {
        foreignKey: "bet_id",
        as: "bet",
      });
    }
  }

  BetResult.init(
    {
      result_id: DataTypes.INTEGER,
      bet_id: DataTypes.INTEGER,
      amount: DataTypes.INTEGER,
      actual_win_lose_amount: DataTypes.DECIMAL(10, 3),
      win_lose_flg: DataTypes.BOOLEAN,
      cancel_flg: DataTypes.BOOLEAN,
      settle_flg: DataTypes.BOOLEAN,
      image: DataTypes.STRING,
      recalculate_flg: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "BetResult",
      indexes: [
        {
          fields: ["bet_id", "cancel_flg"],
          name: "idx_bet_results_bet_cancel",
        },
        { fields: ["bet_id"], name: "idx_bet_results_bet_id" },
        { fields: ["result_id"], name: "idx_bet_results_result_id" },
      ],
    },
  );
  return BetResult;
};
