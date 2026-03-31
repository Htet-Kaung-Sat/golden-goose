'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserRateLimit extends Model {
    static associate(models) {
      UserRateLimit.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      UserRateLimit.belongsTo(models.RateLimit, {
        foreignKey: "rate_limit_id",
        as: "rateLimit",
      });
    }
  }

  UserRateLimit.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      rate_limit_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserRateLimit',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'rate_limit_id'],
        },
      ],
    }
  );

  return UserRateLimit;
};
