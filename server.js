const express = require("express");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const User = require("./models/User");

const app = express();

app.use(express.json());

// Serve the frontend HTML page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API route — get all users from DB
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API route — create a new user
app.post("/api/users", async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;

// Connect to DB first, then seed a test user, then start server
const startServer = async () => {
    await connectDB();

    // Seed a test user if the collection is empty
    const count = await User.countDocuments();
    if (count === 0) {
        await User.create({
            name: "Niramay",
            email: "niramay@gmail.com",
            age: 21,
        });
        console.log("✅ Test user seeded into database");
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
};

startServer();