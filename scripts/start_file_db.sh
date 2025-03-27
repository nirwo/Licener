#!/bin/bash

# Start the application with file-based database

# Ensure the data directory exists
mkdir -p ./data

# Create data files if they don't exist
if [ ! -f "./data/licenses.json" ]; then
  echo '{"data": []}' > ./data/licenses.json
  echo "Created licenses.json file"
fi

if [ ! -f "./data/systems.json" ]; then
  echo '{"data": []}' > ./data/systems.json
  echo "Created systems.json file"
fi

if [ ! -f "./data/users.json" ]; then
  echo '{"data": []}' > ./data/users.json
  echo "Created users.json file"
fi

# Create export and upload directories
mkdir -p ./data/exports
mkdir -p ./data/uploads

# Start the application
echo "Starting Licener with file-based database..."
node app.js