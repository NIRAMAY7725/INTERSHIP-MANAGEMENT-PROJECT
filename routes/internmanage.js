const router = require("express").Router();
const multer = require("multer");
const { protect, authorize } = require("../middleware/auth");
const { fail, id, fields, search, list, found } = require("../lib/request");
const User = require("../models/User");
const Student = require("../models/StudentProfile");
const Company = require("../models/CompanyProfile");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const Saved = require("../models/SavedInternship");
const Notification = require("../models/Notification");
const Audit = require("../models/AuditLog");

const student = authorize("user");
const company = authorize("company");
const admin = authorize("admin");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 } });

router.use(protect);

async function updateProfile(model, user, values) {
    try {
        return await model.findOneAndUpdate({ user }, { $set: values }, { upsert: true, returnDocument: "after", runValidators: true });
    } catch (error) {
        if (error.code !== 11000) throw error;
        return model.findOneAndUpdate({ user }, { $set: values }, { returnDocument: "after", runValidators: true });
    }
}

router.get("/profile", async (req, res) => {
    const { id: user, name, email, role } = req.user;
    const model = { user: Student, company: Company }[role];
    res.json({ ...(model ? await model.findOne({ user }).lean() : {}), name, email, role });
});
router.patch("/profile", async (req, res) => {
    const { id: user, role } = req.user;
    const { name } = fields(req.body, { name: "string" });
    if (name !== undefined) await User.updateOne({ _id: user }, { name }, { runValidators: true });
    if (role === "user") await updateProfile(Student, user, fields(req.body, { bio: "string", education: "string", skills: "strings" }));
    if (role === "company") await updateProfile(Company, user, fields(req.body, { companyName: "string", description: "string", website: "string" }));
    res.json({ message: "Profile saved" });
});
router.put("/profile/resume", student, upload.single("resume"), async (req, res) => {
    const file = req.file;
    if (!file || file.mimetype !== "application/pdf" || !file.buffer.subarray(0, 8).toString().match(/^%PDF-[12]\.\d$/) ||
        !file.buffer.subarray(-1024).includes(Buffer.from("%%EOF"))) fail(400, "Upload a valid PDF resume");
    await updateProfile(Student, req.user.id, { resume: file.buffer, resumeUpdatedAt: new Date() });
    res.json({ message: "Resume saved" });
});
async function sendResume(studentId, res) {
    const profile = found(await Student.findOne({ user: studentId }).select("+resume"));
    if (!profile.resume) fail(404, "No resume uploaded");
    res.attachment("resume.pdf").type("application/pdf").send(profile.resume);
}
router.get("/profile/resume", student, (req, res) => sendResume(req.user.id, res));

async function approvedCompanyIds() {
    const approved = await Company.distinct("user", { verification: "approved" });
    return User.distinct("_id", { _id: { $in: approved }, role: "company", isActive: { $ne: false } });
}

async function visibleInternships(user) {
    if (user.role === "company") return { company: user.id, status: { $ne: "removed" } };
    if (user.role === "admin") return { status: { $ne: "removed" } };
    return { status: "open", deadline: { $gt: new Date() }, company: { $in: await approvedCompanyIds() } };
}

const listingFields = {
    title: "string", description: "string", requirements: "strings", category: "string",
    location: "string", workMode: "string", stipend: "number", duration: "string", deadline: "string",
};
function listingValues(body) {
    const values = fields(body, listingFields);
    if (values.deadline !== undefined && (!Number.isFinite(Date.parse(values.deadline)) || Date.parse(values.deadline) <= Date.now())) {
        fail(400, "Set a future application deadline");
    }
    return values;
}
async function requireApproved(user) {
    if (!await Company.exists({ user, verification: "approved" })) fail(403, "Your company must be verified");
}
function listingQuery(query) {
    return query.populate("company", "name");
}
router.get("/internships", async (req, res) => {
    const filter = await visibleInternships(req.user);
    for (const key of ["location", "category"]) {
        const value = search(req.query[key]);
        if (value) filter[key] = value;
    }
    const term = search(req.query.q);
    if (term) filter.$or = [{ title: term }, { description: term }];
    if (req.query.workMode !== undefined) {
        if (!["remote", "hybrid", "onsite"].includes(req.query.workMode)) fail(400, "Invalid work mode");
        filter.workMode = req.query.workMode;
    }
    for (const [key, operator] of [["minStipend", "$gte"], ["maxStipend", "$lte"]]) {
        const value = req.query[key];
        if (value === undefined) continue;
        if (typeof value !== "string" || !/^\d+(\.\d+)?$/.test(value) || Number(value) > 10000000) fail(400, "Invalid stipend");
        filter.stipend ||= {};
        filter.stipend[operator] = Number(value);
    }
    res.json(await list(Internship, filter, req, listingQuery));
});
router.get("/internships/:id", async (req, res) => {
    res.json(found(await listingQuery(Internship.findOne({ ...await visibleInternships(req.user), _id: id(req.params.id) }))));
});
router.post("/internships", company, async (req, res) => {
    await requireApproved(req.user.id);
    res.status(201).json(await Internship.create({ ...listingValues(req.body), company: req.user.id }));
});
router.patch("/internships/:id", company, async (req, res) => {
    await requireApproved(req.user.id);
    const values = listingValues(req.body);
    const { status } = fields(req.body, { status: "string" });
    if (status !== undefined && status !== "closed") fail(400, "Use closed to close a listing");
    if (status) values.status = status;
    res.json(found(await Internship.findOneAndUpdate(
        { _id: id(req.params.id), company: req.user.id, status: "open" }, values, { returnDocument: "after", runValidators: true }
    )));
});
router.delete("/internships/:id", authorize("company", "admin"), async (req, res) => {
    const key = id(req.params.id);
    const filter = { _id: key, status: { $ne: "removed" } };
    if (req.user.role === "company") {
        filter.company = req.user.id;
        found(await Internship.exists(filter));
        if (await Application.exists({ internship: key })) fail(409, "Listings with applications can be closed");
    }
    found(await Internship.findOneAndUpdate(filter, { status: "removed" }));
    if (req.user.role === "admin") await Audit.create({ actor: req.user.id, target: key, action: "Removed internship" });
    res.json({ message: "Listing removed" });
});

router.get("/saved", student, async (req, res) => {
    res.json(await list(Saved, { student: req.user.id }, req, query => query.populate("internship", "title status deadline")));
});
router.put("/saved/:id", student, async (req, res) => {
    const key = id(req.params.id);
    found(await Internship.exists({ ...await visibleInternships(req.user), _id: key }));
    try {
        await Saved.updateOne({ student: req.user.id, internship: key }, { $setOnInsert: { internship: key } }, { upsert: true });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
    res.json({ message: "Internship saved" });
});
router.delete("/saved/:id", student, async (req, res) => {
    await Saved.deleteOne({ student: req.user.id, internship: id(req.params.id) });
    res.json({ message: "Internship removed from saved" });
});

function applicationScope(user) {
    if (user.role === "user") return { student: user.id };
    if (user.role === "company") return { company: user.id };
    return {};
}
router.get("/applications", async (req, res) => {
    const filter = applicationScope(req.user);
    if (req.query.internship !== undefined) filter.internship = id(req.query.internship);
    res.json(await list(Application, filter, req, query => query.populate("internship", "title")
        .populate("student", "name")));
});
router.post("/internships/:id/applications", student, async (req, res) => {
    const internship = found(await Internship.findOne({ ...await visibleInternships(req.user), _id: id(req.params.id) }));
    const application = await Application.create({ internship: internship.id, student: req.user.id, company: internship.company });
    res.status(201).json(application);
});
router.get("/applications/:id/applicant", company, async (req, res) => {
    const item = found(await Application.findOne({ _id: id(req.params.id), company: req.user.id, status: { $ne: "withdrawn" } }));
    const [profile, user] = await Promise.all([
        Student.findOne({ user: item.student }).select("bio education skills resumeUpdatedAt").lean(),
        User.findById(item.student).select("name").lean(),
    ]);
    res.json({ ...profile, name: found(user).name });
});
router.get("/applications/:id/resume", company, async (req, res) => {
    const item = found(await Application.findOne({ _id: id(req.params.id), company: req.user.id, status: { $ne: "withdrawn" } }));
    await sendResume(item.student, res);
});
const transitions = {
    pending: ["shortlisted", "interview", "accepted", "rejected"],
    shortlisted: ["interview", "accepted", "rejected"],
    interview: ["interview", "accepted", "rejected"],
    accepted: ["completed"],
};
router.patch("/applications/:id", authorize("user", "company"), async (req, res) => {
    const scope = { _id: id(req.params.id), ...applicationScope(req.user) };
    const item = found(await Application.findOne(scope));
    const { status, interviewAt, interviewDetails } = fields(req.body, { status: "string", interviewAt: "string", interviewDetails: "string" });
    const eligible = req.user.role === "user"
        ? status === "withdrawn" && ["pending", "shortlisted", "interview"].includes(item.status)
        : transitions[item.status]?.includes(status);
    if (!eligible) fail(409, "This status change is unavailable");
    const values = { status };
    if (status === "interview") {
        if (!interviewAt || !(Date.parse(interviewAt) > Date.now()) || !interviewDetails) fail(400, "Enter a future interview time and details");
        Object.assign(values, { interviewAt, interviewDetails });
    }
    if (status === "completed") values.completedAt = new Date();
    const updated = await Application.findOneAndUpdate({ ...scope, status: item.status, updatedAt: item.updatedAt },
        { $set: values, $unset: { statusReadAt: 1, ...(req.user.role === "user" ? { companyReadAt: 1 } : {}) } }, { returnDocument: "after", runValidators: true });
    if (!updated) fail(409, "The application changed. Refresh and try again.");
    res.json(updated);
});

router.get("/notifications", authorize("user", "company"), async (req, res) => {
    const applicationFilter = req.user.role === "user" ? { status: { $nin: ["pending", "withdrawn"] } } : {};
    const [notifications, updates] = await Promise.all([
        list(Notification, { user: req.user.id }, req),
        list(Application, { ...applicationScope(req.user), ...applicationFilter }, req,
            query => query.sort({ updatedAt: -1, _id: -1 }).populate("internship", "title")),
    ]);
    if (req.user.role === "company") {
        for (const item of updates.items) item.statusReadAt = item.companyReadAt;
    }
    res.json({ notifications, updates });
});
router.patch("/notifications/:id", async (req, res) => {
    res.json(found(await Notification.findOneAndUpdate({ user: req.user.id, _id: id(req.params.id) }, { readAt: new Date() }, { returnDocument: "after" })));
});
router.patch("/notifications/application/:id", authorize("user", "company"), async (req, res) => {
    const { updatedAt } = fields(req.body, { updatedAt: "string" });
    if (!Number.isFinite(Date.parse(updatedAt))) fail(400, "Invalid notification timestamp");
    found(await Application.findOneAndUpdate({ ...applicationScope(req.user), _id: id(req.params.id), updatedAt },
        { [req.user.role === "company" ? "companyReadAt" : "statusReadAt"]: new Date() }, { timestamps: false }));
    res.json({ message: "Marked as read" });
});

router.get("/dashboard/stats", async (req, res) => {
    const user = req.user;
    const apps = applicationScope(user);
    const appCount = status => Application.countDocuments(status ? { ...apps, status } : apps);
    const active = { status: "open", deadline: { $gt: new Date() }, company: { $in: await approvedCompanyIds() } };
    const metrics = user.role === "user" ? {
        "Available internships": Internship.countDocuments(active), "Total applications": appCount(),
        "Pending applications": appCount("pending"), "Accepted applications": appCount("accepted"),
        "Rejected applications": appCount("rejected"), "Completed internships": appCount("completed"),
    } : user.role === "company" ? {
        "Total listings": Internship.countDocuments({ company: user.id, status: { $ne: "removed" } }),
        "Active internships": Internship.countDocuments({ ...active, $and: [{ company: user.id }] }),
        "Total applicants": appCount(), "Shortlisted applicants": appCount("shortlisted"),
        "Accepted applicants": appCount("accepted"), "Completed internships": appCount("completed"),
    } : {
        "Total users": User.countDocuments(), "Total students": User.countDocuments({ role: "user" }),
        "Total companies": User.countDocuments({ role: "company" }),
        "Verified companies": Company.countDocuments({ verification: "approved" }),
        "Active internships": Internship.countDocuments(active), "Total applications": appCount(),
        "Accepted applications": appCount("accepted"), "Completed internships": appCount("completed"),
    };
    const values = await Promise.all(Object.values(metrics));
    res.json(Object.fromEntries(Object.keys(metrics).map((name, index) => [name, values[index]])));
});

router.put("/admin/companies/:id/verification", admin, async (req, res) => {
    const key = id(req.params.id);
    found(await User.exists({ _id: key, role: "company" }));
    const { verification } = fields(req.body, { verification: "string" });
    if (!["approved", "rejected"].includes(verification)) fail(400, "Choose approved or rejected");
    const profile = await updateProfile(Company, key, { verification });
    await Promise.all([
        Audit.create({ actor: req.user.id, target: key, action: "Company verification: " + verification }),
        Notification.create({ user: key, message: "Your company verification is " + verification }),
    ]);
    res.json(profile);
});
router.get("/admin/audit", admin, async (req, res) => {
    res.json(await list(Audit, {}, req, query => query.populate("actor", "name")));
});
router.get("/admin/reports.csv", admin, async (req, res) => {
    function csv(value) {
        let cell = String(value ?? "");
        if (/^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(cell)) cell = "'" + cell;
        return '"' + cell.replaceAll('"', '""') + '"';
    }
    res.attachment("applications.csv").type("text/csv");
    const cursor = Application.find().sort({ createdAt: -1 }).populate("internship", "title").lean().cursor();
    try {
        res.write("Application ID,Internship,Status,Submitted,Completed\r\n");
        for await (const item of cursor) {
            if (res.destroyed) break;
            const line = [item._id, item.internship?.title, item.status, item.createdAt.toISOString(), item.completedAt?.toISOString()];
            if (!res.write(line.map(csv).join(",") + "\r\n")) {
                await new Promise(resolve => {
                    const done = () => { res.off("drain", done); res.off("close", done); resolve(); };
                    res.once("drain", done);
                    res.once("close", done);
                    if (res.destroyed) done();
                });
            }
        }
        res.end();
    } finally {
        await cursor.close();
    }
});

module.exports = router;
