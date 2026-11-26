# REST API

All paths below are relative to `/api`. Send JSON for request bodies unless the route specifies a file upload. For protected routes send `Authorization: Bearer <token>`.

Paginated collections accept `page` and `limit` (default 20, maximum 100) and return `{ items, pagination: { page, limit, total, pages } }`. The users collection names its array `users`. Notifications provide two paginated collections. Invalid requests return `{ error }` with a 4xx status. Typical responses are 201 for creation, 401 for missing or invalid sessions, 403 for an unauthorized role, 404 for an absent or out-of-scope record, 409 for conflicts, 413 for oversized input and 429 for rate limiting.

| Method and path | Access | Payload or behavior |
| --- | --- | --- |
| POST `/auth/register` | Public | `name, email, password, role`. Student role is `user`, company role is `company`. |
| POST `/auth/login` | Public | `email, password`. Returns user details and a JWT. |
| POST `/auth/logout` | Signed in | Revokes sessions for the current account. |
| PATCH `/auth/password` | Signed in | `currentPassword, password`. Revokes existing sessions. |
| GET `/dashboard/me` | Signed in | Account identity and database role. |
| GET `/dashboard/stats` | Signed in | Dashboard metrics for the current role. |
| GET/PATCH `/profile` | Signed in | All roles can update `name`. Students can set `education, bio, skills`; companies can set `companyName, description, website`. |
| PUT/GET `/profile/resume` | Student | Upload multipart field `resume` (PDF, max 2 MiB) or download one's resume. |
| GET `/internships` | Signed in | Filter by `q, location, category, workMode, minStipend, maxStipend`. The database role determines visibility. |
| GET `/internships/:id` | Signed in | Listing details within the caller's scope. |
| POST `/internships` | Verified company | `title, description, requirements, category, location, workMode, stipend, duration, deadline`. The deadline must be in the future. |
| PATCH `/internships/:id` | Verified owning company | Edit fields on an open listing or set `status: "closed"`. |
| DELETE `/internships/:id` | Owning company or admin | Soft removal. Companies can remove listings with no applications. |
| GET `/saved` | Student | List saved internships. |
| PUT/DELETE `/saved/:id` | Student | Save or unsave by internship ID. |
| POST `/internships/:id/applications` | Student | Apply once to an available listing. |
| GET `/applications` | Signed in | Application history limited by role. Optional `internship` filter. |
| PATCH `/applications/:id` | Applying student or owning company | Update `status`. Interviews require `interviewAt` and `interviewDetails`. |
| GET `/applications/:id/applicant` | Owning company | Applicant profile for a non-withdrawn application. |
| GET `/applications/:id/resume` | Owning company | Download applicant PDF for a non-withdrawn application. |
| GET `/notifications` | Student or company | Verification messages and latest application updates. |
| PATCH `/notifications/:id` | Recipient | Mark a message read. |
| PATCH `/notifications/application/:id` | Student or owning company | Mark the current application update read using its `updatedAt` timestamp. |
| POST `/contact` | Public | `name, email, subject, message`. |
| GET `/contact` | Admin | Paginated contact messages. |
| PATCH `/contact/:id/archive` | Admin | Archive a message and record the action. |
| GET `/users` | Admin | Search with `q`, filter by `role` and `active`. |
| GET `/users/:id` | Admin | Account details with sensitive fields excluded. |
| POST `/users` | Admin | Create an account with `name, email, password, role, age, avatar, isActive`. |
| PUT `/users/:id` | Admin | Edit `name, email, age, avatar, isActive`. |
| DELETE `/users/:id` | Admin | Deactivate a non-admin account. |
| PUT `/admin/companies/:id/verification` | Admin | Set `verification` to `approved` or `rejected`. |
| GET `/admin/audit` | Admin | Activity recorded by administrative operations. |
| GET `/admin/reports.csv` | Admin | Download applications with status, submission and completion dates. |

Dates use ISO 8601. Stipend is a non-negative amount in INR. Work modes are `remote`, `hybrid` and `onsite`. Skills and requirements are arrays of strings.

A new application is `pending`. Company decisions move it to `shortlisted`, `interview`, `accepted` or `rejected` as permitted by its current status. Companies can complete an accepted application. Students can withdraw while it is pending, shortlisted or in interview. Updates use a conditional write to protect against concurrent status changes. A unique index prevents repeat applications to a listing.
