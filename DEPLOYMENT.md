# Licener Deployment Guide

This guide provides instructions for deploying the Licener application in various environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
  - [1. Linux Deployment](#1-linux-deployment)
  - [2. Windows Deployment](#2-windows-deployment)
  - [3. Docker Deployment](#3-docker-deployment)
- [File Database Setup](#file-database-setup)
- [Securing Your Deployment](#securing-your-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying Licener, ensure you have the following:

- Node.js (v14 or higher)
- npm (included with Node.js)
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

2. Create required directories and initialize the file database:
   ```bash
   chmod +x scripts/start_file_db.sh
   ./scripts/start_file_db.sh
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
   After=network.target

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

2. Create required directories and database files:
   ```
   mkdir data
   echo {"data": []} > data\licenses.json
   echo {"data": []} > data\systems.json
   echo {"data": []} > data\users.json
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

2. Run the container with volume for data persistence:
   ```bash
   docker run -d --name licener-app \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e SESSION_SECRET=your_session_secret \
     -e JWT_SECRET=your_jwt_secret \
     -v $(pwd)/data:/usr/src/app/data \
     licener
   ```

## File Database Setup

Licener uses a file-based database system that stores data in JSON files. To initialize the database:

1. Create the data directory structure:
   ```bash
   mkdir -p data/uploads data/exports
   ```

2. Create the database files if they don't exist:
   ```bash
   echo '{"data": []}' > data/licenses.json
   echo '{"data": []}' > data/systems.json
   echo '{"data": []}' > data/users.json
   ```

3. Set appropriate permissions:
   ```bash
   chmod -R 755 data
   ```

4. For convenience, use the provided setup script:
   ```bash
   chmod +x scripts/start_file_db.sh
   ./scripts/start_file_db.sh
   ```

### Backup Strategy

Since all data is stored in JSON files, regular backups are essential:

1. Create a backup script:
   ```bash
   #!/bin/bash
   # backup.sh
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/path/to/backups"
   mkdir -p $BACKUP_DIR
   tar -czf $BACKUP_DIR/licener_backup_$TIMESTAMP.tar.gz /path/to/licener/data/*.json
   ```

2. Make it executable and add to cron:
   ```bash
   chmod +x backup.sh
   crontab -e
   ```

3. Add a daily backup schedule:
   ```
   0 2 * * * /path/to/backup.sh
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

4. File permissions:
   ```bash
   # Ensure proper file permissions
   chmod -R 755 data
   chmod 600 .env
   ```

5. Regular data backups:
   ```bash
   # Manual backup
   tar -czf licener_backup_$(date +%Y%m%d).tar.gz data/*.json
   ```

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check Node.js version: `node -v` (should be 14+)
   - Verify npm modules are installed: `npm install`
   - Check for errors in the console output

2. **Application starts but isn't accessible**
   - Check if the correct port is being used (default: 3000)
   - Verify firewall settings: `sudo ufw status` (Linux) or check Windows Firewall
   - Check if another application is using the same port: `netstat -tuln | grep 3000`

3. **File upload issues**
   - Verify that data directories exist and have proper permissions
   - Check disk space: `df -h` (Linux) or check Disk Management (Windows)

4. **Data not persisting**
   - Ensure the data directory has proper write permissions
   - Check that the JSON files exist and are writable
   - For Docker deployments, verify the volume is mounted correctly

5. **Login issues**
   - If the default user doesn't work, delete the `data/users.json` file and restart
   - The system will recreate the default user automatically

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