'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Scanner extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
       Scanner.belongsTo(models.Desk, {
        foreignKey: "desk_id",
        as: "desk",
      });
    }
  }
  Scanner.init({
    name: DataTypes.STRING,
    desk_id: DataTypes.INTEGER,
    com_port: DataTypes.STRING,
    serial_number: DataTypes.STRING,
    position: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Scanner',
  });
  return Scanner;
};