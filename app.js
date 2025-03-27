const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// DB Config
const db = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/licener';

// Connect to MongoDB with retry logic and improved error handling
const connectWithRetry = () => {
  console.log('MongoDB connection attempt...');
  mongoose.connect(db, {
    serverSelectionTimeoutMS: 5000, // 5 seconds timeout on server selection
    connectTimeoutMS: 10000,       // 10 seconds timeout on connection
  })
    .then(() => {
      console.log('MongoDB Connected');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

// For development/testing purposes - allow app to start even if MongoDB is not available
const startWithoutMongo = process.env.START_WITHOUT_MONGO === 'true';

if (startWithoutMongo) {
  console.warn('WARNING: Starting application without MongoDB connection (START_WITHOUT_MONGO=true)');
} else {
  connectWithRetry();
}

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

// Method override middleware
app.use(methodOverride('_method'));

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

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));