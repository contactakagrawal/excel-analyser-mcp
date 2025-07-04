# Excel Analyser MCP

[![MCP Badge](https://lobehub.com/badge/mcp/contactakagrawal-excel-analyser-mcp)](https://lobehub.com/mcp/contactakagrawal-excel-analyser-mcp)
[![npm version](https://img.shields.io/npm/v/excel-analyser-mcp.svg)](https://www.npmjs.com/package/excel-analyser-mcp)
[![npm downloads](https://img.shields.io/npm/dt/excel-analyser-mcp.svg)](https://www.npmjs.com/package/excel-analyser-mcp)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](https://github.com/contactakagrawal/excel-analyser-mcp/blob/main/LICENSE)
[![MCP Server](https://img.shields.io/badge/MCP-Server-green.svg)](https://lobehub.com)

A Node.js MCP server for reading and analyzing Excel (.xlsx), CSV (.csv), and JSON (.json) files. Designed for scalable, chunked, and column/field-specific data access, making it ideal for AI agents and automation workflows that need to process large datasets efficiently.

## Features
- **Read Excel/CSV/JSON files** and output all or selected columns/fields as JSON
- **Chunked access**: Efficiently handle very large files by fetching data in configurable chunks
- **Column/Field filtering**: Extract only the columns or fields you need
- **Automatic pagination**: JSON files with >1000 entries are automatically paginated
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
**Description:** Reads a JSON file containing an array of objects and returns a preview (first 100 entries) and metadata for large files, or the full data for small files.

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
    "message": "Data is too large to return in one response. Use get_json_chunk for paginated access."
  }
}
```

---

### 4. `get_json_chunk`
**Description:** Fetches a chunk of entries from a JSON file, with optional field filtering. Useful for processing large JSON files in batches with automatic pagination.

**Parameters:**
- `filePath` (string, required): Path to the JSON file on disk (.json)
- `fields` (array of strings, optional): Fields to include in the output
- `start` (integer, optional, default 0): Entry index to start from (0-based)
- `limit` (integer, optional, default 1000): Number of entries to return in the chunk

**Returns:**
- `{ chunk: [...], start, limit, totalEntries, fields }`

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
  "totalEntries": 15000,
  "fields": ["id", "name", "email", "age", "department", "salary", "status"]
}
```

---

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

### Analyzing a JSON File

**Scenario:** You want to analyze a large JSON dataset of employee records.

**1. Initial Request to AI Agent:**

> **You:** Can you analyze the employee data in `/home/john/data/employees.json` and show me the available fields?

**2. AI Agent uses the `read_json` tool:**

```json
{
  "tool_name": "read_json",
  "parameters": {
    "filePath": "/home/john/data/employees.json"
  }
}
```

**3. Response for Large JSON File:**

```json
{
  "JSON": {
    "preview": [
      { "id": 1, "name": "John Doe", "department": "Engineering", "salary": 75000 },
      { "id": 2, "name": "Jane Smith", "department": "Marketing", "salary": 65000 }
    ],
    "totalEntries": 8500,
    "fields": ["id", "name", "email", "age", "department", "salary"],
    "message": "Data is too large to return in one response. Use get_json_chunk for paginated access."
  }
}
```

**4. AI Agent provides the summary:**

> **Agent:** The JSON file contains employee records with the following fields: `id`, `name`, `email`, `age`, `department`, and `salary`. The file has 8,500 total entries. Here are the first two records:
>
> *   ID: 1, Name: John Doe, Department: Engineering, Salary: 75000
> *   ID: 2, Name: Jane Smith, Department: Marketing, Salary: 65000
>
> You can use the `get_json_chunk` tool to process the data in batches for analysis.

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
- **Supported file types:** `.xlsx`, `.csv`, and `.json` files
- **JSON file requirements:** Must contain an array of objects
- **Excel files:** Only the first sheet is used by default in chunked operations
- **Automatic pagination:** JSON files with >1000 entries automatically use pagination
- **Chunk sizes:** Default 1000 for optimal performance, configurable per request
- **Error handling:** Comprehensive error messages for file not found, invalid formats, etc.

---

## Testing

The project includes test files for both Excel/CSV and JSON functionality:

- `test-readExcelFile.js` - Test Excel/CSV reading functionality
- `test-readJsonFile.js` - Test JSON reading functionality
- `test-data.json` - Sample JSON file for testing

To run tests:
```bash
node test-readExcelFile.js
node test-readJsonFile.js
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