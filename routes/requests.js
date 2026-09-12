// routes/requests.js
const express = require('express');
const db = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { getCompatibleDonorTypes, isEligibleByCooldown, daysUntilEligible, ALL_BLOOD_TYPES } = require('../utils/bloodCompatibility');

const router = express.Router();

const EXPIRY_DAYS = 7; // A pending request auto-expires after this many days with no action.

// Auto-expire stale pending requests. Called at the top of any route that reads requests,
// so the status shown is always accurate without needing a background cron job.
function expireStaleRequests() {
  db.prepare(`
    UPDATE requests
    SET status = 'Expired'
    WHERE status = 'Pending'
      AND julianday('now') - julianday(created_at) > ?
  `).run(EXPIRY_DAYS);
}

// ---------- Post a new request ----------
router.get('/requests/new', requireLogin, (req, res) => {
  res.render('request-new', { error: null, bloodTypes: ALL_BLOOD_TYPES, formData: {} });
});

router.post('/requests/new', requireLogin, (req, res) => {
  const { patient_name, blood_type_needed, urgency, hospital_location, contact_phone } = req.body;

  if (!patient_name || !blood_type_needed || !urgency || !hospital_location || !contact_phone) {
    return res.render('request-new', { error: 'Please fill in all fields.', bloodTypes: ALL_BLOOD_TYPES, formData: req.body });
  }
  if (!ALL_BLOOD_TYPES.includes(blood_type_needed)) {
    return res.render('request-new', { error: 'Please select a valid blood type.', bloodTypes: ALL_BLOOD_TYPES, formData: req.body });
  }
  if (!['Critical', 'High', 'Medium'].includes(urgency)) {
    return res.render('request-new', { error: 'Please select a valid urgency level.', bloodTypes: ALL_BLOOD_TYPES, formData: req.body });
  }

  db.prepare(`
    INSERT INTO requests (requester_id, patient_name, blood_type_needed, urgency, hospital_location, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.session.userId, patient_name.trim(), blood_type_needed, urgency, hospital_location.trim(), contact_phone.trim());

  res.redirect('/requests');
});

// ---------- View all requests (with matching donor counts) ----------
router.get('/requests', requireLogin, (req, res) => {
  expireStaleRequests();

  const { blood_type, status } = req.query;

  let query = `
    SELECT r.*, u.name AS requester_name
    FROM requests r
    JOIN users u ON u.id = r.requester_id
    WHERE 1=1
  `;
  const params = [];

  if (blood_type) {
    query += ' AND r.blood_type_needed = ?';
    params.push(blood_type);
  }
  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  query += " ORDER BY CASE r.urgency WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 ELSE 2 END, r.created_at DESC";

  const requests = db.prepare(query).all(...params);

  // For each request, count how many available + eligible + compatible donors exist right now.
  const enriched = requests.map(r => {
    const compatibleTypes = getCompatibleDonorTypes(r.blood_type_needed);
    const placeholders = compatibleTypes.map(() => '?').join(',');
    const donors = db.prepare(`
      SELECT dp.last_donation_date FROM donor_profiles dp
      WHERE dp.availability = 1 AND dp.blood_type IN (${placeholders})
    `).all(...compatibleTypes);

    const matchingCount = donors.filter(d => isEligibleByCooldown(d.last_donation_date)).length;

    return { ...r, matchingCount, isOwner: r.requester_id === req.session.userId };
  });

  res.render('requests', { requests: enriched, bloodTypes: ALL_BLOOD_TYPES, filters: { blood_type, status } });
});

// ---------- View matching donors for one specific request ----------
router.get('/requests/:id/matches', requireLogin, (req, res) => {
  expireStaleRequests();

  const request = db.prepare(`
    SELECT r.*, u.name AS requester_name FROM requests r
    JOIN users u ON u.id = r.requester_id WHERE r.id = ?
  `).get(req.params.id);

  if (!request) return res.status(404).send('Request not found.');

  const compatibleTypes = getCompatibleDonorTypes(request.blood_type_needed);
  const placeholders = compatibleTypes.map(() => '?').join(',');

  const candidates = db.prepare(`
    SELECT dp.*, u.name, u.phone, u.city_area
    FROM donor_profiles dp
    JOIN users u ON u.id = dp.user_id
    WHERE dp.availability = 1 AND dp.blood_type IN (${placeholders})
    ORDER BY
      CASE WHEN u.city_area = ? THEN 0 ELSE 1 END,
      dp.blood_type ASC
  `).all(...compatibleTypes, request.hospital_location);

  const matches = candidates.map(d => ({
    ...d,
    eligible: isEligibleByCooldown(d.last_donation_date),
    daysRemaining: daysUntilEligible(d.last_donation_date),
    sameArea: d.city_area === request.hospital_location,
  })).filter(d => d.eligible); // only show donors who are actually eligible to donate right now

  res.render('request-matches', { request, matches });
});

// ---------- Mark a request Fulfilled ----------
router.post('/requests/:id/fulfill', requireLogin, (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).send('Request not found.');
  if (request.requester_id !== req.session.userId) {
    return res.status(403).send('Only the person who posted this request can mark it fulfilled.');
  }

  db.prepare(`
    UPDATE requests SET status = 'Fulfilled', fulfilled_at = datetime('now') WHERE id = ?
  `).run(req.params.id);

  res.redirect('/requests');
});

module.exports = router;
