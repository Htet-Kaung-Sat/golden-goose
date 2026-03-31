const express = require("express");
const {
    getOperationLog,
    createOperationLog
} = require("../../controllers/admin/operation-log.controller");

const router = express.Router();

router.get("/", getOperationLog);
router.post("/save", createOperationLog);
module.exports = router;