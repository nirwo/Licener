#!/bin/bash
#
# Licener File Database Restore Script
# This script restores a backup of JSON database files

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Error: No backup file specified."
    echo "Usage: $0 /path/to/licener_backup_YYYYMMDD_HHMMSS.tar.gz"
    
    # List available backups
    if [ -d "./backups" ]; then
        echo -e "\nAvailable backups:"
        ls -lh ./backups | grep "licener_backup_" | tail -5
    fi
    
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file ${BACKUP_FILE} not found."
    exit 1
fi

# Confirm restore
echo "WARNING: This will replace your current database files with those from the backup."
echo "         Make sure the application is stopped before proceeding."
read -p "Do you want to continue? (y/n): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Create backup of current data (just in case)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEMP_BACKUP="./data_before_restore_${TIMESTAMP}.tar.gz"
echo "Creating backup of current data..."
tar -czf "${TEMP_BACKUP}" ./data/*.json

# Restore from backup
echo "Restoring from ${BACKUP_FILE}..."
tar -xzf "${BACKUP_FILE}" -C ./

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo "Restore successful."
    echo "Your previous data was backed up to: ${TEMP_BACKUP}"
    echo "You can now start the application."
else
    echo "Restore failed!"
    echo "Your previous data was backed up to: ${TEMP_BACKUP}"
    echo "You may need to manually restore from this backup."
    exit 1
fi