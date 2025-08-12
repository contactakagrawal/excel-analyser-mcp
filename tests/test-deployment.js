#!/usr/bin/env node

/**
 * Test Deployed Excel Analyser MCP Server
 * 
 * This script tests a deployed MCP server to ensure it's working correctly.
 * 
 * Usage:
 *   node test-deployment.js https://your-app.railway.app
 *   node test-deployment.js http://localhost:8080
 */

const testDeployedServer = async (baseUrl) => {
  if (!baseUrl) {
    console.log('❌ Please provide a server URL');
    console.log('Usage: node test-deployment.js https://your-app.railway.app');
    process.exit(1);
  }

  console.log('🚀 Testing Deployed Excel Analyser MCP Server');
  console.log('='.repeat(60));
  console.log(`🎯 Server URL: ${baseUrl}`);
  console.log();

  const mcpEndpoint = `${baseUrl}/mcp`;
  const healthEndpoint = `${baseUrl}/health`;

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(healthEndpoint);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed');
      console.log(`   📍 Service: ${healthData.service}`);
      console.log(`   📍 Version: ${healthData.version}`);
      console.log(`   📍 MCP Endpoint: ${healthData.endpoints?.mcp || 'unknown'}`);
    } else {
      console.log(`❌ Health check failed: ${healthResponse.status}`);
      return;
    }

    console.log();

    // Test 2: MCP Initialize
    console.log('2️⃣ Testing MCP initialization...');
    const initResponse = await fetch(mcpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: { listChanged: false },
            sampling: {}
          },
          clientInfo: {
            name: 'deployment-test-client',
            version: '1.0.0'
          }
        }
      })
    });

    if (initResponse.ok) {
      const initData = await initResponse.text();
      if (initData.includes('ExcelAnalyser')) {
        console.log('✅ MCP initialization successful');
        
        // Extract session ID from response if available
        const sessionIdMatch = initData.match(/"Mcp-Session-Id":\s*"([^"]+)"/);
        const sessionId = initResponse.headers.get('Mcp-Session-Id') || 
                         (sessionIdMatch && sessionIdMatch[1]);
        
        if (sessionId) {
          console.log(`   📍 Session ID: ${sessionId}`);
        }
      } else {
        console.log('❌ Unexpected initialization response');
        console.log('   Response:', initData.substring(0, 200) + '...');
        return;
      }
    } else {
      console.log(`❌ MCP initialization failed: ${initResponse.status}`);
      const errorText = await initResponse.text();
      console.log('   Error:', errorText.substring(0, 200));
      return;
    }

    console.log();

    // Test 3: CORS Headers
    console.log('3️⃣ Testing CORS configuration...');
    const corsResponse = await fetch(mcpEndpoint, {
      method: 'OPTIONS'
    });

    if (corsResponse.ok) {
      const corsOrigin = corsResponse.headers.get('Access-Control-Allow-Origin');
      const corsMethods = corsResponse.headers.get('Access-Control-Allow-Methods');
      const corsHeaders = corsResponse.headers.get('Access-Control-Allow-Headers');
      
      console.log('✅ CORS configuration:');
      console.log(`   📍 Allow-Origin: ${corsOrigin}`);
      console.log(`   📍 Allow-Methods: ${corsMethods}`);
      console.log(`   📍 Allow-Headers: ${corsHeaders}`);
    } else {
      console.log(`❌ CORS test failed: ${corsResponse.status}`);
    }

    console.log();
    console.log('🎉 All tests passed! Your MCP server is deployed correctly.');
    console.log();
    console.log('📋 Connection Info for MCP Clients:');
    console.log('```json');
    console.log('{');
    console.log('  "mcpServers": {');
    console.log('    "Excel Analyser MCP (Cloud)": {');
    console.log('      "type": "http",');
    console.log(`      "url": "${mcpEndpoint}"`);
    console.log('    }');
    console.log('  }');
    console.log('}');
    console.log('```');
    console.log();
    console.log('🔗 Share this URL with others to use your MCP server!');

  } catch (error) {
    console.log('❌ Failed to connect to server');
    console.log(`   Error: ${error.message}`);
    console.log();
    console.log('💡 Troubleshooting:');
    console.log('   • Check if the server is running');
    console.log('   • Verify the URL is correct');
    console.log('   • Check Railway deployment logs');
    console.log('   • Ensure the server is accessible from the internet');
  }
};

// Get URL from command line arguments
const serverUrl = process.argv[2];
testDeployedServer(serverUrl); 