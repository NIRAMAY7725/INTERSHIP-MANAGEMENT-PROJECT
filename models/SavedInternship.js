const { Schema, model } = require("mongoose");

const schema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    internship: { type: Schema.Types.ObjectId, ref: "Internship", required: true },
}, { timestamps: true });
schema.index({ student: 1, internship: 1 }, { unique: true });

module.exports = model("SavedInternship", schema);
