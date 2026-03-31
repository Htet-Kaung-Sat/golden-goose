const { Camera, Desk } = require("../../models");
const { response } = require("../../utils/response.js");
const {
  createCameraSchema,
  updateCameraSchema,
} = require("../../validations/camera.validation.js");

const createCamera = async (req, res) => {
  try {
    const { error, value } = createCameraSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const camera = await Camera.create(value);
    response(res, 201, true, "Camera created successfully", { camera });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateCamera = async (req, res) => {
  try {
    const { error, value } = updateCameraSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const camera = await Camera.findByPk(req.params.id);
    if (!camera) return response(res, 404, false, "Camera not found");

    await camera.update(value);
    response(res, 200, true, "Camera updated successfully", { camera });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getCameras = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const cameras = await Camera.findAndCountAll({
      limit,
      offset,
      include: [
        {
          model: Desk,
          as: "desk",
        },
      ],
    });

    response(res, 200, true, "Cameras fetched successfully", {
      cameras: cameras.rows,
      pagination: {
        total: cameras.count,
        page,
        limit,
        totalPages: Math.ceil(cameras.count / limit),
      },
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getCamera = async (req, res) => {
  try {
    const camera = await Camera.findByPk(req.params.id, {
      include: [
        {
          model: Desk,
          as: "desk",
        },
      ],
    });
    if (!camera) return response(res, 404, false, "Camera not found");

    response(res, 200, true, "Camera fetched successfully", { camera });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteCamera = async (req, res) => {
  try {
    const camera = await Camera.findByPk(req.params.id);
    if (!camera) return response(res, 404, false, "Camera not found");

    await camera.destroy();

    response(res, 200, true, "Camera deleted successfully");
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  createCamera,
  updateCamera,
  getCameras,
  getCamera,
  deleteCamera,
};
