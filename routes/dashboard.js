const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const System = require('../models/System');

// Dashboard route - main view after login
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    console.log(`Loading dashboard for user: ${req.user.name || req.user.email}`);

    // Get user's subscriptions
    const subscriptions = await Subscription.find({ user: req.user._id })
      .sort({ created: -1 })
      .limit(5);
    console.log(`Found ${subscriptions.length} subscriptions for dashboard`);

    // If user has no subscriptions, create a demo subscription
    if (subscriptions.length === 0) {
      console.log('No subscriptions found, creating a demo subscription for the user');
      try {
        await Subscription.createDemo(req.user._id);
        console.log('Demo subscription created successfully');
      } catch (err) {
        console.error('Error creating demo subscription:', err);
      }
    }

    // Get latest subscriptions (including potentially created demo)
    const recentSubscriptions = await Subscription.find({ user: req.user._id })
      .sort({ created: -1 })
      .limit(5);

    // Get user's systems
    const systems = await System.find({ user: req.user._id });

    // Calculate statistics
    const stats = {
      totalLicenses: await Subscription.countDocuments({ user: req.user._id }),
      expiringSoon: await Subscription.countDocuments({
        user: req.user._id,
        renewalDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      }),
      activeSystems: systems.length,
      annualSpend: calculateAnnualSpend(subscriptions),
    };

    // Mock activity data - replace with real data in production
    const recentActivity = [
      {
        date: new Date(),
        user: req.user.name,
        action: 'Logged in',
        details: 'User logged in successfully',
        icon: 'fa-sign-in-alt',
      },
      {
        date: new Date(Date.now() - 1 * 60 * 60 * 1000),
        user: req.user.name,
        action: 'Viewed subscription',
        details: 'Accessed subscription details',
        icon: 'fa-eye',
      },
      {
        date: new Date(Date.now() - 3 * 60 * 60 * 1000),
        user: req.user.name,
        action: 'Added system',
        details: 'Created new system',
        icon: 'fa-server',
      },
    ];

    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      stats,
      recentLicenses: recentSubscriptions,
      recentActivity,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.flash('error_msg', 'Error loading dashboard');
    res.render('dashboard', {
      title: 'Dashboard',
      error: 'Failed to load dashboard data',
    });
  }
});

// Helper function to calculate annual spend
function calculateAnnualSpend(subscriptions) {
  return subscriptions
    .reduce((total, sub) => {
      return total + (sub.cost || 0);
    }, 0)
    .toFixed(2);
}

module.exports = router;
