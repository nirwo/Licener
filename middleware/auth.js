/**
 * Authentication Middleware
 */

// Ensure the user is authenticated
module.exports.ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  req.flash('error_msg', 'Please log in to view this resource');
  res.redirect('/auth/login');
};

// Ensure the user is not authenticated (for login/register pages)
module.exports.ensureGuest = function (req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }

  res.redirect('/dashboard');
};

// Ensure the user is an admin
module.exports.ensureAdmin = function (req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }

  req.flash('error_msg', 'Access denied. Admin privileges required.');
  res.redirect('/dashboard');
};

// Ensure the user is a manager or admin
module.exports.ensureManager = function (req, res, next) {
  if (req.isAuthenticated() && (req.user.role === 'manager' || req.user.role === 'admin')) {
    return next();
  }

  req.flash('error_msg', 'Access denied. Manager privileges required.');
  res.redirect('/dashboard');
};

module.exports.forwardAuthenticated = function (req, res, next) {
  try {
    if (!req.isAuthenticated()) {
      return next();
    }

    // Add a validation to ensure req.user exists
    if (!req.user) {
      console.error('Auth: forwardAuthenticated: user is authenticated but req.user is missing');
      req.logout(function (err) {
        if (err) console.error('Auth: Error logging out invalid session:', err);
        // Try the route again after logout
        return next();
      });
      return;
    }

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Auth: Error in forwardAuthenticated middleware:', err);
    // In case of error, better to attempt login again
    next();
  }
};
