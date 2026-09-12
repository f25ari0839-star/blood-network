// server.js
// Entry point. Wires up middleware, view engine, routes, and starts the server.

const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/db');
const { attachUserToViews, requireLogin } = require('./middleware/auth');
const { isEligibleByCooldown } = require('./utils/bloodCompatibility');

const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donors');
const requestRoutes = require('./routes/requests');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- View engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- Middleware ----------
app.use(express.urlencoded({ extended: true })); // parse HTML form submissions
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'blood-network-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 hour session
}));

app.use(attachUserToViews);

// ---------- Routes ----------
app.use(authRoutes);
app.use(donorRoutes);
app.use(requestRoutes);

app.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/dashboard' : '/login');
});

app.get('/dashboard', requireLogin, (req, res) => {
  const donorProfile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.session.userId);

  const stats = {
    totalDonors: db.prepare('SELECT COUNT(*) AS c FROM donor_profiles').get().c,
    availableDonors: db.prepare('SELECT COUNT(*) AS c FROM donor_profiles WHERE availability = 1').get().c,
    pendingRequests: db.prepare("SELECT COUNT(*) AS c FROM requests WHERE status = 'Pending'").get().c,
    criticalRequests: db.prepare("SELECT COUNT(*) AS c FROM requests WHERE status = 'Pending' AND urgency = 'Critical'").get().c,
  };

  const myRequests = db.prepare('SELECT * FROM requests WHERE requester_id = ? ORDER BY created_at DESC LIMIT 5')
    .all(req.session.userId);

  const isEligible = donorProfile ? isEligibleByCooldown(donorProfile.last_donation_date) : null;

  res.render('dashboard', { donorProfile, stats, myRequests, isEligible });
});

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`\n🩸 Blood Donor & Emergency Request Network running at http://localhost:${PORT}\n`);
});
