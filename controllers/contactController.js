const Contact = require("../models/Contact");

// POST /api/contact
const submitContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        const contact = await Contact.create({
            name,
            email,
            subject,
            message,
        });

        res.status(201).json({
            message: "Message sent successfully! We'll get back to you soon.",
            contact,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// GET /api/contact (admin only)
const getAllContacts = async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { submitContact, getAllContacts };
