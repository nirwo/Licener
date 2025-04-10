const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const dotenv = require('dotenv');
const { displayBanner } = require('./utils/banner');
const moment = require('moment'); // Add moment as a dependency for the helpers

// Load environment variables
dotenv.config();

const app = express();

// Initialize file-based database
const { License, System, User } = require('./utils/file-db');
console.log('File-based database initialized');

// Display file database banner
displayBanner(false, 'FILE-DB');

// For backwards compatibility with any code expecting mongoose
const mongoose = {
  connect: () => console.log('Using file-based database, MongoDB not required'),
  disconnect: () => console.log('Disconnecting from file-based database'),
  connection: {
    on: () => {},
    once: () => {}
  }
};

// Configure Passport
require('./config/passport')(passport);

// Get the handlebars helpers
const handlebarsHelpers = require('./utils/handlebars-helpers');

// Add a fallback inline definition of critical helpers just to be sure
const criticalHelpers = {
  startsWith: function(str, prefix) {
    if (typeof str !== 'string') {
      return false;
    }
    return str.startsWith(prefix);
  },
  eq: function(a, b) {
    return a === b;
  },
  formatDate: function(date, format) {
    if (!date) return '';
    return moment(date).format(format);
  },
  subtract: function(a, b) {
    return a - b;
  },
  gte: function(a, b) {
    return a >= b;
  },
  // New helpers for license management
  daysFromNow: function(date) {
    if (!date) return 0;
    const now = moment();
    const futureDate = moment(date);
    return Math.max(0, futureDate.diff(now, 'days'));
  },
  isPast: function(date) {
    if (!date) return false;
    return moment(date).isBefore(moment());
  },
  daysRemainingClass: function(days) {
    if (days <= 7) return 'danger';
    if (days <= 30) return 'warning';
    return 'success';
  },
  licenseStatusClass: function(status) {
    if (!status) return 'secondary';
    switch(status.toLowerCase()) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'expired': return 'danger';
      case 'renewed': return 'info';
      default: return 'secondary';
    }
  },
  percentage: function(numerator, denominator) {
    if (!denominator || denominator == 0) return 0;
    return Math.round((numerator / denominator) * 100);
  },
  percentageClass: function(percent) {
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warning';
    return 'success';
  },
  formatCurrency: function(amount, currency) {
    if (amount === undefined || amount === null) return '';
    try {
      const currencySymbol = currency === 'EUR' ? '€' : '$';
      return currencySymbol + parseFloat(amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch(e) {
      return amount;
    }
  },
  divide: function(a, b) {
    if (!b || b == 0) return 0;
    return a / b;
  },
  nl2br: function(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  },
  contains: function(list, item) {
    if (!list || !Array.isArray(list)) return false;
    return list.some(listItem => {
      if (listItem && item && typeof listItem.toString === 'function' && typeof item.toString === 'function') {
        return listItem.toString() === item.toString();
      }
      return listItem === item;
    });
  },
  isArray: function(obj) {
    return Array.isArray(obj);
  }
};

// Handlebars Middleware
app.engine('handlebars', engine({
  defaultLayout: 'main',
  helpers: { ...handlebarsHelpers, ...criticalHelpers }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'templates'));

// Body parser middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override middleware - enable both query and body parameter overrides
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    const method = req.body._method;
    delete req.body._method;
    return method;
  }
  
  // Check query param too (for ?_method=DELETE style)
  if (req.query && '_method' in req.query) {
    return req.query._method;
  }
}));
app.use(methodOverride('_method')); // Also keep the default for redundancy

// Express session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: true,
  saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash middleware
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  
  // For debugging
  console.log('Session data:', {
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : 'function not available',
    user: req.user ? `User ID: ${req.user._id}` : 'Not logged in',
    session: req.session ? 'Session exists' : 'No session'
  });
  
  next();
});

// Set static folder
app.use(express.static(path.join(__dirname, 'static')));

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const licenseRoutes = require('./routes/licenses');
const systemRoutes = require('./routes/systems');
const reportRoutes = require('./routes/reports');
const apiRoutes = require('./routes/api');
const vendorRoutes = require('./routes/vendors'); // If you added this line

// Add redirects for common auth paths
app.get('/users/login', (req, res) => {
  res.redirect('/auth/login');
});

app.get('/users/register', (req, res) => {
  res.redirect('/auth/register');
});

app.get('/users/logout', (req, res) => {
  res.redirect('/auth/logout');
});

// Use routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/licenses', licenseRoutes);
app.use('/systems', systemRoutes);
app.use('/reports', reportRoutes);
app.use('/api', apiRoutes);
// Fix the vendors route if it exists
if (typeof vendorRoutes === 'function') {
  app.use('/vendors', vendorRoutes);
} else if (vendorRoutes) {
  console.warn('Warning: vendorRoutes is not a valid middleware function');
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  try {
    res.status(500).render('error', {
      title: 'Server Error',
      error: err.message || 'An unknown error occurred'
    });
  } catch (renderError) {
    console.error('Error rendering error page:', renderError);
    res.status(500).send('Internal Server Error. Please try again later.');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Application URL: http://localhost:${PORT}`);
});