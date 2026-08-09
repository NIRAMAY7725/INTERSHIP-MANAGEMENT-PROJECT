const User = require("../models/User");

// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        // Restrict roles to prevent privilege escalation
        const assignedRole = role === "company" ? "company" : "user";

        // Create user (password is hashed by pre-save hook)
        const user = await User.create({
            name,
            email,
            password,
            role: assignedRole,
        });

        // Generate JWT
        const token = user.generateAuthToken();

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });
    } catch (error) {
        console.error("Register Error:", error.message);
        res.status(400).json({ error: error.name === 'ValidationError' ? error.message : "Registration failed. Please try again." });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Please provide email and password" });
        }

        // Find user and include password field
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT
        const token = user.generateAuthToken();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });
    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ error: "Internal Server Error. Please try again later." });
    }
};

module.exports = { register, login };
