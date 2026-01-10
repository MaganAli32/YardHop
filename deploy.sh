#!/bin/bash
# YardFront Deployment Script

set -e  # Exit on error

echo "🚀 YardFront Deployment"
echo "===================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build frontend
echo ""
echo "🔨 Building frontend..."
npm run build

# Check if build succeeded
if [ ! -d "dist" ]; then
    echo "❌ Build failed! dist folder not found."
    exit 1
fi

echo "✓ Build completed successfully"

# Create logs directory
mkdir -p logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "📦 PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Start/restart with PM2
echo ""
echo "🌟 Starting server with PM2..."
if pm2 list | grep -q "yardfront"; then
    echo "   Restarting existing yardfront process..."
    pm2 restart yardfront
else
    echo "   Starting new yardfront process..."
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Server running on port 3000"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check server status"
echo "  pm2 logs yardfront    - View logs"
echo "  pm2 restart yardfront - Restart server"
echo "  pm2 stop yardfront    - Stop server"
echo "  pm2 monit           - Monitor server"








