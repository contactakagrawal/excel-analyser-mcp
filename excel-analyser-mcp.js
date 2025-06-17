#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import XLSX from "xlsx";
import { parse } from "csv-parse/sync";

const server = new McpServer({
  name: "ExcelAnalyser",
  version: "1.0.0"
});

server.tool(
  "read_excel",
  {
    filePath: z.string().describe("Path to the Excel or CSV file on disk (.xlsx or .csv)"),
    columns: z.array(z.string()).optional().describe("Columns to include in the output. If not specified, all columns are included.")
  },
  async ({ filePath, columns }) => {
    try {
      // Validate file extension
      if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.csv')) {
        return {
          content: [{
            type: "text",
            text: `Only .xlsx and .csv files are supported. Provided: ${filePath}`
          }]
        };
      }
      // Read file from disk
      const fs = await import('fs/promises');
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          content: [{
            type: "text",
            text: `File does not exist: ${filePath}`
          }]
        };
      }
      const buffer = await fs.readFile(filePath);
      const CHUNK_SIZE = 20000;
      const result = {};
      if (filePath.endsWith('.xlsx')) {
        // Read workbook
        const workbook = XLSX.read(buffer, { type: "buffer" });
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          let data = XLSX.utils.sheet_to_json(sheet, { defval: null });
          // Filter columns if specified
          if (columns && columns.length > 0) {
            data = data.map(row => {
              const filtered = {};
              for (const col of columns) {
                filtered[col] = row[col];
              }
              return filtered;
            });
          }
          // For large data, return preview and metadata
          if (data.length > CHUNK_SIZE) {
            result[sheetName] = {
              preview: data.slice(0, 100),
              totalRows: data.length,
              columns: Object.keys(data[0] || {}),
              message: "Data is too large to return in one response. Please request specific chunks if needed."
            };
          } else {
            result[sheetName] = data;
          }
        }
      } else if (filePath.endsWith('.csv')) {
        // Parse CSV
        const csvString = buffer.toString();
        let data = parse(csvString, {
          columns: true,
          skip_empty_lines: true
        });
        // Filter columns if specified
        if (columns && columns.length > 0) {
          data = data.map(row => {
            const filtered = {};
            for (const col of columns) {
              filtered[col] = row[col];
            }
            return filtered;
          });
        }
        // For large data, return preview and metadata
        if (data.length > CHUNK_SIZE) {
          result["CSV"] = {
            preview: data.slice(0, 100),
            totalRows: data.length,
            columns: Object.keys(data[0] || {}),
            message: "Data is too large to return in one response. Please request specific chunks if needed."
          };
        } else {
          result["CSV"] = data;
        }
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to read or parse file: ${error.message}`
        }]
      };
    }
  }
);

server.tool(
  "get_chunk",
  {
    filePath: z.string().describe("Path to the Excel or CSV file on disk (.xlsx or .csv)"),
    columns: z.array(z.string()).optional().describe("Columns to include in the output. If not specified, all columns are included."),
    start: z.number().int().nonnegative().default(0).describe("Row index to start from (0-based)"),
    limit: z.number().int().positive().default(5000).describe("Number of rows to return in the chunk (default 5000)"),
  },
  async ({ filePath, columns, start = 0, limit = 5000 }) => {
    try {
      if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.csv')) {
        return {
          content: [{
            type: "text",
            text: `Only .xlsx and .csv files are supported. Provided: ${filePath}`
          }]
        };
      }
      const fs = await import('fs/promises');
      try {
        await fs.access(filePath);
      } catch {
        return {
          content: [{
            type: "text",
            text: `File does not exist: ${filePath}`
          }]
        };
      }
      const buffer = await fs.readFile(filePath);
      let data = [];
      if (filePath.endsWith('.xlsx')) {
        const XLSX = (await import('xlsx')).default;
        const workbook = XLSX.read(buffer, { type: "buffer" });
        // Use the first sheet by default
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet, { defval: null });
      } else if (filePath.endsWith('.csv')) {
        const { parse } = await import('csv-parse/sync');
        const csvString = buffer.toString();
        data = parse(csvString, {
          columns: true,
          skip_empty_lines: true
        });
      }
      // Filter columns if specified
      if (columns && columns.length > 0) {
        data = data.map(row => {
          const filtered = {};
          for (const col of columns) {
            filtered[col] = row[col];
          }
          return filtered;
        });
      }
      // Get the chunk
      const chunk = data.slice(start, start + limit);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            chunk,
            start,
            limit,
            totalRows: data.length
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to read or parse file: ${error.message}`
        }]
      };
    }
  }
);

// Extracted core logic for testing
export async function readExcelFile(filePath, columns) {
  try {
    if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.csv')) {
      return {
        content: [{
          type: "text",
          text: `Only .xlsx and .csv files are supported. Provided: ${filePath}`
        }]
      };
    }
    const fs = await import('fs/promises');
    try {
      await fs.access(filePath);
    } catch {
      return {
        content: [{
          type: "text",
          text: `File does not exist: ${filePath}`
        }]
      };
    }
    const buffer = await fs.readFile(filePath);
    const CHUNK_SIZE = 20000;
    const result = {};
    if (filePath.endsWith('.xlsx')) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        let data = XLSX.utils.sheet_to_json(sheet, { defval: null });
        if (columns && columns.length > 0) {
          data = data.map(row => {
            const filtered = {};
            for (const col of columns) {
              filtered[col] = row[col];
            }
            return filtered;
          });
        }
        if (data.length > CHUNK_SIZE) {
          result[sheetName] = {
            preview: data.slice(0, 100),
            totalRows: data.length,
            columns: Object.keys(data[0] || {}),
            message: "Data is too large to return in one response. Please request specific chunks if needed."
          };
        } else {
          result[sheetName] = data;
        }
      }
    } else if (filePath.endsWith('.csv')) {
      const csvString = buffer.toString();
      let data = parse(csvString, {
        columns: true,
        skip_empty_lines: true
      });
      if (columns && columns.length > 0) {
        data = data.map(row => {
          const filtered = {};
          for (const col of columns) {
            filtered[col] = row[col];
          }
          return filtered;
        });
      }
      if (data.length > CHUNK_SIZE) {
        result["CSV"] = {
          preview: data.slice(0, 100),
          totalRows: data.length,
          columns: Object.keys(data[0] || {}),
          message: "Data is too large to return in one response. Please request specific chunks if needed."
        };
      } else {
        result["CSV"] = data;
      }
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Failed to read or parse file: ${error.message}`
      }]
    };
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
