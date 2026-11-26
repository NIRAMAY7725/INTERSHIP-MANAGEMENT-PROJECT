const { Schema, model } = require("mongoose");

const schema = new Schema({
    company: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 5000 },
    requirements: { type: [String], default: [] },
    category: { type: String, required: true, maxlength: 100 },
    location: { type: String, required: true, maxlength: 120 },
    workMode: { type: String, enum: ["remote", "hybrid", "onsite"], required: true },
    stipend: { type: Number, required: true, min: 0, max: 10000000 },
    duration: { type: String, required: true, maxlength: 100 },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ["open", "closed", "removed"], default: "open" },
}, { timestamps: true });
schema.index({ company: 1, createdAt: -1 });
schema.index({ status: 1, deadline: 1 });

module.exports = model("Internship", schema);
