const { Schema, model } = require("mongoose");

const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, maxlength: 400 },
    readAt: Date,
}, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });

module.exports = model("Notification", schema);
