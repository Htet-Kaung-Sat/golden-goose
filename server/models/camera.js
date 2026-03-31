"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Camera extends Model {
    static associate(models) {
      Camera.belongsTo(models.Desk, {
        foreignKey: "desk_id",
        as: "desk",
      });
    }
  }
  Camera.init(
    {
      desk_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      camera_no: DataTypes.STRING,
      position: DataTypes.STRING,
      url: DataTypes.STRING,
      status: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Camera",
    }
  );
  return Camera;
};
