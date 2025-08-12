#!/usr/bin/env node

/**
 * Test HTTP Transport for Excel Analyser MCP
 * 
 * This script demonstrates how to test the HTTP transport.
 * 
 * Usage:
 * 1. Start the HTTP server in one terminal:
 *    node excel-analyser-mcp.js streamableHttp
 * 
 * 2. Run this test in another terminal:
 *    node test-http-transport.js
 */

const testHttpTransport = async () => {
  console.log('🚀 Testing Excel Analyser MCP HTTP Transport');
  console.log('='.repeat(50));
  
  const baseUrl = 'http://localhost:8080/mcp';
  
  try {
    // Test basic connectivity
    console.log('📡 Testing HTTP endpoint...');
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ping'
      })
    });
    
    if (response.ok) {
      console.log('✅ HTTP transport is working!');
      console.log(`📍 Server running at: ${baseUrl}`);
    } else {
      console.log('❌ HTTP transport test failed');
      console.log(`Status: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log('❌ Failed to connect to HTTP transport');
    console.log(`Error: ${error.message}`);
    console.log('\n💡 Make sure to start the server first:');
    console.log('   node excel-analyser-mcp.js streamableHttp');
  }
  
  console.log('\n📚 More examples:');
  console.log('• Custom port: node excel-analyser-mcp.js streamableHttp 3000');
  console.log('• Custom endpoint: node excel-analyser-mcp.js streamableHttp 8080 /excel');
  console.log('• SSE transport: node excel-analyser-mcp.js sse');
};

// Run the test
testHttpTransport(); 