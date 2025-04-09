module.exports = {
  ensureAuthenticated: function(req, res, next) {
    try {
      // Check if authenticated
      if (req.isAuthenticated()) {
        // Additional check to ensure user object is valid
        if (!req.user) {
          console.error('ensureAuthenticated: user is authenticated but req.user is missing');
          req.logout(function(err) {
            if (err) console.error('Error logging out invalid session:', err);
            req.flash('error_msg', 'Session error. Please log in again.');
            return res.redirect('/users/login');
          });
          return;
        }
        
        // Ensure user has both id and _id properties
        if (!req.user.id && req.user._id) {
          console.log('Adding missing id property to user object');
          req.user.id = req.user._id.toString();
        }
        
        if (!req.user._id && req.user.id) {
          console.log('Adding missing _id property to user object');
          req.user._id = req.user.id;
        }
        
        return next();
      }
      
      req.flash('error_msg', 'Please log in to view this resource');
      res.redirect('/users/login');
    } catch (err) {
      console.error('Error in ensureAuthenticated middleware:', err);
      req.flash('error_msg', 'An error occurred. Please log in again.');
      res.redirect('/users/login');
    }
  },
  
  ensureAdmin: function(req, res, next) {
    try {
      if (req.isAuthenticated()) {
        // Check if user exists
        if (!req.user) {
          console.error('ensureAdmin: user is authenticated but req.user is missing');
          req.flash('error_msg', 'Session error. Please log in again.');
          return res.redirect('/users/login');
        }
        
        // Check if user is admin
        if (req.user.role === 'admin') {
          return next();
        }
        
        console.log(`User ${req.user.name || req.user.email} (role: ${req.user.role}) attempted to access admin resource`);
        req.flash('error_msg', 'You do not have permission to access this resource');
        return res.redirect('/dashboard');
      }
      
      req.flash('error_msg', 'Please log in to view this resource');
      res.redirect('/users/login');
    } catch (err) {
      console.error('Error in ensureAdmin middleware:', err);
      req.flash('error_msg', 'An error occurred. Please try again.');
      res.redirect('/dashboard');
    }
  },
  
  ensureManager: function(req, res, next) {
    try {
      if (req.isAuthenticated()) {
        // Check if user exists
        if (!req.user) {
          console.error('ensureManager: user is authenticated but req.user is missing');
          req.flash('error_msg', 'Session error. Please log in again.');
          return res.redirect('/users/login');
        }
        
        // Check if user is admin or manager
        if (req.user.role === 'admin' || req.user.role === 'manager') {
          return next();
        }
        
        console.log(`User ${req.user.name || req.user.email} (role: ${req.user.role}) attempted to access manager resource`);
        req.flash('error_msg', 'You do not have permission to access this resource');
        return res.redirect('/dashboard');
      }
      
      req.flash('error_msg', 'Please log in to view this resource');
      res.redirect('/users/login');
    } catch (err) {
      console.error('Error in ensureManager middleware:', err);
      req.flash('error_msg', 'An error occurred. Please try again.');
      res.redirect('/dashboard');
    }
  },
  
  forwardAuthenticated: function(req, res, next) {
    try {
      if (!req.isAuthenticated()) {
        return next();
      }
      
      // Add a validation to ensure req.user exists
      if (!req.user) {
        console.error('forwardAuthenticated: user is authenticated but req.user is missing');
        req.logout(function(err) {
          if (err) console.error('Error logging out invalid session:', err);
          // Try the route again after logout
          return next();
        });
        return;
      }
      
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Error in forwardAuthenticated middleware:', err);
      // In case of error, better to attempt login again
      next();
    }
  }
};