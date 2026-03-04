#!/usr/bin/env node

/**
 * Graph-OS MCP Server CLI
 * 
 * Command-line entry point to launch the MCP SSE server.
 */

import { MCPServer, SSEServer } from '../index';

// =============================================================================
// CLI Arguments
// =============================================================================

const args = process.argv.slice(2);
const hostArg = args.find(a => a.startsWith('--host='));
const portArg = args.find(a => a.startsWith('--port='));
const debugArg = args.includes('--debug');

const host = hostArg ? hostArg.split('=')[1] : '0.0.0.0';
const port = portArg ? parseInt(portArg.split('=')[1]) : 8084;

// =============================================================================
// Start Server
// =============================================================================

console.log('--- Graph-OS MCP Server ---');
console.log(`Version: 2.0.0`);
console.log(`Host: ${host}`);
console.log(`Port: ${port}`);
console.log(`Debug: ${debugArg ? 'ON' : 'OFF'}`);

const mcpServer = new MCPServer({
    name: 'graph-os-mcp',
    version: '2.0.0',
    debug: debugArg
});

const sseServer = new SSEServer(mcpServer, {
    host,
    port,
    debug: debugArg
});

sseServer.start().then(() => {
    console.log(`\nServer is running!`);
    console.log(`SSE URL: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}/sse`);
    console.log('Press Ctrl+C to stop');
}).catch((err: Error) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
