# Fix Port 3000 Already in Use Error

## Problem
```
Error: listen EADDRINUSE: address already in use :::3000
```

This means another process is already using port 3000.

## Solution

### Option 1: Kill the process using port 3000

```bash
# Find the process ID
lsof -ti:3000

# Kill it
lsof -ti:3000 | xargs kill -9

# Or if that doesn't work:
kill -9 $(lsof -ti:3000)
```

### Option 2: Find and kill Node processes

```bash
# Find all Node processes
ps aux | grep node | grep -v grep

# Kill specific Node process (replace PID with actual process ID)
kill -9 <PID>
```

### Option 3: Use a different port

Edit your `.env` file and change:
```env
PORT=3001
```

Then restart:
```bash
npm start
```

### Option 4: Check if PM2 is running

If you're using PM2, check:
```bash
pm2 list
pm2 stop all
pm2 delete all
```

## After fixing, start the server:

```bash
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


