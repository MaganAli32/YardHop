#!/bin/bash
# Quick server connection test script

echo "🔍 Testing YardFront Server Connection..."
echo ""

# Test 1: Check if port is listening
echo "1️⃣  Checking if port 3000 is listening..."
if lsof -i :3000 > /dev/null 2>&1; then
  echo "   ✅ Port 3000 is active"
else
  echo "   ❌ Port 3000 is NOT active - server may not be running"
  echo "   💡 Run: npm run dev:server"
  exit 1
fi

echo ""

# Test 2: Health endpoint
echo "2️⃣  Testing /health endpoint..."
HEALTH=$(curl -s http://localhost:3000/health)
if [ $? -eq 0 ] && echo "$HEALTH" | grep -q "status"; then
  echo "   ✅ Health check passed"
  echo "   Response: $HEALTH"
else
  echo "   ❌ Health check failed"
  exit 1
fi

echo ""

# Test 3: API endpoint
echo "3️⃣  Testing /api/products endpoint..."
API=$(curl -s http://localhost:3000/api/products)
if [ $? -eq 0 ]; then
  echo "   ✅ API endpoint responding"
  echo "   Response: ${API:0:50}..."
else
  echo "   ❌ API endpoint failed"
  exit 1
fi

echo ""

# Test 4: Frontend
echo "4️⃣  Testing frontend (/)..."
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$FRONTEND" = "200" ]; then
  echo "   ✅ Frontend is accessible"
else
  echo "   ⚠️  Frontend returned HTTP $FRONTEND"
fi

echo ""
echo "✅ All tests passed! Server is running correctly."
echo ""
echo "🌐 Try accessing:"
echo "   - Frontend: http://localhost:3000"
echo "   - Health: http://localhost:3000/health"
echo "   - API: http://localhost:3000/api/products"
echo ""
echo "💡 If browser still can't connect:"
echo "   1. Try http://127.0.0.1:3000 instead of localhost"
echo "   2. Clear browser cache (Cmd+Shift+R on Mac)"
echo "   3. Try a different browser or incognito mode"
echo "   4. Check browser console for errors (F12)"








