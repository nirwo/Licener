#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting production deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build frontend assets
echo "🔨 Building frontend assets..."
npm run build

# Set environment
echo "🌍 Setting production environment..."
export NODE_ENV=production

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start app.js --name "licener" --env production

# Save PM2 process list
echo "💾 Saving PM2 process list..."
pm2 save

echo "✅ Deployment completed successfully!" 