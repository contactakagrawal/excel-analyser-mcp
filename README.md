# Excel Analyser

A simple Node.js tool to read and analyse Excel (.xlsx) files using the Model Context Protocol (MCP) and the `xlsx` library.

## Features
- Reads Excel files and outputs all sheets as JSON
- CLI and MCP tool integration
- Sample test and Excel file included

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/yourusername/excel-analyser.git
cd excel-analyser
npm install
```

### Usage
#### Run the MCP Tool
```bash
node excel_analyser_mcp.js
```

#### Run the Test Script
```bash
node read_excel_test.js
```

The sample Excel file `dummy_excel_file.xlsx` is included for testing.

## Project Structure
- `excel_analyser_mcp.js` - Main MCP tool implementation
- `read_excel_test.js` - Standalone test script for reading Excel files
- `dummy_excel_file.xlsx` - Sample Excel file

## License
ISC 