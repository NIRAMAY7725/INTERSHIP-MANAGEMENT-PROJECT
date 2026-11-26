const { Schema, model } = require("mongoose");

const schema = new Schema({
    internship: { type: Schema.Types.ObjectId, ref: "Internship", required: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "shortlisted", "interview", "accepted", "rejected", "withdrawn", "completed"], default: "pending" },
    interviewAt: Date,
    interviewDetails: { type: String, maxlength: 2000 },
    completedAt: Date,
    statusReadAt: Date,
    companyReadAt: Date,
}, { timestamps: true });
schema.index({ internship: 1, student: 1 }, { unique: true });
schema.index({ student: 1, status: 1, createdAt: -1 });
schema.index({ company: 1, status: 1, createdAt: -1 });

module.exports = model("Application", schema);
