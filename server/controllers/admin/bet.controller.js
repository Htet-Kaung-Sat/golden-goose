const { Bet, User, GameRound } = require("../../models");
const { response } = require("../../utils/response.js");
const { sequelize } = require("../../models");
const {
  createBetSchema,
  updateBetSchema,
} = require("../../validations/bet.validation.js");

const getBets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const bets = await Bet.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: GameRound,
          as: "gameround",
        },
      ],
    });

    response(res, 200, true, "Bets fetched successfully", {
      bets: bets.rows,
      pagination: {
        total: bets.count,
        page,
        limit,
        totalPages: Math.ceil(bets.count / limit),
      },
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getBet = async (req, res) => {
  try {
    const bet = await Bet.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: GameRound,
          as: "gameround",
        },
      ],
    });
    if (!bet) return response(res, 404, false, "Bet not found");

    response(res, 200, true, "Bet fetched successfully", { bet });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const createBet = async (req, res) => {
  try {
    const { error, value } = createBetSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);
    const bet = await Bet.create(value);
    response(res, 201, true, "Bet created successfully", { bet });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateBet = async (req, res) => {
  try {
    const { error, value } = updateBetSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const bet = await Bet.findByPk(req.params.id);
    if (!bet) return response(res, 404, false, "Bet not found");

    await bet.update(value);
    response(res, 200, true, "Bet updated successfully", { bet });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteBet = async (req, res) => {
  try {
    const bet = await Bet.findByPk(req.params.id);
    if (!bet) return response(res, 404, false, "Bet not found");

    await bet.destroy();

    response(res, 200, true, "Bet deleted successfully");
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getBets,
  getBet,
  createBet,
  updateBet,
  deleteBet,
};
