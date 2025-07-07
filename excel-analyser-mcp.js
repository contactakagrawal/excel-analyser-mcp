#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import XLSX from "xlsx";
import { parse } from "csv-parse/sync";
import { chain } from 'stream-chain';
import parser from 'stream-json/Parser.js';
import streamArray from 'stream-json/streamers/StreamArray.js';

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
    filePath: z.string().describe("Path to the Excel or CSV file on disk (.xlsx or .csv)"),
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
      
      // Check if file exists
      try {
        await fs.promises.access(filePath);
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
            fs.createReadStream(filePath),
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
      
      await fs.promises.access(filePath);

      const dataPromise = new Promise((resolve, reject) => {
        const results = [];
        let totalEntries = 0;

        const pipeline = chain([
            fs.createReadStream(filePath),
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
      
      await fs.promises.access(filePath);
      
      const dataPromise = new Promise((resolve, reject) => {
        const chunk = [];
        let totalEntries = 0;

        const pipeline = chain([
            fs.createReadStream(filePath),
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
  const fs = await import('fs');
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
      await fs.promises.access(filePath);
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
          fs.createReadStream(filePath),
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
