import { readJsonFile } from './excel-analyser-mcp.js';

async function testReadJsonFile() {
  console.log('Testing readJsonFile function...');
  
  // Test with a sample JSON file (you can replace this path with an actual file)
  const testFilePath = './test-data.json';
  
  try {
    const result = await readJsonFile(testFilePath);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testReadJsonFile(); 