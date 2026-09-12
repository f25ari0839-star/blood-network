// middleware/auth.js
// Simple session-based auth guard. If there's no logged-in user in the session,
// redirect to the login page instead of letting the request through.

function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Makes the current user available to every EJS view as `currentUser`,
// so templates can show "Logged in as X" / conditional nav links without
// every single route having to pass it manually.
function attachUserToViews(req, res, next) {
  res.locals.currentUser = req.session && req.session.userId
    ? { id: req.session.userId, name: req.session.userName }
    : null;
  next();
}

module.exports = { requireLogin, attachUserToViews };
