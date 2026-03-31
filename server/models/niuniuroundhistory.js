"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class NiuniuRoundHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      NiuniuRoundHistory.belongsTo(models.NiuniuRound, {
        foreignKey: "niuniu_round_id",
        as: "niuniu_round",
      });
      NiuniuRoundHistory.belongsTo(models.GameRound, {
        foreignKey: "game_round_id",
        as: "game_round",
      });
    }
  }
  NiuniuRoundHistory.init(
    {
      niuniu_round_id: DataTypes.INTEGER,
      game_round_id: DataTypes.INTEGER,
      banker_cards: DataTypes.STRING,
      banker_niu_value: DataTypes.INTEGER,
      banker_hand_type: DataTypes.STRING,
      banker_multiplier: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "NiuniuRoundHistory",
    },
  );
  return NiuniuRoundHistory;
};
