const User = require("../models/User");
const { fields, fail, validatePassword } = require("../lib/request");

function credentials(body) {
    const { email } = fields(body, { email: "string" });
    const password = body.password;
    if (!email || email.length > 254 || typeof password !== "string" || !password || Buffer.byteLength(password) > 72) {
        fail(400, "Enter a valid email and password");
    }
    return { email: email.toLowerCase(), password };
}

function session(user) {
    return { _id: user.id, name: user.name, email: user.email, role: user.role, token: user.generateAuthToken() };
}

async function register(req, res) {
    const { email, password } = credentials(req.body);
    const { name, role = "user" } = fields(req.body, { name: "string", role: "string" });
    if (!["user", "company"].includes(role)) fail(400, "Choose a student or company account");
    validatePassword(password);
    const user = await User.create({ name, email, password, role });
    res.status(201).json(session(user));
}

async function login(req, res) {
    const { email, password } = credentials(req.body);
    const user = await User.findOne({ email }).select("+password +sessionVersion");
    if (!user?.isActive || !await user.matchPassword(password)) fail(401, "Invalid email or password");
    res.json(session(user));
}

async function logout(req, res) {
    await User.updateOne({ _id: req.user.id }, { $inc: { sessionVersion: 1 } });
    res.json({ message: "Signed out" });
}

async function changePassword(req, res) {
    fields(req.body, {});
    const { currentPassword, password } = req.body;
    validatePassword(password);
    const user = await User.findById(req.user.id).select("+password +sessionVersion");
    if (typeof currentPassword !== "string" || Buffer.byteLength(currentPassword) > 72 ||
        !await user.matchPassword(currentPassword)) fail(400, "Current password is incorrect");
    user.$where = user.isSelected("sessionVersion") && user.sessionVersion === 0
        ? { $or: [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }] }
        : { sessionVersion: user.sessionVersion };
    user.password = password;
    user.sessionVersion += 1;
    await user.save();
    res.json({ message: "Password changed. Sign in again." });
}

module.exports = { register, login, logout, changePassword };
