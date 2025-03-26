#!/bin/bash
# Script to initialize the MongoDB database with sample data

echo "Initializing MongoDB database for Licener application..."

# Check if MongoDB is running
if command -v mongod &> /dev/null && systemctl is-active --quiet mongod; then
  echo "MongoDB is running via system service..."
  # Use mongosh if available, fallback to mongo
  if command -v mongosh &> /dev/null; then
    echo "Importing sample data using mongosh..."
    mongosh "mongodb://localhost:27017/licener" scripts/init_db.js
  else
    echo "Importing sample data using mongo..."
    mongo "mongodb://localhost:27017/licener" scripts/init_db.js
  fi
else
  # Check if MongoDB is running in Docker
  if command -v docker &> /dev/null && docker ps | grep -q mongodb; then
    echo "MongoDB is running in Docker..."
    
    # Copy the initialization script to the container
    docker cp scripts/init_db.js mongodb:/tmp/init_db.js
    
    # Execute the script inside the container
    docker exec mongodb mongosh "mongodb://localhost:27017/licener" /tmp/init_db.js
  else
    echo "Error: MongoDB is not running. Please start MongoDB before running this script."
    echo "You can use the install_mongodb.sh or install_docker_mongodb.sh scripts to set up MongoDB."
    exit 1
  fi
fi

echo "Database initialization complete!"
echo "You can now log in with the following credentials:"
echo "Admin User: admin@example.com / password123"
echo "Regular User: user@example.com / password123"