require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const User = require("../models/User");
const { validatePassword } = require("../lib/request");

async function main() {
    const [action, emailArg] = process.argv.slice(2);
    const email = emailArg?.trim().toLowerCase();
    if (!["admin", "password"].includes(action) || !email || !process.env.MONGO_URI) {
        throw new Error("Set MONGO_URI and provide an action and existing account email");
    }
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    const account = await User.findOne({ email }).select("+sessionVersion");
    if (!account) throw new Error("Account not found");
    if (action === "admin") {
        if (account.role === "company") throw new Error("Use a dedicated student account for administrator provisioning");
        await User.updateOne({ _id: account.id, role: { $in: ["user", "admin"] } },
            { $set: { role: "admin", isActive: true }, $inc: { sessionVersion: 1 } });
        console.log("Administrator account is active. Sign in again.");
    } else {
        if (process.stdin.isTTY) throw new Error("Pipe the password from a hidden prompt as documented");
        let value = "";
        process.stdin.setEncoding("utf8");
        for await (const chunk of process.stdin) {
            value += chunk;
            if (Buffer.byteLength(value) > 74) throw new Error("Password input is too long");
        }
        const password = value.replace(/\r?\n$/, "");
        validatePassword(password);
        account.password = password;
        account.sessionVersion += 1;
        await account.save();
        console.log("Password changed. Existing sessions were revoked.");
    }
}

main().catch(error => {
    console.error(error.status === 400 || error.name === "Error" ? error.message : "Account operation failed. Check the database configuration.");
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
