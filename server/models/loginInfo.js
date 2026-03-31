'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoginInfo extends Model {
    static associate(models) {
      LoginInfo.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }

  }
  LoginInfo.init({
    user_id: DataTypes.INTEGER,
    serial_number: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true,
    },
    state: DataTypes.STRING,
    equipment: DataTypes.STRING,
    browser: DataTypes.STRING,
    ip_address: DataTypes.STRING,
    site: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'LoginInfo',
  });
  return LoginInfo;
};