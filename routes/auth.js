// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const router = express.Router();

// ---------- Signup ----------
router.get('/signup', (req, res) => {
  res.render('signup', { error: null, formData: {} });
});

router.post('/signup', async (req, res) => {
  const { name, email, phone, city_area, password, confirm_password } = req.body;

  // --- Basic input validation ---
  if (!name || !email || !phone || !city_area || !password) {
    return res.render('signup', { error: 'Please fill in all fields.', formData: req.body });
  }
  if (password.length < 6) {
    return res.render('signup', { error: 'Password must be at least 6 characters.', formData: req.body });
  }
  if (password !== confirm_password) {
    return res.render('signup', { error: 'Passwords do not match.', formData: req.body });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.render('signup', { error: 'Please enter a valid email address.', formData: req.body });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.render('signup', { error: 'An account with this email already exists.', formData: req.body });
  }

  try {
    // Never store plain-text passwords — bcrypt with a salt round of 10 is a solid default.
    const passwordHash = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, city_area)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), email.toLowerCase().trim(), phone.trim(), passwordHash, city_area.trim());

    req.session.userId = result.lastInsertRowid;
    req.session.userName = name.trim();
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Signup error:', err);
    res.render('signup', { error: 'Something went wrong. Please try again.', formData: req.body });
  }
});

// ---------- Login ----------
router.get('/login', (req, res) => {
  res.render('login', { error: null, formData: {} });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { error: 'Please enter both email and password.', formData: req.body });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.render('login', { error: 'Invalid email or password.', formData: req.body });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.render('login', { error: 'Invalid email or password.', formData: req.body });
  }

  req.session.userId = user.id;
  req.session.userName = user.name;
  res.redirect('/dashboard');
});

// ---------- Logout ----------
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
