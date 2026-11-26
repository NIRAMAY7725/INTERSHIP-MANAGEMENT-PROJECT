# How features work

## Student

Sign in and open **My profile** to edit your name, education, skills and bio. Upload a PDF resume to make it available to companies considering your applications. In **Browse internships**, combine a text query with location, category, mode and stipend filters. Open the listing to see requirements, save it or apply. The database accepts one application per student and listing. **My applications** shows submission, current status, interview instructions and completion timestamps. Use **Withdraw** while the application is still in review. **Notifications** shows the latest status update for each reviewed application.

## Company

Set your company details under **My profile** and check the verification badge. An approved company can post a listing with a deadline, stipend, duration and requirements. Use **Manage internships** to edit or close a listing. A company can remove its listing when it has no applications. **Manage applicants** shows applications to your company's listings and links to applicant profiles and uploaded resumes. Shortlist, schedule an interview, accept, reject or mark a previously accepted application complete. **Notifications** shows verification decisions and application activity.

## Admin

Use **Manage students** and **Manage companies** to search and filter accounts, edit their permitted fields and activate or deactivate them. Verify companies from the company list. Use **Manage internships** for listing moderation and **Manage applications** to inspect progress. Review and archive messages in **Contact messages**. **Activity log** records administrative account, moderation, contact and verification actions. **Reports** streams the applications CSV. The admin account menu opens profile, password and logout actions.

## Data and session behavior

Dashboard cards count database records with the role's own scope. Accepted and completed are separate statuses. Removing a listing preserves existing application history, and deactivating an account preserves its profile and records. Company listings are hidden from students when the company is unverified or inactive, the listing closes, or the deadline passes.

Logout and password changes revoke all JWTs for the account. The resume endpoint serves downloads as attachments and checks ownership on every request. The PDF checks validate size, MIME type, header and end marker. Antivirus and malware scanning require a separate service.

The app is configured for a single Node.js process. It serializes listing changes and applications for each listing in that process. Run one app process per database unless the listing-write coordination is moved to MongoDB. Administrative writes and their audit or notification entries use separate writes.
