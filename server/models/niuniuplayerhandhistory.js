"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class NiuniuPlayerHandHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      NiuniuPlayerHandHistory.belongsTo(models.NiuniuPlayerHand, {
        foreignKey: "niuniu_player_hand_id",
        as: "niuniu_player_hand",
      });
      NiuniuPlayerHandHistory.belongsTo(models.NiuniuRound, {
        foreignKey: "niuniu_round_id",
        as: "niuniu_round",
      });
    }
  }
  NiuniuPlayerHandHistory.init(
    {
      niuniu_player_hand_id: DataTypes.INTEGER,
      niuniu_round_id: DataTypes.INTEGER,
      player_position: DataTypes.STRING,
      cards: DataTypes.STRING,
      niu_value: DataTypes.INTEGER,
      hand_type: DataTypes.STRING,
      result: DataTypes.STRING,
      multiplier: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "NiuniuPlayerHandHistory",
    },
  );
  return NiuniuPlayerHandHistory;
};
