# Subscription Loading Issue Fix

If you're experiencing issues with loading subscriptions in the Licener application, follow these steps to resolve the problem:

## Quick Fix

1. Run the provided fix script to automatically resolve the issue:

```
node fix-subscription-final.js
```

2. Restart your application after the fix is applied.

## Manual Fix Steps

If the automatic fix doesn't resolve your issue, follow these manual steps:

### 1. Fix Database Structure

Ensure that the `data/db.json` file exists with the proper structure:

```json
{
  "subscriptions": [
    {
      "_id": "demo1",
      "name": "Demo Subscription",
      "product": "Demo Product",
      "vendor": "Demo Vendor",
      "type": "Subscription",
      "seats": 10,
      "cost": 999.99,
      "renewalDate": "2025-04-13T00:00:00.000Z",
      "purchaseDate": "2024-04-13T00:00:00.000Z",
      "notes": "This is a demo subscription.",
      "user": "demo-user",
      "status": "active",
      "createdAt": "2024-04-13T00:00:00.000Z",
      "updatedAt": "2024-04-13T00:00:00.000Z"
    }
  ],
  "users": [],
  "systems": [],
  "vendors": []
}
```

### 2. Fix Circular Dependencies

The issue is caused by circular dependencies between `models/Subscription.js` and `utils/file-db.js`. To fix this:

1. Replace the `models/Subscription.js` file with the fixed version provided in `models/subscription-fixed.js`:

```
cp models/subscription-fixed.js models/Subscription.js
```

2. If you're still having issues, edit `utils/file-db.js` to remove direct requires to Subscription.js:

Find this line:
```javascript
SubscriptionModel = require('../models/Subscription');
```

Replace with:
```javascript
// Dynamically load SubscriptionModel when needed to avoid circular dependencies
function getSubscriptionModel() {
  try {
    return mongoose.model('Subscription');
  } catch (e) {
    // If not already defined, load it
    try {
      return require('../models/Subscription');
    } catch (err) {
      console.error('Error loading Subscription model:', err);
      return null;
    }
  }
}
```

## Troubleshooting

If you're still experiencing issues:

1. Check the application logs for specific error messages
2. Ensure the `data` directory exists with write permissions
3. Verify that `db.json` contains the required collections
4. Try running the application with debug logging enabled:

```
DEBUG=licener:* npm start
```

5. If all else fails, you can reset the data and start fresh:

```javascript
// Create a new db.json with proper structure
const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'data', 'db.json');
const dataDir = path.join(__dirname, 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create fresh db.json with demo data
const data = {
  subscriptions: [{
    _id: 'demo1',
    name: 'Demo Subscription',
    product: 'Demo Product',
    vendor: 'Demo Vendor',
    type: 'Subscription',
    seats: 10,
    cost: 999.99,
    renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    purchaseDate: new Date().toISOString(),
    notes: 'This is a demo subscription.',
    user: 'demo-user',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }],
  users: [],
  systems: [],
  vendors: []
};

fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
console.log('Created fresh db.json with demo subscription');
```

Save this as `reset-data.js` and run it with `node reset-data.js`.

## Need Further Help?

If you continue to experience issues, please submit a bug report with your specific error messages and application logs. 