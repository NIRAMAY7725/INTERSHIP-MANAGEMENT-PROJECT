const mongoose = require("mongoose");

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}

module.exports = connectDB;
