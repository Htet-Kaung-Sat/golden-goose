"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.BetResult, {
        foreignKey: "bet_result_id",
        as: "betResult",
      });
      Transaction.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }
  Transaction.init(
    {
      user_id: DataTypes.INTEGER,
      bet_result_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      topup_no: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      transaction_type: DataTypes.STRING,
      amount: DataTypes.DECIMAL(10, 3),
      before_amount: DataTypes.DECIMAL(10, 3),
      after_amount: DataTypes.DECIMAL(10, 3),
      recalculate_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Transaction",
      indexes: [
        {
          fields: ["user_id", "createdAt"],
          name: "idx_transactions_user_created",
        },
        {
          fields: ["bet_result_id"],
          name: "idx_transactions_bet_result_id",
        },
      ],
    },
  );
  return Transaction;
};
