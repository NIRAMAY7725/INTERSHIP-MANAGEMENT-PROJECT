# Changelog

## Development branch

- Built on `fix/debug-security` and retained the public landing pages and existing user records.
- Replaced dashboard placeholders with student, company and admin views backed by MongoDB.
- Fixed account validation, normalized emails, handled duplicates, added session revocation and protected administrator accounts from API deactivation.
- Added verification, listing ownership, search, profile editing, PDF resumes, applications, saved listings, interviews, status updates and completion tracking.
- Added administrative account operations, listing moderation, contact archiving, audit logs and CSV export.
- Corrected misleading public navigation and unsupported feature descriptions, removed fabricated public counters and made role selection keyboard accessible.
- Added database administration commands, trusted account scripts, setup guidance, REST documentation and isolated verification workflows.
- Updated vulnerable transitive and direct npm dependencies flagged by the audit.
- Captured 37 real Chromium screenshots and verified mobile application tracking with stacked rows.
