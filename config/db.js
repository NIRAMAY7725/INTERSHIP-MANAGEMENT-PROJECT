const mongoose = require("mongoose");
const dns = require("dns");

// Force Google's public DNS — fixes networks that block SRV lookups
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌", error.message);
    throw error;
  }
};

module.exports = connectDB;