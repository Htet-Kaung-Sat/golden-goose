"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Game extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Game.hasMany(models.Desk, {
        foreignKey: "game_id",
        as: "desks",
      });
      Game.hasMany(models.Result, {
        foreignKey: "game_id",
        as: "results",
      });
    }
  }
  Game.init(
    {
      name: DataTypes.STRING,
      type: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Game",
    },
  );
  return Game;
};
