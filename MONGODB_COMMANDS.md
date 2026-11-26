# MongoDB administration

Run commands using a trusted database operator account. Replace the example addresses and IDs with the intended records. Back up the database before maintenance. Use the application panels for routine changes so application rules, notifications and audit logging run.

## Connect and inspect

```bash
mongosh 'mongodb://127.0.0.1:27017/internmanage'
```

For a hosted cluster, use the connection string supplied by the provider and its secure authentication prompt. In `mongosh`:

```javascript
use internmanage
show collections

// View accounts with private authentication fields excluded.
db.users.find({}, { password: 0, sessionVersion: 0 }).limit(20)
db.users.findOne({ email: "student@example.test" }, { password: 0, sessionVersion: 0 })

// Update the display name (stored as name) or canonical lowercase address.
db.users.updateOne({ email: "student@example.test" }, { $set: { name: "Aarav Mehta", updatedAt: new Date() } })
db.users.updateOne({ email: "student@example.test" }, { $set: { email: "aarav@example.test", updatedAt: new Date() } })
```

The email index rejects duplicate addresses. Inspect `matchedCount` and `modifiedCount` to confirm the intended record changed.

## Roles and account state

Use role changes for dedicated accounts with no existing role-specific data. For accounts with profiles, listings or applications, inspect the linked records before changing their role. These commands guard against changing administrators through student/company updates and revoke previous sessions when privileges change.

```javascript
// Change a dedicated company account to student.
db.users.updateOne({ email: "switch-to-student@example.test", role: "company" }, {
  $set: { role: "user", updatedAt: new Date() }, $inc: { sessionVersion: 1 }
})

// Change a dedicated student account to company. Verification then starts pending.
db.users.updateOne({ email: "switch-to-company@example.test", role: "user" }, {
  $set: { role: "company", updatedAt: new Date() }, $inc: { sessionVersion: 1 }
})

// Promote an existing dedicated account to administrator after confirming its owner.
db.users.updateOne({ email: "trusted-operator@example.test", role: "user" }, {
  $set: { role: "admin", isActive: true, updatedAt: new Date() }, $inc: { sessionVersion: 1 }
})

// Activate and deactivate a student or company. Deactivation revokes sessions.
db.users.updateOne({ email: "aarav@example.test", role: { $in: ["user", "company"] } }, {
  $set: { isActive: true, updatedAt: new Date() }
})
db.users.updateOne({ email: "aarav@example.test", role: { $in: ["user", "company"] } }, {
  $set: { isActive: false, updatedAt: new Date() }, $inc: { sessionVersion: 1 }
})
```

Use `npm run admin -- trusted-operator@example.test` from the application host for routine provisioning.

## Listings, applications and counts

```javascript
db.internships.find({}, { title: 1, status: 1, deadline: 1, company: 1 }).sort({ createdAt: -1 }).limit(20)
db.applications.find({}, { internship: 1, student: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(20)

// Maintenance example: complete one currently accepted application.
const applicationId = ObjectId("65a012345678901234567890")
db.applications.updateOne({ _id: applicationId, status: "accepted" }, {
  $set: { status: "completed", completedAt: new Date(), updatedAt: new Date() },
  $unset: { statusReadAt: "" }
})

db.users.countDocuments({})
db.users.countDocuments({ role: "company" })
db.internships.countDocuments({ status: { $ne: "removed" } })
```

Use statuses from the [API reference](API_DOCUMENTATION.md). Shell updates bypass Mongoose validation and administrative audit hooks.

## Backup and restore

Install MongoDB Database Tools. These examples use a local development server. The restore writes into a separately named database for verification.

```bash
mongodump --uri='mongodb://127.0.0.1:27017' --db=internmanage --archive=internmanage.archive.gz --gzip
mongorestore --uri='mongodb://127.0.0.1:27017' --archive=internmanage.archive.gz --gzip \
  --nsInclude='internmanage.*' --nsFrom='internmanage.*' --nsTo='internmanage_restore.*'
mongosh 'mongodb://127.0.0.1:27017/internmanage_restore'
```

Compare collection counts and indexes in the restored database before switching an application to it. Restrict access to backups because they include resumes and password hashes.

## Reset a password with bcrypt

The project's `scripts/account.js` updates a user through the existing Mongoose model. Its save hook hashes the password with bcrypt and the script revokes active sessions. Feed the password from a hidden Bash prompt.

```bash
read -r -s -p 'New password: ' internmanage_password
printf '\n'
printf '%s\n' "$internmanage_password" | npm run password -- aarav@example.test
unset internmanage_password
```

Choose at least eight characters and no more than 72 UTF-8 bytes. Have the account owner sign in with the new password.
