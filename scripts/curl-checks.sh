#!/bin/bash
# Basic curl checks for endpoints
set -e
BASE_URL=${1:-http://localhost:3000}
echo "Checking $BASE_URL..."
curl -sSf $BASE_URL || (echo "Root endpoint failed" && exit 1)
# Add more endpoint checks below as needed
