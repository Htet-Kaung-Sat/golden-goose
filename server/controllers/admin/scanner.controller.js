const { Scanner, Desk } = require("../../models");
const {
  createScannerSchema,
  updateScannerSchema,
} = require("../../validations/scanner.validation");
const { response } = require("../../utils/response");

const getScanners = async (req, res) => {
  try {
    const scanners = await Scanner.findAll({
      include: [{ model: Desk, as: "desk" }],
      order: [["id", "DESC"]],
    });
    response(res, 200, true, "Scanners fetched successfully", { scanners });
  } catch (error) {
    console.error("GET Scanners Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getScanner = async (req, res) => {
  try {
    const { id } = req.params;
    const scanner = await Scanner.findByPk(id, {
      include: [{ model: Desk, as: "desk" }],
    });

    if (!scanner) {
      return response(res, 404, false, "Scanner not found");
    }

    response(res, 200, true, "Scanner fetched successfully", { scanner });
  } catch (error) {
    console.error("GET Scanner Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const createScanner = async (req, res) => {
  try {
    const { error } = createScannerSchema.validate(req.body);
    if (error) {
      return response(res, 400, false, error.details[0].message);
    }

    const { name, desk_id, serial_number, com_port, position } = req.body;
    const newScanner = await Scanner.create({
      name,
      desk_id,
      serial_number,
      com_port,
      position,
    });

    response(res, 201, true, "Scanner created successfully", {
      scanner: newScanner,
    });
  } catch (error) {
    console.error("Create Scanner Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateScanner = async (req, res) => {
  try {
    const { error } = updateScannerSchema.validate(req.body);
    if (error) {
      return response(res, 400, false, error.details[0].message);
    }

    const { id } = req.params;
    const scanner = await Scanner.findByPk(id);
    if (!scanner) {
      return response(res, 404, false, "Scanner not found");
    }

    const { name, desk_id, serial_number, com_port, position } = req.body;
    await scanner.update({ name, desk_id, serial_number, com_port, position });

    response(res, 200, true, "Scanner updated successfully", { scanner });
  } catch (error) {
    console.error("Update Scanner Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteScanner = async (req, res) => {
  try {
    const { id } = req.params;
    const scanner = await Scanner.findByPk(id);
    if (!scanner) {
      return response(res, 404, false, "Scanner not found");
    }

    await scanner.destroy();

    response(res, 200, true, "Scanner deleted successfully");
  } catch (error) {
    console.error("Delete Scanner Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getScanners,
  getScanner,
  createScanner,
  updateScanner,
  deleteScanner,
};
