const express = require("express");
const path = require("node:path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ quiet: true });

const connectDB = require("./config/db");
const app = express();
const publicDir = path.join(__dirname, "public");

app.disable("x-powered-by");
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'", "data:"],
            upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
        },
    },
}));
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(compression());
app.use(express.json({ limit: "64kb" }));
app.use(express.static(publicDir));
app.use("/api", require("./middleware/apiOptimize").apiOptimize);
if (process.env.NODE_ENV !== "test") {
    app.use("/api", rateLimit({ windowMs: 60000, limit: 180, message: { error: "Too many requests. Try again shortly." } }));
    const authLimit = rateLimit({ windowMs: 900000, limit: 20, message: { error: "Too many attempts. Try again later." } });
    app.use(["/api/auth/login", "/api/auth/register", "/api/auth/password"], authLimit);
}
app.use("/api/users", require("./routes/userRoute"));
app.use("/api/auth", require("./routes/authRoute"));
app.use("/api/dashboard", require("./routes/dashboardRoute"));
app.use("/api/contact", require("./routes/contactRoute"));
app.use("/api", require("./routes/internmanage"));
app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found" }));

for (const page of ["about", "features", "how-it-works", "contact", "login", "register", "privacy", "terms", "dashboard"]) {
    app.get("/" + page, (req, res) => res.sendFile(path.join(publicDir, page + ".html")));
}
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.code === 11000) return res.status(409).json({ error: "This record already exists" });
    if (error.name === "DocumentNotFoundError" || error.name === "VersionError") {
        return res.status(409).json({ error: "The record changed. Refresh and try again." });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ error: "Check the submitted fields and try again" });
    }
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 :
        error.name === "MulterError" ? 400 : error.status || 500;
    const messages = { 413: "The upload or request is too large", 500: "The server could not complete this request" };
    if (status >= 500) console.error("Request failed", { method: req.method, name: error.name });
    res.status(status).json({ error: messages[status] || (error.type ? "Invalid request body" : error.message) });
});

async function start() {
    if (!process.env.MONGO_URI || Buffer.byteLength(process.env.JWT_SECRET || "") < 32) {
        throw new Error("Missing server configuration");
    }
    await connectDB();
    return app.listen(Number(process.env.PORT || 5000), process.env.HOST || "0.0.0.0", () => {
        console.log("InternManage is listening");
    });
}

if (require.main === module) {
    start().catch(error => {
        console.error("Startup failed. Check MONGO_URI, database connectivity, indexes and JWT_SECRET.", error.name);
        process.exit(1);
    });
}

module.exports = { app, start };
