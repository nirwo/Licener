const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const dotenv = require('dotenv');
const { displayBanner } = require('./utils/banner');
const moment = require('moment'); // Add moment as a dependency for the helpers
const { connectDB, checkConnection } = require('./config/database'); // Import MongoDB connection
const exphbs = require('express-handlebars');

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB with improved error handling
connectDB()
  .then(result => {
    if (result) {
      // Use winston or a logger instead of console.log
      // logger.info('MongoDB connected successfully');
    } else {
      // Use winston or a logger instead of console.log
      // logger.info('Using file-based database fallback');
    }

    // Check and log connection status
    const status = checkConnection();
    // Use winston or a logger instead of console.log
    // logger.info(`Database connection status: ${status.stateDescription}`);
  })
  .catch(err => {
    // Use winston or a logger instead of console.error
    // logger.error('Database initialization error:', err);
    // logger.info('Falling back to file-based storage');
  });

// Display banner
displayBanner(false, 'LICENER');

// Configure Passport
require('./config/passport')(passport);

// Add a fallback inline definition of critical helpers just to be sure
const criticalHelpers = {
  startsWith: function (str, prefix) {
    if (typeof str !== 'string') {
      return false;
    }
    return str.startsWith(prefix);
  },
  eq: function (a, b) {
    return a === b;
  },
  formatDate: function (date, format) {
    if (!date) return '';
    const momentDate = moment(date);
    if (!momentDate.isValid()) {
      // Use winston or a logger instead of console.log
      // logger.error(`Invalid date encountered: ${date}`);
      return 'Invalid date';
    }
    return momentDate.format(format || 'YYYY-MM-DD');
  },
  subtract: function (a, b) {
    return a - b;
  },
  gte: function (a, b) {
    return a >= b;
  },
  // New helpers for subscription management
  daysFromNow: function (date) {
    if (!date) return 0;
    const now = moment();
    const futureDate = moment(date);
    return Math.max(0, futureDate.diff(now, 'days'));
  },
  isPast: function (date) {
    if (!date) return false;
    return moment(date).isBefore(moment());
  },
  daysRemainingClass: function (days) {
    if (days <= 7) return 'danger';
    if (days <= 30) return 'warning';
    return 'success';
  },
  subscriptionStatusClass: function (status) {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'danger';
      case 'renewed':
        return 'info';
      default:
        return 'secondary';
    }
  },
  // Backward compatibility
  licenseStatusClass: function (status) {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'danger';
      case 'renewed':
        return 'info';
      default:
        return 'secondary';
    }
  },
  percentage: function (numerator, denominator) {
    if (!denominator || denominator == 0) return 0;
    return Math.round((numerator / denominator) * 100);
  },
  percentageClass: function (percent) {
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warning';
    return 'success';
  },
  formatCurrency: function (amount, currency) {
    if (amount === undefined || amount === null) return '';
    try {
      const currencySymbol = currency === 'EUR' ? '€' : '$';
      return (
        currencySymbol +
        parseFloat(amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    } catch (e) {
      return amount;
    }
  },
  divide: function (a, b) {
    if (!b || b == 0) return 0;
    return a / b;
  },
  nl2br: function (text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  },
  contains: function (list, item) {
    if (!list || !Array.isArray(list)) return false;
    if (item === undefined || item === null) return false;

    return list.some(listItem => {
      if (!listItem) return false;

      // Handle string comparison for IDs
      if (typeof listItem === 'string' && typeof item === 'string') {
        return listItem === item;
      }

      // Handle ObjectId comparison or objects with toString
      try {
        if (
          listItem.toString &&
          typeof listItem.toString === 'function' &&
          item.toString &&
          typeof item.toString === 'function'
        ) {
          return listItem.toString() === item.toString();
        }
      } catch (err) {
        // Use winston or a logger instead of console.error
        // logger.error('Error comparing values in contains helper:', err);
        return false;
      }

      // Simple equality check as fallback
      return listItem === item;
    });
  },
  isArray: function (obj) {
    return Array.isArray(obj);
  },
};

// Import all custom helpers
const customHelpers = require('./helpers/handlebars');

// Set up Handlebars
const hbs = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    ...criticalHelpers,
    ...customHelpers,
  },
  extname: '.handlebars',
});

app.engine('.handlebars', hbs.engine);
app.set('view engine', '.handlebars');
app.set('views', path.join(__dirname, 'templates'));

// Body parser middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override middleware - enable both query and body parameter overrides
app.use(
  methodOverride(function (req, res) {
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
  })
);
app.use(methodOverride('_method')); // Also keep the default for redundancy

// Express session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'licensing-app-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash middleware
app.use(flash());

// Global variables
app.use((req, res, next) => {
  // Set flash messages
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');

  // Set user
  res.locals.user = req.user || null;

  // For debugging
  if (req.method === 'POST' && req.path.includes('login')) {
    // Use winston or a logger instead of console.log
    // logger.info('Login request received:', {
    //   email: req.body.email,
    //   passwordLength: req.body.password ? req.body.password.length : 0,
    // });
  }

  // Use winston or a logger instead of console.log
  // logger.info(`[${req.method}] ${req.path} - Auth: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'}`);

  next();
});

// Import static files middleware
const staticFiles = require('./middleware/static-files');

// Set static folder with proper MIME type handling
app.use('/static', staticFiles);

// Import the error handler middleware
const errorHandlerMiddleware = require('./middleware/error-handling');

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');
const systemRoutes = require('./routes/systems');
const reportRoutes = require('./routes/reports');
const apiRoutes = require('./routes/api');
const vendorRoutes = require('./routes/vendors');
const dashboardRoutes = require('./routes/dashboard');
const webResearcherRoutes = require('./routes/web-researcher');
const onboardingRouter = require('./routes/onboarding');
const licenseRoutes = require('./routes/licenses');

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

// License routes
app.use('/licenses', licenseRoutes);

// Use routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/systems', systemRoutes);
app.use('/reports', reportRoutes);
app.use('/api', apiRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/web-researcher', webResearcherRoutes);
app.use('/onboarding', onboardingRouter);
// Fix the vendors route if it exists
if (typeof vendorRoutes === 'function') {
  app.use('/vendors', vendorRoutes);
} else if (vendorRoutes) {
  // Use winston or a logger instead of console.warn
  // logger.warn('Warning: vendorRoutes is not a valid middleware function');
}

// Use the enhanced error handler middleware
app.use(errorHandlerMiddleware);

// Error handling middleware
app.use((err, req, res, next) => {
  // Use winston or a logger instead of console.error
  // logger.error('Server error:', err);

  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }

  try {
    res.status(500).render('error', {
      title: 'Server Error',
      error: err.message || 'An unknown error occurred',
    });
  } catch (renderError) {
    // Use winston or a logger instead of console.error
    // logger.error('Error rendering error page:', renderError);
    res.status(500).send('Internal Server Error. Please try again later.');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  // Use winston or a logger instead of console.log
  // logger.info(`Server started on port ${PORT}`);
  // logger.info(`Application URL: http://localhost:${PORT}`);
});
