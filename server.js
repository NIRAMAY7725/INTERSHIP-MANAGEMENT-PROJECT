const express = require("express");
const path = require("path");
const os = require("os");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/db");


// Import routes
const userRouter = require("./routes/userRoute");
const authRouter = require("./routes/authRoute");
const contactRouter = require("./routes/contactRoute");

const app = express();

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                styleSrc: ["'self'", "'unsafe-inline'", "https:"],
                fontSrc: ["'self'", "https:", "data:"],
                connectSrc: ["'self'", "https:"],
                mediaSrc: ["'self'", "https:", "data:"],
                objectSrc: ["'none'"],
                frameSrc: ["'self'", "https:"],
                upgradeInsecureRequests: [],
            },
        },
    })
);

// Middleware
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(compression()); // gzip/brotli — ~70% smaller responses for mobile
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});
app.use("/api/auth", authLimiter);

// Serve static files with long cache (1 year for hashed assets, 1 day for HTML)
app.use(
    express.static(path.join(__dirname, "public"), {
        maxAge: "1d",
        etag: true,
        lastModified: true,
    })
);

// API performance middleware (response timing + cache hints)
const { apiOptimize } = require("./middleware/apiOptimize");
app.use("/api", apiOptimize);

// API Routes
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/contact", rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), contactRouter);

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

app.get("/privacy", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "privacy.html"));
});

app.get("/terms", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "terms.html"));
});

const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0";
const LOCAL_URL = `http://localhost:${PORT}`;

// Connect to DB first, then seed a test user, then start server
const startServer = async () => {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error("Set MONGO_URI and a JWT_SECRET of at least 32 characters");
    }
    await connectDB();

    const server = app.listen(PORT, HOST, () => {
        console.log(`🚀 Server running on ${LOCAL_URL}`);

        // Log LAN URL for phone testing
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === "IPv4" && !net.internal) {
                    console.log(`📱 LAN access: http://${net.address}:${PORT}`);
                }
            }
        }
    });

    server.on("error", (error) => {
        console.error(`❌ Server could not start on ${HOST}:${PORT}:`, error.message);
        process.exit(1);
    });
};

startServer().catch((error) => {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
});