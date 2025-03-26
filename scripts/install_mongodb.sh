#!/bin/bash
# Script to install MongoDB on Ubuntu/Debian systems

echo "Installing MongoDB..."

# Import the MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update the package list
sudo apt-get update

# Install MongoDB packages
sudo apt-get install -y mongodb-org

# Start and enable MongoDB service
sudo systemctl daemon-reload
sudo systemctl start mongod
sudo systemctl enable mongod

# Check if MongoDB is running
if sudo systemctl is-active --quiet mongod; then
  echo "MongoDB installed and running successfully!"
else
  echo "MongoDB installation completed, but service is not running. Please check logs with: sudo journalctl -u mongod"
fi

# Create data directory for the application
mkdir -p data/uploads data/exports
chmod 755 data/uploads data/exports

echo "MongoDB installation complete"