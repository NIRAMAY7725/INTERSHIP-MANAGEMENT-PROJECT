const token = localStorage.getItem("internmanage_token");
const content = document.getElementById("content");
const notice = document.getElementById("notice");
let me, page = 1, revision = 0;
const labels = { user: "Student", company: "Company", admin: "Admin" };
function logout() {
    localStorage.removeItem("internmanage_token");
    localStorage.removeItem("internmanage_user");
    location.replace("/login");
}
async function api(path, options = {}) {
    const res = await fetch("/api" + path, { ...options, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" } });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
}
function el(tag, value, parent) {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    if (parent) parent.append(node);
    return node;
}
function card(parent, title, value) {
    const box = el("article", undefined, parent);
    el("h2", title, box); el("p", value, box); return box;
}
function action(parent, title, handler, disabled = false) {
    const b = el("button", title, parent); b.className = "action"; b.disabled = disabled;
    b.addEventListener("click", async () => { b.disabled = true; try { await handler(); } catch(e) { notice.textContent = e.message; } finally { b.disabled = disabled; } });
}
async function render(view) {
    const current = ++revision;
    content.replaceChildren(); notice.textContent = "";
    try {
        if (view === "profile") {
            card(content, "Name", me.name); card(content, "Email", me.email); card(content, "Account type", labels[me.role]); return;
        }
        if (view === "users" && me.role === "admin") {
            const data = await api("/users?page=" + page + "&limit=20");
            if (current !== revision) return;
            const wrap = el("div", undefined, content); wrap.className = "table-wrap";
            const table = el("table", undefined, wrap);
            const head = el("tr", undefined, el("thead", undefined, table));
            ["Name","Email","Role","Status","Action"].forEach(v => el("th", v, head));
            const body = el("tbody", undefined, table);
            data.users.forEach(u => {
                const row = el("tr", undefined, body);
                [u.name,u.email,labels[u.role] || u.role,u.isActive ? "Active" : "Inactive"].forEach(v => el("td", v, row));
                action(el("td", undefined, row), u.isActive ? "Deactivate" : "Activate", async () => {
                    await api("/users/" + encodeURIComponent(u._id), { method:"PUT", body:JSON.stringify({isActive:!u.isActive}) }); await render("users");
                }, u._id === me._id);
            });
            el("p", "Page " + page + " of " + Math.max(1,data.pagination.pages) + " · " + data.pagination.total + " users", content);
            action(content,"Previous",async()=>{page--;await render("users");},page<=1);
            action(content,"Next",async()=>{page++;await render("users");},page>=data.pagination.pages);
            return;
        }
        if (view === "contacts" && me.role === "admin") {
            const messages = await api("/contact");
            if (current !== revision) return;
            if (!messages.length) el("p","No contact messages yet.",content);
            messages.forEach(m=>{const box=card(content,m.subject,m.message);el("p",m.name+" · "+m.email,box);}); return;
        }
        const grid = el("div", undefined, content); grid.className = "grid";
        card(grid,"Welcome",me.name);
        card(grid,"Account status","Active");
        if (me.role === "admin") {
            const data = await api("/users?limit=1");
            if (current !== revision) return;
            card(grid,"Total users",String(data.pagination.total));
            action(content,"Manage users",()=>render("users")); action(content,"Contact messages",()=>render("contacts"));
        } else if (me.role === "company") {
            card(grid,"Internship postings","Coming soon — posting API not implemented.");
            card(grid,"Applicants","Coming soon — application API not implemented.");
        } else {
            card(grid,"Browse internships","Coming soon — internship API not implemented.");
            card(grid,"My applications","Coming soon — application tracking not implemented.");
        }
    } catch(e) { if(current===revision) notice.textContent=e.message; }
}
document.getElementById("logout").addEventListener("click",logout);
(async()=>{
    if(!token){logout();return;}
    try {
        me=await api("/dashboard/me");
        document.getElementById("role").textContent=labels[me.role]+" panel";
        document.getElementById("heading").textContent=labels[me.role]+" dashboard";
        document.getElementById("identity").textContent=me.name;
        document.querySelectorAll("[data-view]").forEach(b=>{
            if(me.role==="admin") b.hidden=false;
            b.addEventListener("click",()=>render(b.dataset.view));
        });
        content.hidden=false; await render("overview");
    } catch(e){notice.textContent=e.message;}
})();
