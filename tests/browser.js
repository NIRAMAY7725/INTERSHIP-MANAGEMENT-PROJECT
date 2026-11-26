const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");
const { harness, listing, pdf } = require("./harness");

async function main() {
    const env = await harness();
    let browser;
    try {
        browser = await chromium.launch();
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", ignoreHTTPSErrors: true });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", entry => { if (entry.type() === "error") errors.push(entry.text()); });
        page.on("dialog", dialog => dialog.accept());
        await fs.mkdir("screenshots", { recursive: true });

        async function visit(path) {
            const response = await page.goto(env.base + path);
            assert.equal(response?.status(), 200, path);
        }
        async function shot(name, destination = page) {
            await destination.screenshot({ path: "screenshots/" + name + ".png", fullPage: true, animations: "disabled" });
        }
        const nav = name => page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name, exact: true }).click();
        async function ready(title) {
            await page.getByRole("heading", { name: title, exact: true }).first().waitFor();
            await page.locator('#content[aria-busy="false"]').waitFor();
            assert.equal(await page.locator('#notice[data-error="true"]').count(), 0);
        }
        async function login(email, title) {
            await visit("/login");
            await page.locator("#loginEmail").fill(email);
            await page.locator("#loginPassword").fill(env.password);
            await page.locator("#loginForm button[type=submit]").click();
            await ready(title);
        }
        async function logout() {
            await page.locator("#identity").click();
            await page.getByRole("button", { name: "Sign out" }).click();
            await page.waitForURL("**/login");
        }

        for (const [path, name] of [["/", "home"], ["/about", "about"], ["/features", "features"], ["/how-it-works", "how-it-works"],
            ["/contact", "contact"], ["/login", "login"], ["/register", "registration"], ["/privacy", "privacy-policy"], ["/terms", "terms"]]) {
            await visit(path);
            await page.evaluate(() => document.fonts.ready.then(() => undefined));
            await shot(name);
        }
        await visit("/");
        for (const name of ["About", "Features", "How It Works", "Contact"]) {
            const item = page.locator("#navMenu").getByRole("link", { name, exact: true });
            const href = await item.getAttribute("href");
            await item.click();
            await page.waitForURL(env.base + href);
        }
        await page.locator("#contactName").fill("Anika Rao");
        await page.locator("#contactEmail").fill("anika@example.test");
        await page.locator("#contactSubject").fill("Interview scheduling question");
        await page.locator("#contactMessage").fill("Can I see my interview schedule in the student dashboard?");
        await page.locator("#contactForm button[type=submit]").click();
        await page.getByText("Message sent successfully", { exact: false }).waitFor();

        await visit("/register");
        await page.locator("#registerName").fill("Aarav Mehta");
        await page.locator("#registerEmail").fill("aarav@example.test");
        await page.locator("#registerPassword").fill(env.password);
        await page.locator("#registerConfirmPassword").fill(env.password);
        await page.locator("#registerForm button[type=submit]").click();
        await page.waitForURL("**/login");
        const company = await env.register("Juniper Studio", "juniper@example.test", "company");

        await login(env.admin.email, "Admin dashboard");
        await nav("Manage companies");
        await ready("Manage companies");
        await page.getByRole("button", { name: "Approve company" }).click();
        await page.getByText("approved", { exact: true }).waitFor();
        await logout();

        await login(company.email, "Company dashboard");
        await nav("My profile");
        await ready("My profile");
        await page.getByLabel("Company name").fill("Juniper Studio");
        await page.getByLabel("Company description").fill("A product studio working on accessible web applications.");
        await page.getByRole("button", { name: "Save profile" }).click();
        await page.getByText("Profile saved", { exact: true }).waitFor();
        await shot("company-profile");
        await nav("Create internship");
        await ready("Create internship");
        await page.getByLabel("Title", { exact: true }).fill(listing.title);
        await page.getByLabel("Category").fill(listing.category);
        await page.getByLabel("Location").fill(listing.location);
        await page.getByLabel("Work mode").selectOption(listing.workMode);
        await page.getByLabel("Stipend", { exact: false }).fill(String(listing.stipend));
        await page.getByLabel("Duration").fill(listing.duration);
        await page.getByLabel("Application deadline").fill(listing.deadline.slice(0, 16));
        await page.getByLabel("Description", { exact: true }).fill(listing.description);
        await page.getByLabel("Requirements", { exact: false }).fill(listing.requirements.join("\n"));
        await shot("company-create-internship");
        await page.getByRole("button", { name: "Publish internship" }).click();
        await ready("Internship details");
        await nav("Manage internships");
        await ready("Manage internships");
        await shot("company-manage-internships");
        await page.getByRole("link", { name: listing.title }).click();
        await ready("Internship details");
        await page.getByRole("link", { name: "Edit internship" }).click();
        await ready("Edit internship");
        await shot("company-edit-internship");
        await logout();

        await login("aarav@example.test", "Student dashboard");
        await nav("My profile");
        await ready("My profile");
        await page.getByLabel("Education").fill("BCA, second year");
        await page.getByLabel("Skills (comma-separated)").fill("JavaScript, CSS, MongoDB");
        await page.getByLabel("About me").fill("I enjoy building accessible web applications.");
        await page.getByRole("button", { name: "Save profile" }).click();
        await page.getByText("Profile saved", { exact: true }).waitFor();
        await page.getByLabel("Resume PDF").setInputFiles({ name: "resume.pdf", mimeType: "application/pdf", buffer: pdf });
        await page.getByRole("button", { name: "Upload resume" }).click();
        await page.getByRole("button", { name: "Download resume" }).waitFor();
        await shot("student-profile");
        await nav("Browse internships");
        await ready("Browse internships");
        await page.getByLabel("Location", { exact: true }).fill("Pune");
        await page.getByRole("button", { name: "Search", exact: true }).click();
        await page.getByRole("link", { name: listing.title }).waitFor();
        await shot("student-internship-listing");
        await page.getByRole("link", { name: listing.title }).click();
        await ready("Internship details");
        await shot("student-internship-details");
        await page.getByRole("button", { name: "Save internship" }).click();
        await page.getByText("Internship saved", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Apply", exact: true }).click();
        await page.getByText("Application submitted", { exact: true }).waitFor();
        await nav("Saved internships");
        await ready("Saved internships");
        await shot("student-saved-internships");
        await logout();

        await login(company.email, "Company dashboard");
        await shot("company-dashboard");
        await nav("Manage applicants");
        await ready("Manage applicants");
        await shot("company-manage-applicants");
        await page.getByRole("link", { name: "Applicant profile" }).click();
        await ready("Applicant profile");
        await shot("company-applicant-profile");
        const resume = page.waitForEvent("download");
        await page.getByRole("button", { name: "Download resume" }).click();
        assert.equal((await resume).suggestedFilename(), "resume.pdf");
        await nav("Manage applicants");
        await ready("Manage applicants");
        await page.getByRole("link", { name: "Schedule interview" }).click();
        await ready("Schedule interview");
        await page.getByLabel("Interview date and time").fill(listing.deadline.slice(0, 16));
        await page.getByLabel("Location or meeting details").fill("Video interview with the engineering team");
        await shot("company-schedule-interview");
        await page.getByRole("button", { name: "Schedule interview" }).click();
        await ready("Manage applicants");
        await page.getByRole("button", { name: "Accept", exact: true }).click();
        await page.getByRole("button", { name: "Mark completed" }).click();
        await page.getByText("completed", { exact: true }).first().waitFor();
        await nav("Notifications");
        await ready("Notifications");
        await shot("company-notifications");
        await logout();

        await login("aarav@example.test", "Student dashboard");
        await shot("student-dashboard");
        await nav("My applications");
        await ready("My applications");
        await page.getByText("completed", { exact: true }).waitFor();
        await shot("student-application-tracking");
        await nav("Notifications");
        await ready("Notifications");
        await shot("student-notifications");
        await page.getByRole("button", { name: "Mark as read" }).click();
        await page.getByText("read", { exact: true }).waitFor();
        await page.locator("#identity").click();
        await page.getByRole("button", { name: "Change password" }).click();
        await ready("Change password");
        await shot("change-password");
        await page.setViewportSize({ width: 390, height: 844 });
        await nav("My applications");
        await ready("My applications");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
        await shot("student-mobile", page);
        await page.getByRole("button", { name: "Menu" }).click();
        assert.equal(await page.getByRole("button", { name: "Menu" }).getAttribute("aria-expanded"), "false");
        await page.getByRole("button", { name: "Menu" }).click();
        await logout();
        await page.setViewportSize({ width: 1440, height: 1000 });

        await login(env.admin.email, "Admin dashboard");
        await shot("admin-dashboard");
        for (const [title, name] of [["Manage students", "manage-students"], ["Manage companies", "manage-companies"],
            ["Manage internships", "manage-internships"], ["Manage applications", "manage-applications"],
            ["Contact messages", "contact-messages"], ["Activity log", "activity-log"], ["Reports", "reports"], ["My profile", "profile"]]) {
            await nav(title);
            await ready(title);
            await shot("admin-" + name);
        }
        await nav("Manage students");
        await ready("Manage students");
        await page.getByRole("link", { name: "Edit account" }).click();
        await ready("Edit account");
        await shot("admin-edit-account");
        await nav("Reports");
        await ready("Reports");
        const report = page.waitForEvent("download");
        await page.getByRole("button", { name: "Download CSV" }).click();
        assert.equal((await report).suggestedFilename(), "applications.csv");
        await logout();
        await page.goto(env.base + "/dashboard#reports");
        await page.waitForURL("**/login");
        assert.deepEqual(errors, []);
        console.log("Browser workflows passed in Chromium at desktop and 390px widths.");
    } finally {
        await browser?.close();
        await env.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
