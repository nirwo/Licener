# Licener Deployment Guide

This guide provides instructions for deploying the Licener application in various environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
  - [1. Linux Deployment](#1-linux-deployment)
  - [2. Windows Deployment](#2-windows-deployment)
  - [3. Docker Deployment](#3-docker-deployment)
- [Database Setup](#database-setup)
- [Securing Your Deployment](#securing-your-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying Licener, ensure you have the following:

- Node.js (v14 or higher)
- npm (included with Node.js)
- MongoDB (v4.4 or higher)
- Git (to clone the repository)

## Environment Configuration

1. Copy the example environment file to create your configuration:
   ```
   cp .env.example .env
   ```

2. Edit the `.env` file with your specific configuration:
   ```
   # Server Configuration
   PORT=3000                     # The port your app will run on
   NODE_ENV=production           # Use 'production' for deployment

   # MongoDB Configuration
   MONGO_URI=mongodb://localhost:27017/licener  # Your MongoDB connection string

   # Security
   SESSION_SECRET=your_long_random_string       # Session encryption key
   JWT_SECRET=another_long_random_string        # JWT signing key
   ```

3. For security, generate strong random strings for `SESSION_SECRET` and `JWT_SECRET`.

## Deployment Options

### 1. Linux Deployment

We provide a deployment script for Linux that handles most of the setup process.

#### Automated Deployment
```bash
# Make the script executable
chmod +x scripts/deploy_linux.sh

# Run the deployment script
./scripts/deploy_linux.sh
```

The script will:
- Check for required dependencies
- Install Node.js dependencies
- Create necessary directories
- Optionally set up a systemd service
- Optionally configure PM2 process manager

#### Manual Deployment Steps

If you prefer to deploy manually:

1. Install dependencies:
   ```bash
   npm install --production
   ```

2. Create required directories:
   ```bash
   mkdir -p data/uploads data/exports
   chmod 755 data/uploads data/exports
   ```

3. Start the application:
   ```bash
   # Direct start
   NODE_ENV=production node app.js
   
   # Or using npm
   npm start
   
   # Or using PM2 (recommended for production)
   pm2 start app.js --name "licener" --env production
   ```

4. Setting up as a systemd service:
   ```bash
   # Create a service file
   sudo nano /etc/systemd/system/licener.service
   
   # Add the following content (adjust paths as needed)
   [Unit]
   Description=Licener - License Management System
   After=network.target mongodb.service
   Wants=mongodb.service

   [Service]
   ExecStart=/path/to/node /path/to/licener/app.js
   WorkingDirectory=/path/to/licener
   Restart=always
   User=yourusername
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   
   # Enable and start the service
   sudo systemctl daemon-reload
   sudo systemctl enable licener
   sudo systemctl start licener
   ```

### 2. Windows Deployment

We provide a deployment script for Windows that handles most of the setup process.

#### Automated Deployment
```
scripts\deploy_windows.bat
```

The script will:
- Check for required dependencies
- Install Node.js dependencies
- Create necessary directories
- Optionally set up a Windows service using NSSM
- Optionally configure PM2 process manager
- Optionally create a scheduled task

#### Manual Deployment Steps

If you prefer to deploy manually:

1. Install dependencies:
   ```
   npm install --production
   ```

2. Create required directories:
   ```
   mkdir data\uploads data\exports
   ```

3. Start the application:
   ```
   # Direct start
   set NODE_ENV=production
   node app.js
   
   # Or using npm
   npm start
   
   # Or using PM2 (recommended for production)
   pm2 start app.js --name "licener" --env production
   ```

4. Setting up as a Windows service using NSSM:
   ```
   # Install NSSM from http://nssm.cc/
   
   # Install the service
   nssm install Licener "C:\path\to\node.exe" "C:\path\to\licener\app.js"
   nssm set Licener AppDirectory "C:\path\to\licener"
   nssm set Licener DisplayName "Licener - License Management System"
   nssm set Licener Description "A web application for managing software licenses"
   nssm set Licener AppEnvironmentExtra "NODE_ENV=production"
   nssm set Licener Start SERVICE_AUTO_START
   
   # Start the service
   nssm start Licener
   ```

### 3. Docker Deployment

For a containerized deployment, we provide Docker and Docker Compose configurations.

#### Using Docker Compose (Recommended)

1. Review and modify the `docker-compose.yml` file:
   - Update the `SESSION_SECRET` and `JWT_SECRET` environment variables
   - Adjust any other settings as needed

2. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

3. To stop the containers:
   ```bash
   docker-compose down
   ```

#### Using Docker without Compose

1. Build the Docker image:
   ```bash
   docker build -t licener .
   ```

2. Create a network for the containers:
   ```bash
   docker network create licener-network
   ```

3. Start a MongoDB container:
   ```bash
   docker run -d --name licener-mongodb \
     --network licener-network \
     -v licener-mongo-data:/data/db \
     mongo:6
   ```

4. Start the Licener application container:
   ```bash
   docker run -d --name licener-app \
     --network licener-network \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e MONGO_URI=mongodb://licener-mongodb:27017/licener \
     -e SESSION_SECRET=your_session_secret \
     -e JWT_SECRET=your_jwt_secret \
     -v licener-data:/usr/src/app/data \
     licener
   ```

## Database Setup

### MongoDB Community Edition

1. Install MongoDB for your platform:
   - [Linux Installation](https://docs.mongodb.com/manual/administration/install-on-linux/)
   - [Windows Installation](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/)
   - [macOS Installation](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/)

2. Start MongoDB:
   ```bash
   # Linux
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

3. Create a database user (optional but recommended):
   ```javascript
   // Connect to MongoDB
   mongo
   
   // Switch to admin database
   use admin
   
   // Create admin user
   db.createUser({
     user: "adminUser",
     pwd: "securePassword",
     roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
   })
   
   // Switch to Licener database
   use licener
   
   // Create application user
   db.createUser({
     user: "licenerUser",
     pwd: "anotherSecurePassword",
     roles: [{ role: "readWrite", db: "licener" }]
   })
   ```

4. Update your `.env` file with authentication:
   ```
   MONGO_URI=mongodb://licenerUser:anotherSecurePassword@localhost:27017/licener
   ```

### MongoDB Atlas (Cloud Hosting)

1. [Sign up](https://www.mongodb.com/cloud/atlas/register) for MongoDB Atlas
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get your connection string and update your `.env` file:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/licener?retryWrites=true&w=majority
   ```

## Securing Your Deployment

For production deployments, consider the following security measures:

1. Set up HTTPS:
   - Use a reverse proxy like Nginx or Apache
   - Obtain SSL certificates (e.g., using Let's Encrypt)

2. Set up a firewall:
   ```bash
   # Linux (ufw example)
   sudo ufw allow ssh
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   
   # Windows
   # Use Windows Firewall via GUI or netsh commands
   ```

3. Regular updates:
   ```bash
   # Update dependencies
   npm audit fix
   
   # Keep the system updated
   # Linux
   sudo apt update && sudo apt upgrade
   
   # Windows
   # Use Windows Update
   ```

## Troubleshooting

### Common Issues

1. **Cannot connect to MongoDB**
   - Check if MongoDB is running: `systemctl status mongod` (Linux) or Services console (Windows)
   - Verify connection string in `.env` file
   - Check network connectivity and firewall settings

2. **Application starts but isn't accessible**
   - Check if the correct port is being used (default: 3000)
   - Verify firewall settings: `sudo ufw status` (Linux) or check Windows Firewall
   - Check if another application is using the same port: `netstat -tuln | grep 3000`

3. **File upload issues**
   - Verify that data directories exist and have proper permissions
   - Check disk space: `df -h` (Linux) or check Disk Management (Windows)

### Logs

Check application logs for troubleshooting:

```bash
# Direct Node.js logs
# Check console output

# Systemd service logs (Linux)
sudo journalctl -u licener.service

# PM2 logs
pm2 logs licener

# Docker logs
docker logs licener-app
```

### Getting Help

If you encounter issues not covered here:

1. Check the GitHub repository issues section
2. Ask for help in the community forum or discussion board
3. Contact support if you have a commercial license