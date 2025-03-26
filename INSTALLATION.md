# Licener Installation Guide

This guide provides comprehensive instructions for installing and running the Licener application.

## Prerequisites

Before installing Licener, ensure you have the following:

- Node.js (v14 or higher)
- npm (included with Node.js)
- MongoDB (v4.4 or higher) OR Docker

## Installation Options

You can install Licener using one of the following methods:

1. [Direct Installation](#direct-installation) - Install directly on your host machine
2. [Docker Installation](#docker-installation) - Install using Docker containers
3. [Script-based Installation](#script-based-installation) - Use the provided deployment scripts

## Direct Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/licener.git
cd licener
```

### 2. Install MongoDB

#### On Ubuntu/Debian:

```bash
# Import the MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create a list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package database
sudo apt-get update

# Install MongoDB packages
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl daemon-reload
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### On RHEL/CentOS/Fedora:

```bash
# Create a repository file
sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo << EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

# Install MongoDB packages
sudo yum install -y mongodb-org

# Start and enable MongoDB
sudo systemctl daemon-reload
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### On Windows:

Download and install MongoDB Community Edition from [MongoDB's website](https://www.mongodb.com/try/download/community)

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file to match your configuration
# Especially update SESSION_SECRET and JWT_SECRET with random strings
```

### 4. Install Dependencies

```bash
npm install --production
```

### 5. Create Required Directories

```bash
mkdir -p data/uploads data/exports
chmod 755 data/uploads data/exports
```

### 6. Start the Application

```bash
NODE_ENV=production node app.js
```

## Docker Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/licener.git
cd licener
```

### 2. Configure Docker Compose

Edit the `docker-compose.yml` file to set the environment variables, especially the `SESSION_SECRET` and `JWT_SECRET`.

### 3. Build and Start the Containers

```bash
# Build and start the containers
docker-compose up -d

# Check the container status
docker-compose ps
```

### 4. Access the Application

Open your browser and navigate to `http://localhost:3000`

## Script-based Installation

We provide deployment scripts for Linux and Windows that automate most of the installation process.

### Linux Installation

```bash
# Make the script executable
chmod +x scripts/deploy_linux.sh

# Run the deployment script
./scripts/deploy_linux.sh
```

### Windows Installation

```batch
# Run the deployment script
scripts\deploy_windows.bat
```

The scripts will:
- Check for required dependencies
- Install MongoDB (or use Docker for MongoDB)
- Install Node.js dependencies
- Create necessary directories
- Configure environment variables
- Optionally set up a service/daemon

## MongoDB Standalone Docker Installation

If you prefer to use MongoDB with Docker but install the application directly:

```bash
# Create a Docker network
docker network create mongodb-network

# Run MongoDB in Docker
docker run -d --name mongodb \
  --network mongodb-network \
  -p 27017:27017 \
  -v mongodb-data:/data/db \
  --restart unless-stopped \
  mongo:6

# Update your .env file to use the Docker MongoDB
# MONGO_URI=mongodb://localhost:27017/licener
```

## Configuration

### Environment Variables

Key environment variables to configure:

- `PORT`: The port the application will run on (default: 3000)
- `NODE_ENV`: Environment setting ('development' or 'production')
- `MONGO_URI`: MongoDB connection string
- `SESSION_SECRET`: Secret for session encryption
- `JWT_SECRET`: Secret for JWT token signing

## Starting and Stopping

### Starting the Application

#### Direct start:
```bash
NODE_ENV=production node app.js
```

#### Using npm:
```bash
npm start
```

#### Using the provided start script:
```bash
./scripts/start_app.sh
```

### Running as a Service

#### Linux (systemd):
```bash
# Copy the service file
sudo cp licener.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable licener
sudo systemctl start licener

# Check status
sudo systemctl status licener
```

#### Windows (using NSSM):
```batch
# Install the service (if not done by the deploy script)
nssm install Licener "C:\path\to\node.exe" "C:\path\to\licener\app.js"
nssm set Licener AppDirectory "C:\path\to\licener"

# Start the service
nssm start Licener
```

## Troubleshooting

### Connection Issues

1. **MongoDB connection failed**
   - Check if MongoDB is running: `systemctl status mongod`
   - Verify your MongoDB connection string in `.env`
   - For Docker: ensure the MongoDB container is running

2. **Application not starting**
   - Check for errors in the console output
   - Verify that all dependencies are installed
   - Check Node.js version compatibility
   - Verify file permissions on directories

3. **Cannot access the application**
   - Check if the application is running and listening on the expected port
   - Verify firewall settings
   - Check for conflicting applications on the same port

### Logs

- Application logs are output to the console
- For systemd service: `journalctl -u licener.service`
- For Docker: `docker logs licener-app`

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Docker Documentation](https://docs.docker.com/)