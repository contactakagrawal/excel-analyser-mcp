import { readExcelFile } from "../excel-analyser-mcp.js";
import path from "path";

// const csvPath = path.resolve("/Users/amitagrawal/Documents/Amit/projects/excel-analyser-mcp/NSE.csv"); // <-- Provide your own test CSV file path here
const xlsxPath = path.resolve("./tests/dummy_excel_file.xlsx"); // Sample Excel file included

async function run() {
  console.log("--- Reading CSV file ---");
  // const csvResult = await readExcelFile(csvPath);
  // console.log(csvResult);
  //console.log(JSON.stringify(csvResult, null, 2));

  //console.log("\n--- Reading XLSX file ---");
  // const xlsxResult = await readExcelFile(xlsxPath);
  // console.log(JSON.stringify(xlsxResult, null, 2));
}

run().catch(console.error); 