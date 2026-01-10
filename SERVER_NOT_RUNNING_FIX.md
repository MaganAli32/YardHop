# Server Not Running - Fix Guide

## Problem
You're seeing `ERR_CONNECTION_REFUSED` errors because the backend server is not running.

## Quick Fix

### Option 1: Use the Startup Script (Easiest)
```bash
cd /Users/maganali/Downloads/yardhop
./start-server.sh
```

### Option 2: Manual Start
```bash
cd /Users/maganali/Downloads/yardhop

# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start the server
npm start
```

## What You Should See

When the server starts successfully, you'll see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏠 YardFront Backend Server                               ║
║                                                           ║
║   ✅ Server running on http://localhost:3000              ║
║   📡 API available at http://localhost:3000/api           ║
║   🔗 Supabase connected: ✓                                ║
║   🌍 Environment: development                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Important Notes

1. **Keep the terminal open** - The server runs in the foreground. If you close the terminal, the server stops.

2. **Check for errors** - If you see "Missing required Supabase environment variables", check your `.env` file.

3. **Test the API** - Once running, test with:
   ```bash
   curl http://localhost:3000/api/health
   ```

4. **Refresh your browser** - After starting the server, hard refresh (Cmd+Shift+R) your browser.

## Running in Background (Optional)

If you want to run the server in the background:

### Using nohup:
```bash
cd /Users/maganali/Downloads/yardhop
nohup npm start > server.log 2>&1 &
tail -f server.log  # Watch the logs
```

### Using PM2 (if installed):
```bash
cd /Users/maganali/Downloads/yardhop
npm run pm2:start
npm run pm2:logs  # View logs
```

## Troubleshooting

### Server won't start
1. Check `.env` file exists and has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Check if port 3000 is available: `lsof -i :3000`
3. Look for error messages in the terminal

### Still getting connection refused
1. Verify server is running: `ps aux | grep "node.*server"`
2. Check server logs for errors
3. Try accessing: `http://localhost:3000/api/health` in your browser

### API returns 404
- Make sure routes are registered in `server.js`
- Check that route files exist in `routes/` directory


