const { Schema, model } = require("mongoose");

const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, maxlength: 120, default: "" },
    description: { type: String, maxlength: 5000, default: "" },
    website: { type: String, maxlength: 500, match: /^https?:\/\/[^\s]+$|^$/, default: "" },
    verification: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
}, { timestamps: true });

module.exports = model("CompanyProfile", schema);
