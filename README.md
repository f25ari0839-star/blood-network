# BloodBridge — Sukkur Emergency Donor Network

A working web application that connects blood donors with people who urgently need blood,
built for the CSC-206 Software Engineering semester project.

## What this solves

Blood donation coordination in Sukkur currently runs on informal WhatsApp groups and phone
chains. BloodBridge replaces that with a simple, reliable system: donors register once and
toggle their availability; requesters post what they need; the system finds compatible,
eligible, available donors automatically using correct blood-type compatibility rules.

## Tech stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`) — a real file on disk, not in-memory data
- **Templating:** EJS (server-rendered HTML)
- **Auth:** express-session + bcryptjs (passwords are hashed, never stored in plain text)

## How to run it

1. Make sure Node.js (v16+) is installed.
2. Install dependencies:
   ```
   npm install
   ```
3. (Optional but recommended for the demo) Seed the database with sample donors and requests:
   ```
   node seed.js
   ```
   This creates 8 sample users (password for all: `password123`), 6 donor profiles, and
   3 sample blood requests, so the app isn't empty on first load.
4. Start the server:
   ```
   npm start
   ```
5. Open **http://localhost:3000** in your browser.

If you seeded the database, you can log in as `ahmed@example.com` / `password123` (or any
other seeded email — same password) to see the app fully populated.

To start completely fresh, delete `data/blood_network.db` and restart the server — the
tables are recreated automatically on boot.

## What's implemented

**Mandatory core features (per the brief, Section 3):**
- Donor registration: name, contact, blood type, city/area, toggleable availability,
  last-donation-date self-declaration with a 90-day (3-month) cooldown rule
- Blood request posting: blood type needed, urgency (Critical/High/Medium),
  hospital/location, contact info — visible to relevant donors immediately
- Search & matching: automatic surfacing of compatible donors for each request, using a
  correct blood-type compatibility chart (see `utils/bloodCompatibility.js`) — e.g. O- is
  treated as a universal donor, AB+ as a universal recipient
- Authentication: signup/login with sessions; passwords hashed with bcrypt, never stored
  in plain text
- Request status tracking: Pending / Fulfilled / Expired, with the requester able to mark
  their own request as fulfilled, and stale pending requests (7+ days old) auto-expiring

**Extras included beyond the minimum:**
- Matches are sorted so donors in the same area as the hospital appear first
- Only donors who are simultaneously available, blood-type compatible, AND past their
  cooldown are shown as matches (not just compatible)
- A dashboard with live counts (pending requests, critical requests, available donors)

## Known limitations

- No SMS/WhatsApp notifications — donors have to check the app to see new requests
  (listed as an optional "excellence" feature in the brief, not core)
- No admin/hospital verification layer for requests
- Location matching is by exact city/area name (string match), not GPS proximity
- No password reset flow (not required for a class demo, but a real product would need one)
- Single server instance, no rate limiting on request posting

## Project structure

```
blood-network/
├── server.js                  # entry point
├── config/db.js                # SQLite connection + schema
├── middleware/auth.js          # login guard + session helper
├── routes/
│   ├── auth.js                 # signup, login, logout
│   ├── donors.js                # donor registration, availability toggle, directory
│   └── requests.js              # post request, list/filter, matching, fulfill
├── utils/bloodCompatibility.js # compatibility chart + cooldown math
├── views/                      # EJS templates
├── public/css/style.css        # all styling
└── seed.js                     # demo data
```
