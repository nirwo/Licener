#!/bin/bash

# Make sure MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "MongoDB is not running. Starting MongoDB..."
    mongod --fork --logpath /tmp/mongodb.log --dbpath /tmp/mongodata
fi

# Install test dependencies if needed
npm install chai mocha

# Run only the delete test
echo "Running license deletion test..."
npx mocha test/delete-license.test.js

echo "Test completed!"