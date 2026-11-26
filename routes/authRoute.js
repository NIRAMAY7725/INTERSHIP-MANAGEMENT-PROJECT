const router = require("express").Router();
const { register, login, logout, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.patch("/password", protect, changePassword);

module.exports = router;
