#!/bin/bash

# YardFront Server Startup Script

echo "🚀 Starting YardFront Backend Server..."
echo ""

# Check if port 3000 is in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is already in use. Killing existing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Check for .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create a .env file with your Supabase credentials."
    exit 1
fi

# Check for required env vars
if ! grep -q "SUPABASE_URL" .env || ! grep -q "SUPABASE_ANON_KEY" .env; then
    echo "⚠️  Warning: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env"
    echo "   The server may not start correctly."
fi

echo "✅ Starting server..."
echo ""
echo "📝 Server will run in this terminal. Press Ctrl+C to stop."
echo ""

# Start the server
npm start


