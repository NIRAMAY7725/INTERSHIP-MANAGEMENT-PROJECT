const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "");
    if (!match) return res.status(401).json({ error: "Authentication required" });
    let decoded;
    try {
        decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
    try {
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) return res.status(401).json({ error: "Account unavailable" });
        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
};

const authorize = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Not authorized for this action" });
    return next();
};

module.exports = { protect, authorize };
