const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { harness, password, listing, pdf, future } = require("./harness");
const User = require("../models/User");

test("role workflows against isolated MongoDB", async t => {
    const env = await harness();
    t.after(env.close);
    const { request, register } = env;
    const login = email => request("/auth/login", { method: "POST", body: { email, password } });
    let student, otherStudent, company, otherCompany, admin, internship, application;

    await t.test("registration, role authentication, validation and authorization", async () => {
        student = await register("Aarav Mehta", "student@example.test", "user");
        otherStudent = await register("Diya Patel", "other@example.test", "user");
        company = await register("Juniper Studio", "company@example.test", "company");
        otherCompany = await register("Maple Studio", "maple@example.test", "company");
        for (const [email, role] of [[student.email, "user"], [company.email, "company"], [env.admin.email, "admin"]]) {
            const signedIn = await login(email);
            assert.equal(signedIn.status, 200);
            assert.equal(signedIn.data.role, role);
            const dashboard = await request("/dashboard/me", { token: signedIn.data.token });
            assert.equal(dashboard.data.role, role);
            if (role === "admin") admin = signedIn.data;
        }
        const registration = body => request("/auth/register", { method: "POST", body });
        assert.equal((await registration({ name: "Duplicate", email: student.email.toUpperCase(), password })).status, 409);
        assert.equal((await registration({ name: "Name", email: "new@example.test", password, role: "admin" })).status, 400);
        assert.equal((await request("/auth/login", { method: "POST", body: { email: student.email, password: "incorrect" } })).status, 401);
        assert.equal((await request("/auth/login", { method: "POST", body: { email: {}, password } })).status, 400);
        assert.equal((await request("/dashboard/me")).status, 401);
        const expired = jwt.sign({ id: student._id, version: 0 }, process.env.JWT_SECRET, { issuer: "internmanage", expiresIn: -1 });
        assert.equal((await request("/dashboard/me", { token: expired })).status, 401);
        assert.equal((await request("/users", { token: student.token })).status, 403);
        const stored = await User.findById(student._id).select("+password");
        assert.notEqual(stored.password, password);
        assert.equal(await stored.matchPassword(password), true);
    });

    await t.test("profile updates and PDF validation", async () => {
        const token = student.token;
        const updated = await request("/profile", { token, method: "PATCH", body: { education: "BCA", skills: ["JS", "CSS"], role: "admin" } });
        assert.equal(updated.status, 200);
        const profile = await request("/profile", { token });
        assert.equal(profile.data.education, "BCA");
        assert.equal(profile.data.role, "user");
        const upload = data => {
            const body = new FormData();
            body.set("resume", new Blob([data], { type: "application/pdf" }), "test.pdf");
            return request("/profile/resume", { token, body, method: "PUT" });
        };
        assert.equal((await upload("invalid")).status, 400);
        assert.equal((await upload(Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
        assert.equal((await upload(pdf)).status, 200);
        assert.deepEqual((await request("/profile/resume", { token })).data, pdf);
        assert.equal((await request("/profile", { token })).data.resume, undefined);
    });

    await t.test("verification, listing CRUD, search, save and ownership", async () => {
        const token = company.token;
        const create = body => request("/internships", { token, method: "POST", body });
        assert.equal((await create(listing)).status, 403);
        const verified = await request("/admin/companies/" + company._id + "/verification",
            { token: admin.token, method: "PUT", body: { verification: "approved" } });
        assert.equal(verified.status, 200);
        const companyProfile = await request("/profile", { token, method: "PATCH", body: { companyName: "Juniper Studio", verification: "rejected" } });
        assert.equal(companyProfile.status, 200);
        assert.equal((await request("/profile", { token })).data.verification, "approved");
        const posted = await create(listing);
        assert.equal(posted.status, 201);
        internship = posted.data;
        const key = "/internships/" + internship._id;
        const result = await request("/internships?q=web&workMode=hybrid&location=Pune&category=Engineering&minStipend=11000&maxStipend=13000", { token: student.token });
        assert.equal(result.data.items.length, 1);
        assert.equal((await request("/internships?q=%5B", { token: student.token })).data.items.length, 0);
        assert.equal((await request(key, { token: otherCompany.token, method: "DELETE" })).status, 404);
        assert.equal((await request(key, { token, method: "PATCH", body: { stipend: 12500 } })).data.stipend, 12500);
        const disposable = await create({ ...listing, title: "Temporary listing" });
        const disposableKey = "/internships/" + disposable.data._id;
        assert.equal((await request(disposableKey, { token, method: "PATCH", body: { status: "closed" } })).data.status, "closed");
        assert.equal((await request(disposableKey, { token, method: "DELETE" })).status, 200);
        assert.equal((await request(disposableKey, { token })).status, 404);
        assert.equal((await request("/saved/" + internship._id, { token: student.token, method: "PUT" })).status, 200);
        assert.equal((await request("/saved", { token: student.token })).data.items.length, 1);
        assert.equal((await request("/saved/" + internship._id, { token: student.token, method: "DELETE" })).status, 200);
    });

    await t.test("applications, concurrent duplicate prevention, interviews and completion", async () => {
        const apply = token => request("/internships/" + internship._id + "/applications", { token, method: "POST" });
        const results = await Promise.all([apply(student.token), apply(student.token)]);
        assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
        application = results.find(result => result.status === 201).data;
        const key = "/applications/" + application._id;
        const change = (token, body) => request(key, { token, method: "PATCH", body });
        assert.equal((await change(otherCompany.token, { status: "accepted" })).status, 404);
        assert.equal((await request(key + "/resume", { token: otherCompany.token })).status, 404);
        assert.deepEqual((await request(key + "/resume", { token: company.token })).data, pdf);
        assert.equal((await request(key + "/applicant", { token: company.token })).data.education, "BCA");
        assert.equal((await change(student.token, { status: "accepted" })).status, 409);
        assert.equal((await change(company.token, { status: "shortlisted" })).status, 200);
        assert.equal((await change(company.token, { status: "interview", interviewAt: future(2), interviewDetails: "Video call" })).status, 200);
        assert.equal((await change(company.token, { status: "accepted" })).status, 200);
        assert.equal((await change(company.token, { status: "completed" })).data.status, "completed");
        const other = await apply(otherStudent.token);
        assert.equal((await request("/applications/" + other.data._id, { token: company.token, method: "PATCH", body: { status: "rejected" } })).data.status, "rejected");
        const pendingListing = await request("/internships", { token: company.token, method: "POST", body: { ...listing, title: "Other listing" } });
        const pending = await request("/internships/" + pendingListing.data._id + "/applications", { token: otherStudent.token, method: "POST" });
        assert.equal((await request("/applications/" + pending.data._id, { token: otherStudent.token, method: "PATCH", body: { status: "withdrawn" } })).data.status, "withdrawn");
        const events = await request("/notifications", { token: student.token });
        const update = events.data.updates.items[0];
        assert.equal(update.status, "completed");
        assert.equal((await request("/notifications/application/" + update._id,
            { token: student.token, method: "PATCH", body: { updatedAt: update.updatedAt } })).status, 200);
        assert.equal((await request("/dashboard/stats", { token: student.token })).data["Completed internships"], 1);
        assert.equal((await request("/dashboard/stats", { token: company.token })).data["Total applicants"], 3);
        assert.equal((await request("/internships/" + internship._id, { token: company.token, method: "DELETE" })).status, 409);
    });

    await t.test("admin reporting, contact, deactivation, audit, password updates and logout", async () => {
        const token = admin.token;
        assert.equal((await request("/users?role=user&q=Aarav", { token })).data.users.length, 1);
        assert.equal((await request("/users/" + student._id, { token, method: "PUT", body: { name: "Aarav M.", isActive: false } })).status, 200);
        assert.equal((await request("/dashboard/me", { token: student.token })).status, 401);
        assert.equal((await login(student.email)).status, 401);
        assert.equal((await request("/users/" + admin._id, { token, method: "DELETE" })).status, 409);
        assert.equal((await request("/users/" + student._id, { token, method: "PUT", body: { isActive: true } })).status, 200);
        assert.equal((await request("/dashboard/me", { token: student.token })).status, 401);
        const currentStudent = (await login(student.email)).data;
        const fresh = "NewPassword-2026";
        assert.equal((await request("/auth/password", { token: currentStudent.token, method: "PATCH",
            body: { currentPassword: password, password: fresh } })).status, 200);
        assert.equal((await login(student.email)).status, 401);
        assert.equal((await request("/dashboard/me", { token: currentStudent.token })).status, 401);
        assert.equal((await request("/auth/login", { method: "POST", body: { email: student.email, password: fresh } })).status, 200);
        assert.equal((await request("/contact", { method: "POST", body: { name: "Visitor", email: "visitor@example.test", subject: "Question", message: "When do interviews start?" } })).status, 201);
        const contacts = await request("/contact", { token });
        assert.equal(contacts.data.items.length, 1);
        assert.equal((await request("/contact/" + contacts.data.items[0]._id + "/archive", { token, method: "PATCH" })).status, 200);
        assert.ok((await request("/admin/audit", { token })).data.items.length >= 4);
        assert.match((await request("/admin/reports.csv", { token })).data.toString(), /Web Development Intern/);
        assert.equal((await request("/admin/reports.csv", { token: company.token })).status, 403);
        assert.equal((await request("/internships/" + internship._id, { token, method: "DELETE" })).status, 200);
        assert.equal((await request("/applications", { token })).data.items.length, 3);
        assert.equal((await request("/auth/logout", { token, method: "POST" })).status, 200);
        assert.equal((await request("/dashboard/me", { token })).status, 401);
    });
});
