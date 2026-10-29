# AI Usage Disclosure

**Project:** BloodBridge — Sukkur Emergency Donor Network
**Team members:** Muhammad Zain, Maliha Nabi, Sahabia Hassan, Tooba Zulfaqar, Ali Shakeel, Ayan
**Date:** 29 October 2026

## AI tools used

- Claude (Anthropic), used throughout the project for code generation, debugging help, and documentation.

## What AI was used for

- Generating the initial project structure: Express server, folder organization, and route files.
- Designing the SQLite database schema (users, donor profiles, requests, donor responses).
- Writing the blood-type compatibility logic and the 90-day donation cooldown calculation.
- Generating the EJS view templates and the CSS styling.
- Writing the authentication flow, including password hashing with bcrypt.
- Fixing a Windows installation problem by switching the database layer to Node's built-in SQLite module.
- Adding features after instructor feedback: units of blood needed per request, and the "I Can Donate" offer system with a "View Offers" page for requesters.
- Fixing dependency security warnings (npm audit) and preparing the app for cloud deployment.
- Drafting the README, this disclosure, and our demo video script.

## What the team did itself

- Installed and ran the project on our own machines and resolved the local Node.js and npm setup.
- Manually tested every core feature end to end: signup/login, donor registration, availability toggle, posting requests, matching, offering to donate, marking requests fulfilled, and donor search.
- Reviewed the main code (routes, database setup, and the compatibility logic) so we can explain how the system works.
- Checked the blood-type compatibility results against a standard transfusion chart.
- Demoed the project to our instructor, collected feedback, and requested the changes listed above.
- Uploaded the code to GitHub and prepared the demo, sample data, and presentation.

## Team understanding confirmation

Each team member can explain, without notes, the part they present in the demo, including:
- How the blood type compatibility check works and why O- and AB+ are special cases.
- How passwords are protected (hashing, not encryption).
- How pending requests automatically expire after 7 days.
- How "I Can Donate" is validated: the donor must be registered, available, blood-type compatible, and past the 90-day cooldown.
- Why SQLite was chosen and what would change to use a different database.
