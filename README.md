https://github.com/NIRAMAY7725/INTERSHIP-MANAGEMENT-PROJECT/issues/2#issue-5440221236


# InternManage — Online Internship Management Portal

> Empowering Internships, Building Careers

A one-stop platform for students, companies, and institutions to manage the internship lifecycle — from posting opportunities to applying, tracking, and approving them. Built with Node.js, Express, and MongoDB.

---

## 📌 Project Status

This project is under **active development**. Authentication, role-based access control, and the admin/user backbone are complete and working. Core internship features (listings, applications, dashboards) are on the roadmap below.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js 5 |
| Database | MongoDB + Mongoose |
| Authentication | JWT (JSON Web Tokens) |
| Password Hashing | bcrypt |
| Security | Helmet, CORS, express-rate-limit |
| Frontend | HTML, CSS, Vanilla JS |

---

## ✅ Features (Implemented)

- **User registration & login** with hashed passwords and JWT-based sessions
- **Role-based access control** — `user`, `company`, and `admin` roles, enforced server-side (role can't be self-escalated at signup)
- **Admin user management** — full CRUD on users, restricted to admin accounts
- **Contact form** — public submission endpoint + admin-only inbox view
- **Security middleware** — Helmet for HTTP headers, CORS, and rate limiting (10 requests / 15 min) on all `/api/auth` routes
- **Marketing site** — Home, About, Features, How It Works, Contact, Login, Register pages

## 🚧 Roadmap (Planned, Not Yet Built)

The navigation currently links to a few pages that are still in progress:

- [ ] `Internship` model + listings — post, browse, and filter internships
- [ ] `Application` model — students apply, companies review, status tracking (pending/accepted/rejected)
- [ ] Student/company **dashboard**
- [ ] **Certificates** for completed internships
- [ ] **Reports/analytics** for admins and companies
- [ ] Privacy Policy & Terms pages

If you're picking this project back up, this list is the priority order — the auth/security foundation is solid, so the fastest path to a working demo is the `Internship` + `Application` models next.

---

## 📁 Project Structure

```
INTERSHIP-MANAGEMENT-PROJECT/
│
├── server.js               # App entry point — middleware, routing, DB connect, seed
├── package.json
├── .env                     # Not committed — see Environment Variables below
│
├── config/
│   └── db.js                # MongoDB connection
│
├── routes/
│   ├── authRoute.js          # /api/auth/register, /api/auth/login
│   ├── userRoute.js          # /api/users (admin only)
│   └── contactRoute.js       # /api/contact
│
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   └── contactController.js
│
├── models/
│   ├── User.js                # bcrypt hashing, JWT generation, role enum
│   ├── Contact.js
│   ├── Post.js                 # scaffolded, not yet wired to a route
│   └── Comment.js              # scaffolded, not yet wired to a route
│
├── middleware/
│   └── auth.js                # protect (JWT check) + authorize (role check)
│
├── public/                    # Static frontend (HTML/CSS/JS)
│   ├── index.html, about.html, features.html, how-it-works.html,
│   │   contact.html, login.html, register.html
│   ├── css/style.css
│   └── js/app.js
│
└── testModels.js              # Manual script to sanity-check models (run with `node testModels.js`)
```

> **Note:** There's a legacy `FRONTED/` folder from early prototyping (an outdated `User` model and a scratch file) that isn't used anywhere in the app. Safe to delete before sharing or grading this repo.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB connection string (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Installation

```bash
git clone https://github.com/NIRAMAY7725/INTERSHIP-MANAGEMENT-PROJECT.git
cd INTERSHIP-MANAGEMENT-PROJECT
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret_string
```

### Run the server

```bash
node server.js
```

> There's no `npm start` script defined yet in `package.json` — running `node server.js` directly works today. Adding a `"start": "node server.js"` script is a quick, worthwhile improvement.

The app will be available at `http://localhost:5000`.

### First-run seeding

On first run against an empty database, the server automatically seeds one test user:

```
email: niramay@gmail.com
password: niramay123
```

⚠️ **This is for local development only.** Remove or change this seed before deploying anywhere public, since it creates a predictable account with a known password.

---

## 📡 API Reference

### Auth — `/api/auth`

| Method | Endpoint | Access | Body |
|---|---|---|---|
| POST | `/register` | Public | `{ name, email, password, role? }` |
| POST | `/login` | Public | `{ email, password }` |

Both return `{ _id, name, email, role, token }` on success. `role` on registration is restricted server-side to `user` or `company` — admin accounts can't be self-registered.

### Users — `/api/users` (admin only, requires `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all users |
| GET | `/:id` | Get one user |
| POST | `/` | Create a user |
| PUT | `/:id` | Update a user (password/role/email locked from this endpoint) |
| DELETE | `/:id` | Delete a user |

### Contact — `/api/contact`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Public | Submit a contact message |
| GET | `/` | Admin only | View all submitted messages |

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt before saving (`User.pre("save")` hook) and never returned by default (`select: false`)
- JWTs carry `id` and `role`, expire after 7 days
- Auth endpoints are rate-limited to reduce brute-force risk
- User updates strip `password`, `role`, `email`, and `_id` server-side to prevent privilege escalation via the update endpoint
- Before production: restrict `cors()` to your actual frontend origin (currently open to all origins) and confirm `JWT_SECRET` is a long, random value stored only in `.env`

---

## 🧪 Testing Models

`testModels.js` is a manual script (not an automated test suite) that creates and cleans up a User → Post → Comment chain to confirm the models and their relationships work:

```bash
node testModels.js
```

---

## 🤝 Contributing

This is currently a solo/academic project. If you'd like to contribute, open an issue describing the change before submitting a PR.

## 📄 License

ISC

## 👤 Author

**Niramay** — [@NIRAMAY7725](https://github.com/NIRAMAY7725)
