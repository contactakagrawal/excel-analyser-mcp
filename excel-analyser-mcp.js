#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from 'http';
import { z } from "zod";
import XLSX from "xlsx";
import { parse } from "csv-parse/sync";
import { chain } from 'stream-chain';
import parser from 'stream-json/Parser.js';
import streamArray from 'stream-json/streamers/StreamArray.js';
import path from 'path';

const server = new McpServer({
  name: "ExcelAnalyser",
  version: "1.0.0"
});

// Helper function to detect if a path is a URL
const isUrl = (path) => {
  try {
    new URL(path);
    return true;
  } catch {
    return false;
  }
};

// Helper function to fetch file from URL
const fetchFileFromUrl = async (url) => {
  console.error(`Fetching file from URL: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }
  return await response.arrayBuffer();
};

server.tool(
  "read_excel",
  {
    filePath: z.string().describe("Path to Excel/CSV file on disk OR public URL (.xlsx or .csv). Examples: './data.xlsx', '/path/to/file.csv', 'https://example.com/data.xlsx'"),
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
      // Read file (local or URL)
      let buffer;
      
      if (isUrl(filePath)) {
        // Fetch from URL
        buffer = Buffer.from(await fetchFileFromUrl(filePath));
      } else {
        // Read local file
        const fs = await import('fs/promises');
        try {
          const normalizedPath = path.normalize(filePath);
          await fs.access(normalizedPath);
          buffer = await fs.readFile(normalizedPath);
        } catch {
          return {
            content: [{
              type: "text",
              text: `File does not exist: ${filePath}. For cloud files, use public URLs like 'https://example.com/file.xlsx'`
            }]
          };
        }
      }
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
              message: `The sheet '${sheetName}' contains ${data.length} rows, which is too large to return at once. A preview of the first 100 rows is shown. To access the full dataset, you must make sequential calls to the 'get_chunk' tool. It is your responsibility to track the 'start' and 'limit' parameters for pagination. Please note that the 'limit' parameter must not exceed 1000. The 'totalRows' is provided to help you. For example, the first call would be get_chunk(filePath='${filePath}', start=0, limit=1000), and the second call would be get_chunk(filePath='${filePath}', start=1000, limit=1000).`
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
            message: `The CSV file contains ${data.length} rows, which is too large to return at once. A preview of the first 100 rows is shown. To access the full dataset, you must make sequential calls to the 'get_chunk' tool. It is your responsibility to track the 'start' and 'limit' parameters for pagination. Please note that the 'limit' parameter must not exceed 1000. The 'totalRows' is provided to help you. For example, the first call would be get_chunk(filePath='${filePath}', start=0, limit=1000), and the second call would be get_chunk(filePath='${filePath}', start=1000, limit=1000).`
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
    filePath: z.string().describe("Path to Excel/CSV file on disk OR public URL (.xlsx or .csv). Examples: './data.xlsx', '/path/to/file.csv', 'https://example.com/data.xlsx'"),
    columns: z.array(z.string()).optional().describe("Columns to include in the output. If not specified, all columns are included."),
    start: z.number().int().nonnegative().default(0).describe("Row index to start from (0-based)"),
    limit: z.number().int().positive().default(1000).describe("Number of rows to return in the chunk (default 1000)"),
  },
  async ({ filePath, columns, start, limit }) => {
    try {
      if (limit > 1000) {
        return {
          content: [{
            type: "text",
            text: `The 'limit' parameter cannot exceed 1000. Please adjust your request. For example, to get the first 1000 rows, use get_chunk(filePath='${filePath}', start=0, limit=1000). To get the next 1000 rows, use get_chunk(filePath='${filePath}', start=1000, limit=1000).`
          }]
        };
      }
      if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.csv')) {
        return {
          content: [{
            type: "text",
            text: `Only .xlsx and .csv files are supported. Provided: ${filePath}`
          }]
        };
      }
      // Read file (local or URL)
      let buffer;
      
      if (isUrl(filePath)) {
        // Fetch from URL
        buffer = Buffer.from(await fetchFileFromUrl(filePath));
      } else {
        // Read local file
        const fs = await import('fs/promises');
        try {
          const normalizedPath = path.normalize(filePath);
          await fs.access(normalizedPath);
          buffer = await fs.readFile(normalizedPath);
        } catch {
          return {
            content: [{
              type: "text",
              text: `File does not exist: ${filePath}. For cloud files, use public URLs like 'https://example.com/file.xlsx'`
            }]
          };
        }
      }
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
    filePath: z.string().describe("Path to JSON file on disk OR public URL (.json). Examples: './data.json', '/path/to/file.json', 'https://example.com/data.json'"),
    fields: z.array(z.string()).optional().describe("Fields to include in the output. If not specified, all fields are included.")
  },
  async ({ filePath, fields }) => {
    const fs = await import('fs');
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
      
      // Create readable stream (local file or URL)
      let readableStream;
      
      if (isUrl(filePath)) {
        // Fetch from URL and create stream
        const response = await fetch(filePath);
        if (!response.ok) {
          return {
            content: [{
              type: "text",
              text: `Failed to fetch URL: ${response.status} ${response.statusText}`
            }]
          };
        }
        readableStream = response.body;
      } else {
        // Check if local file exists
        try {
          const normalizedPath = path.normalize(filePath);
          await fs.promises.access(normalizedPath);
          readableStream = fs.createReadStream(normalizedPath);
        } catch {
          return {
            content: [{
              type: "text",
              text: `File does not exist: ${filePath}. For cloud files, use public URLs like 'https://example.com/file.json'`
            }]
          };
        }
      }

      const dataPromise = new Promise((resolve, reject) => {
        const preview = [];
        let totalEntries = 0;
        let fieldNames = [];
        const PREVIEW_LIMIT = 100;

        const pipeline = chain([
            readableStream,
            new parser(),
            new streamArray()
        ]);

        pipeline.on('data', ({ value }) => {
            if (totalEntries === 0 && value) {
                fieldNames = Object.keys(value);
            }
            totalEntries++;

            if (preview.length < PREVIEW_LIMIT) {
                let item = value;
                if (fields && fields.length > 0) {
                    const filtered = {};
                    for (const field of fields) {
                        if (item.hasOwnProperty(field)) {
                            filtered[field] = item[field];
                        }
                    }
                    preview.push(filtered);
                } else {
                    preview.push(item);
                }
            }
        });

        pipeline.on('end', () => {
            resolve({ preview, totalEntries, fieldNames });
        });

        pipeline.on('error', reject);
      });

      const { preview, totalEntries, fieldNames } = await dataPromise;
      
      const result = {
        "JSON": {
          preview,
          totalEntries,
          fields: fieldNames,
          message: `The JSON contains ${totalEntries} entries. A preview of the first ${Math.min(totalEntries, 100)} entries is shown. To access the full dataset, you must make sequential calls to the 'get_json_chunk' tool. It is your responsibility to track the 'start' and 'limit' parameters for pagination. Please note that the 'limit' parameter must not exceed 1000. The 'totalEntries' is provided to help you. For example, the first call would be get_json_chunk(filePath='${filePath}', start=0, limit=1000).`
        }
      };
      
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
  "query_json",
  {
    filePath: z.string().describe("Path to the JSON file on disk (.json)"),
    query: z.object({
      field: z.string().describe("The field to query (e.g., 'trading_symbol')"),
      operator: z.enum(["contains", "equals", "startsWith", "endsWith"]).describe("The query operator"),
      value: z.string().describe("The value to match against")
    }).describe("The query to execute on the JSON data")
  },
  async ({ filePath, query }) => {
    const fs = await import('fs');
    const MAX_RESULTS = 1000;
    try {
      if (!filePath.endsWith('.json')) {
        return { content: [{ type: "text", text: `Only .json files are supported. Provided: ${filePath}` }] };
      }
      
      const normalizedPath = path.normalize(filePath);
      await fs.promises.access(normalizedPath);

      const dataPromise = new Promise((resolve, reject) => {
        const results = [];
        let totalEntries = 0;

        const pipeline = chain([
            fs.createReadStream(normalizedPath),
            new parser(),
            new streamArray()
        ]);

        pipeline.on('data', ({ value }) => {
            totalEntries++;
            let isMatch = false;
            const fieldValue = value[query.field];

            if (fieldValue !== undefined && fieldValue !== null) {
              const strFieldValue = String(fieldValue);
              switch (query.operator) {
                case 'contains':
                  isMatch = strFieldValue.includes(query.value);
                  break;
                case 'equals':
                  isMatch = strFieldValue === query.value;
                  break;
                case 'startsWith':
                  isMatch = strFieldValue.startsWith(query.value);
                  break;
                case 'endsWith':
                  isMatch = strFieldValue.endsWith(query.value);
                  break;
              }
            }
            
            if (isMatch && results.length < MAX_RESULTS) {
                results.push(value);
            }
        });

        pipeline.on('end', () => {
            resolve({ results, totalEntries });
        });

        pipeline.on('error', reject);
      });

      const { results, totalEntries } = await dataPromise;
      
      let message = `Query returned ${results.length} matching entries.`;
      if (results.length >= MAX_RESULTS) {
        message += ` (Note: Results are capped at ${MAX_RESULTS}. The query may have more matches.)`;
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            matches: results,
            matchCount: results.length,
            totalEntriesScanned: totalEntries,
            message: message
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to query JSON file: ${error.message}`
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
    const fs = await import('fs');
    try {
      if (limit > 1000) {
        return {
          content: [{
            type: "text",
            text: `The 'limit' parameter cannot exceed 1000. Please adjust your request. For example, to get the first 1000 entries, use get_json_chunk(filePath='${filePath}', start=0, limit=1000). To get the next 1000 entries, use get_json_chunk(filePath='${filePath}', start=1000, limit=1000).`
          }]
        };
      }
      
      if (!filePath.endsWith('.json')) {
        return {
          content: [{
            type: "text",
            text: `Only .json files are supported. Provided: ${filePath}`
          }]
        };
      }
      
      const normalizedPath = path.normalize(filePath);
      await fs.promises.access(normalizedPath);
      
      const dataPromise = new Promise((resolve, reject) => {
        const chunk = [];
        let totalEntries = 0;

        const pipeline = chain([
            fs.createReadStream(normalizedPath),
            new parser(),
            new streamArray()
        ]);

        pipeline.on('data', ({ key, value }) => {
            totalEntries++;

            if (key >= start && key < start + limit) {
                let item = value;
                if (fields && fields.length > 0) {
                    const filtered = {};
                    for (const field of fields) {
                        if (item.hasOwnProperty(field)) {
                            filtered[field] = item[field];
                        }
                    }
                    chunk.push(filtered);
                } else {
                    chunk.push(item);
                }
            }
        });

        pipeline.on('end', () => {
            resolve({ chunk, totalEntries });
        });

        pipeline.on('error', reject);
      });

      const { chunk, totalEntries } = await dataPromise;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            chunk,
            start,
            limit,
            totalEntries: totalEntries
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
    const normalizedPath = path.normalize(filePath);
    let buffer;
    try {
      await fs.access(normalizedPath);
      buffer = await fs.readFile(normalizedPath);
    } catch {
      return {
        content: [{
          type: "text",
          text: `File does not exist: ${filePath}`
        }]
      };
    }
    
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
  const fs = await import('fs');
  const normalizedPath = path.normalize(filePath);
  try {
    if (!filePath.endsWith('.json')) {
      return {
        content: [{
          type: "text",
          text: `Only .json files are supported. Provided: ${filePath}`
        }]
      };
    }
    
    try {
      await fs.promises.access(normalizedPath);
    } catch {
      return {
        content: [{
          type: "text",
          text: `File does not exist: ${filePath}`
        }]
      };
    }
    
    const dataPromise = new Promise((resolve, reject) => {
      const preview = [];
      let totalEntries = 0;
      let fieldNames = [];
      const PREVIEW_LIMIT = 100;

      const pipeline = chain([
          fs.createReadStream(normalizedPath),
          new parser(),
          new streamArray()
      ]);

      pipeline.on('data', ({ value }) => {
          if (totalEntries === 0 && value) {
              fieldNames = Object.keys(value);
          }
          totalEntries++;

          if (preview.length < PREVIEW_LIMIT) {
              let item = value;
              if (fields && fields.length > 0) {
                  const filtered = {};
                  for (const field of fields) {
                      if (item.hasOwnProperty(field)) {
                          filtered[field] = item[field];
                      }
                  }
                  preview.push(filtered);
              } else {
                  preview.push(item);
              }
          }
      });

      pipeline.on('end', () => {
          resolve({ preview, totalEntries, fieldNames });
      });

      pipeline.on('error', reject);
    });

    const { preview, totalEntries, fieldNames } = await dataPromise;
    
    const result = {
      "JSON": {
        preview,
        totalEntries,
        fields: fieldNames,
        message: `The JSON contains ${totalEntries} entries. A preview of the first ${Math.min(totalEntries, 100)} entries is shown. To access the full dataset, you must make sequential calls to the 'get_json_chunk' tool. It is your responsibility to track the 'start' and 'limit' parameters for pagination. Please note that the 'limit' parameter must not exceed 1000. The 'totalEntries' is provided to help you. For example, the first call would be get_json_chunk(filePath='${filePath}', start=0, limit=1000).`
      }
    };
    
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
  const args = process.argv.slice(2);
  const transportType = args[0] || 'stdio';
  
  switch (transportType) {
    case 'stdio':
      const stdioTransport = new StdioServerTransport();
      console.error('Excel Analyser MCP server running on stdio');
      await server.connect(stdioTransport);
      break;
      
    case 'sse':
      const ssePort = parseInt(args[1]) || 8080;
      const sseEndpoint = args[2] || '/sse';
      const sseTransport = new SSEServerTransport(sseEndpoint, { port: ssePort });
      console.error(`Excel Analyser MCP server running on SSE at http://localhost:${ssePort}${sseEndpoint}`);
      await server.connect(sseTransport);
      break;
      
    case 'streamableHttp':
    case 'stream':
      const httpPort = parseInt(args[1]) || parseInt(process.env.PORT) || 8080;
      const httpEndpoint = args[2] || '/mcp';
      
      // Create HTTP transport with session management
      const httpTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => Math.random().toString(36).substring(2, 15),
      });
      
      // Create HTTP server
      const httpServer = createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        // Health check endpoint
        if (req.url === '/health' || req.url === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'healthy', 
            service: 'Excel Analyser MCP',
            version: '2.1.0',
            endpoints: {
              mcp: httpEndpoint,
              health: '/health',
              upload: '/upload'
            },
            usage: {
              description: 'Excel Analyser MCP Server - Analyze Excel, CSV, and JSON files',
              documentation: 'https://github.com/contactakagrawal/excel-analyser-mcp#readme',
              mcpConnection: `Connect your MCP client to: ${req.headers.host}${httpEndpoint}`
            }
          }));
          return;
        }
        
        // File upload endpoint for web-based usage
        if (req.url === '/upload' && req.method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            message: 'File upload endpoint - Implementation depends on your storage needs',
            suggestion: 'For production, consider using cloud storage (AWS S3, etc.) or base64 encoding in MCP tool calls'
          }));
          return;
        }
        
        // Only handle requests to our MCP endpoint
        if (req.url === httpEndpoint) {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              try {
                const parsedBody = JSON.parse(body);
                await httpTransport.handleRequest(req, res, parsedBody);
              } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
          } else if (req.method === 'GET' || req.method === 'DELETE') {
            await httpTransport.handleRequest(req, res);
          } else {
            res.writeHead(405);
            res.end('Method Not Allowed');
          }
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });
      
      // Start HTTP server
      await new Promise((resolve, reject) => {
        httpServer.listen(httpPort, '0.0.0.0', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const serverUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}${httpEndpoint}`
        : `http://localhost:${httpPort}${httpEndpoint}`;
      
      console.error(`Excel Analyser MCP server running on HTTP at ${serverUrl}`);
      
      // Handle server errors
      httpServer.on('error', (error) => {
        console.error('HTTP Server error:', error);
      });
      
      // Connect the MCP server to the transport
      await server.connect(httpTransport);
      break;
      
    default:
      console.error('Usage: excel-analyser-mcp [stdio|sse|streamableHttp] [port] [endpoint]');
      console.error('  stdio - Use stdio transport (default)');
      console.error('  sse <port> <endpoint> - Use SSE transport (default: port 8080, endpoint /sse)');
      console.error('  streamableHttp <port> <endpoint> - Use HTTP transport (default: port 8080, endpoint /mcp)');
      process.exit(1);
  }
}

main().catch(console.error);
