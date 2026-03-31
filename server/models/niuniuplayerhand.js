"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class NiuniuPlayerHand extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      NiuniuPlayerHand.belongsTo(models.NiuniuRound, {
        foreignKey: "niuniu_round_id",
        as: "niuniu_round",
      });
    }
  }
  NiuniuPlayerHand.init(
    {
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
      modelName: "NiuniuPlayerHand",
    },
  );
  return NiuniuPlayerHand;
};
