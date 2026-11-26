const { Schema, model } = require("mongoose");

const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    education: { type: String, maxlength: 5000, default: "" },
    bio: { type: String, maxlength: 5000, default: "" },
    skills: { type: [String], default: [] },
    resume: { type: Buffer, select: false },
    resumeUpdatedAt: Date,
}, { timestamps: true });

module.exports = model("StudentProfile", schema);
