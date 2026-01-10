# Starting the YardFront Server

## Problem
The frontend is getting `ERR_CONNECTION_REFUSED` errors because the backend server is not running.

## Solution

### Step 1: Check if port 3000 is in use
```bash
lsof -i :3000
```

If something is using it, kill it:
```bash
lsof -ti:3000 | xargs kill -9
```

### Step 2: Start the server
```bash
cd /Users/maganali/Downloads/yardhop
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║   🏠 YardFront Backend Server                               ║
║   ✅ Server running on http://localhost:3000              ║
║   📡 API available at http://localhost:3000/api           ║
║   🔗 Supabase connected: ✓                                ║
╚═══════════════════════════════════════════════════════════╝
```

### Step 3: Keep the server running
**Important**: Keep the terminal window open where the server is running. If you close it, the server stops.

### Step 4: Test the API
Open a new terminal and test:
```bash
curl http://localhost:3000/api/health
```

You should get:
```json
{"status":"ok","message":"YardFront API is running",...}
```

### Step 5: Refresh your browser
Once the server is running, hard refresh your browser (Cmd+Shift+R) and the app should work.

## Running in Background (Optional)

If you want to run the server in the background:

### Option 1: Using `nohup`
```bash
cd /Users/maganali/Downloads/yardhop
nohup npm start > server.log 2>&1 &
```

### Option 2: Using PM2 (if installed)
```bash
cd /Users/maganali/Downloads/yardhop
npm run pm2:start
```

## Troubleshooting

### Server won't start
1. Check environment variables are set in `.env`
2. Check if port 3000 is available
3. Check for errors in the terminal output

### Still getting connection refused
1. Make sure the server is actually running: `ps aux | grep "node.*server"`
2. Check the server logs for errors
3. Verify the server is listening: `lsof -i :3000`

### API returns 404
- Make sure routes are properly registered in `server.js`
- Check that the route file exists in `routes/` directory


