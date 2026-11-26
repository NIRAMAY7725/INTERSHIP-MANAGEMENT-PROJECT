const { isObjectIdOrHexString } = require("mongoose");

function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}

function id(value) {
    if (!isObjectIdOrHexString(value)) fail(400, "Invalid record ID");
    return String(value).toLowerCase();
}

function fields(body, definitions) {
    if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "Invalid request body");
    const result = {};
    for (const [key, type] of Object.entries(definitions)) {
        if (!Object.hasOwn(body, key)) continue;
        const value = body[key];
        if (type === "strings") {
            if (!Array.isArray(value) || value.length > 30 || value.some(item => typeof item !== "string" || item.length > 120)) {
                fail(400, "Invalid " + key);
            }
            result[key] = [...new Set(value.map(item => item.trim()).filter(Boolean))];
        } else {
            if (typeof value !== type || (type === "string" && value.length > 5000) ||
                (type === "number" && !Number.isFinite(value))) fail(400, "Invalid " + key);
            result[key] = type === "string" ? value.trim() : value;
        }
    }
    return result;
}

function search(value) {
    if (value === undefined || value === "") return undefined;
    if (typeof value !== "string" || value.length > 100) fail(400, "Invalid search term");
    return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function pageNumber(value, fallback, maximum) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) < 1) fail(400, "Invalid pagination");
    return Math.min(Number(value), maximum);
}

async function list(model, filter, req, configure = query => query) {
    const page = pageNumber(req.query.page, 1, 100000);
    const limit = pageNumber(req.query.limit, 20, 100);
    const [items, total] = await Promise.all([
        configure(model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
        model.countDocuments(filter),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

function found(record) {
    if (!record) fail(404, "Record not found");
    return record;
}

function validatePassword(password) {
    if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) {
        fail(400, "Use at least 8 characters and at most 72 UTF-8 bytes for the password");
    }
}

module.exports = { fail, id, fields, search, list, found, validatePassword };
