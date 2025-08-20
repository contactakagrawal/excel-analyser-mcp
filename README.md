# Excel Analyser MCP

[![MCP Badge](https://lobehub.com/badge/mcp/contactakagrawal-excel-analyser-mcp)](https://lobehub.com/mcp/contactakagrawal-excel-analyser-mcp)
[![npm version](https://img.shields.io/npm/v/excel-analyser-mcp.svg)](https://www.npmjs.com/package/excel-analyser-mcp)
[![npm downloads](https://img.shields.io/npm/dt/excel-analyser-mcp.svg)](https://www.npmjs.com/package/excel-analyser-mcp)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](https://github.com/contactakagrawal/excel-analyser-mcp/blob/main/LICENSE)
[![MCP Server](https://img.shields.io/badge/MCP-Server-green.svg)](https://lobehub.com)

A Node.js MCP server for reading and analyzing Excel (.xlsx), CSV (.csv), and JSON (.json) files. Supports **multiple transport protocols** (stdio, HTTP, SSE) and designed for scalable, chunked, and column/field-specific data access, making it ideal for AI agents and automation workflows that need to process large datasets efficiently.

## 🚀 Quick Start - Configuration

Excel Analyser MCP supports multiple transport protocols: **stdio** (npm/CLI), **HTTP streamable**, and **SSE**.

### ⚡ Ready-to-Use HTTP Server (Recommended)
The fastest way to get started! Use our deployed server without any installation:

**MCP Client Configuration (HTTP - Ready to Use):**
```json
{
  "mcpServers": {
    "Excel Analyser MCP": {
      "type": "http",
      "url": "https://web-production-64851.up.railway.app/mcp"
    }
  }
}
```

🎉 **That's it!** No installation required. Start analyzing files immediately.

**📝 Example Usage Prompt (HTTP - Use Cloud URLs):**
```
Please analyze the Excel file at https://github.com/contactakagrawal/excel-analyser-mcp/raw/main/tests/dummy_excel_file.xlsx and show me the first few rows and column names.
```

**⚠️ Important for HTTP:** Use **cloud URLs** (GitHub raw, Google Drive public links, etc.) since the server runs remotely and cannot access your local files.

### NPM/Stdio Transport (Self-hosted)
Perfect for MCP clients like Claude Desktop, Cursor, and other CLI-based integrations.

**mcp.json Configuration:**
```json
{
  "mcpServers": {
    "Excel Analyser MCP": {
      "command": "npx",
      "args": ["-y", "excel-analyser-mcp"]
    }
  }
}
```

**📝 Example Usage Prompt (Stdio - Use Local Paths):**
```
Please analyze the Excel file at /Users/john/Documents/sales_data.xlsx and show me the first few rows and column names.
```

**⚠️ Important for Stdio:** Use **absolute local file paths** since the server runs on your machine and can access your local files directly.

### HTTP Transport (Self-hosted)
Ideal for web applications, REST API integrations, and serverless deployments.

**Start HTTP Server:**
```bash
# Default: runs on http://localhost:8080/mcp
npx excel-analyser-mcp streamableHttp

# Custom port and endpoint
npx excel-analyser-mcp streamableHttp 3000 /excel-mcp
```

**MCP Client Configuration (HTTP):**
```json
{
  "mcpServers": {
    "Excel Analyser MCP": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

**📝 Example Usage Prompt (Self-hosted HTTP - Use Local or Cloud URLs):**
```
Please analyze the Excel file at /Users/john/Documents/sales_data.xlsx and show me the first few rows and column names.
```

**⚠️ Important for Self-hosted HTTP:** You can use **local absolute paths** or **cloud URLs** since your server can access both local files and remote URLs.

### SSE Transport (Self-hosted)
For real-time streaming applications (deprecated but still supported).

**Start SSE Server:**
```bash
# Default: runs on http://localhost:8080/sse
npx excel-analyser-mcp sse

# Custom port and endpoint  
npx excel-analyser-mcp sse 3000 /excel-sse
```

**MCP Client Configuration (SSE):**
```json
{
  "mcpServers": {
    "Excel Analyser MCP": {
      "type": "sse", 
      "url": "http://localhost:8080/sse"
    }
  }
}
```

### Development Scripts (Self-hosted)
```bash
npm run start          # Default stdio transport
npm run start:stdio    # Explicit stdio transport  
npm run start:http     # HTTP transport on port 8080
npm run start:sse      # SSE transport on port 8080
```

---

## What's New in v2.1.0
- **🚀 Multi-Transport Support**: Now supports stdio (npm), HTTP streamable, and SSE transports for maximum flexibility
- **🔗 HTTP Transport**: Perfect for web applications and REST API integrations  
- **📡 SSE Transport**: Real-time streaming capabilities for advanced use cases
- **⚙️ Easy Configuration**: Simple command-line arguments to choose your preferred transport

## What's New in v2.0.0
- **New `query_json` Tool**: A powerful new tool for efficiently searching large JSON files based on field values.
- **Efficient Streaming**: All JSON tools (`read_json`, `query_json`, `get_json_chunk`) have been re-architected to use streaming. This means they can process gigabyte-sized files with minimal memory usage, preventing crashes and ensuring scalability.

## Features
- **Multi-Transport Support**: Choose between stdio (npm), HTTP streamable, or SSE transports
- **Read Excel/CSV/JSON files** and output all or selected columns/fields as JSON
- **Efficient Streaming**: Handle multi-gigabyte JSON files with constant, low memory usage.
- **Powerful JSON Querying**: Quickly search and filter large JSON files without loading the entire file into memory.
- **Chunked Access**: Process large files iteratively by fetching data in configurable chunks.
- **Column/Field filtering**: Extract only the columns or fields you need.
- **MCP server integration**: Expose tools for AI agents and automation.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)

### Installation
```bash
npm install
yarn install # or your preferred package manager
```

### Running the MCP Server
```bash
node excel-analyser-mcp.js
```

Or configure your MCP agent to launch this file with Node.js and --stdio.

---

## MCP Tools

### 1. `read_excel`
**Description:** Reads an Excel or CSV file and returns a preview (first 100 rows) and metadata for large files, or the full data for small files.

**Parameters:**
- `filePath` (string, required): Path to the Excel or CSV file on disk (.xlsx or .csv)
- `columns` (array of strings, optional): Columns to include in the output. If not specified, all columns are included.

**Returns:**
- For large files: `{ preview: [...], totalRows, columns, message }`
- For small files: Full data as an array

**Example Request:**
```json
{
  "filePath": "./your_data.csv",
  "columns": ["description", "category"]
}
```

---

### 2. `get_chunk`
**Description:** Fetches a chunk of rows from a CSV or Excel file, with optional column filtering. Useful for processing large files in batches.

**Parameters:**
- `filePath` (string, required): Path to the Excel or CSV file on disk (.xlsx or .csv)
- `columns` (array of strings, optional): Columns to include in the output
- `start` (integer, optional, default 0): Row index to start from (0-based)
- `limit` (integer, optional, default 1000): Number of rows to return in the chunk

**Returns:**
- `{ chunk: [...], start, limit, totalRows }`

**Example Request:**
```json
{
  "filePath": "./your_data.csv",
  "columns": ["description"],
  "start": 0,
  "limit": 1000
}
```

**Example Response:**
```json
{
  "chunk": [
    { "description": "Customer cannot login..." },
    { "description": "Payment failed for order..." }
    // ... up to 1000 rows
  ],
  "start": 0,
  "limit": 1000,
  "totalRows": 58635
}
```

---

### 3. `read_json`
**Description:** Efficiently reads a large JSON file to provide a quick preview (first 100 entries) and metadata without loading the entire file into memory. This is the recommended first step for analyzing a new JSON file.

**Parameters:**
- `filePath` (string, required): Path to the JSON file on disk (.json)
- `fields` (array of strings, optional): Fields to include in the output. If not specified, all fields are included.

**Returns:**
- For large files (>1000 entries): `{ preview: [...], totalEntries, fields, message }`
- For small files: Full data as an array

**Example Request:**
```json
{
  "filePath": "./employees.json",
  "fields": ["name", "department", "salary"]
}
```

**Example Response (large file):**
```json
{
  "JSON": {
    "preview": [
      { "name": "John Doe", "department": "Engineering", "salary": 75000 },
      { "name": "Jane Smith", "department": "Marketing", "salary": 65000 }
      // ... up to 100 entries
    ],
    "totalEntries": 15000,
    "fields": ["id", "name", "email", "age", "department", "salary"],
    "message": "Data is too large to return in one response. Use get_json_chunk for paginated access or query_json to search."
  }
}
```

---

### 4. `query_json`
**Description:** Performs a fast, memory-efficient search on a large JSON file. It streams the file and returns all entries that match the specified query, up to a limit of 1000 results. This is the ideal tool for finding specific data within a large dataset.

**Parameters:**
- `filePath` (string, required): Path to the JSON file on disk (.json).
- `query` (object, required): The query to execute on the JSON data.
  - `field` (string): The field to query (e.g., 'trading_symbol').
  - `operator` (enum): The query operator. Can be `contains`, `equals`, `startsWith`, or `endsWith`.
  - `value` (string): The value to match against.

**Returns:**
- `{ matches: [...], matchCount, totalEntriesScanned, message }`

**Example Request:**
```json
{
  "filePath": "/path/to/your/large_dataset.json",
  "query": {
    "field": "trading_symbol",
    "operator": "contains",
    "value": "TITAN"
  }
}
```

**Example Response:**
```json
{
  "matches": [
    { "instrument_key": "NSE_EQ|INE280A01028", "trading_symbol": "TITAN" },
    { "instrument_key": "NSE_EQ|INE280A01029", "trading_symbol": "TITANBEES" }
  ],
  "matchCount": 2,
  "totalEntriesScanned": 2500000,
  "message": "Query returned 2 matching entries."
}
```

---

### 5. `get_json_chunk`
**Description:** Fetches a specific chunk of entries from a JSON file. This tool is designed for **iterative analysis**, where you need to process every entry in the file sequentially, one chunk at a time. It uses efficient streaming to access the requested chunk without re-reading the whole file.

**Parameters:**
- `filePath` (string, required): Path to the JSON file on disk (.json)
- `fields` (array of strings, optional): Fields to include in the output
- `start` (integer, optional, default 0): Entry index to start from (0-based)
- `limit` (integer, optional, default 1000): Number of entries to return in the chunk

**Returns:**
- `{ chunk: [...], start, limit, totalEntries }`

**Example Request:**
```json
{
  "filePath": "./large_dataset.json",
  "fields": ["id", "name", "status"],
  "start": 0,
  "limit": 1000
}
```

**Example Response:**
```json
{
  "chunk": [
    { "id": 1, "name": "John Doe", "status": "active" },
    { "id": 2, "name": "Jane Smith", "status": "inactive" }
    // ... up to 1000 entries
  ],
  "start": 0,
  "limit": 1000,
  "totalEntries": 15000
}
```

---

## How to Choose the Right JSON Tool

Use this guide to select the most efficient tool for your task:

- **To explore a new JSON file:**
  - **1st:** Use `read_json`. It will give you the total number of entries, all available fields, and a preview of the first 100 entries.

- **To find specific data:**
  - **Use `query_json`**. It's the fastest and most memory-efficient way to search for entries that match a specific condition (e.g., find all users where `status` is `active`).

- **To process every entry:**
  - **Use `get_json_chunk`**. This is for when you need to perform an action on every single entry in the file, such as categorizing support tickets or performing a complex calculation. Call it in a loop, incrementing the `start` parameter, until you have processed all `totalEntries`.

## Usage with AI Agents
- Configure your AI agent (e.g., Cursor AI, Copilot) to connect to this MCP server.
- Use `read_excel` or `read_json` for a quick preview and metadata.
- Use `get_chunk` or `get_json_chunk` to iterate through large files in batches for scalable analysis.
- JSON files with more than 1000 entries automatically use pagination for optimal performance.

---

## Example Usage

Here's an example of how you can use this MCP server with an AI agent to analyze files.

**Important:** The MCP server requires **absolute file paths** for security and reliability reasons.

### Analyzing an Excel/CSV File

**Scenario:** You want to get a summary of `dummy_excel_file.xlsx`.

**1. Initial Request to AI Agent:**

> **You:** Can you analyze the file at `/home/john/documents/dummy_excel_file.xlsx` and give me the column names and the first few rows?

**2. AI Agent uses the `read_excel` tool:**

The agent would make a tool call similar to this:

```json
{
  "tool_name": "read_excel",
  "parameters": {
    "filePath": "/home/john/documents/dummy_excel_file.xlsx"
  }
}
```

**3. Response from the MCP Server:**

If the file is large, the server will return a preview:

```json
{
  "preview": [
    { "ID": 1, "Name": "John Doe", "Sales": 1500 },
    { "ID": 2, "Name": "Jane Smith", "Sales": 2200 }
  ],
  "totalRows": 10500,
  "columns": ["ID", "Name", "Sales"],
  "message": "File is large. Returning a preview of the first 100 rows."
}
```

### Searching a Large JSON File

**Scenario:** You want to find all stocks with "TITAN" in their trading symbol from a very large JSON file.

**1. Initial Request to AI Agent:**
> **You:** Can you find all entries in `/data/NSE.json` where the `trading_symbol` contains `TITAN`?

**2. AI Agent uses the `query_json` tool:**
```json
{
  "tool_name": "query_json",
  "parameters": {
    "filePath": "/data/NSE.json",
    "query": {
      "field": "trading_symbol",
      "operator": "contains",
      "value": "TITAN"
    }
  }
}
```

**3. Response from the MCP Server:**
```json
{
  "matches": [
    { "instrument_key": "NSE_EQ|INE280A01028", "trading_symbol": "TITAN" }
  ],
  "matchCount": 1,
  "totalEntriesScanned": 2500000,
  "message": "Query returned 1 matching entries."
}
```

### Analyzing a JSON File Iteratively

**Scenario:** You want to analyze a large JSON dataset of employee records, chunk by chunk.

**1. Initial Request to AI Agent:**

> **You:** Can you analyze the employee data in `/home/john/data/employees.json` and show me the first chunk?

**2. AI Agent uses the `get_json_chunk` tool:**

```json
{
  "tool_name": "get_json_chunk",
  "parameters": {
    "filePath": "/home/john/data/employees.json",
    "start": 0,
    "limit": 1000
  }
}
```

**3. Response for Large JSON File:**
```json
{
  "chunk": [
    { "id": 1, "name": "John Doe", "status": "active" }
  ],
  "start": 0,
  "limit": 1000,
  "totalEntries": 15000
}
```

---

## 🚀 Cloud Deployment

Deploy your MCP server to the internet so others can use it via HTTP transport!

### Quick Deploy to Railway
1. **Fork/clone** this repository
2. **Connect to Railway**: [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. **Access your server**: `https://your-app.railway.app/mcp`

### Use Your Deployed Server
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

📖 **Full deployment guide**: See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions, security considerations, and alternative platforms.

## 📚 Documentation

Additional documentation is available in the `docs/` directory:

- `docs/DEPLOYMENT.md` - Complete deployment guide for Railway and other cloud platforms
- `docs/URL_SUPPORT.md` - Guide for adding URL support to handle cloud-based file access

---

## Notes
- **Supported file types:** `.xlsx`, `.csv`, and `.json` files
- **JSON file requirements:** Must contain an array of objects
- **Excel files:** Only the first sheet is used by default in chunked operations
- **Automatic pagination:** JSON files with >1000 entries automatically use pagination
- **Chunk sizes:** Default 1000 for optimal performance, configurable per request
- **Error handling:** Comprehensive error messages for file not found, invalid formats, etc.

---

## Testing

The project includes test files for both Excel/CSV and JSON functionality in the `tests/` directory:

- `tests/test-readExcelFile.js` - Test Excel/CSV reading functionality
- `tests/test-readJsonFile.js` - Test JSON reading functionality  
- `tests/test-http-transport.js` - Test HTTP transport connectivity
- `tests/test-deployment.js` - Test deployed server functionality
- `tests/test-data.json` - Sample JSON file for testing
- `tests/dummy_excel_file.xlsx` - Sample Excel file for testing

To run tests:
```bash
# Test file processing
npm test                    # Excel/CSV test
npm run test-json          # JSON test
npm run test-all           # All file processing tests

# Test HTTP transport (requires server running)
npm run start:http         # Terminal 1: Start HTTP server
npm run test-http          # Terminal 2: Test HTTP connectivity

# Test deployed server
npm run test-deployment https://your-deployed-url.com
```

---

## Feedback & Support

We value your feedback and are committed to improving Excel Analyser MCP. Here are several ways you can reach out:

### 🐛 Found a Bug?
- **GitHub Issues**: [Report bugs here](https://github.com/contactakagrawal/excel-analyser-mcp/issues/new?assignees=&labels=bug&template=bug_report.md&title=%5BBUG%5D)
- Please include:
  - Steps to reproduce the issue
  - Expected vs actual behavior
  - File type and size (if applicable)
  - Error messages or logs

### 💡 Feature Requests & Enhancements
- **GitHub Issues**: [Request features here](https://github.com/contactakagrawal/excel-analyser-mcp/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=%5BFEATURE%5D)
- **GitHub Discussions**: [Start a discussion](https://github.com/contactakagrawal/excel-analyser-mcp/discussions) for ideas and general feedback

### 📝 General Feedback
- **Email**: [contactakagrawal@gmail.com](mailto:contactakagrawal@gmail.com)
- **GitHub Discussions**: [General feedback](https://github.com/contactakagrawal/excel-analyser-mcp/discussions/categories/general)

### 🤝 Contributing
We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information on how to:
- Submit pull requests
- Report issues
- Suggest improvements
- Help with documentation

### ⭐ Show Your Support
If you find this project helpful, please consider:
- Giving it a ⭐ star on GitHub
- Sharing it with others who might benefit
- Contributing to the codebase

---

## License
ISC