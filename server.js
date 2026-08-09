const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/db");
const User = require("./models/User");

// Import routes
const userRouter = require("./routes/userRoute");
const authRouter = require("./routes/authRoute");
const contactRouter = require("./routes/contactRoute");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});
app.use("/api/auth", authLimiter);

// Serve static files from public folder (CSS, JS, images)
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/contact", contactRouter);

// Serve frontend pages
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/features", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "features.html"));
});

app.get("/how-it-works", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "how-it-works.html"));
});

app.get("/contact", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
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
            password: "niramay123",
            age: 21,
        });
        console.log("✅ Test user seeded into database");
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
};

startServer();