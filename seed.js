// seed.js
// Populates the database with realistic sample data so the demo isn't starting from
// a completely empty screen. Run with: node seed.js
// Safe to re-run — it clears existing data first.

const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seed() {
  console.log('Clearing existing data...');
  db.exec('DELETE FROM requests; DELETE FROM donor_profiles; DELETE FROM users;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('requests','donor_profiles','users');");

  const passwordHash = await bcrypt.hash('password123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, phone, password_hash, city_area) VALUES (?, ?, ?, ?, ?)
  `);

  const users = [
    ['Ahmed Raza', 'ahmed@example.com', '0300-1112233', 'Sukkur City'],
    ['Sana Memon', 'sana@example.com', '0301-2223344', 'New Pind, Sukkur'],
    ['Bilal Shaikh', 'bilal@example.com', '0302-3334455', 'Sukkur City'],
    ['Ayesha Khan', 'ayesha@example.com', '0303-4445566', 'Rohri'],
    ['Usman Soomro', 'usman@example.com', '0304-5556677', 'Sukkur City'],
    ['Hina Abbasi', 'hina@example.com', '0305-6667788', 'New Pind, Sukkur'],
    ['Fahad Junejo', 'fahad@example.com', '0306-7778899', 'Rohri'],
    ['Zara Solangi', 'zara@example.com', '0307-8889900', 'Sukkur City'],
    // Extra donors across more Sukkur areas, covering every blood type so any
    // search or match query returns results without needing to reseed.
    ['Imran Qureshi', 'imran@example.com', '0308-1010101', 'Pannu Aqil'],
    ['Nadia Baloch', 'nadia@example.com', '0309-2020202', 'Old Sukkur'],
    ['Waqas Chandio', 'waqas@example.com', '0310-3030303', 'Military Road, Sukkur'],
    ['Farah Bhutto', 'farah@example.com', '0311-4040404', 'Shikarpur Road, Sukkur'],
    ['Kashif Lakho', 'kashif@example.com', '0312-5050505', 'Rohri'],
    ['Rabia Panhwar', 'rabia@example.com', '0313-6060606', 'New Pind, Sukkur'],
    ['Adeel Mahar', 'adeel@example.com', '0314-7070707', 'Sukkur City'],
    ['Sadia Larik', 'sadia@example.com', '0315-8080808', 'Pannu Aqil'],
    ['Tariq Indhar', 'tariq@example.com', '0316-9090909', 'Old Sukkur'],
    ['Mehwish Katiar', 'mehwish@example.com', '0317-1212121', 'Military Road, Sukkur'],
  ];

  const userIds = {};
  for (const [name, email, phone, city] of users) {
    const result = insertUser.run(name, email, phone, passwordHash, city);
    userIds[email] = result.lastInsertRowid;
  }

  const insertDonor = db.prepare(`
    INSERT INTO donor_profiles (user_id, blood_type, availability, last_donation_date) VALUES (?, ?, ?, ?)
  `);

  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().substring(0, 10);
  };

  insertDonor.run(userIds['ahmed@example.com'], 'O-', 1, daysAgo(120));   // eligible
  insertDonor.run(userIds['sana@example.com'], 'A+', 1, daysAgo(10));    // still in cooldown
  insertDonor.run(userIds['bilal@example.com'], 'B+', 1, null);         // never donated, eligible
  insertDonor.run(userIds['ayesha@example.com'], 'AB+', 0, daysAgo(200)); // eligible but unavailable
  insertDonor.run(userIds['usman@example.com'], 'O+', 1, daysAgo(95));   // eligible
  insertDonor.run(userIds['hina@example.com'], 'A-', 1, daysAgo(45));    // still in cooldown

  // Extra donors — every blood type covered, all available and past cooldown,
  // spread across different Sukkur areas so matching/search always has results.
  insertDonor.run(userIds['imran@example.com'], 'O-', 1, null);
  insertDonor.run(userIds['nadia@example.com'], 'O+', 1, null);
  insertDonor.run(userIds['waqas@example.com'], 'A+', 1, null);
  insertDonor.run(userIds['farah@example.com'], 'A-', 1, null);
  insertDonor.run(userIds['kashif@example.com'], 'B+', 1, null);
  insertDonor.run(userIds['rabia@example.com'], 'B-', 1, null);
  insertDonor.run(userIds['adeel@example.com'], 'AB+', 1, null);
  insertDonor.run(userIds['sadia@example.com'], 'AB-', 1, null);
  insertDonor.run(userIds['tariq@example.com'], 'O+', 1, null);
  insertDonor.run(userIds['mehwish@example.com'], 'B+', 1, null);

  const insertRequest = db.prepare(`
    INSERT INTO requests (requester_id, patient_name, blood_type_needed, urgency, hospital_location, contact_phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertRequest.run(userIds['fahad@example.com'], 'Mumtaz Junejo', 'O-', 'Critical', 'Sukkur City', '0306-7778899', 'Pending');
  insertRequest.run(userIds['zara@example.com'], 'Rukhsana Bibi', 'B+', 'High', 'Rohri', '0307-8889900', 'Pending');
  insertRequest.run(userIds['ayesha@example.com'], 'Kamran Khan', 'A+', 'Medium', 'New Pind, Sukkur', '0303-4445566', 'Pending');

  console.log('✅ Seed complete.');
  console.log('   Sample login: ahmed@example.com / password123 (any seeded user works, same password)');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
