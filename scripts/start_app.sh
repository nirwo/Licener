#!/bin/bash
# Script to start the Licener application

echo "Starting Licener application..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "No .env file found. Creating from .env.example..."
  if [ -f .env.example ]; then
    cp .env.example .env
    
    # Generate random strings for secrets
    SESSION_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
    JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
    
    # Replace placeholder secrets with random strings
    sed -i "s/change_this_to_a_long_random_string/$SESSION_SECRET/g" .env
    sed -i "s/change_this_to_a_different_long_random_string/$JWT_SECRET/g" .env
    
    # Set environment to production
    sed -i "s/NODE_ENV=development/NODE_ENV=production/g" .env
    
    echo "Environment file created."
  else
    echo "No .env.example file found. Cannot continue."
    exit 1
  fi
fi

# Create required directories if they don't exist
mkdir -p data/uploads data/exports
chmod 755 data/uploads data/exports

# Check if mongodb is running
if command -v systemctl &> /dev/null && systemctl is-active --quiet mongod; then
  echo "MongoDB service is running."
else
  # Check if MongoDB is running in Docker
  if command -v docker &> /dev/null && docker ps | grep -q mongodb; then
    echo "MongoDB is running in Docker."
  else
    echo "WARNING: MongoDB does not appear to be running."
    echo "Please start MongoDB before running the application."
    echo "You can use the install_mongodb.sh or install_docker_mongodb.sh scripts if needed."
    
    echo "Would you like to try to start MongoDB with Docker? (y/n)"
    read -r start_mongo
    
    if [[ "$start_mongo" == "y" ]]; then
      if command -v docker &> /dev/null; then
        echo "Starting MongoDB with Docker..."
        docker network create mongodb-network 2>/dev/null || true
        
        if docker ps -a | grep -q mongodb; then
          docker start mongodb
        else
          docker run -d --name mongodb \
            --network mongodb-network \
            -p 27017:27017 \
            -v mongodb-data:/data/db \
            --restart unless-stopped \
            mongo:6
        fi
        
        # Give MongoDB a moment to start up
        echo "Waiting for MongoDB to start..."
        sleep 5
      else
        echo "Docker is not installed. Cannot start MongoDB."
        echo "Please install MongoDB manually and try again."
        exit 1
      fi
    else
      echo "Continuing without verified MongoDB connection..."
    fi
  fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --production
fi

# Start the application
echo "Starting the application..."
NODE_ENV=production node app.js