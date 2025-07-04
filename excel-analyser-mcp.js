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
              message: `The sheet '${sheetName}' contains ${data.length} rows, which is too large to return at once. A preview of the first 100 rows is shown. To access the full dataset, you must make sequential calls to the 'get_chunk' tool. It is your responsibility to track the 'start' and 'limit' parameters for pagination. The 'totalRows' is provided to help you.`
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
            message: `The CSV file contains ${data.length} rows, which is too large to return at once. A preview of the first 100 rows is shown. To access the full dataset, you must make sequential calls to the 'get_chunk' tool. It is your responsibility to track the 'start' and 'limit' parameters for pagination. The 'totalRows' is provided to help you.`
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
    limit: z.number().int().positive().default(1000).describe("Number of rows to return in the chunk (default 1000)"),
  },
  async ({ filePath, columns, start, limit }) => {
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

server.tool(
  "read_json",
  {
    filePath: z.string().describe("Path to the JSON file on disk (.json)"),
    fields: z.array(z.string()).optional().describe("Fields to include in the output. If not specified, all fields are included.")
  },
  async ({ filePath, fields }) => {
    try {
      // Validate file extension
      if (!filePath.endsWith('.json')) {
        return {
          content: [{
            type: "text",
            text: `Only .json files are supported. Provided: ${filePath}`
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
      
      const fileContent = await fs.readFile(filePath, 'utf8');
      let data = JSON.parse(fileContent);
      
      // Handle different JSON structures
      if (!Array.isArray(data)) {
        return {
          content: [{
            type: "text",
            text: `JSON file must contain an array of objects. Found: ${typeof data}`
          }]
        };
      }
      
      // Filter fields if specified
      if (fields && fields.length > 0 && data.length > 0) {
        data = data.map(item => {
          const filtered = {};
          for (const field of fields) {
            if (item.hasOwnProperty(field)) {
              filtered[field] = item[field];
            }
          }
          return filtered;
        });
      }
      
      const CHUNK_SIZE = 1000;
      const result = {};
      
      // For large data, return preview and metadata
      if (data.length > CHUNK_SIZE) {
        result["JSON"] = {
          preview: data.slice(0, 100),
          totalEntries: data.length,
          fields: data.length > 0 ? Object.keys(data[0] || {}) : [],
          message: `The JSON contains ${data.length} entries, which is too large to return at once. A preview of the first 100 entries is shown. To access the full dataset, you must make sequential calls to the 'get_json_chunk' tool. It is your responsibility to track the 'start' and 'limit' parameters for pagination. The 'totalEntries' is provided to help you.`
        };
      } else {
        result["JSON"] = data;
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
          text: `Failed to read or parse JSON file: ${error.message}`
        }]
      };
    }
  }
);

server.tool(
  "get_json_chunk",
  {
    filePath: z.string().describe("Path to the JSON file on disk (.json)"),
    fields: z.array(z.string()).optional().describe("Fields to include in the output. If not specified, all fields are included."),
    start: z.number().int().nonnegative().default(0).describe("Entry index to start from (0-based)"),
    limit: z.number().int().positive().default(1000).describe("Number of entries to return in the chunk (default 1000)"),
  },
  async ({ filePath, fields, start, limit }) => {
    try {
      // Debug: Log the actual parameters received
      console.log(`DEBUG get_json_chunk: filePath=${filePath}, start=${start}, limit=${limit}, fields=${fields ? fields.join(',') : 'null'}`);
      
      if (!filePath.endsWith('.json')) {
        return {
          content: [{
            type: "text",
            text: `Only .json files are supported. Provided: ${filePath}`
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
      
      const fileContent = await fs.readFile(filePath, 'utf8');
      let data = JSON.parse(fileContent);
      
      // Handle different JSON structures
      if (!Array.isArray(data)) {
        return {
          content: [{
            type: "text",
            text: `JSON file must contain an array of objects. Found: ${typeof data}`
          }]
        };
      }
      
      // Filter fields if specified
      if (fields && fields.length > 0 && data.length > 0) {
        data = data.map(item => {
          const filtered = {};
          for (const field of fields) {
            if (item.hasOwnProperty(field)) {
              filtered[field] = item[field];
            }
          }
          return filtered;
        });
      }
      
      // Get the chunk
      console.log(`DEBUG: data.length=${data.length}, slicing from ${start} to ${start + limit}`);
      const chunk = data.slice(start, start + limit);
      console.log(`DEBUG: chunk.length=${chunk.length}, first item id=${chunk[0]?.id || 'N/A'}, last item id=${chunk[chunk.length - 1]?.id || 'N/A'}`);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            chunk,
            start,
            limit,
            totalEntries: data.length,
            fields: data.length > 0 ? Object.keys(data[0] || {}) : []
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to read or parse JSON file: ${error.message}`
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

export async function readJsonFile(filePath, fields) {
  try {
    if (!filePath.endsWith('.json')) {
      return {
        content: [{
          type: "text",
          text: `Only .json files are supported. Provided: ${filePath}`
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
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    let data = JSON.parse(fileContent);
    
    if (!Array.isArray(data)) {
      return {
        content: [{
          type: "text",
          text: `JSON file must contain an array of objects. Found: ${typeof data}`
        }]
      };
    }
    
    if (fields && fields.length > 0 && data.length > 0) {
      data = data.map(item => {
        const filtered = {};
        for (const field of fields) {
          if (item.hasOwnProperty(field)) {
            filtered[field] = item[field];
          }
        }
        return filtered;
      });
    }
    
    const CHUNK_SIZE = 1000;
    const result = {};
    
    if (data.length > CHUNK_SIZE) {
      result["JSON"] = {
        preview: data.slice(0, 100),
        totalEntries: data.length,
        fields: data.length > 0 ? Object.keys(data[0] || {}) : [],
        message: `The JSON contains ${data.length} entries, which is too large to return at once. A preview of the first 100 entries is shown. To access the full dataset, you must make sequential calls to the 'get_json_chunk' tool. It is your responsibility to track the 'start' and 'limit' parameters for pagination. The 'totalEntries' is provided to help you.`
      };
    } else {
      result["JSON"] = data;
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
        text: `Failed to read or parse JSON file: ${error.message}`
      }]
    };
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
