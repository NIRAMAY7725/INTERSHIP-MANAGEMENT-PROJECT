const Contact = require("../models/Contact");
const Audit = require("../models/AuditLog");
const { fields, list, found, id, fail } = require("../lib/request");

async function submitContact(req, res) {
    const values = fields(req.body, { name: "string", email: "string", subject: "string", message: "string" });
    if (values.name?.length > 100 || values.email?.length > 254 || values.subject?.length > 150) fail(400, "Contact fields are too long");
    await Contact.create(values);
    res.status(201).json({ message: "Message sent successfully" });
}

async function getAllContacts(req, res) {
    res.json(await list(Contact, {}, req));
}

async function archiveContact(req, res) {
    const key = id(req.params.id);
    found(await Contact.findByIdAndUpdate(key, { archivedAt: new Date() }));
    await Audit.create({ actor: req.user.id, action: "Archived contact message", target: key });
    res.json({ message: "Message archived" });
}

module.exports = { submitContact, getAllContacts, archiveContact };
