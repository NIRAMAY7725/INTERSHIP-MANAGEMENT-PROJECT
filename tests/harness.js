const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

const password = "Demonstration-pass-24";
const future = (days = 15) => new Date(Date.now() + days * 86400000).toISOString();
const listing = {
    title: "Web Development Intern", category: "Engineering", location: "Pune", workMode: "hybrid",
    stipend: 12000, duration: "12 weeks", description: "Build and test accessible features with our engineering team.",
    requirements: ["JavaScript fundamentals", "Interest in accessibility"], deadline: future(),
};
const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");

async function harness() {
    const mongo = await MongoMemoryServer.create({ instance: { dbName: "internmanage_isolated_test" } });
    let server;
    async function close() {
        if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await mongoose.disconnect();
        await mongo.stop();
    }
    try {
        process.env.NODE_ENV = "test";
        process.env.MONGO_URI = mongo.getUri("internmanage_isolated_test");
        process.env.JWT_SECRET = randomBytes(48).toString("hex");
        process.env.HOST = "127.0.0.1";
        process.env.PORT = "0";
        const { start } = require("../server");
        server = await start();
        if (!server.listening) await once(server, "listening");
        const base = "http://127.0.0.1:" + server.address().port;
        async function request(path, { token, method = "GET", body } = {}) {
            const headers = token ? { Authorization: "Bearer " + token } : {};
            if (body !== undefined && !(body instanceof FormData)) {
                headers["Content-Type"] = "application/json";
                body = JSON.stringify(body);
            }
            const response = await fetch(base + "/api" + path, { method, headers, body });
            const contentType = response.headers.get("content-type") || "";
            const data = contentType.includes("json") ? await response.json() : Buffer.from(await response.arrayBuffer());
            return { status: response.status, data };
        }
        async function register(name, email, role) {
            const result = await request("/auth/register", { method: "POST", body: { name, email, role, password } });
            if (result.status !== 201) throw new Error("Fixture registration failed: " + JSON.stringify(result));
            return result.data;
        }
        const User = require("../models/User");
        const admin = await User.create({ name: "Maya Sharma", email: "admin@example.test", password, role: "admin" });
        return { base, close, request, register, admin, password };
    } catch (error) {
        await close();
        throw error;
    }
}

module.exports = { harness, password, listing, pdf, future };
