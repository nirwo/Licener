/**
 * Global error handler middleware to catch toString and other common errors
 */
const errorHandlerMiddleware = (err, req, res, next) => {
  console.error('Server error:', err);

  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Check for common "toString" errors
  if (
    err.message &&
    err.message.includes('Cannot read properties of undefined (reading \'toString\')')
  ) {
    console.log('toString error detected - this usually means an undefined ID is being processed');
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    console.log('User logged in:', !!req.user);

    // For toString errors specifically related to authentication, redirect to login
    if (
      req.path !== '/auth/login' &&
      req.path !== '/auth/register' &&
      !req.path.startsWith('/static/')
    ) {
      req.flash('error_msg', 'Your session has expired. Please log in again.');
      return res.redirect('/auth/login');
    }
  }

  // Render error page
  try {
    res.status(500).render('error', {
      title: 'Server Error',
      error: err.message || 'An unknown error occurred',
      stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    });
  } catch (renderError) {
    console.error('Error rendering error page:', renderError);
    res.status(500).send('Internal Server Error. Please try again later.');
  }
};

module.exports = errorHandlerMiddleware;
