const express = require("express");
const router = express.Router();
const {
    submitContact,
    getAllContacts,
    archiveContact,
} = require("../controllers/contactController");

const { protect, authorize } = require("../middleware/auth");

// POST /api/contact — public
router.post("/", submitContact);

// GET /api/contact — admin only
router.get("/", protect, authorize("admin"), getAllContacts);
router.patch("/:id/archive", protect, authorize("admin"), archiveContact);

module.exports = router;
