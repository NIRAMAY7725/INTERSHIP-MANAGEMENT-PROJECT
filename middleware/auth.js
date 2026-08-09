const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    let token;

    // Check for Bearer token in Authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            // Attach user to request (exclude password)
            req.user = await User.findById(decoded.id);

            next();
        } catch (error) {
            res.status(401).json({ error: "Not authorized, token failed" });
        }
    }

    if (!token) {
        res.status(401).json({ error: "Not authorized, no token" });
    }
};

// Role-based access control
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res
                .status(403)
                .json({ error: "Not authorized for this action" });
        }
        next();
    };
};

module.exports = { protect, authorize };
