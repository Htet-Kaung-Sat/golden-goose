"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.belongsTo(models.Role, {
        foreignKey: "role_id",
        as: "role",
      });
      User.hasMany(models.LoginInfo, {
        foreignKey: "user_id",
        as: "loginInfos",
      });
      User.hasMany(models.GameSession, {
        foreignKey: "user_id",
        as: "gameSessions",
      });
      User.hasMany(models.Bet, {
        foreignKey: "user_id",
        as: "bet",
      });
      User.hasMany(models.UserRateLimit, {
        foreignKey: "user_id",
        as: "userRateLimits",
      });
    }

    async validPassword(password) {
      return await bcrypt.compare(password, this.password);
    }
  }
  User.init(
    {
      role_id: DataTypes.INTEGER,
      desk_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      account: DataTypes.STRING,
      creator_account: DataTypes.STRING,
      name: DataTypes.STRING,
      password: DataTypes.STRING,
      level: DataTypes.INTEGER,
      state: DataTypes.STRING,
      locking: DataTypes.STRING,
      balance: DataTypes.INTEGER,
      bonus_type: DataTypes.STRING,
      bonus_rate: DataTypes.DECIMAL(10, 2),
      display_bonus: DataTypes.BOOLEAN,
      share_type: DataTypes.BOOLEAN,
      share_rate: DataTypes.INTEGER,
      permission: DataTypes.STRING,
      day_limit: DataTypes.INTEGER,
      token_version: DataTypes.INTEGER,
      ip_address: DataTypes.STRING,
      login_flg: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "User",
      hooks: {
        // Hash password before create
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },

        // Hash password before update
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    },
  );
  return User;
};
