# Excel Analyser MCP

[![MCP Badge](https://lobehub.com/badge/mcp/contactakagrawal-excel-analyser-mcp)](https://lobehub.com/mcp/contactakagrawal-excel-analyser-mcp)
[![npm version](https://img.shields.io/npm/v/excel-analyser-mcp.svg)](https://www.npmjs.com/package/excel-analyser-mcp)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](https://github.com/contactakagrawal/excel-analyser-mcp/blob/main/LICENSE)
[![MCP Server](https://img.shields.io/badge/MCP-Server-green.svg)](https://lobehub.com)

A Node.js MCP server for reading and analyzing Excel (.xlsx) and CSV (.csv) files. Designed for scalable, chunked, and column-specific data access, making it ideal for AI agents and automation workflows that need to process large datasets efficiently.

## Features
- **Read Excel/CSV files** and output all or selected columns as JSON
- **Chunked access**: Efficiently handle very large files by fetching data in configurable chunks
- **Column filtering**: Extract only the columns you need
- **MCP server integration**: Expose tools for AI agents and automation

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
- `limit` (integer, optional, default 5000): Number of rows to return in the chunk

**Returns:**
- `{ chunk: [...], start, limit, totalRows }`

**Example Request:**
```json
{
  "filePath": "./your_data.csv",
  "columns": ["description"],
  "start": 0,
  "limit": 5000
}
```

**Example Response:**
```json
{
  "chunk": [
    { "description": "Customer cannot login..." },
    { "description": "Payment failed for order..." }
    // ... up to 5000 rows
  ],
  "start": 0,
  "limit": 5000,
  "totalRows": 58635
}
```

---

## Usage with AI Agents
- Configure your AI agent (e.g., Cursor AI, Copilot) to connect to this MCP server.
- Use `read_excel` for a quick preview and metadata.
- Use `get_chunk` to iterate through large files in batches for scalable analysis (e.g., categorizing ticket descriptions).

---

## Example Usage

Here's an example of how you can use this MCP server with an AI agent to analyze an Excel file.

**Important:** The MCP server requires **absolute file paths** for security and reliability reasons.

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
If the file is small, the full content is returned.

**4. AI Agent provides the summary:**

> **Agent:** The Excel file has the following columns: `ID`, `Name`, and `Sales`. Here are the first two rows:
>
> *   ID: 1, Name: John Doe, Sales: 1500
> *   ID: 2, Name: Jane Smith, Sales: 2200
>
> The file contains a total of 10,500 rows. You can use the `get_chunk` tool to process it in batches if needed.

This example illustrates how the `read_excel` tool can be used for initial data exploration.

---

## Example: mcp.json Configuration
To use this server with an MCP-compatible agent, add the following to your `mcp.json`:

```json
{
  "mcpServers": {
    "Excel Analyser MCP": {
      "command": "npx",
      "args": ["-y", "excel-analyser-mcp", "--stdio"]
    }
  }
}
```

---

## Notes
- Only `.xlsx` and `.csv` files are supported.
- For Excel files, only the first sheet is used by default in `get_chunk`.
- Errors (e.g., file not found, invalid parameters) are returned as plain text.

---

## License
ISC 