# 🌐 URL Support for Cloud Deployment

When your MCP server is deployed to the cloud, it can't access local files. This guide shows how to extend the tools to support URL-based file access.

## 🔗 Current Challenge

**Local Development** (works):
```javascript
{
  "filePath": "./my-data.xlsx"  // ✅ Local file access
}
```

**Cloud Deployment** (doesn't work):
```javascript
{
  "filePath": "./my-data.xlsx"  // ❌ File not found on server
}
```

## 💡 Solution: URL Support

### Option 1: Public URLs

Support files hosted on the internet:

```javascript
{
  "filePath": "https://example.com/public-data.xlsx"  // ✅ Works in cloud
}
```

### Option 2: Base64 Content

Accept file content directly:

```javascript
{
  "fileContent": "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQA...",
  "fileName": "data.xlsx"
}
```

## 🛠️ Implementation Guide

### Step 1: Add URL Detection

```javascript
// In excel-analyser-mcp.js
const isUrl = (path) => {
  try {
    new URL(path);
    return true;
  } catch {
    return false;
  }
};
```

### Step 2: Add HTTP Fetch Function

```javascript
const fetchFileFromUrl = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }
  return await response.arrayBuffer();
};
```

### Step 3: Modify read_excel Tool

```javascript
server.tool(
  "read_excel",
  {
    filePath: z.string().describe("Path to Excel/CSV file on disk OR public URL"),
    columns: z.array(z.string()).optional()
  },
  async ({ filePath, columns }) => {
    try {
      let buffer;
      
      if (isUrl(filePath)) {
        // Fetch from URL
        console.error(`Fetching file from URL: ${filePath}`);
        buffer = Buffer.from(await fetchFileFromUrl(filePath));
      } else {
        // Read local file (for local development)
        const fs = await import('fs/promises');
        try {
          await fs.access(filePath);
          buffer = await fs.readFile(filePath);
        } catch {
          return {
            content: [{
              type: "text",
              text: `File not found: ${filePath}. For cloud deployment, use public URLs instead of local paths.`
            }]
          };
        }
      }
      
      // Rest of the existing logic...
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }]
      };
    }
  }
);
```

## 📋 Usage Examples

### For Users of Your Deployed Server

**Instead of local files**:
```json
{
  "name": "read_excel",
  "arguments": {
    "filePath": "./data.xlsx"  // ❌ Won't work in cloud
  }
}
```

**Use public URLs**:
```json
{
  "name": "read_excel", 
  "arguments": {
    "filePath": "https://github.com/user/repo/raw/main/data.xlsx"  // ✅ Works!
  }
}
```

**Or Google Sheets (as CSV)**:
```json
{
  "name": "read_excel",
  "arguments": {
    "filePath": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv"
  }
}
```

**Or Dropbox/OneDrive public links**:
```json
{
  "name": "read_excel",
  "arguments": {
    "filePath": "https://dropbox.com/s/abc123/data.xlsx?dl=1"
  }
}
```

## 🔐 Security Considerations

### For Production:

1. **URL Validation**
   ```javascript
   const allowedDomains = ['github.com', 'docs.google.com', 'dropbox.com'];
   const urlObj = new URL(filePath);
   if (!allowedDomains.includes(urlObj.hostname)) {
     throw new Error('Domain not allowed');
   }
   ```

2. **File Size Limits**
   ```javascript
   const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
   if (buffer.length > MAX_FILE_SIZE) {
     throw new Error('File too large');
   }
   ```

3. **Rate Limiting**
   ```javascript
   // Track requests per IP/session
   const requestCounts = new Map();
   // Implement rate limiting logic
   ```

## 📖 User Documentation

Update your README to include:

```markdown
## 🌐 Cloud Usage

When using the deployed server, provide public URLs instead of local file paths:

### ✅ Supported URL Sources:
- **GitHub**: `https://github.com/user/repo/raw/main/file.xlsx`
- **Google Sheets**: `https://docs.google.com/spreadsheets/d/ID/export?format=csv`
- **Dropbox**: `https://dropbox.com/s/abc123/file.xlsx?dl=1`
- **OneDrive**: Public share links
- **Any public web server**: Direct file URLs

### 📝 Example Usage:
```json
{
  "name": "read_excel",
  "arguments": {
    "filePath": "https://github.com/user/data/raw/main/sales.xlsx",
    "columns": ["date", "revenue", "region"]
  }
}
```

### 🚫 What Doesn't Work:
- Local file paths: `./data.xlsx`
- Private URLs requiring authentication
- Files larger than 50MB
```

## 🧪 Testing URL Support

Create a test script:

```javascript
// test-url-support.js
const testUrls = [
  'https://github.com/contactakagrawal/excel-analyser-mcp/raw/main/dummy_excel_file.xlsx',
  'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv'
];

testUrls.forEach(async (url) => {
  console.log(`Testing: ${url}`);
  // Test your MCP server with this URL
});
```

## 🎯 Next Steps

1. **Implement URL support** in your tools
2. **Test with public URLs**
3. **Update documentation** 
4. **Deploy to Railway**
5. **Share with users**

This approach makes your cloud-deployed MCP server much more useful! 🚀 