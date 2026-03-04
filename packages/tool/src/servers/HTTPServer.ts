/**
 * HTTP Server - REST API server for Graph-OS tools
 *
 * Provides a REST API interface for Graph-OS tools using Bun's native HTTP server.
 *
 * @module @graph-os/tool/servers
 */

import { MCPServer, createMCPServer, type MCPServerConfig } from './MCPServer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * HTTP Server configuration
 */
export interface HTTPServerConfig extends MCPServerConfig {
  /** Host to bind to */
  host?: string;
  /** Port to listen on */
  port?: number;
}

/**
 * HTTP Request context
 */
interface RequestContext {
  method: string;
  path: string;
  headers: Headers;
  body: unknown;
  query: URLSearchParams;
}

// =============================================================================
// HTTP SERVER CLASS
// =============================================================================

/**
 * HTTP Server implementation for Graph-OS tools
 *
 * Provides REST endpoints for tool discovery and execution:
 * - GET /tools - List all available tools
 * - POST /tools/call - Execute a tool
 * - GET /health - Health check endpoint
 * - GET /info - Server information
 *
 * @example
 * ```typescript
 * const server = new HTTPServer(mcpServer, { port: 3000 });
 * await server.start();
 * ```
 */
export class HTTPServer {
  private mcpServer: MCPServer;
  private config: HTTPServerConfig;
  private server: ReturnType<typeof Bun.serve> | null = null;

  constructor(mcpServer: MCPServer, config: HTTPServerConfig = {}) {
    this.mcpServer = mcpServer;
    this.config = {
      host: config.host || '0.0.0.0',
      port: config.port || 3000,
      ...config,
    };
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    const { host, port } = this.config;

    this.server = Bun.serve({
      port,
      hostname: host,
      development: false,

      fetch: async (request: Request): Promise<Response> => {
        const url = new URL(request.url);
        const ctx: RequestContext = {
          method: request.method,
          path: url.pathname,
          headers: request.headers,
          body: null,
          query: url.searchParams,
        };

        // Parse body for POST/PUT requests
        if (request.method === 'POST' || request.method === 'PUT') {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              ctx.body = await request.json();
            } catch {
              return this.jsonResponse({ error: 'Invalid JSON body' }, 400);
            }
          }
        }

        // Route request
        return this.handleRequest(ctx);
      },

      error: (error: Error): Response => {
        console.error('HTTP Server error:', error);
        return this.jsonResponse({ error: 'Internal server error' }, 500);
      },
    });

    if (this.config.debug) {
      console.log(`HTTP Server started on http://${host}:${port}`);
    }
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(ctx: RequestContext): Promise<Response> {
    const { method, path } = ctx;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Route to appropriate handler
      let response: Response;

      switch (true) {
        case path === '/health' && method === 'GET':
          response = this.handleHealth();
          break;

        case path === '/info' && method === 'GET':
          response = this.handleInfo();
          break;

        case path === '/tools' && method === 'GET':
          response = this.handleToolsList();
          break;

        case path === '/tools/call' && method === 'POST':
          response = await this.handleToolsCall(ctx.body as { name: string; arguments: Record<string, unknown> });
          break;

        case path === '/initialize' && method === 'POST':
          response = await this.handleInitialize();
          break;

        default:
          response = this.jsonResponse({
            error: 'Not found',
            path,
            availableEndpoints: [
              'GET /health',
              'GET /info',
              'GET /tools',
              'POST /tools/call',
              'POST /initialize',
            ],
          }, 404);
      }

      // Add CORS headers to response
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }

      return response;

    } catch (error) {
      console.error('Request handler error:', error);
      const response = this.jsonResponse({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 500);

      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }

      return response;
    }
  }

  /**
   * Handle health check
   */
  private handleHealth(): Response {
    return this.jsonResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle server info request
   */
  private handleInfo(): Response {
    return this.jsonResponse({
      server: this.mcpServer.getServerInfo(),
      capabilities: this.mcpServer.getCapabilities(),
      endpoints: {
        tools: 'GET /tools',
        callTool: 'POST /tools/call',
        health: 'GET /health',
        info: 'GET /info',
      },
    });
  }

  /**
   * Handle tools list request
   */
  private handleToolsList(): Response {
    const tools = this.mcpServer.listTools();
    return this.jsonResponse({
      tools,
      count: tools.length,
    });
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(body: { name: string; arguments: Record<string, unknown> }): Promise<Response> {
    if (!body || !body.name) {
      return this.jsonResponse({
        error: 'Invalid request',
        message: 'Request body must include "name" field',
        example: { name: 'use', arguments: { detect: true } },
      }, 400);
    }

    const result = await this.mcpServer.callTool({
      name: body.name,
      arguments: body.arguments || {},
    });

    // Parse the result content
    const content = result.content[0];
    let data: unknown;
    try {
      data = content?.type === 'text' ? JSON.parse(content.text) : content;
    } catch {
      data = content?.text;
    }

    return this.jsonResponse({
      result: data,
      isError: result.isError,
    });
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(): Promise<Response> {
    const mcpResponse = await this.mcpServer.handleRequest({ method: 'initialize' });
    return this.jsonResponse(mcpResponse.result);
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
      if (this.config.debug) {
        console.log('HTTP Server stopped');
      }
    }
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    const { host, port } = this.config;
    const displayHost = host === '0.0.0.0' ? 'localhost' : host;
    return `http://${displayHost}:${port}`;
  }

  /**
   * Create JSON response
   */
  private jsonResponse(data: unknown, status: number = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an HTTP server instance
 */
export function createHTTPServer(config?: HTTPServerConfig): HTTPServer {
  const mcpServer = createMCPServer(config);
  return new HTTPServer(mcpServer, config);
}

export default HTTPServer;
