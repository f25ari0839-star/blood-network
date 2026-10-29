// routes/requests.js
const express = require('express');
const db = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const {
  getCompatibleDonorTypes,
  isCompatible,
  isEligibleByCooldown,
  daysUntilEligible,
  ALL_BLOOD_TYPES,
} = require('../utils/bloodCompatibility');

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
  const { patient_name, blood_type_needed, units_needed, urgency, hospital_location, contact_phone } = req.body;

  if (!patient_name || !blood_type_needed || !units_needed || !urgency || !hospital_location || !contact_phone) {
    return res.render('request-new', { error: 'Please fill in all fields.', bloodTypes: ALL_BLOOD_TYPES, formData: req.body });
  }
  if (!ALL_BLOOD_TYPES.includes(blood_type_needed)) {
    return res.render('request-new', { error: 'Please select a valid blood type.', bloodTypes: ALL_BLOOD_TYPES, formData: req.body });
  }
  if (!['Critical', 'High', 'Medium'].includes(urgency)) {
    return res.render('request-new', { error: 'Please select a valid urgency level.', bloodTypes: ALL_BLOOD_TYPES, formData: req.body });
  }
  const unitsNum = parseInt(units_needed, 10);
  if (!Number.isInteger(unitsNum) || unitsNum < 1 || unitsNum > 20) {
    return res.render('request-new', { error: 'Units needed must be a whole number between 1 and 20.', bloodTypes: ALL_BLOOD_TYPES, formData: req.body });
  }

  db.prepare(`
    INSERT INTO requests (requester_id, patient_name, blood_type_needed, units_needed, urgency, hospital_location, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.session.userId, patient_name.trim(), blood_type_needed, unitsNum, urgency, hospital_location.trim(), contact_phone.trim());

  res.redirect('/requests');
});

// ---------- View all requests (with matching donor counts + response counts) ----------
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

  // The current user's own donor profile, if any. Used to decide whether to show
  // the "I Can Donate" button on each request card.
  const myDonorProfile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.session.userId);

  const enriched = requests.map(r => {
    const compatibleTypes = getCompatibleDonorTypes(r.blood_type_needed);
    const placeholders = compatibleTypes.map(() => '?').join(',');
    const donors = db.prepare(`
      SELECT dp.last_donation_date FROM donor_profiles dp
      WHERE dp.availability = 1 AND dp.blood_type IN (${placeholders})
    `).all(...compatibleTypes);

    const matchingCount = donors.filter(d => isEligibleByCooldown(d.last_donation_date)).length;

    const responseCount = db.prepare('SELECT COUNT(*) AS c FROM donor_responses WHERE request_id = ?').get(r.id).c;
    const alreadyResponded = !!db.prepare('SELECT 1 AS x FROM donor_responses WHERE request_id = ? AND donor_user_id = ?').get(r.id, req.session.userId);

    const isOwner = r.requester_id === req.session.userId;

    const canRespond = !isOwner
      && r.status === 'Pending'
      && !alreadyResponded
      && !!myDonorProfile
      && !!myDonorProfile.availability
      && isCompatible(myDonorProfile.blood_type, r.blood_type_needed)
      && isEligibleByCooldown(myDonorProfile.last_donation_date);

    return { ...r, matchingCount, responseCount, alreadyResponded, isOwner, canRespond };
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
  })).filter(d => d.eligible); // only donors who can actually donate right now

  res.render('request-matches', { request, matches });
});

// ---------- Donor actively offers to fulfil a request ("I Can Donate") ----------
router.post('/requests/:id/respond', requireLogin, (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).send('Request not found.');
  if (request.status !== 'Pending') {
    return res.status(400).send('This request is no longer pending.');
  }
  if (request.requester_id === req.session.userId) {
    return res.status(403).send("You can't respond to your own request.");
  }

  const donorProfile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.session.userId);
  if (!donorProfile) {
    return res.status(403).send('You need to register as a donor first. Go to "My Donor Profile".');
  }
  if (!donorProfile.availability) {
    return res.status(403).send('You need to mark yourself as available before offering to donate.');
  }
  if (!isCompatible(donorProfile.blood_type, request.blood_type_needed)) {
    return res.status(403).send('Your blood type is not compatible with this request.');
  }
  if (!isEligibleByCooldown(donorProfile.last_donation_date)) {
    return res.status(403).send("You're still within your 90-day donation cooldown period.");
  }

  try {
    db.prepare('INSERT INTO donor_responses (request_id, donor_user_id) VALUES (?, ?)').run(request.id, req.session.userId);
  } catch (err) {
    // UNIQUE constraint means they already responded; treat as a no-op.
  }

  res.redirect('/requests');
});

// ---------- Requester views the donors who offered to help ----------
router.get('/requests/:id/responses', requireLogin, (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).send('Request not found.');
  if (request.requester_id !== req.session.userId) {
    return res.status(403).send('Only the person who posted this request can view its responses.');
  }

  const responders = db.prepare(`
    SELECT u.name, u.phone, u.city_area, dp.blood_type, dr.responded_at
    FROM donor_responses dr
    JOIN users u ON u.id = dr.donor_user_id
    LEFT JOIN donor_profiles dp ON dp.user_id = u.id
    WHERE dr.request_id = ?
    ORDER BY dr.responded_at ASC
  `).all(request.id);

  res.render('request-responses', { request, responders });
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
