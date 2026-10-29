# AI Usage Disclosure

**Project:** BloodBridge — Sukkur Emergency Donor Network
**Team members:** _[fill in names]_
**Date:** _[fill in]_

> Fill this in honestly before submission — see Section 7 of the project brief.
> This is not penalized; it exists so AI use can be discussed fairly during evaluation.

## AI tools used

- Claude (Anthropic) — used for initial scaffolding, code generation, and this document's structure.

## What AI was used for

- Generating the initial project skeleton: Express server setup, route structure, and
  folder organization.
- Writing the blood-type compatibility logic (`utils/bloodCompatibility.js`) and the
  90-day cooldown calculation.
- Generating boilerplate for the EJS views and the CSS design system.
- Writing the authentication flow (signup/login/session handling with bcrypt).
- Drafting this README and disclosure template.

## What the team did itself

_[Fill this in — be specific. Examples of what to describe:]_
- Which parts you read line-by-line and understood before demo day
- Any bugs you found and fixed yourselves
- Any features you modified, extended, or rewrote from the AI-generated version
- Decisions you made that AI didn't make for you (e.g. choosing SQLite over another
  database, deciding on the urgency levels, deciding what "same area" matching means)
- Testing you did manually (which flows you clicked through, what data you used)

## Team understanding confirmation

Every team member should be able to explain, without notes:
- How the blood type compatibility check works and why O- / AB+ are special cases
- How passwords are protected (hashing, not encryption — and why that distinction matters)
- How the auto-expiry of pending requests works
- Why the database is SQLite and what would need to change to use a different one

_[Each member should add a line here confirming which parts of the codebase they can
personally walk through and defend during Q&A.]_
