import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import XLSX from "xlsx";

const server = new McpServer({
  name: "ExcelAnalyser",
  version: "1.0.0"
});

server.tool(
  "read_excel",
  async () => {
    try {
      // Read file from disk
      const fs = await import('fs/promises');
      const filePath = "/Users/amitagrawal/Documents/Amit/projects/MCP/dummy_excel_file.xlsx";
      const buffer = await fs.readFile(filePath);
      // Read workbook
      const workbook = XLSX.read(buffer, { type: "buffer" });
      // Convert all sheets to JSON
      const result = {};
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        result[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: null });
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to read or parse Excel file: ${error.message}`
        }]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
