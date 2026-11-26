# Test report

Verified on November 26, 2026 with Node.js 24, Mongoose 9.13.1, a dedicated local MongoDB process, and Playwright 1.65.1 with Chromium. Tests created fictional accounts in a disposable database.

| Check | Result |
| --- | --- |
| Node.js syntax checks on project JavaScript | Passed |
| `npm test` | 7 passed, 0 failed, 0 skipped, including the parent workflow and six subtests |
| `npm run test:browser` | Passed at 1440px desktop and 390px mobile widths |
| Standard `node server.js` startup with real MongoDB | Passed, including public home, protected route and auth throttling |
| `npm audit` | 0 reported dependency vulnerabilities |
| Screenshot verification | 37 captured PNG files, all decoded successfully |

## API integration

The integration suite exercised student and company registration, admin login, role-specific dashboard identity, duplicate emails, inactive accounts, expired tokens, role checks and logout. It also verified updates and reads for profiles, PDF type and size limits, listing creation, filtering and ownership, saved internships, concurrent duplicate applications, application decisions, completion, withdrawal, scoped resume access, notifications, database-backed counts, admin edits, contact archiving and CSV reports. The operator script tests covered administrator provisioning and bcrypt password reset for an existing record without a session version.

## Browser verification

Chromium followed the public navigation and contact submission, created student and company accounts through the registration form, and signed in through each role's UI. The browser test approved the company, published a listing, uploaded and downloaded a PDF, saved and applied to the listing, scheduled an interview, accepted and completed the application, read a notification, and downloaded the CSV. It checked dashboard navigation, menu collapse, lack of page-level overflow at 390px, and browser console errors.

The [screenshots folder](screenshots/) contains captures from the test run. It covers the nine public pages, each role dashboard and the requested workflow views, plus the mobile application-tracking view.

## Verification limits

The tests used local MongoDB. Atlas connectivity, reverse-proxy deployment, Safari and Firefox, malware scanning, and CLI backup and restore were outside the executed checks.
