#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner function
show_banner() {
    echo -e "${BLUE}"
    echo "┌───────────────────────────────────────────────────────────┐"
    echo "│                                                           │"
    echo "│                   LICENER                                 │"
    echo "│           License Management System                       │"
    echo "│                                                           │"
    echo "└───────────────────────────────────────────────────────────┘"
    echo -e "${NC}"
}

# Usage information
usage() {
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 [command]"
    echo ""
    echo "Commands:"
    echo "  install      Install all required dependencies"
    echo "  run          Start the application in development mode"
    echo "  start        Start the application in production mode"
    echo "  stop         Stop all running instances of the application"
    echo "  status       Check if the application is running"
    echo "  backup       Backup all data"
    echo "  restore      Restore data from backup"
    echo ""
}

# Check if the application is running
check_if_running() {
    if pgrep -f "node app.js" > /dev/null; then
        echo -e "${GREEN}Licener is currently running.${NC}"
        echo "Running processes:"
        ps aux | grep "node app.js" | grep -v grep
        return 0
    else
        echo -e "${RED}Licener is not running.${NC}"
        return 1
    fi
}

# Create data files if they don't exist
ensure_data_files() {
    # Ensure the data directory exists
    mkdir -p ./data

    # Create data files if they don't exist
    if [ ! -f "./data/licenses.json" ]; then
        echo '{"data": []}' > ./data/licenses.json
        echo -e "${GREEN}Created licenses.json file${NC}"
    fi

    if [ ! -f "./data/systems.json" ]; then
        echo '{"data": []}' > ./data/systems.json
        echo -e "${GREEN}Created systems.json file${NC}"
    fi

    if [ ! -f "./data/users.json" ]; then
        echo '{"data": []}' > ./data/users.json
        echo -e "${GREEN}Created users.json file${NC}"
    fi

    # Create export and upload directories
    mkdir -p ./data/exports
    mkdir -p ./data/uploads
}

# Install dependencies
install_dependencies() {
    show_banner
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
        echo "Visit https://nodejs.org for installation instructions."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        echo -e "${RED}Node.js version 14 or higher is required.${NC}"
        echo "Current version: $(node -v)"
        exit 1
    fi
    
    echo -e "${GREEN}Using Node.js version: $(node -v)${NC}"
    echo -e "${GREEN}Using npm version: $(npm -v)${NC}"
    
    # Install Node.js dependencies
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Dependencies installed successfully!${NC}"
    else
        echo -e "${RED}Failed to install dependencies.${NC}"
        exit 1
    fi
    
    # Set up data directories and files
    ensure_data_files
    
    echo -e "${GREEN}Installation completed successfully!${NC}"
    echo -e "${YELLOW}You can now run the application with:${NC} $0 run"
}

# Run the application in development mode
run_application() {
    show_banner
    echo -e "${YELLOW}Starting Licener in development mode...${NC}"
    
    # Check if already running
    if check_if_running; then
        echo -e "${YELLOW}Licener is already running. To restart, run:${NC} $0 stop && $0 run"
        return
    fi
    
    # Ensure data files exist
    ensure_data_files
    
    # Start the application
    echo -e "${GREEN}Starting application...${NC}"
    npm run dev
}

# Start the application in production mode
start_application() {
    show_banner
    echo -e "${YELLOW}Starting Licener in production mode...${NC}"
    
    # Check if already running
    if check_if_running; then
        echo -e "${YELLOW}Licener is already running. To restart, run:${NC} $0 stop && $0 start"
        return
    fi
    
    # Ensure data files exist
    ensure_data_files
    
    # Start the application using pm2 if available, otherwise use node
    if command -v pm2 &> /dev/null; then
        echo -e "${GREEN}Starting application with PM2...${NC}"
        pm2 start app.js --name licener
    else
        echo -e "${YELLOW}PM2 not found. Starting with Node directly...${NC}"
        echo -e "${YELLOW}Note: For production, PM2 is recommended for better process management.${NC}"
        echo -e "${YELLOW}Install PM2 with: npm install -g pm2${NC}"
        node app.js > app.log 2>&1 &
        echo -e "${GREEN}Application started with PID: $!${NC}"
        echo -e "${YELLOW}Logs are being written to: app.log${NC}"
    fi
    
    echo -e "${GREEN}Application running at:${NC} http://localhost:3000"
}

# Stop the application
stop_application() {
    show_banner
    echo -e "${YELLOW}Stopping Licener...${NC}"
    
    # Check if running
    if ! check_if_running; then
        echo -e "${YELLOW}No instances of Licener running.${NC}"
        return
    fi
    
    # Stop with pm2 if running with it
    if command -v pm2 &> /dev/null && pm2 list | grep -q "licener"; then
        echo -e "${GREEN}Stopping application with PM2...${NC}"
        pm2 stop licener
    else
        echo -e "${GREEN}Stopping application processes...${NC}"
        pkill -f "node app.js"
    fi
    
    # Verify all instances are stopped
    if ! pgrep -f "node app.js" > /dev/null; then
        echo -e "${GREEN}All Licener instances stopped successfully.${NC}"
    else
        echo -e "${RED}Failed to stop all instances. Consider using:${NC} pkill -9 -f \"node app.js\""
    fi
}

# Backup data
backup_data() {
    show_banner
    echo -e "${YELLOW}Backing up Licener data...${NC}"
    
    # Create backup directory
    BACKUP_DIR="./backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Copy data files
    cp -r ./data/*.json "$BACKUP_DIR/"
    
    # Create archive
    tar czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"
    
    # Remove temporary directory
    rm -rf "$BACKUP_DIR"
    
    echo -e "${GREEN}Backup created: ${BACKUP_DIR}.tar.gz${NC}"
}

# Restore data
restore_data() {
    show_banner
    echo -e "${YELLOW}Restoring Licener data...${NC}"
    
    # List available backups
    BACKUPS=(./backup/*.tar.gz)
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}No backups found.${NC}"
        return
    fi
    
    echo "Available backups:"
    for i in "${!BACKUPS[@]}"; do
        echo "[$i] ${BACKUPS[$i]}"
    done
    
    read -p "Enter backup number to restore: " BACKUP_NUM
    if [[ ! "$BACKUP_NUM" =~ ^[0-9]+$ ]] || [ "$BACKUP_NUM" -ge ${#BACKUPS[@]} ]; then
        echo -e "${RED}Invalid backup selection.${NC}"
        return
    fi
    
    SELECTED_BACKUP="${BACKUPS[$BACKUP_NUM]}"
    RESTORE_DIR="./restore_tmp"
    
    # Extract backup
    mkdir -p "$RESTORE_DIR"
    tar xzf "$SELECTED_BACKUP" -C "$RESTORE_DIR"
    
    # Stop application if running
    if check_if_running; then
        echo -e "${YELLOW}Stopping application before restore...${NC}"
        stop_application
    fi
    
    # Backup current data
    CURRENT_BACKUP="./backup/pre_restore_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$CURRENT_BACKUP"
    cp -r ./data/*.json "$CURRENT_BACKUP/"
    
    # Copy restored data
    cp -r "$RESTORE_DIR"/*/*.json ./data/
    
    # Clean up
    rm -rf "$RESTORE_DIR"
    
    echo -e "${GREEN}Data restored from: $SELECTED_BACKUP${NC}"
    echo -e "${GREEN}Previous data backed up to: $CURRENT_BACKUP${NC}"
    echo -e "${YELLOW}You can now restart the application with:${NC} $0 run"
}

# Main script logic
case "$1" in
    install)
        install_dependencies
        ;;
    run)
        run_application
        ;;
    start)
        start_application
        ;;
    stop)
        stop_application
        ;;
    status)
        check_if_running
        ;;
    backup)
        backup_data
        ;;
    restore)
        restore_data
        ;;
    *)
        show_banner
        usage
        ;;
esac

exit 0