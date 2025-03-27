# Licener Installation Guide

This guide provides comprehensive instructions for installing and running the Licener application.

## Prerequisites

Before installing Licener, ensure you have the following:

- Node.js (v14 or higher)
- npm (included with Node.js)

## Installation Options

You can install Licener using one of the following methods:

1. [File-based Database Installation](#file-based-database-installation) - Recommended for most users
2. [Docker Installation](#docker-installation) - Install using Docker containers
3. [Script-based Installation](#script-based-installation) - Use the provided deployment scripts

## File-based Database Installation

Licener uses a file-based database system that stores data in JSON files, making it easy to set up and maintain without external dependencies.

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/licener.git
cd licener
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy the example environment file if it exists
cp .env.example .env

# Edit the .env file to match your configuration
# Especially update SESSION_SECRET and JWT_SECRET with random strings
```

At minimum, your .env file should contain:
```
PORT=3000
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
```

### 4. Initialize File Database

The file database requires certain directories and files to be created. Use the provided script:

```bash
# Make the script executable
chmod +x scripts/start_file_db.sh

# Run the script to initialize the database and start the application
./scripts/start_file_db.sh
```

The script will:
- Create the data directory
- Initialize necessary JSON database files
- Create upload and export directories
- Start the application

### 5. Access the Application

Open your browser and navigate to `http://localhost:3000`

Default login credentials:
- Email: demo@example.com
- Password: password

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
- Install Node.js dependencies
- Create necessary directories
- Configure environment variables
- Optionally set up a service/daemon

## Development Mode

For development with auto-reload:

```bash
# Make the script executable
chmod +x scripts/dev_file_db.sh

# Start in development mode
./scripts/dev_file_db.sh
```

Or using npm:

```bash
npm run dev
```

This will:
- Start the application using nodemon
- Watch for file changes and automatically restart
- Use the file-based database
- Ignore data file changes to prevent restart loops

## Configuration

### Environment Variables

Key environment variables to configure:

- `PORT`: The port the application will run on (default: 3000)
- `NODE_ENV`: Environment setting ('development' or 'production')
- `SESSION_SECRET`: Secret for session encryption
- `JWT_SECRET`: Secret for JWT token signing

### Data Storage

With the file-based database, all data is stored in JSON files in the `data` directory:

- `data/licenses.json`: License data
- `data/systems.json`: System data
- `data/users.json`: User data
- `data/uploads/`: Uploaded files
- `data/exports/`: Exported reports

## Starting and Stopping

### Starting the Application

#### Direct start:
```bash
node app.js
```

#### Using npm:
```bash
npm start
```

#### Using the provided start script:
```bash
./scripts/start_file_db.sh
```

### Running as a Service

#### Linux (systemd):
```bash
# Create a systemd service file
sudo nano /etc/systemd/system/licener.service
```

Add the following content:
```
[Unit]
Description=Licener License Management System
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/licener
ExecStart=/usr/bin/node app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable licener
sudo systemctl start licener
```

## Troubleshooting

### Common Issues

1. **Application not starting**
   - Check for errors in the console output
   - Verify that all dependencies are installed
   - Check Node.js version compatibility
   - Verify file permissions on directories

2. **Cannot access the application**
   - Check if the application is running and listening on the expected port
   - Verify firewall settings
   - Check for conflicting applications on the same port

3. **Data not persisting**
   - Verify the data directory has proper write permissions
   - Check that the JSON files are being created correctly
   - Look for error messages in the console output

4. **Login issues**
   - If the default user doesn't work, delete the `data/users.json` file and restart
   - The system will recreate the default user automatically

5. **Nodemon keeps restarting**
   - Ensure you're using the provided `nodemon.json` configuration
   - This config ignores changes to data files to prevent restart loops

### Logs

- Application logs are output to the console
- For systemd service: `journalctl -u licener.service`
- For Docker: `docker logs licener-app`

## Additional Resources

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express Documentation](https://expressjs.com/)
- [LowDB Documentation](https://github.com/typicode/lowdb)