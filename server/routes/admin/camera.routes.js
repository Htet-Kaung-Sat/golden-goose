const express = require("express");
const {
  getCameras,
  createCamera,
  updateCamera,
  getCamera,
  deleteCamera,
} = require("../../controllers/admin/camera.controller.js");

const router = express.Router();

router.post("/", createCamera);
router.get("/", getCameras);
router.put("/:id", updateCamera);
router.get("/:id", getCamera);
router.delete("/:id", deleteCamera);
module.exports = router;
