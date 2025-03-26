#!/bin/bash
# Licener - Linux Deployment Script

echo "===== Licener Deployment Script for Linux ====="
echo "This script will help you deploy the Licener application."

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required dependencies
echo "Checking dependencies..."

if ! command_exists node; then
  echo "Node.js is not installed. Please install Node.js (v14+) and try again."
  exit 1
fi

if ! command_exists npm; then
  echo "npm is not installed. Please install npm and try again."
  exit 1
fi

if ! command_exists mongo; then
  echo "MongoDB is not installed. You may need to install MongoDB or configure a remote connection."
  echo "Continue anyway? (y/n)"
  read -r continue_without_mongo
  if [[ "$continue_without_mongo" != "y" ]]; then
    exit 1
  fi
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d '.' -f 1)

if [[ "$NODE_MAJOR_VERSION" -lt 14 ]]; then
  echo "Node.js v14+ is required. Current version: $NODE_VERSION"
  echo "Please upgrade Node.js and try again."
  exit 1
fi

echo "Node.js version: $NODE_VERSION - OK"

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
  echo "Run './start_pm2.sh' to start the application with PM2"
  
  # Setup PM2 to start on system boot
  echo "Do you want PM2 to start on system boot? (y/n)"
  read -r pm2_startup
  
  if [[ "$pm2_startup" == "y" ]]; then
    echo "Setting up PM2 startup script..."
    pm2 startup
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
  echo "Run './start.sh' to start the application"
fi

echo ""
echo "===== Deployment Complete ====="
echo "To start Licener, you can:"
if [[ "$create_service" == "y" ]]; then
  echo "1. Install and start the systemd service (recommended for production)"
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