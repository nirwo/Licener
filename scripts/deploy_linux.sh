#!/bin/bash
# Licener - Linux Deployment Script

echo "===== Licener Deployment Script for Linux ====="
echo "This script will help you deploy the Licener application."

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to install MongoDB if not present
install_mongodb() {
  echo "MongoDB is not installed. Would you like to install it? (y/n)"
  read -r install_mongo
  
  if [[ "$install_mongo" != "y" ]]; then
    echo "MongoDB installation skipped. You need to configure a MongoDB connection manually."
    return 1
  fi
  
  echo "Installing MongoDB..."
  
  # Add MongoDB repository
  if command_exists apt-get; then
    # Debian/Ubuntu
    apt-get update
    apt-get install -y gnupg curl
    curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    apt-get update
    apt-get install -y mongodb-org
    systemctl enable mongod
    systemctl start mongod
  elif command_exists yum; then
    # RHEL/CentOS/Fedora
    cat > /etc/yum.repos.d/mongodb-org-6.0.repo << EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF
    yum install -y mongodb-org
    systemctl enable mongod
    systemctl start mongod
  else
    echo "Unsupported package manager. Please install MongoDB manually following the instructions at: https://docs.mongodb.com/manual/administration/install-on-linux/"
    return 1
  fi
  
  echo "MongoDB installed successfully!"
  return 0
}

# Function to use Docker for MongoDB if installation fails
use_docker_mongodb() {
  echo "Would you like to use Docker for MongoDB instead? (y/n)"
  read -r use_docker
  
  if [[ "$use_docker" != "y" ]]; then
    echo "Docker MongoDB setup skipped. You need to configure a MongoDB connection manually."
    return 1
  fi
  
  # Check if Docker is installed
  if ! command_exists docker; then
    echo "Docker is not installed. Installing Docker..."
    
    if command_exists apt-get; then
      # Debian/Ubuntu
      apt-get update
      apt-get install -y ca-certificates curl gnupg
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
      apt-get update
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    elif command_exists yum; then
      # RHEL/CentOS/Fedora
      yum install -y yum-utils
      yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      systemctl enable docker
      systemctl start docker
    else
      echo "Unsupported package manager. Please install Docker manually following the instructions at: https://docs.docker.com/engine/install/"
      return 1
    fi
  fi
  
  # Check if Docker Compose is installed
  if ! command_exists docker-compose && ! command_exists docker compose; then
    echo "Docker Compose is not installed. Installing Docker Compose..."
    if ! command_exists docker compose; then
      curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
      chmod +x /usr/local/bin/docker-compose
    fi
  fi
  
  # Run MongoDB with Docker
  echo "Starting MongoDB with Docker..."
  
  # Create a docker network for MongoDB
  docker network create mongodb-network 2>/dev/null || true
  
  # Run MongoDB container
  docker run -d --name mongodb \
    --network mongodb-network \
    -p 27017:27017 \
    -v mongodb-data:/data/db \
    --restart unless-stopped \
    mongo:6
  
  # Update .env file with Docker MongoDB URI
  if [[ -f .env ]]; then
    sed -i "s#MONGO_URI=.*#MONGO_URI=mongodb://localhost:27017/licener#" .env
  fi
  
  echo "MongoDB running in Docker container!"
  return 0
}

# Check for required dependencies
echo "Checking dependencies..."

if ! command_exists node; then
  echo "Node.js is not installed. Would you like to install it? (y/n)"
  read -r install_node
  
  if [[ "$install_node" == "y" ]]; then
    echo "Installing Node.js..."
    if command_exists apt-get; then
      # Debian/Ubuntu
      curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
      apt-get install -y nodejs
    elif command_exists yum; then
      # RHEL/CentOS/Fedora
      curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
      yum install -y nodejs
    else
      echo "Unsupported package manager. Please install Node.js manually."
      exit 1
    fi
  else
    echo "Node.js installation is required. Exiting."
    exit 1
  fi
fi

if ! command_exists npm; then
  echo "npm is not installed. It should be installed with Node.js."
  echo "Please install npm and try again."
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d '.' -f 1)

if [[ "$NODE_MAJOR_VERSION" -lt 14 ]]; then
  echo "Node.js v14+ is required. Current version: $NODE_VERSION"
  echo "Would you like to upgrade Node.js? (y/n)"
  read -r upgrade_node
  
  if [[ "$upgrade_node" == "y" ]]; then
    echo "Upgrading Node.js..."
    if command_exists apt-get; then
      # Debian/Ubuntu
      curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
      apt-get install -y nodejs
    elif command_exists yum; then
      # RHEL/CentOS/Fedora
      curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
      yum install -y nodejs
    else
      echo "Unsupported package manager. Please upgrade Node.js manually."
      exit 1
    fi
  else
    echo "Node.js upgrade is required. Exiting."
    exit 1
  fi
fi

echo "Node.js version: $NODE_VERSION - OK"

# Check for MongoDB
if ! command_exists mongo && ! command_exists mongosh; then
  # MongoDB not installed locally, offer to install
  install_mongodb || use_docker_mongodb || true
else
  # Check if MongoDB service is running
  if command_exists systemctl && systemctl is-active --quiet mongod; then
    echo "MongoDB is installed and running."
  else
    echo "MongoDB is installed but not running."
    echo "Starting MongoDB service..."
    if command_exists systemctl; then
      systemctl start mongod
      systemctl enable mongod
    else
      echo "Could not start MongoDB service. Please start it manually."
    fi
  fi
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Check if .env file exists, create from example if it doesn't
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    
    # Generate random strings for secrets
    SESSION_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
    JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
    
    # Replace placeholder secrets with random strings
    sed -i "s/change_this_to_a_long_random_string/$SESSION_SECRET/" .env
    sed -i "s/change_this_to_a_different_long_random_string/$JWT_SECRET/" .env
    
    # Set environment to production
    sed -i "s/NODE_ENV=development/NODE_ENV=production/" .env
    
    echo "Environment file created. Please edit .env file to configure your settings."
  else
    echo "No .env or .env.example file found. Please create .env file manually."
    exit 1
  fi
fi

# Create required directories
echo "Creating data directories..."
mkdir -p data/uploads
mkdir -p data/exports
chmod 755 data/uploads
chmod 755 data/exports

# Create a systemd service file for running as a service
echo "Do you want to create a systemd service for Licener? (y/n)"
read -r create_service

if [[ "$create_service" == "y" ]]; then
  SERVICE_FILE="licener.service"
  WORKING_DIR=$(pwd)
  NODE_PATH=$(command -v node)
  
  echo "Creating systemd service file: $SERVICE_FILE"
  
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Licener - License Management System
After=network.target mongodb.service
Wants=mongodb.service

[Service]
ExecStart=$NODE_PATH $WORKING_DIR/app.js
WorkingDirectory=$WORKING_DIR
Restart=always
User=$(whoami)
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

  echo "Service file created: $SERVICE_FILE"
  echo "To install the service, run:"
  echo "  sudo cp $SERVICE_FILE /etc/systemd/system/"
  echo "  sudo systemctl daemon-reload"
  echo "  sudo systemctl enable licener"
  echo "  sudo systemctl start licener"
  
  # Offer to install the service
  echo "Do you want to install and start the service now? (y/n)"
  read -r install_service
  
  if [[ "$install_service" == "y" ]]; then
    if command_exists sudo; then
      sudo cp "$SERVICE_FILE" /etc/systemd/system/
      sudo systemctl daemon-reload
      sudo systemctl enable licener
      sudo systemctl start licener
      echo "Service installed and started!"
    else
      echo "The 'sudo' command is not available. Please install the service manually."
    fi
  fi
fi

# Create a script to start the application using PM2 (if available)
echo "Do you want to use PM2 process manager? (y/n)"
read -r use_pm2

if [[ "$use_pm2" == "y" ]]; then
  if ! command_exists pm2; then
    echo "PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
  fi
  
  echo "Creating PM2 startup script..."
  cat > "start_pm2.sh" << EOF
#!/bin/bash
pm2 start app.js --name "licener" --env production
pm2 save
EOF

  chmod +x start_pm2.sh
  echo "PM2 startup script created: start_pm2.sh"
  
  # Setup PM2 to start on system boot
  echo "Do you want PM2 to start on system boot? (y/n)"
  read -r pm2_startup
  
  if [[ "$pm2_startup" == "y" ]]; then
    echo "Setting up PM2 startup script..."
    pm2 startup
    
    # Offer to run the startup command
    echo "Do you want to start the application with PM2 now? (y/n)"
    read -r start_pm2_now
    
    if [[ "$start_pm2_now" == "y" ]]; then
      ./start_pm2.sh
      echo "Application started with PM2!"
    fi
  fi
else
  # Create a simple startup script
  echo "Creating a simple startup script..."
  cat > "start.sh" << EOF
#!/bin/bash
export NODE_ENV=production
node app.js
EOF

  chmod +x start.sh
  echo "Startup script created: start.sh"
  
  # Offer to start the application
  echo "Do you want to start the application now? (y/n)"
  read -r start_now
  
  if [[ "$start_now" == "y" ]]; then
    ./start.sh &
    echo "Application started!"
  fi
fi

echo ""
echo "===== Deployment Complete ====="
echo "To start Licener, you can:"
if [[ "$create_service" == "y" ]]; then
  echo "1. Use the systemd service (recommended for production)"
  echo "   sudo systemctl start licener"
fi
if [[ "$use_pm2" == "y" ]]; then
  echo "2. Run './start_pm2.sh' to start with PM2 (recommended for production)"
else
  echo "3. Run './start.sh' to start directly with Node.js"
  echo "4. Run 'npm start' to start using the npm script"
fi
echo ""
echo "Access the application at: http://localhost:3000"
echo "Remember to secure your server with a proper firewall and HTTPS if exposing to the internet!"