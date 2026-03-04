#!/usr/bin/env node

/**
 * Graph-OS Tool CLI Entry Point
 *
 * Command-line interface for running MCP/SSE/HTTP/WS servers.
 *
 * Usage:
 *   graph-os-tool [options]
 *   graph-os-tool --server=sse --port=8084
 *   graph-os-tool --server=mcp --stdio
 *   graph-os-tool --server=http --port=3000
 *   graph-os-tool --server=ws --port=8085
 *
 * @module @graph-os/tool/bin
 */

import { createMCPServer, createSSEServer, createHTTPServer, createWSServer } from '../index';
import type { MCPServer } from '../servers/MCPServer';

// =============================================================================
// CLI ARGUMENTS
// =============================================================================

interface CLIArgs {
  server: 'mcp' | 'sse' | 'http' | 'ws';
  host: string;
  port: number;
  stdio: boolean;
  debug: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);

  const serverArg = args.find(a => a.startsWith('--server='));
  const hostArg = args.find(a => a.startsWith('--host='));
  const portArg = args.find(a => a.startsWith('--port='));
  const stdio = args.includes('--stdio');
  const debug = args.includes('--debug') || args.includes('-d');

  return {
    server: (serverArg?.split('=')[1] as CLIArgs['server']) || 'sse',
    host: hostArg?.split('=')[1] || '0.0.0.0',
    port: portArg ? parseInt(portArg.split('=')[1]) : 8084,
    stdio,
    debug,
  };
}

// =============================================================================
// MCP STDIO MODE
// =============================================================================

/**
 * Run MCP server in stdio mode for Claude Desktop integration
 *
 * This implements the MCP protocol over stdin/stdout:
 * - Reads JSON-RPC messages from stdin
 * - Writes JSON-RPC responses to stdout
 * - Logs to stderr to avoid protocol pollution
 */
async function runMCPStdio(mcpServer: MCPServer, debug: boolean): Promise<void> {
  const { stdin, stdout, stderr } = process;

  // Set stdin to raw mode for proper message handling
  if (stdin.isTTY) {
    stdin.setRawMode(true);
  }
  stdin.setEncoding('utf8');
  stdin.resume();

  if (debug) {
    stderr.write('MCP Server starting in stdio mode\n');
    stderr.write(`Server: ${JSON.stringify(mcpServer.getServerInfo())}\n`);
  }

  // Buffer for incomplete messages
  let buffer = '';

  // Handle stdin data
  stdin.on('data', async (chunk: string) => {
    buffer += chunk;

    // Process complete messages (newline-delimited JSON)
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line) continue;

      try {
        const request = JSON.parse(line);
        if (debug) {
          stderr.write(`[REQ] ${JSON.stringify(request)}\n`);
        }

        // Handle the request
        const response = await mcpServer.handleRequest({
          method: request.method,
          params: request.params,
        });

        // Send response
        const output = JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          ...response,
        }) + '\n';

        if (debug) {
          stderr.write(`[RES] ${output.trim()}\n`);
        }

        stdout.write(output);

      } catch (error) {
        // JSON parse error or other error
        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error',
            data: error instanceof Error ? error.message : String(error),
          },
        };

        if (debug) {
          stderr.write(`[ERR] ${JSON.stringify(errorResponse)}\n`);
        }

        stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  });

  // Handle stdin end
  stdin.on('end', () => {
    if (debug) {
      stderr.write('MCP Server: stdin ended, shutting down\n');
    }
    process.exit(0);
  });

  // Handle errors
  stdin.on('error', (error: Error) => {
    stderr.write(`MCP Server stdin error: ${error.message}\n`);
    process.exit(1);
  });

  stdout.on('error', (error: Error) => {
    stderr.write(`MCP Server stdout error: ${error.message}\n`);
    process.exit(1);
  });

  // Handle shutdown signals
  process.on('SIGINT', () => {
    if (debug) {
      stderr.write('\nMCP Server shutting down (SIGINT)\n');
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (debug) {
      stderr.write('MCP Server shutting down (SIGTERM)\n');
    }
    process.exit(0);
  });

  // Log ready state to stderr
  stderr.write('Graph-OS MCP Server ready\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const cliArgs = parseArgs();

  // For MCP stdio mode, don't print to stdout
  if (cliArgs.server !== 'mcp' || !cliArgs.stdio) {
    console.log('--- Graph-OS Tool v2.0.0 ---');
    console.log(`Server: ${cliArgs.server}`);
    console.log(`Host: ${cliArgs.host}`);
    console.log(`Port: ${cliArgs.port}`);
    console.log(`Debug: ${cliArgs.debug ? 'ON' : 'OFF'}`);
    console.log('');
  }

  try {
    switch (cliArgs.server) {
      case 'mcp':
        // MCP over stdio
        const mcpServer = createMCPServer({
          name: 'graph-os-tool',
          version: '2.0.0',
          debug: cliArgs.debug,
        });

        if (cliArgs.stdio) {
          await runMCPStdio(mcpServer, cliArgs.debug);
        } else {
          console.error('MCP server requires --stdio flag');
          console.error('Usage: graph-os-tool --server=mcp --stdio');
          process.exit(1);
        }
        break;

      case 'sse':
        const sseServer = createSSEServer({
          name: 'graph-os-tool',
          version: '2.0.0',
          host: cliArgs.host,
          port: cliArgs.port,
          debug: cliArgs.debug,
        });

        await sseServer.start();
        console.log(`SSE Server running at: ${sseServer.getUrl()}`);
        break;

      case 'http':
        const httpServer = createHTTPServer({
          name: 'graph-os-tool',
          version: '2.0.0',
          host: cliArgs.host,
          port: cliArgs.port,
          debug: cliArgs.debug,
        });

        await httpServer.start();
        console.log(`HTTP Server running at: ${httpServer.getUrl()}`);
        console.log('');
        console.log('Available endpoints:');
        console.log('  GET  /health     - Health check');
        console.log('  GET  /info       - Server info');
        console.log('  GET  /tools      - List tools');
        console.log('  POST /tools/call - Execute tool');
        break;

      case 'ws':
        const wsServer = createWSServer({
          name: 'graph-os-tool',
          version: '2.0.0',
          host: cliArgs.host,
          port: cliArgs.port,
          debug: cliArgs.debug,
        });

        await wsServer.start();
        console.log(`WebSocket Server running at: ${wsServer.getUrl()}`);
        console.log('');
        console.log('Protocol:');
        console.log('  Request:     { type: "request", id: "xxx", method: "tools/call", params: {...} }');
        console.log('  Response:    { type: "response", id: "xxx", result: {...} }');
        console.log('  Notification: { type: "notification", method: "event/name", params: {...} }');
        break;

      default:
        console.error(`Unknown server type: ${cliArgs.server}`);
        console.error('Valid options: mcp, sse, http, ws');
        process.exit(1);
    }

    // Keep process alive for servers (except MCP stdio which handles its own lifecycle)
    if (cliArgs.server !== 'mcp') {
      console.log('');
      console.log('Press Ctrl+C to stop');
    }

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run main
main().catch(console.error);
