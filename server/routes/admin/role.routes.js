const express = require("express");
const {
  getRoles,
  createRole,
  updateRole,
  getRole,
  deleteRole,
} = require("../../controllers/admin/role.controller.js");

const router = express.Router();

router.post("/", createRole);
router.get("/", getRoles);
router.put("/:id", updateRole);
router.get("/:id", getRole);
router.delete("/:id", deleteRole);

module.exports = router;
