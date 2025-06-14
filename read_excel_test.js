import XLSX from "xlsx";
import fs from "fs/promises";

async function readExcel(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const result = {};
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      result[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Failed to read or parse Excel file:", error.message);
  }
}

const filePath = "/Users/amitagrawal/Documents/Amit/projects/MCP/dummy_excel_file.xlsx";;
readExcel(filePath);

// Direct import of .xlsx files is not supported. Please use fs and xlsx to read the file.
console.log("Direct import of .xlsx files is not supported. Please use fs and xlsx to read the file."); 