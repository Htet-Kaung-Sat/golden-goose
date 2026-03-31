'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Bet.belongsTo(models.GameRound, {
        foreignKey: 'round_id',
        as: 'gameround'
      });
      Bet.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      Bet.hasMany(models.BetResult, {
        foreignKey: 'bet_id',
        as: 'bet'
      });
    }
  }
  Bet.init(
    {
      round_id: DataTypes.INTEGER,
      user_id: DataTypes.INTEGER,
      ip_address: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Bet",
      indexes: [
        { fields: ["round_id", "user_id"], name: "idx_bets_round_user" },
        { fields: ["user_id"], name: "idx_bets_user_id" },
      ],
    },
  );
  return Bet;
};