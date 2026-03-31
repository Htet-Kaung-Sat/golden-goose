const express = require("express");
const {
  getUsers,
  createUser,
  updateUser,
  updateInfo,
  getUser,
  deleteUser,
  getAgentTrees,
  checkExistOrNotAgents,
  userLockUnlock,
  updateUserBalance,
  OperateUsers,
  getBalanceForCurrentUser,
} = require("../../controllers/admin/user.controller.js");

const router = express.Router();

router.get("/", getUsers);
router.get("/:id", getUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.put("/info_update/:id", updateInfo);
router.delete("/:id", deleteUser);
router.get("/user_management/agent_tree", getAgentTrees);
router.get("/user_management/check_agent_tree", checkExistOrNotAgents);
router.put("/user_management/lock_unlock", userLockUnlock);
router.put("/user_management/topup", updateUserBalance);
router.post("/operate", OperateUsers);
router.get("/me/balance", getBalanceForCurrentUser);
module.exports = router;
