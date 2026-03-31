"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Desk extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Desk.belongsTo(models.Game, {
        foreignKey: "game_id",
        as: "game",
      });

      Desk.hasMany(models.GameSession, {
        foreignKey: "desk_id",
        as: "gameSessions",
      });

      Desk.hasMany(models.Scanner, {
        foreignKey: "desk_id",
        as: "scanners",
      });

      Desk.hasMany(models.Camera, {
        foreignKey: "desk_id",
        as: "cameras",
      });
    }
  }
  Desk.init(
    {
      name: DataTypes.STRING,
      game_id: DataTypes.INTEGER,
      baccarat_type: DataTypes.STRING,
      desk_no: DataTypes.INTEGER,
      position: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Desk",
    },
  );
  return Desk;
};
