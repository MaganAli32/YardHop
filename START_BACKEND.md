# Start Backend Server - Quick Guide

## The Error
```
ERR_CONNECTION_REFUSED
Failed to fetch
```

This means the backend server is **not running** on port 3000.

## Solution: Start the Server

### Step 1: Open Terminal
Open a terminal window.

### Step 2: Navigate to Project
```bash
cd /Users/maganali/Downloads/yardhop
```

### Step 3: Start the Server
```bash
npm start
```

### Step 4: Verify It's Running
You should see:
```
╔═══════════════════════════════════════════════════════════╗
║   🏠 YardFront Backend Server                               ║
║   ✅ Server running on http://localhost:3000              ║
║   📡 API available at http://localhost:3000/api           ║
║   🔗 Supabase connected: ✓                                ║
╚═══════════════════════════════════════════════════════════╝
```

### Step 5: Keep Terminal Open
**IMPORTANT:** Keep the terminal window open. If you close it, the server stops.

### Step 6: Refresh Browser
Hard refresh your browser (Cmd+Shift+R) and try the scanner again.

## Alternative: Run in Background

If you want to run the server in the background:

```bash
cd /Users/maganali/Downloads/yardhop
nohup npm start > server.log 2>&1 &
tail -f server.log  # Watch the logs
```

## Troubleshooting

### Port 3000 Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Then start server
npm start
```

### Missing Environment Variables
Make sure your `.env` file has:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (for AI features)

### Server Won't Start
Check the terminal output for error messages. Common issues:
- Missing `.env` file
- Wrong environment variable names
- Port already in use

## Test the API

Once the server is running, test it:
```bash
curl http://localhost:3000/api/health
```

Should return: `{"status":"ok",...}`


