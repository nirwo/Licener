#!/bin/bash

# Make sure MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "MongoDB is not running. Starting MongoDB..."
    mongod --fork --logpath /tmp/mongodb.log --dbpath /tmp/mongodata
fi

# Install test dependencies if they don't exist
echo "Checking for test dependencies..."
if ! npm list -g chai > /dev/null; then
    echo "Installing chai..."
    npm install -g chai chai-http
fi

if ! npm list -g mongodb-memory-server > /dev/null; then
    echo "Installing mongodb-memory-server..."
    npm install -g mongodb-memory-server
fi

# Run tests
echo "Running model tests..."
npm test -- -g "License Model"
npm test -- -g "System Model"

echo "Running route tests..."
npm test -- -g "License Routes"

echo "Running integration tests..."
npm test -- -g "Licener Integration Tests"

echo "All tests completed!"