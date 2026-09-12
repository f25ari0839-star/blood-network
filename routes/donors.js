// routes/donors.js
const express = require('express');
const db = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { isEligibleByCooldown, daysUntilEligible, ALL_BLOOD_TYPES } = require('../utils/bloodCompatibility');

const router = express.Router();

// ---------- Become a donor / edit donor profile ----------
router.get('/donor/register', requireLogin, (req, res) => {
  const existing = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.session.userId);
  res.render('donor-register', { error: null, existing, bloodTypes: ALL_BLOOD_TYPES });
});

router.post('/donor/register', requireLogin, (req, res) => {
  const { blood_type, last_donation_date } = req.body;

  if (!blood_type || !ALL_BLOOD_TYPES.includes(blood_type)) {
    const existing = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.session.userId);
    return res.render('donor-register', { error: 'Please select a valid blood type.', existing, bloodTypes: ALL_BLOOD_TYPES });
  }

  const existing = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.session.userId);

  if (existing) {
    db.prepare(`
      UPDATE donor_profiles SET blood_type = ?, last_donation_date = ?
      WHERE user_id = ?
    `).run(blood_type, last_donation_date || null, req.session.userId);
  } else {
    db.prepare(`
      INSERT INTO donor_profiles (user_id, blood_type, availability, last_donation_date)
      VALUES (?, ?, 1, ?)
    `).run(req.session.userId, blood_type, last_donation_date || null);
  }

  res.redirect('/dashboard');
});

// ---------- Toggle availability ----------
router.post('/donor/toggle-availability', requireLogin, (req, res) => {
  const profile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.session.userId);
  if (!profile) return res.redirect('/donor/register');

  const newAvailability = profile.availability ? 0 : 1;
  db.prepare('UPDATE donor_profiles SET availability = ? WHERE user_id = ?')
    .run(newAvailability, req.session.userId);

  res.redirect('/dashboard');
});

// ---------- Browse all donors (directory / manual search) ----------
router.get('/donors', requireLogin, (req, res) => {
  const { blood_type, city_area } = req.query;

  let query = `
    SELECT dp.*, u.name, u.phone, u.email, u.city_area
    FROM donor_profiles dp
    JOIN users u ON u.id = dp.user_id
    WHERE 1=1
  `;
  const params = [];

  if (blood_type) {
    query += ' AND dp.blood_type = ?';
    params.push(blood_type);
  }
  if (city_area) {
    query += ' AND u.city_area LIKE ?';
    params.push(`%${city_area}%`);
  }

  query += ' ORDER BY dp.availability DESC, u.name ASC';

  const donors = db.prepare(query).all(...params).map(d => ({
    ...d,
    eligible: isEligibleByCooldown(d.last_donation_date),
    daysRemaining: daysUntilEligible(d.last_donation_date),
  }));

  res.render('donors', { donors, bloodTypes: ALL_BLOOD_TYPES, filters: { blood_type, city_area } });
});

module.exports = router;
