const { Schema, model } = require("mongoose");

const schema = new Schema({
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    target: { type: Schema.Types.ObjectId, required: true },
}, { timestamps: true });
schema.index({ createdAt: -1 });

module.exports = model("AuditLog", schema);
