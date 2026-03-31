'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OperationLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      OperationLog.belongsTo(models.User, {
        foreignKey: 'operator_user_id',
        as: 'operator',
      });
      OperationLog.belongsTo(models.User, {
        foreignKey: 'operated_user_id',
        as: 'operatedUser',
      });
    }
  }
  OperationLog.init({
    operator_user_id: DataTypes.NUMBER,
    action: DataTypes.ENUM(
          'points_boost',
          'deposit',
          'modify',
          'login',
          'wash_code',
          'recalculate',
          'cancel'
        ),
    action_display: DataTypes.STRING(255),
    operated_user_id: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    operation_id: DataTypes.INTEGER,
    ip_location: DataTypes.STRING(255),
    remark: DataTypes.STRING(255),
  }, {
    sequelize,
    modelName: 'OperationLog',
  });
  return OperationLog;
};