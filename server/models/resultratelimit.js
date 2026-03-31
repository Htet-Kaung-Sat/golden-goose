'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ResultRateLimit extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        ResultRateLimit.belongsTo(models.Result, {
          foreignKey: "result_id",
          as: "result"
        });

        ResultRateLimit.belongsTo(models.RateLimit, {
          foreignKey: "rate_limit_id",
          as: "rate_limit"
        });
    }
  }
  ResultRateLimit.init({
    result_id: DataTypes.INTEGER,
    rate_limit_id: DataTypes.INTEGER,
    min_bet: DataTypes.INTEGER,
    max_bet: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'ResultRateLimit',
  });
  return ResultRateLimit;
};