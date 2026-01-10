#!/bin/bash
# Complete Server Setup Script for YardFront

set -e

echo "🚀 YardFront Server Setup"
echo "======================="
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  This script is designed for Linux servers."
    echo "   For macOS/Windows, use: npm run deploy"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Node.js not found. Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✓ Node.js installed"
else
    echo "✓ Node.js $(node --version)"
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
    echo "✓ PM2 installed"
else
    echo "✓ PM2 already installed"
fi

# Install project dependencies
echo ""
echo "📦 Installing project dependencies..."
npm install --legacy-peer-deps

# Build the application
echo ""
echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

# Start with PM2
echo ""
echo "🌟 Starting application..."
if pm2 list | grep -q "yardfront"; then
    pm2 restart yardfront
else
    pm2 start ecosystem.config.js
fi

pm2 save

# Setup PM2 to start on system boot
echo ""
echo "⚙️  Configuring auto-start on boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Your YardFront application is now running!"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check server status"
echo "  pm2 logs yardfront    - View logs (--lines 100 for more)"
echo "  pm2 restart yardfront - Restart server"
echo "  pm2 stop yardfront    - Stop server"
echo "  pm2 monit           - Monitor resources"
echo ""
echo "📍 Server URL: http://localhost:3000"
echo "   (or your server's IP address)"








