// config/db.js
// Sets up the SQLite database connection and creates tables if they don't exist yet.
// Using better-sqlite3 because it's synchronous and simple — no callback/promise juggling
// needed for a project this size, and it persists to a real file on disk (not in-memory).

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'blood_network.db');
const db = new Database(dbPath);

// Enforce foreign key constraints (SQLite has them off by default)
db.pragma('foreign_keys = ON');

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
    urgency TEXT NOT NULL CHECK (urgency IN ('Critical','High','Medium')),
    hospital_location TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Fulfilled','Expired')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    fulfilled_at TEXT,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_donor_blood_type ON donor_profiles(blood_type);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
`);

module.exports = db;
