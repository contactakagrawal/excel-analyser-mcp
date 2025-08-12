#!/usr/bin/env node

// Test script to verify pagination logic
const testData = [];
for (let i = 0; i < 100; i++) {
  testData.push({ id: i, name: `Item ${i}` });
}

console.log("Testing pagination logic:");
console.log("Total items:", testData.length);

// Test different start and limit values
const testCases = [
  { start: 0, limit: 10 },
  { start: 10, limit: 10 },
  { start: 20, limit: 5 },
  { start: 0, limit: 5000 }
];

testCases.forEach(({ start, limit }) => {
  const chunk = testData.slice(start, start + limit);
  console.log(`\nstart: ${start}, limit: ${limit}`);
  console.log(`Returned ${chunk.length} items`);
  console.log(`First item id: ${chunk[0]?.id}, Last item id: ${chunk[chunk.length - 1]?.id}`);
});

// Test the actual function logic
async function testGetJsonChunk() {
  const fs = await import('fs/promises');
  
  // Create a test JSON file
  const testJsonData = [];
  for (let i = 0; i < 50; i++) {
    testJsonData.push({ 
      id: i, 
      name: `Test Item ${i}`,
      value: Math.random() * 100
    });
  }
  
  await fs.writeFile('test-pagination.json', JSON.stringify(testJsonData, null, 2));
  
  // Test different chunks
  const filePath = 'test-pagination.json';
  const fileContent = await fs.readFile(filePath, 'utf8');
  let data = JSON.parse(fileContent);
  
  console.log("\n=== Testing actual JSON chunk logic ===");
  
  const testChunks = [
    { start: 0, limit: 10 },
    { start: 10, limit: 10 },
    { start: 20, limit: 10 },
    { start: 0, limit: 5000 }
  ];
  
  testChunks.forEach(({ start, limit }) => {
    const chunk = data.slice(start, start + limit);
    console.log(`\nstart: ${start}, limit: ${limit}`);
    console.log(`Total data length: ${data.length}`);
    console.log(`Chunk length: ${chunk.length}`);
    if (chunk.length > 0) {
      console.log(`First item: ${JSON.stringify(chunk[0])}`);
      console.log(`Last item: ${JSON.stringify(chunk[chunk.length - 1])}`);
    }
  });
  
  // Clean up
  await fs.unlink('test-pagination.json');
}

testGetJsonChunk().catch(console.error); 