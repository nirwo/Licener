const express = require('express');
const serverless = require('serverless-http');
const app = express();

// Import your routes
const routes = require('../../routes');

// Use your routes
app.use('/', routes);

// Handle 404s
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Export the serverless function
module.exports.handler = serverless(app);
