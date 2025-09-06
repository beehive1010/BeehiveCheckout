# 🔧 Replit Preview & Logs Troubleshooting Guide

## Current Status ✅
Your development server is running correctly:
- **Vite dev server**: Running on `http://localhost:5000/`
- **Network accessible**: `http://172.31.105.194:5000/`
- **Port configuration**: Fixed in `.replit` file

## 🖥️ How to Access Your App in Replit

### Option 1: Webview Tab
1. Look for the **"Webview"** tab in Replit's interface
2. If it's not showing your app, click the **refresh** button in the webview
3. The webview should automatically show `https://your-repl-name.replit.dev`

### Option 2: Direct URL
Your app should be accessible at:
```
https://[your-repl-name].[your-username].replit.dev
```

### Option 3: Manual Webview
1. Click the **"+"** tab in Replit
2. Select **"Webview"**
3. It should automatically detect port 5000

## 📊 How to See Logs in Replit

### Console Logs
1. **Shell Tab**: Shows server logs (npm run dev output)
2. **Console Tab**: Shows JavaScript console logs from browser
3. **Terminal**: Run commands and see output

### Browser Developer Tools
1. Right-click in webview → **"Inspect"**
2. Go to **"Console"** tab to see frontend logs
3. Go to **"Network"** tab to see API calls

## 🔍 Current Server Status

```bash
# Your server is running and accessible:
✅ Vite dev server: http://localhost:5000/
✅ External access: http://172.31.105.194:5000/
✅ Port configuration: Fixed in .replit file
```

## 🚨 Common Fixes

### If Preview Doesn't Work:
1. **Check Port**: Make sure port 5000 is configured in `.replit` (✅ Done)
2. **Restart Replit**: Sometimes you need to restart the entire Repl
3. **Clear Browser Cache**: Hard refresh the webview (Ctrl+F5)
4. **Check Firewall**: Some networks block external ports

### If Logs Don't Show:
1. **Shell Tab**: Make sure you're looking at the right tab
2. **Console.log**: Add `console.log('Test')` to your code to verify
3. **Error Logs**: Check both server logs and browser console

### If Environment Issues:
1. **Environment Variables**: Check if your `.env` file is loaded
2. **Port Conflicts**: Make sure no other process is using port 5000

## 🔧 Manual Commands to Debug

```bash
# Check if server is running
curl -I http://localhost:5000

# Restart dev server
npm run dev

# Check for port conflicts
ps aux | grep vite

# Check environment
echo $PORT
```

## 📝 Your Current Configuration

**Package.json scripts**:
```json
"dev": "vite dev --host 0.0.0.0 --port 5000"
"start": "vite preview --host 0.0.0.0 --port 5000"
```

**Replit ports**:
```toml
[[ports]]
localPort = 5000
externalPort = 80
```

Your setup looks correct! If you're still having issues, try:
1. **Refreshing the webview**
2. **Restarting the Repl**  
3. **Checking for JavaScript errors in browser console**