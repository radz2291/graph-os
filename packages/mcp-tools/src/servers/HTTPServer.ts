/**
 * HTTP Server - REST API server for Graph-OS tools
 * 
 * Provides HTTP endpoints for tool discovery and execution.
 * 
 * @module @graph-os/mcp-tools/servers
 */

import * as http from 'http';
import * as url from 'url';
import type { MCPServer } from './MCPServer';

// =============================================================================
// Types
// =============================================================================

export interface HTTPServerConfig {
  /** Port to listen on */
  port?: number;
  /** Host to bind to */
  host?: string;
  /** Enable CORS */
  cors?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

// =============================================================================
// HTTPServer Class
// =============================================================================

/**
 * HTTP Server implementation for Graph-OS tools
 * 
 * Provides a REST API for tool discovery and execution.
 * 
 * @example
 * ```typescript
 * const server = new HTTPServer(mcpServer, {
 *   port: 3001,
 *   host: 'localhost'
 * });
 * 
 * server.start();
 * 
 * // Endpoints:
 * // GET  /tools         - List all tools
 * // GET  /tools/:name   - Get tool info
 * // POST /tools/:name   - Execute tool
 * // GET  /health        - Health check
 * ```
 */
export class HTTPServer {
  private config: Required<HTTPServerConfig>;
  private mcpServer: MCPServer;
  private server: http.Server | null = null;

  constructor(mcpServer: MCPServer, config: HTTPServerConfig = {}) {
    this.mcpServer = mcpServer;
    this.config = {
      port: config.port || 3001,
      host: config.host || 'localhost',
      cors: config.cors !== false,
      debug: config.debug || false,
    };
  }

  /**
   * Start the HTTP server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);

      this.server.listen(this.config.port, this.config.host, () => {
        if (this.config.debug) {
          console.log(`HTTP Server started on http://${this.config.host}:${this.config.port}`);
        }
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Get server address info
   */
  address(): { port: number; host: string } | null {
    if (!this.server) return null;
    return {
      port: this.config.port,
      host: this.config.host,
    };
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Set CORS headers
    if (this.config.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';
    const method = req.method || 'GET';

    try {
      // Route the request
      if (pathname === '/health' && method === 'GET') {
        await this.handleHealth(req, res);
      } else if (pathname === '/tools' && method === 'GET') {
        await this.handleListTools(req, res);
      } else if (pathname.startsWith('/tools/') && method === 'GET') {
        await this.handleGetTool(req, res, pathname);
      } else if (pathname.startsWith('/tools/') && method === 'POST') {
        await this.handleExecuteTool(req, res, pathname);
      } else {
        this.sendError(res, 404, 'Not Found');
      }
    } catch (error) {
      this.sendError(res, 500, error instanceof Error ? error.message : 'Internal Server Error');
    }
  }

  /**
   * Handle GET /health
   */
  private async handleHealth(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    this.sendJSON(res, 200, {
      status: 'ok',
      server: this.mcpServer.getServerInfo(),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle GET /tools
   */
  private async handleListTools(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const tools = this.mcpServer.listTools();
    this.sendJSON(res, 200, {
      count: tools.length,
      tools,
    });
  }

  /**
   * Handle GET /tools/:name
   */
  private async handleGetTool(
    req: http.IncomingMessage, 
    res: http.ServerResponse, 
    pathname: string
  ): Promise<void> {
    const toolName = pathname.replace('/tools/', '');
    const tools = this.mcpServer.listTools();
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
      this.sendError(res, 404, `Tool not found: ${toolName}`);
      return;
    }

    this.sendJSON(res, 200, tool);
  }

  /**
   * Handle POST /tools/:name
   */
  private async handleExecuteTool(
    req: http.IncomingMessage, 
    res: http.ServerResponse, 
    pathname: string
  ): Promise<void> {
    const toolName = pathname.replace('/tools/', '');

    // Read request body
    const body = await this.readBody(req);
    
    let args: Record<string, unknown>;
    try {
      args = body ? JSON.parse(body) : {};
    } catch {
      this.sendError(res, 400, 'Invalid JSON body');
      return;
    }

    // Execute tool
    const result = await this.mcpServer.callTool({
      name: toolName,
      arguments: args,
    });

    const statusCode = result.isError ? 400 : 200;
    this.sendJSON(res, statusCode, result);
  }

  /**
   * Read request body
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * Send JSON response
   */
  private sendJSON(res: http.ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send error response
   */
  private sendError(res: http.ServerResponse, statusCode: number, message: string): void {
    this.sendJSON(res, statusCode, {
      error: true,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Create an HTTP server instance
 */
export function createHTTPServer(mcpServer: MCPServer, config?: HTTPServerConfig): HTTPServer {
  return new HTTPServer(mcpServer, config);
}

export default HTTPServer;
