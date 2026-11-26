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
function sampleResume() {
    const stream = "BT /F1 16 Tf 50 730 Td (Aarav Mehta - Sample Resume) Tj ET";
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
    ];
    let document = "%PDF-1.4\n";
    const offsets = objects.map((body, index) => {
        const offset = document.length;
        document += (index + 1) + " 0 obj\n" + body + "\nendobj\n";
        return String(offset).padStart(10, "0") + " 00000 n \n";
    });
    const xref = document.length;
    document += "xref\n0 6\n0000000000 65535 f \n" + offsets.join("") +
        "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
    return Buffer.from(document);
}
const pdf = sampleResume();

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
