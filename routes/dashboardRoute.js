const router = require("express").Router();
const { protect } = require("../middleware/auth");
router.get("/me", protect, (req, res) => {
    const { _id, name, email, role, isActive, createdAt } = req.user;
    res.json({ _id, name, email, role, isActive, createdAt });
});
module.exports = router;
