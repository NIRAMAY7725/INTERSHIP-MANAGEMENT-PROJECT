const User = require("../models/User");

// GET all users — supports pagination: ?page=1&limit=20
const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find()
                .select("-password -__v")
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(),
        ]);

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET one user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password -__v").lean();
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST create user
const createUser = async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// PUT update user
const updateUser = async (req, res) => {
    try {
        // Filter out sensitive fields to prevent mass assignment
        const { password, role, email, _id, ...safeUpdateData } = req.body;

        const user = await User.findByIdAndUpdate(req.params.id, safeUpdateData, { new: true });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        console.error("updateUser Error:", error.message);
        res.status(400).json({ error: "Failed to update user" });
    }
};

// DELETE user
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ message: "User deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};
