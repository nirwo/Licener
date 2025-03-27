const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const dotenv = require('dotenv');
const { displayBanner } = require('./utils/banner');

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

// Handlebars Middleware
app.engine('handlebars', engine({
  defaultLayout: 'main',
  helpers: require('./utils/handlebars-helpers')
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
    user: req.user ? `User ID: ${req.user.id}` : 'Not logged in',
    session: req.session ? 'Session exists' : 'No session'
  });
  
  next();
});

// Set static folder
app.use(express.static(path.join(__dirname, 'static')));

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/licenses', require('./routes/licenses'));
app.use('/systems', require('./routes/systems'));
app.use('/reports', require('./routes/reports'));
app.use('/api', require('./routes/api'));

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