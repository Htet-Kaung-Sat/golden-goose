"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class NiuniuRound extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      NiuniuRound.belongsTo(models.GameRound, {
        foreignKey: "game_round_id",
        as: "game_round",
      });
      NiuniuRound.hasMany(models.NiuniuPlayerHand, {
        foreignKey: "niuniu_round_id",
        as: "niuniuPlayerHands",
      });
    }
  }
  NiuniuRound.init(
    {
      game_round_id: DataTypes.INTEGER,
      banker_cards: DataTypes.STRING,
      banker_niu_value: DataTypes.INTEGER,
      banker_hand_type: DataTypes.STRING,
      banker_multiplier: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "NiuniuRound",
    },
  );
  return NiuniuRound;
};
