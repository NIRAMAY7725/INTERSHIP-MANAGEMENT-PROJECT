const User = require("../models/User");
const Company = require("../models/CompanyProfile");
const Audit = require("../models/AuditLog");
const { fields, list, search, id, found, fail, validatePassword } = require("../lib/request");

async function getAllUsers(req, res) {
    const filter = {};
    const { role, active, q } = req.query;
    if (role !== undefined) {
        if (!["user", "company", "admin"].includes(role)) fail(400, "Invalid role");
        filter.role = role;
    }
    if (active !== undefined) {
        if (!["true", "false"].includes(active)) fail(400, "Invalid account status");
        filter.isActive = active === "true" ? { $ne: false } : false;
    }
    const term = search(q);
    if (term) filter.$or = [{ name: term }, { email: term }];
    const { items: users, pagination } = await list(User, filter, req);
    const profiles = await Company.find({ user: { $in: users.filter(user => user.role === "company").map(user => user._id) } })
        .select("user verification companyName").lean();
    const byUser = new Map(profiles.map(profile => [String(profile.user), profile]));
    for (const user of users) if (user.role === "company") user.company = byUser.get(String(user._id));
    res.json({ users, pagination });
}

async function getUserById(req, res) {
    res.json(found(await User.findById(id(req.params.id))));
}

async function createUser(req, res) {
    const values = fields(req.body, { name: "string", email: "string", role: "string", age: "number", avatar: "string", isActive: "boolean" });
    validatePassword(req.body.password);
    const user = await User.create({ ...values, password: req.body.password });
    await Audit.create({ actor: req.user.id, action: "Created account", target: user.id });
    const { password, sessionVersion, ...publicUser } = user.toObject();
    res.status(201).json(publicUser);
}

async function update(req, res, values) {
    const key = id(req.params.id);
    const filter = { _id: key };
    // Admin accounts are managed by trusted operators. This invariant is safe across concurrent requests.
    if (values.isActive === false) filter.role = { $ne: "admin" };
    const changes = { $set: values };
    if (values.isActive === false) changes.$inc = { sessionVersion: 1 };
    const user = await User.findOneAndUpdate(filter, changes, { returnDocument: "after", runValidators: true });
    if (!user && await User.exists({ _id: key, role: "admin" })) fail(409, "Administrator deactivation is an operator task");
    found(user);
    await Audit.create({ actor: req.user.id, action: values.isActive === false ? "Deactivated account" : "Updated account", target: key });
    res.json(user);
}

function updateUser(req, res) {
    const values = fields(req.body, { name: "string", email: "string", age: "number", isActive: "boolean", avatar: "string" });
    if (!Object.keys(values).length) fail(400, "Supply at least one permitted field");
    return update(req, res, values);
}

function deleteUser(req, res) {
    return update(req, res, { isActive: false });
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
