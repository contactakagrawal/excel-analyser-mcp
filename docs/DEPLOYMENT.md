# 🚀 Deployment Guide - Excel Analyser MCP

This guide will help you deploy Excel Analyser MCP to the cloud so others can use it via HTTP transport.

## 🛤️ Railway Deployment (Recommended)

### Step 1: Prepare Your Repository

1. **Clone/Fork the repository**
   ```bash
   git clone https://github.com/contactakagrawal/excel-analyser-mcp.git
   cd excel-analyser-mcp
   ```

2. **Verify files are in place**
   - ✅ `Procfile` (tells Railway how to start the server)
   - ✅ `package.json` (with updated dependencies)
   - ✅ `excel-analyser-mcp.js` (with HTTP transport support)

### Step 2: Deploy to Railway

#### Option A: Via Railway Dashboard
1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your excel-analyser-mcp repository
4. Railway will automatically detect it's a Node.js project
5. Deployment starts automatically!

#### Option B: Via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
railway up
```

### Step 3: Configure Environment (Optional)

In Railway dashboard → your project → Variables:
```
PORT=8080           # Railway sets this automatically
NODE_ENV=production # Optional: for production optimizations
```

### Step 4: Access Your Deployed Server

After deployment, Railway provides a URL like: `https://your-app.railway.app`

**Test endpoints:**
- **Health check**: `https://your-app.railway.app/health`
- **MCP endpoint**: `https://your-app.railway.app/mcp`

## 🔗 Using Your Deployed MCP Server

### For MCP Clients (Claude Desktop, Cursor, etc.)

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "Excel Analyser MCP (Cloud)": {
      "type": "http",
      "url": "https://your-app.railway.app/mcp"
    }
  }
}
```

### For Web Applications

```javascript
// Example: Connect from a web app
const mcpClient = new MCPClient({
  name: "MyApp",
  version: "1.0.0"
});

await mcpClient.connect({
  type: "httpStream",
  url: "https://your-app.railway.app/mcp"
});

// Use the tools
const result = await mcpClient.callTool({
  name: "read_excel",
  arguments: { filePath: "/path/to/file.xlsx" }
});
```

## 📁 File Access Considerations

**Important**: Your deployed server can only access files that are:

1. **Uploaded to the server** (need to implement file upload)
2. **Publicly accessible via URL** (modify tools to accept URLs)
3. **Included in the deployment** (static files)

### Solution Options:

#### Option 1: URL-based File Access
Modify tools to accept URLs:
```javascript
// Instead of local file path
{ filePath: "./data.xlsx" }

// Use public URLs
{ filePath: "https://example.com/data.xlsx" }
```

#### Option 2: Base64 File Upload
Accept base64-encoded file content:
```javascript
{
  fileContent: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQA...",
  fileName: "data.xlsx"
}
```

#### Option 3: Cloud Storage Integration
Integrate with AWS S3, Google Cloud Storage, etc.

## 🌐 Alternative Deployment Platforms

### Vercel
```bash
npm install -g vercel
vercel --prod
```

Add `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "excel-analyser-mcp.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/excel-analyser-mcp.js"
    }
  ]
}
```

### Heroku
```bash
# Install Heroku CLI, then:
heroku create your-app-name
git push heroku main
```

### Google Cloud Run
```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["node", "excel-analyser-mcp.js", "streamableHttp"]
```

## 🔒 Security Considerations

### For Production Deployment:

1. **Rate Limiting**
   ```javascript
   // Add rate limiting middleware
   const rateLimit = require('express-rate-limit');
   ```

2. **Authentication** (if needed)
   ```javascript
   // Add API key validation
   if (req.headers['x-api-key'] !== process.env.API_KEY) {
     return res.status(401).json({ error: 'Unauthorized' });
   }
   ```

3. **CORS Configuration**
   ```javascript
   // Restrict to specific origins in production
   res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
   ```

4. **File Size Limits**
   ```javascript
   // Limit file upload sizes
   const maxFileSize = 50 * 1024 * 1024; // 50MB
   ```

## 📊 Monitoring & Maintenance

### Health Checks
Your server includes a health check endpoint:
```
GET https://your-app.railway.app/health
```

### Logs
Check Railway dashboard → your project → Deployments → View logs

### Updates
Push to your GitHub repository → Railway auto-deploys

## 🆘 Troubleshooting

### Common Issues:

1. **Port Issues**
   - Ensure you're using `process.env.PORT`
   - Railway assigns port automatically

2. **File Access**
   - Remember: deployed server can't access local files
   - Use URLs or implement file upload

3. **CORS Errors**
   - Check allowed origins in CORS headers
   - Ensure proper headers for MCP

4. **Memory Limits**
   - Large files may exceed Railway's memory limits
   - Consider chunking or streaming for large files

### Getting Help:

- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: https://github.com/contactakagrawal/excel-analyser-mcp/issues
- **Email**: contactakagrawal@gmail.com

---

## 🎉 Success!

Once deployed, share your MCP server URL with others:

**Your MCP Server**: `https://your-app.railway.app/mcp`

Users can connect to it from any MCP-compatible client! 🚀 