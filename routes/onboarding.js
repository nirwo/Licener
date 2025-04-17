// Add onboarding route/controller (Express example, adjust as needed for your stack)
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const System = require('../models/System');
const Subscription = require('../models/Subscription');

// Step 1: Profile Setup
router.get('/', ensureAuthenticated, (req, res) => {
  res.render('onboarding/wizard', { step: 1, user: req.user });
});

router.post('/profile', ensureAuthenticated, async (req, res) => {
  const { name, company } = req.body;
  await User.findByIdAndUpdate(req.user._id, { name, company });
  res.redirect('/onboarding/system');
});

// Step 2: Add System
router.get('/system', ensureAuthenticated, (req, res) => {
  res.render('onboarding/wizard', { step: 2 });
});

router.post('/system', ensureAuthenticated, async (req, res) => {
  const { systemName, systemType } = req.body;
  await System.create({ name: systemName, systemType, user: req.user._id });
  res.redirect('/onboarding/subscription');
});

// Step 3: Add Subscription
router.get('/subscription', ensureAuthenticated, (req, res) => {
  res.render('onboarding/wizard', { step: 3 });
});

router.post('/subscription', ensureAuthenticated, async (req, res) => {
  const { product, vendor, cost, renewalDate } = req.body;
  await Subscription.create({ product, vendor, cost, renewalDate, user: req.user._id });
  res.redirect('/onboarding/summary');
});

// Step 4: Summary
router.get('/summary', ensureAuthenticated, async (req, res) => {
  const user = req.user;
  const systems = await System.find({ user: user._id });
  const subscriptions = await Subscription.find({ user: user._id });
  res.render('onboarding/wizard', { step: 4, user, systems, subscriptions });
});

module.exports = router;
