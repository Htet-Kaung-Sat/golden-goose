'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RateLimit extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      RateLimit.belongsTo(models.Game, {
        foreignKey: "game_id",
        as: "game",
      });
      RateLimit.hasMany(models.ResultRateLimit, {
        foreignKey: "rate_limit_id",
        as: "results"
      });
    }
  }
  RateLimit.init({
    game_id: DataTypes.INTEGER,
    min_bet: DataTypes.INTEGER,
    max_bet: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'RateLimit',
  });
  return RateLimit;
};