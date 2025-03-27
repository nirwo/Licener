#!/bin/bash
#
# Licener File Database Backup Script
# This script creates a backup of all JSON database files

# Configuration
BACKUP_DIR="./backups"
DATA_DIR="./data"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="licener_backup_${TIMESTAMP}.tar.gz"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Create backup
echo "Creating backup of Licener database files..."
tar -czf "${BACKUP_DIR}/${BACKUP_FILE}" \
    "${DATA_DIR}"/*.json \
    --exclude="${DATA_DIR}/uploads" \
    --exclude="${DATA_DIR}/exports"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup successful: ${BACKUP_DIR}/${BACKUP_FILE}"
    echo "Backup size: $(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)"
    
    # List recent backups
    echo -e "\nRecent backups:"
    ls -lh "${BACKUP_DIR}" | grep "licener_backup_" | tail -5
    
    # Optional: Clean old backups (uncomment to enable)
    # find "${BACKUP_DIR}" -name "licener_backup_*.tar.gz" -type f -mtime +30 -delete
else
    echo "Backup failed!"
    exit 1
fi

echo -e "\nTo restore from backup, use:"
echo "tar -xzf ${BACKUP_FILE} -C /path/to/licener"