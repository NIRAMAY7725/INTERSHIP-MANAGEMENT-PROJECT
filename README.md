# InternManage

InternManage is a BCA minor project for managing internships from discovery through completion. It serves a public website and three role-based dashboards backed by MongoDB.

| Role | Workflow |
| --- | --- |
| Student | Register, build a profile, upload a PDF resume, find and save internships, apply, track decisions and interviews, and view completion details. |
| Company | Register, complete the company profile, obtain verification, publish and manage listings, review applicants, schedule interviews, and record decisions and completion. |
| Admin | Verify companies, manage accounts, moderate listings, monitor applications, archive contact messages, review activity, and export reports. |

The frontend uses HTML, CSS and vanilla JavaScript. Express runs on Node.js. Mongoose connects to MongoDB. Authentication uses bcrypt and signed JWTs.

## Run locally

Install Node.js 22 or newer and start a MongoDB server. You can also use a MongoDB Atlas database.

```bash
git clone --branch develop/internmanage-panels https://github.com/NIRAMAY7725/INTERSHIP-MANAGEMENT-PROJECT.git
cd INTERSHIP-MANAGEMENT-PROJECT
npm ci
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Put the generated value in `JWT_SECRET`, set the database name and connection string in `MONGO_URI`, then run `npm start`. Open <http://127.0.0.1:5000>. For development, `npm run dev` restarts the server on code changes.

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection URI, including the database name. The example connects to a local database. |
| `JWT_SECRET` | Private signing secret of at least 32 bytes. Changing it invalidates existing JWTs. |
| `HOST` | Binding address. The example binds to loopback. |
| `PORT` | HTTP port, default 5000. |
| `NODE_ENV` | Use `production` behind HTTPS. |
| `CORS_ORIGIN` | Optional single trusted browser origin for a separately hosted frontend. Leave empty for the bundled frontend. |

For Atlas, use a database user with access limited to the project database and allow the server's network in Atlas. Escape special characters in URI credentials. Keep `.env` out of source control.

## Provision an administrator

Register a dedicated student account through the normal form. A trusted operator with database access can activate it as an administrator:

```bash
npm run admin -- admin@example.test
```

Sign in again after provisioning. Public registration offers Student and Company accounts. The admin UI deactivates student and company accounts without deleting records.

## Repository layout

| Directory | Contents |
| --- | --- |
| `public/` | Existing public pages, shared dashboard, JavaScript, styles and media |
| `routes/`, `controllers/` | REST routes and workflow handlers |
| `middleware/`, `lib/` | Authentication, response handling, request validation and pagination |
| `models/`, `config/` | Mongoose schemas, indexes and database startup |
| `scripts/` | Trusted account provisioning and password reset |
| `tests/` | API integration and browser workflows using an isolated MongoDB process |
| `screenshots/` | Chromium captures with fictional accounts and data |

The root `server.js` is the application entry point. `FRONTED/` contains historical prototype files.

## Demo workflow

1. Register a student and company. Set up both profiles.
2. Sign in as admin, open **Manage companies**, and approve the company.
3. Sign in as the company and publish a listing with a future deadline.
4. Sign in as the student, upload a PDF resume, browse the listing and apply.
5. Sign in as the company, open **Manage applicants**, and schedule an interview, accept the application and mark it complete.
6. View the completion as the student and download the applications CSV as the admin.

## Testing

```bash
npm test
npx playwright install chromium
npm run test:browser
```

For Linux hosts that lack browser libraries, install the Playwright system dependencies using `npx playwright install-deps chromium`. The tests start their own MongoDB and HTTP processes. The first run may require access to download the MongoDB binary. The browser test refreshes the fictional screenshot set.

## Existing databases

The `users` collection and existing role names are preserved. New profiles are optional and created when users edit them or an administrator verifies a company. Session versions default to zero for older accounts. Existing users sign in again to receive the new token format. Existing companies start as pending if they have no verification record. The app creates indexes on startup. If MongoDB reports a duplicate while building a unique index, back up the database and reconcile the conflicting records before restarting.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Startup fails | Check the MongoDB URI, firewall, database user permissions and signing secret. |
| Company cannot publish | Check that the account is active and the company verification is approved. |
| Listing is absent from student search | Check its deadline, status, company verification and filters. |
| Resume upload fails | Choose a PDF of 2 MiB or less. |
| Previously valid JWT is rejected | Sign in again after logout, password change, deactivation or secret rotation. |
| Browser test fails to launch | Install Chromium and its host libraries. |

[REST API](API_DOCUMENTATION.md) · [MongoDB commands](MONGODB_COMMANDS.md) · [Feature guide](FEATURE_WORKING.md) · [Test report](TEST_REPORT.md) · [Changelog](CHANGELOG.md)
