const token = localStorage.getItem("internmanage_token");
const content = document.getElementById("content");
const notice = document.getElementById("notice");
const heading = document.getElementById("heading");
const nav = document.getElementById("nav");
const labels = { user: "Student", company: "Company", admin: "Admin" };
const shared = { overview: "Overview", profile: "My profile" };
const views = {
    user: { ...shared, internships: "Browse internships", saved: "Saved internships", applications: "My applications", notifications: "Notifications" },
    company: { ...shared, create: "Create internship", internships: "Manage internships", applications: "Manage applicants", notifications: "Notifications" },
    admin: { ...shared, students: "Manage students", companies: "Manage companies", internships: "Manage internships",
        applications: "Manage applications", contacts: "Contact messages", audit: "Activity log", reports: "Reports" },
};
const secondary = { details: "Internship details", edit: "Edit internship", applicant: "Applicant profile", password: "Change password", interview: "Schedule interview", account: "Edit account" };
const states = new Map();
let me;
let revision = 0;

function clearSession() {
    localStorage.removeItem("internmanage_token");
    localStorage.removeItem("internmanage_user");
    location.replace("/login");
}

async function api(path, options = {}) {
    const headers = { Authorization: "Bearer " + token };
    let body = options.body;
    if (body && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(body);
    }
    const response = await fetch("/api" + path, { ...options, body, headers });
    if (response.status === 401) {
        clearSession();
        throw new Error("Your session has expired");
    }
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "The request failed");
    }
    return options.download ? response.blob() : response.json();
}

function el(tag, value, parent) {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    if (parent) parent.append(node);
    return node;
}
function message(value = "", error = false) {
    notice.textContent = value;
    notice.dataset.error = String(error);
}
function card(parent, title, value) {
    const box = el("article", undefined, parent);
    el("h2", title, box);
    if (value !== undefined) el("p", value, box);
    return box;
}
function badge(parent, status) {
    const chip = el("span", status, parent);
    chip.className = "badge";
    chip.dataset.value = status;
}
function actions(parent) {
    const row = el("div", undefined, parent);
    row.className = "actions";
    return row;
}
function button(parent, title, handler, disabled = false) {
    const node = el("button", title, parent);
    node.type = "button";
    node.disabled = disabled;
    node.addEventListener("click", () => run(node, handler));
    return node;
}
async function run(node, handler) {
    const current = revision;
    node.disabled = true;
    message();
    try {
        await handler();
    } catch (error) {
        if (current === revision) message(error.message, true);
    } finally {
        node.disabled = false;
    }
}
function link(parent, title, view, param) {
    const node = el("a", title, parent);
    node.href = "#" + view + (param ? "/" + encodeURIComponent(param) : "");
    return node;
}
function date(value) {
    return value ? new Date(value).toLocaleString() : "—";
}
function money(value) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}
function form(parent, specs, initial, title, handler) {
    const node = el("form", undefined, parent);
    const grid = el("div", undefined, node);
    grid.className = "form-grid";
    for (const [name, label, type = "text", choices, required = false] of specs) {
        const wrap = el("label", label, grid);
        const input = el(type === "select" ? "select" : type === "textarea" ? "textarea" : "input", undefined, wrap);
        input.name = name;
        input.required = required;
        if (input.tagName === "INPUT") input.type = type;
        if (type === "file") input.accept = "application/pdf";
        if (type === "number") { input.min = 0; input.step = "0.01"; }
        if (type === "password") input.autocomplete = name === "currentPassword" ? "current-password" : "new-password";
        if (choices) for (const [value, text] of choices) el("option", text, input).value = value;
        if (initial[name] !== undefined) input.value = initial[name];
    }
    const submit = el("button", title, actions(node));
    submit.type = "submit";
    node.addEventListener("submit", event => {
        event.preventDefault();
        const data = new FormData(node);
        run(submit, () => handler(Object.fromEntries(data), data));
    });
}
function grid(parent) {
    const node = el("div", undefined, parent);
    node.className = "grid";
    return node;
}
function table(parent, columns, rows, renderRow) {
    if (!rows.length) { el("p", "No records to display.", parent); return; }
    const wrap = el("div", undefined, parent);
    wrap.className = "table-wrap";
    const node = el("table", undefined, wrap);
    const head = el("tr", undefined, el("thead", undefined, node));
    for (const column of columns) el("th", column, head).scope = "col";
    const body = el("tbody", undefined, node);
    for (const item of rows) renderRow(el("tr", undefined, body), item);
}
function cells(row, ...values) {
    values.forEach(value => el("td", value ?? "—", row));
}
function stateFor(view) {
    if (!states.has(view)) states.set(view, { page: 1, filters: {} });
    return states.get(view);
}
function filters(parent, view, specs) {
    const state = stateFor(view);
    form(parent, specs, state.filters, "Search", values => {
        state.filters = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
        state.page = 1;
        return render();
    });
}
async function listing(path, view, extra = {}) {
    const state = stateFor(view);
    return api(path + "?" + new URLSearchParams({ ...state.filters, ...extra, page: state.page }));
}
function pagination(parent, view, data) {
    const state = stateFor(view);
    const row = actions(parent);
    button(row, "Previous", () => { state.page--; return render(); }, data.page <= 1);
    el("span", "Page " + data.page + " of " + Math.max(1, data.pages) + " · " + data.total + " records", row);
    button(row, "Next", () => { state.page++; return render(); }, data.page >= data.pages);
}
async function refresh(path, method, body, fallback) {
    const current = revision;
    const result = await api(path, { method, body });
    if (current === revision) await render(result.message || fallback || "Changes saved");
}
async function download(path, filename) {
    const blob = await api(path, { download: true });
    const url = URL.createObjectURL(blob);
    const anchor = el("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function overview(parent) {
    const metrics = await api("/dashboard/stats");
    const cards = grid(parent);
    for (const [key, value] of Object.entries(metrics)) el("p", value, card(cards, key)).className = "metric";
}
async function profile(parent) {
    const data = await api("/profile");
    const box = card(parent, "Account", data.email);
    if (me.role === "company") badge(box, data.verification || "pending");
    const specs = [["name", "Account name", "text", null, true]];
    if (me.role === "user") specs.push(["education", "Education"], ["skills", "Skills (comma-separated)"], ["bio", "About me", "textarea"]);
    if (me.role === "company") specs.push(["companyName", "Company name"], ["website", "Website", "url"], ["description", "Company description", "textarea"]);
    form(parent, specs, { ...data, skills: data.skills?.join(", ") }, "Save profile", values => {
        if (values.skills !== undefined) values.skills = values.skills.split(",");
        return refresh("/profile", "PATCH", values);
    });
    if (me.role === "user") {
        const resume = card(parent, "Resume", data.resumeUpdatedAt ? "Updated " + date(data.resumeUpdatedAt) : "Upload a PDF up to 2 MiB.");
        if (data.resumeUpdatedAt) button(resume, "Download resume", () => download("/profile/resume", "resume.pdf"));
        form(parent, [["resume", "Resume PDF", "file", null, true]], {}, "Upload resume",
            (_, body) => refresh("/profile/resume", "PUT", body));
    }
}
function password(parent) {
    form(parent, [["currentPassword", "Current password", "password", null, true], ["password", "New password", "password", null, true]],
        {}, "Change password", async values => {
            await api("/auth/password", { method: "PATCH", body: values });
            clearSession();
        });
}
const modes = [["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "On-site"]];
async function internships(parent) {
    const specs = [["q", "Search internships"], ["category", "Category"], ["location", "Location"],
        ["workMode", "Work mode", "select", [["", "All modes"], ...modes]],
        ["minStipend", "Minimum stipend (₹)", "number"], ["maxStipend", "Maximum stipend (₹)", "number"]];
    if (me.role === "company") link(parent, "Create internship", "create");
    filters(parent, "internships", specs);
    const data = await listing("/internships", "internships");
    table(parent, ["Internship", "Location", "Stipend", "Deadline", "Status"], data.items, (row, item) => {
        link(el("td", undefined, row), item.title, "details", item._id);
        cells(row, item.location + " · " + item.workMode, money(item.stipend), date(item.deadline));
        badge(el("td", undefined, row), item.status);
    });
    pagination(parent, "internships", data.pagination);
}
async function details(parent, key) {
    const item = await api("/internships/" + key);
    const box = card(parent, item.title, item.description);
    badge(box, item.status);
    el("p", (item.company?.name || "Company") + " · " + item.category + " · " + item.location + " · " + item.workMode, box);
    el("p", money(item.stipend) + " · " + item.duration + " · Apply by " + date(item.deadline), box);
    if (item.requirements.length) {
        el("h2", "Requirements", box);
        const items = el("ul", undefined, box);
        for (const requirement of item.requirements) el("li", requirement, items);
    }
    const row = actions(box);
    link(row, "All internships", "internships");
    if (me.role === "user") {
        button(row, "Save internship", () => refresh("/saved/" + key, "PUT"));
        button(row, "Apply", () => {
            if (confirm("Submit your application for " + item.title + "?")) return refresh("/internships/" + key + "/applications", "POST", undefined, "Application submitted");
        });
    } else if (me.role === "company") {
        link(row, "View applicants", "applications", key);
        if (item.status === "open") {
            link(row, "Edit internship", "edit", key);
            button(row, "Close listing", () => {
                if (confirm("Close this listing to new applications?")) return refresh("/internships/" + key, "PATCH", { status: "closed" }, "Listing closed");
            });
        }
    }
    if (me.role !== "user") button(row, "Remove listing", async () => {
        if (!confirm("Remove this listing from the dashboard?")) return;
        await api("/internships/" + key, { method: "DELETE" });
        location.hash = "internships";
    });
}
function localDate(value) {
    const timestamp = new Date(value);
    return new Date(timestamp.getTime() - timestamp.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
async function edit(parent, key) {
    const item = key ? await api("/internships/" + key) : {};
    if (!key) {
        const data = await api("/profile");
        if (data.verification !== "approved") {
            card(parent, "Company verification", "An administrator must approve your company before you can publish a listing.");
            link(parent, "My profile", "profile");
            return;
        }
    }
    const specs = [["title", "Title"], ["category", "Category"], ["location", "Location"],
        ["workMode", "Work mode", "select", modes], ["stipend", "Stipend (₹)", "number"], ["duration", "Duration"],
        ["deadline", "Application deadline", "datetime-local"], ["description", "Description", "textarea"]]
        .map(([name, label, type, options]) => [name, label, type, options, true]);
    specs.push(["requirements", "Requirements (one per line)", "textarea"]);
    form(parent, specs, { ...item, deadline: item.deadline && localDate(item.deadline), requirements: item.requirements?.join("\n") },
        key ? "Save listing" : "Publish internship", async values => {
            values.stipend = Number(values.stipend);
            values.deadline = new Date(values.deadline).toISOString();
            values.requirements = values.requirements.split("\n");
            const saved = await api("/internships" + (key ? "/" + key : ""), { method: key ? "PATCH" : "POST", body: values });
            location.hash = "details/" + saved._id;
        });
}
async function saved(parent) {
    const data = await listing("/saved", "saved");
    table(parent, ["Internship", "Deadline", "Action"], data.items, (row, item) => {
        const ticket = item.internship;
        const cell = el("td", undefined, row);
        if (ticket?.status === "open" && Date.parse(ticket.deadline) > Date.now()) link(cell, ticket.title, "details", ticket._id);
        else cell.textContent = ticket?.title || "Unavailable internship";
        cells(row, date(ticket?.deadline));
        if (ticket) button(el("td", undefined, row), "Remove from saved", () => refresh("/saved/" + ticket._id, "DELETE"));
    });
    pagination(parent, "saved", data.pagination);
}
function changeStatus(item, status) {
    if (confirm("Change application status to " + status + "?")) return refresh("/applications/" + item._id, "PATCH", { status });
}
async function applications(parent, key) {
    if (key) link(parent, "All applications", "applications");
    const pageKey = key ? "applications/" + key : "applications";
    const data = await listing("/applications", pageKey, key ? { internship: key } : {});
    const columns = me.role === "user" ? ["Internship", "Status", "Activity", "Actions"] :
        ["Internship", "Applicant", "Status", "Activity", "Actions"];
    table(parent, columns, data.items, (row, item) => {
        cells(row, item.internship?.title);
        if (me.role !== "user") cells(row, item.student?.name);
        badge(el("td", undefined, row), item.status);
        const activity = el("td", "Submitted " + date(item.createdAt), row);
        if (item.interviewAt) el("p", "Interview " + date(item.interviewAt) + "\n" + item.interviewDetails, activity);
        if (item.completedAt) el("p", "Completed " + date(item.completedAt), activity);
        const rowActions = actions(el("td", undefined, row));
        const reviewable = ["pending", "shortlisted", "interview"].includes(item.status);
        if (me.role === "user" && reviewable) button(rowActions, "Withdraw", () => changeStatus(item, "withdrawn"));
        if (me.role === "company") {
            if (item.status !== "withdrawn") link(rowActions, "Applicant profile", "applicant", item._id);
            if (item.status === "pending") button(rowActions, "Shortlist", () => changeStatus(item, "shortlisted"));
            if (reviewable) {
                link(rowActions, "Schedule interview", "interview", item._id);
                button(rowActions, "Accept", () => changeStatus(item, "accepted"));
                button(rowActions, "Reject", () => changeStatus(item, "rejected"));
            }
            if (item.status === "accepted") button(rowActions, "Mark completed", () => changeStatus(item, "completed"));
        }
    });
    pagination(parent, pageKey, data.pagination);
}
async function applicant(parent, key) {
    const data = await api("/applications/" + key + "/applicant");
    const box = card(parent, data.name, data.bio);
    el("p", "Education · " + (data.education || "Not provided"), box);
    el("p", "Skills · " + (data.skills?.join(", ") || "Not provided"), box);
    if (data.resumeUpdatedAt) button(box, "Download resume", () => download("/applications/" + key + "/resume", "resume.pdf"));
    link(parent, "Manage applicants", "applications");
}
function interview(parent, key) {
    form(parent, [["interviewAt", "Interview date and time", "datetime-local", null, true],
        ["interviewDetails", "Location or meeting details", "textarea", null, true]], {}, "Schedule interview", async values => {
        await api("/applications/" + key, { method: "PATCH", body: { ...values, status: "interview", interviewAt: new Date(values.interviewAt).toISOString() } });
        location.hash = "applications";
    });
}
async function notifications(parent) {
    const view = "notifications";
    const data = await listing("/notifications", view);
    if (!data.notifications.items.length && !data.updates.items.length) el("p", "You have no notifications.", parent);
    for (const item of data.notifications.items) {
        const box = card(parent, item.message, date(item.createdAt));
        if (!item.readAt) button(box, "Mark as read", () => refresh("/notifications/" + item._id, "PATCH"));
        else badge(box, "read");
    }
    for (const item of data.updates.items) {
        const box = card(parent, item.internship?.title || "Application update", date(item.updatedAt));
        badge(box, item.status);
        if (!item.statusReadAt) button(box, "Mark as read", () => refresh("/notifications/application/" + item._id, "PATCH", { updatedAt: item.updatedAt }));
        else badge(box, "read");
    }
    const pager = data.updates.pagination.pages >= data.notifications.pagination.pages ? data.updates.pagination : data.notifications.pagination;
    pagination(parent, view, pager);
}
async function users(parent, view) {
    const role = view === "students" ? "user" : "company";
    filters(parent, view, [["q", "Search name or email"], ["active", "Account status", "select", [["", "All accounts"], ["true", "Active"], ["false", "Inactive"]]]]);
    const data = await listing("/users", view, { role });
    table(parent, ["Name", "Email", "Account status", "Actions"], data.users, (row, item) => {
        cells(row, item.company?.companyName || item.name, item.email);
        const status = el("td", undefined, row);
        badge(status, item.isActive === false ? "inactive" : "active");
        if (role === "company") badge(status, item.company?.verification || "pending");
        const rowActions = actions(el("td", undefined, row));
        link(rowActions, "Edit account", "account", item._id);
        button(rowActions, item.isActive === false ? "Activate" : "Deactivate", () => {
            const active = item.isActive === false;
            if (confirm((active ? "Activate " : "Deactivate ") + item.name + "?")) return refresh("/users/" + item._id, "PUT", { isActive: active });
        });
        if (role === "company") for (const verification of ["approved", "rejected"]) {
            if (item.company?.verification === verification) continue;
            const title = verification === "approved" ? "Approve company" : "Reject company";
            button(rowActions, title, () => {
                if (confirm(title + "?")) return refresh("/admin/companies/" + item._id + "/verification", "PUT", { verification });
            });
        }
    });
    pagination(parent, view, data.pagination);
}
async function account(parent, key) {
    const data = await api("/users/" + key);
    form(parent, [["name", "Name", "text", null, true], ["email", "Email", "email", null, true]], data, "Save account",
        values => refresh("/users/" + key, "PUT", values));
    link(parent, "Back to accounts", data.role === "company" ? "companies" : "students");
}
async function contacts(parent) {
    const data = await listing("/contact", "contacts");
    if (!data.items.length) el("p", "No messages to display.", parent);
    for (const item of data.items) {
        const box = card(parent, item.subject, item.message);
        el("p", item.name + " · " + item.email + " · " + date(item.createdAt), box);
        if (item.archivedAt) badge(box, "archived");
        else button(box, "Archive message", () => {
            if (confirm("Archive this message?")) return refresh("/contact/" + item._id + "/archive", "PATCH");
        });
    }
    pagination(parent, "contacts", data.pagination);
}
async function audit(parent) {
    const data = await listing("/admin/audit", "audit");
    table(parent, ["When", "Administrator", "Action", "Record ID"], data.items, (row, item) =>
        cells(row, date(item.createdAt), item.actor?.name, item.action, item.target));
    pagination(parent, "audit", data.pagination);
}
async function reports(parent) {
    const box = card(parent, "Application report", "Export application records, statuses and completion dates.");
    button(box, "Download CSV", () => download("/admin/reports.csv", "applications.csv"));
    await overview(parent);
}
const handlers = { overview, profile, password, internships, details, create: edit, edit, saved, applications,
    applicant, interview, notifications, students: parent => users(parent, "students"),
    companies: parent => users(parent, "companies"), account, contacts, audit, reports };
const secondaryRoles = { details: ["user", "company", "admin"], edit: ["company"], applicant: ["company"],
    interview: ["company"], password: ["user", "company", "admin"], account: ["admin"] };
async function render(success) {
    if (!me) return;
    const current = ++revision;
    let [view, key] = location.hash.slice(1).split("/");
    if (!Object.hasOwn(views[me.role], view) && !secondaryRoles[view]?.includes?.(me.role)) view = "overview";
    if (key && !/^[a-f0-9]{24}$/i.test(key)) { message("Invalid record ID", true); return; }
    if (["details", "edit", "applicant", "interview", "account"].includes(view) && !key) view = "overview";
    const title = view === "overview" ? labels[me.role] + " dashboard" : views[me.role][view] || secondary[view];
    heading.textContent = title;
    document.title = title + " | InternManage";
    for (const item of nav.querySelectorAll("a")) {
        if (item.hash === "#" + view) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
    }
    content.replaceChildren();
    content.setAttribute("aria-busy", "true");
    message("Loading…");
    const fragment = document.createDocumentFragment();
    try {
        await handlers[view](fragment, key);
        if (current !== revision) return;
        content.replaceChildren(fragment);
        message(success);
    } catch (error) {
        if (current === revision) message(error.message, true);
    } finally {
        if (current === revision) content.setAttribute("aria-busy", "false");
    }
}

document.getElementById("menu").addEventListener("click", event => {
    event.target.setAttribute("aria-expanded", String(!document.body.classList.toggle("collapsed")));
});
for (const view of ["profile", "password"]) document.getElementById(view).addEventListener("click", () => {
    document.getElementById("account").open = false;
    location.hash = view;
});
document.getElementById("logout").addEventListener("click", event => run(event.currentTarget, async () => {
    await api("/auth/logout", { method: "POST" });
    clearSession();
}));
window.addEventListener("hashchange", () => {
    render();
    heading.focus();
});
(async () => {
    if (!token) return clearSession();
    try {
        me = await api("/dashboard/me");
        document.getElementById("role").textContent = labels[me.role] + " panel";
        document.getElementById("identity").textContent = me.name;
        for (const [view, label] of Object.entries(views[me.role])) link(nav, label, view);
        await render();
    } catch (error) {
        message(error.message, true);
    }
})();
