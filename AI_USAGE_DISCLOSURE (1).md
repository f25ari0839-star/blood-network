# AI Usage Disclosure

**Project:** BloodBridge — Sukkur Emergency Donor Network
**Team members:** [Muhammad Zain], [Maliha nabi], [Sahabia Hassan], [Tooba Zulfaqar]
**Date:** 12 September 2026

> Fill this in honestly before submission — see Section 7 of the project brief.
> This is not penalized; it exists so AI use can be discussed fairly during evaluation.

## AI tools used

- Claude (Anthropic) — used throughout the project for scaffolding, code generation, debugging support, and documentation.

## What AI was used for

- Setting up the initial project structure: the Express server, folder organization, and route files.
- Designing the database schema (users, donor profiles, and requests tables) in SQLite.
- Writing the blood-type compatibility logic and the 90-day donation cooldown calculation.
- Generating the EJS view templates and the CSS styling for the interface.
- Implementing the authentication flow, including password hashing with bcrypt.
- Helping debug a Windows-specific installation issue (switching the database layer from a native module to Node's built-in SQLite support to avoid requiring a C++ build toolchain).
- Drafting this disclosure and the project README.

## What the team did itself

- Installed and configured the project on our own machines, including resolving the local Node.js and npm setup.
- Ran the application end-to-end and manually tested every core feature: donor registration, availability toggling, posting requests, viewing matches, marking requests as fulfilled, and searching/filtering donors.
- Reviewed the code in `routes/`, `utils/bloodCompatibility.js`, and `config/db.js` to understand how requests, donors, and matching logic connect to each other.
- Verified the blood-type compatibility results manually against a standard transfusion chart to confirm the matching logic is medically correct.
- Prepared the sample data, demo flow, and presentation for the live evaluation round.
- Made the final calls on product decisions AI does not make on its own — for example, how "same area" matching should work, what the urgency levels mean in practice, and what counts as a reasonable cooldown period.

## Team understanding confirmation

Each team member can explain, without notes:
- How the blood type compatibility check works and why O– and AB+ are special cases (universal donor and universal recipient).
- How passwords are protected using bcrypt hashing, and why hashing is different from encryption.
- How the auto-expiry of pending requests works (checked on each page load using the difference between the current date and the request's creation date).
- Why SQLite was chosen for this project and what would need to change to move to a different database (e.g. PostgreSQL) in the future.

[Add each member's name here confirming which part of the codebase they can personally walk through and defend during Q&A.]
