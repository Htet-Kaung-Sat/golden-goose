"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Announce extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Announce.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }
  Announce.init(
    {
      user_id: DataTypes.INTEGER,
      title: DataTypes.STRING,
      content: DataTypes.TEXT,
      type: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Announce",
    },
  );
  return Announce;
};
