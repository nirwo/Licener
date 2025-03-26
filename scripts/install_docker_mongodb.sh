#!/bin/bash
# Script to install MongoDB using Docker

echo "Setting up MongoDB using Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed. Would you like to install it? (y/n)"
  read -r install_docker
  
  if [[ "$install_docker" == "y" ]]; then
    echo "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Add user to docker group to avoid sudo requirement
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes to take effect."
  else
    echo "Docker installation aborted. Cannot continue without Docker."
    exit 1
  fi
fi

# Create a docker network for MongoDB
docker network create mongodb-network 2>/dev/null || true

# Check if MongoDB container is already running
if docker ps | grep -q "mongodb"; then
  echo "MongoDB container is already running."
else
  # Check if container exists but is stopped
  if docker ps -a | grep -q "mongodb"; then
    echo "MongoDB container exists but is not running. Starting it..."
    docker start mongodb
  else
    # Create and run MongoDB container
    echo "Creating and starting MongoDB container..."
    docker run -d --name mongodb \
      --network mongodb-network \
      -p 27017:27017 \
      -v mongodb-data:/data/db \
      --restart unless-stopped \
      mongo:6
  fi
fi

# Update .env file with Docker MongoDB URI
if [[ -f .env ]]; then
  sed -i "s#MONGO_URI=.*#MONGO_URI=mongodb://localhost:27017/licener#g" .env
  echo "Updated .env file with MongoDB connection string."
fi

# Create data directory for the application
mkdir -p data/uploads data/exports
chmod 755 data/uploads data/exports

echo "MongoDB setup with Docker completed!"