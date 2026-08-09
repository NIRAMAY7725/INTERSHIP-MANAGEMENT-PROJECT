const express = require("express");
const router = express.Router();
const {
    submitContact,
    getAllContacts,
} = require("../controllers/contactController");

const { protect, authorize } = require("../middleware/auth");

// POST /api/contact — public
router.post("/", submitContact);

// GET /api/contact — admin only
router.get("/", protect, authorize("admin"), getAllContacts);

module.exports = router;
