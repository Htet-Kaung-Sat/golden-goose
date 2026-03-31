const { Game } = require("../../models");
const { response } = require("../../utils/response.js");
const {
  createGameSchema,
  updateGameSchema,
} = require("../../validations/game.validation.js");

const createGame = async (req, res) => {
  try {
    const { error, value } = createGameSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const exists = await Game.findOne({ where: { name: value.name } });
    if (exists) return response(res, 400, false, "Game name already exists");
    const game = await Game.create(value);
    response(res, 201, true, "Game created successfully", { game });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateGame = async (req, res) => {
  try {
    const { error, value } = updateGameSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const game = await Game.findByPk(req.params.id);
    if (!game) return response(res, 404, false, "Game not found");

    await game.update(value);
    response(res, 200, true, "Game updated successfully", { game });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getGames = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const games = await Game.findAndCountAll({
      limit,
      offset,
    });

    response(res, 200, true, "Games fetched successfully", {
      games: games.rows,
      pagination: {
        total: games.count,
        page,
        limit,
        totalPages: Math.ceil(games.count / limit),
      },
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getGame = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return response(res, 404, false, "Game not found");

    response(res, 200, true, "Game fetched successfully", { game });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteGame = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return response(res, 404, false, "Game not found");

    await game.destroy();

    response(res, 200, true, "Game deleted successfully");
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  createGame,
  updateGame,
  getGames,
  getGame,
  deleteGame,
};
