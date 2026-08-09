const express = require("express");
const router = express.Router();
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
} = require("../controllers/userController");

const { protect, authorize } = require("../middleware/auth");

// All user routes require admin privileges
router.use(protect);
router.use(authorize("admin"));

// GET all users
router.get("/", getAllUsers);

// GET one user by ID
router.get("/:id", getUserById);

// POST create user
router.post("/", createUser);

// PUT update user
router.put("/:id", updateUser);

// DELETE user
router.delete("/:id", deleteUser);

module.exports = router;