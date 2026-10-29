// config/db.js
// Sets up the SQLite database connection and creates tables if they don't exist yet.
// Uses Node's built-in `node:sqlite` module (available without flags since Node 22.13 / 23.4,
// and a Release Candidate as of Node 24) instead of a third-party native package. This avoids
// requiring a C++ build toolchain (Visual Studio Build Tools on Windows, Xcode on Mac) just to
// install dependencies — a common source of setup pain for a class project.

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// DB_PATH lets a hosting platform point the database at a persistent disk.
// Locally it defaults to data/blood_network.db inside the project.
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'blood_network.db');

// The data/ folder is not stored in Git (database files are ignored), so create it if missing.
// Without this, a fresh clone or a cloud deploy would crash with "unable to open database file".
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

// Enforce foreign key constraints (SQLite has them off by default)
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    city_area TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS donor_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    blood_type TEXT NOT NULL CHECK (blood_type IN ('O-','O+','A-','A+','B-','B+','AB-','AB+')),
    availability INTEGER NOT NULL DEFAULT 1, -- 1 = available, 0 = not available
    last_donation_date TEXT,                 -- nullable: NULL means "never donated / no record"
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL,
    patient_name TEXT NOT NULL,
    blood_type_needed TEXT NOT NULL CHECK (blood_type_needed IN ('O-','O+','A-','A+','B-','B+','AB-','AB+')),
    units_needed INTEGER NOT NULL DEFAULT 1 CHECK (units_needed BETWEEN 1 AND 20),
    urgency TEXT NOT NULL CHECK (urgency IN ('Critical','High','Medium')),
    hospital_location TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Fulfilled','Expired')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    fulfilled_at TEXT,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- A donor actively offering to fulfil a specific request ("I Can Donate"),
  -- as opposed to just being passively surfaced as a compatible match.
  CREATE TABLE IF NOT EXISTS donor_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    donor_user_id INTEGER NOT NULL,
    responded_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(request_id, donor_user_id),
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_donor_blood_type ON donor_profiles(blood_type);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
`);

// Safe migration: databases created before `units_needed` existed won't get the column
// from CREATE TABLE IF NOT EXISTS, so add it here if missing.
const requestColumns = db.prepare("PRAGMA table_info(requests)").all();
if (!requestColumns.some((col) => col.name === 'units_needed')) {
  db.exec("ALTER TABLE requests ADD COLUMN units_needed INTEGER NOT NULL DEFAULT 1;");
}

module.exports = db;
