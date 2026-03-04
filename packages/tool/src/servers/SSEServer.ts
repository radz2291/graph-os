/**
 * SSE Server - Server-Sent Events server for Graph-OS tools
 *
 * Provides an SSE interface for real-time tool updates and streaming responses.
 *
 * @module @graph-os/tool/servers
 */

import { MCPServer, createMCPServer, type MCPServerConfig } from './MCPServer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * SSE Server configuration
 */
export interface SSEServerConfig extends MCPServerConfig {
  /** Host to bind to */
  host?: string;
  /** Port to listen on */
  port?: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
}

/**
 * SSE Event
 */
interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * SSE Client connection
 */
interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  lastEventId?: string;
  connectedAt: Date;
}

// =============================================================================
// SSE SERVER CLASS
// =============================================================================

/**
 * SSE Server implementation for Graph-OS tools
 *
 * Provides endpoints for:
 * - GET /sse - SSE connection endpoint
 * - POST /tools/call - Execute a tool and stream results
 * - GET /health - Health check endpoint
 *
 * @example
 * ```typescript
 * const server = new SSEServer(mcpServer, { port: 8084 });
 * await server.start();
 * ```
 */
export class SSEServer {
  private mcpServer: MCPServer;
  private config: SSEServerConfig;
  private server: ReturnType<typeof Bun.serve> | null = null;
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatTimer: Timer | null = null;

  constructor(mcpServer: MCPServer, config: SSEServerConfig = {}) {
    this.mcpServer = mcpServer;
    this.config = {
      host: config.host || '0.0.0.0',
      port: config.port || 8084,
      heartbeatInterval: config.heartbeatInterval || 30000,
      ...config,
    };
  }

  /**
   * Start the SSE server
   */
  async start(): Promise<void> {
    const { host, port } = this.config;

    this.server = Bun.serve({
      port,
      hostname: host,
      development: false,

      fetch: async (request: Request): Promise<Response> => {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Last-Event-ID',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        try {
          let response: Response;

          switch (true) {
            case path === '/health' && request.method === 'GET':
              response = this.handleHealth();
              break;

            case path === '/sse' && request.method === 'GET':
              response = this.handleSSEConnection(request);
              break;

            case path === '/tools' && request.method === 'GET':
              response = this.handleToolsList(corsHeaders);
              break;

            case path === '/tools/call' && request.method === 'POST':
              response = await this.handleToolsCall(request, corsHeaders);
              break;

            case path === '/broadcast' && request.method === 'POST':
              response = await this.handleBroadcast(request, corsHeaders);
              break;

            default:
              response = new Response(JSON.stringify({
                error: 'Not found',
                availableEndpoints: [
                  'GET /sse',
                  'GET /tools',
                  'POST /tools/call',
                  'POST /broadcast',
                  'GET /health',
                ],
              }, null, 2), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              });
          }

          return response;

        } catch (error) {
          console.error('SSE Server error:', error);
          return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
      },

      error: (error: Error): Response => {
        console.error('SSE Server error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    // Start heartbeat
    this.startHeartbeat();

    if (this.config.debug) {
      console.log(`SSE Server started on http://${host}:${port}/sse`);
    }
  }

  /**
   * Handle SSE connection
   */
  private handleSSEConnection(request: Request): Response {
    const clientId = this.generateClientId();
    const lastEventId = request.headers.get('Last-Event-ID') || undefined;

    const stream = new ReadableStream({
      start: (controller) => {
        const client: SSEClient = {
          id: clientId,
          controller,
          lastEventId,
          connectedAt: new Date(),
        };

        this.clients.set(clientId, client);

        // Send connected event
        this.sendEvent(client, {
          event: 'connected',
          data: JSON.stringify({
            clientId,
            serverInfo: this.mcpServer.getServerInfo(),
            timestamp: new Date().toISOString(),
          }),
        });

        if (this.config.debug) {
          console.log(`SSE client connected: ${clientId}`);
        }
      },

      cancel: () => {
        this.clients.delete(clientId);
        if (this.config.debug) {
          console.log(`SSE client disconnected: ${clientId}`);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  /**
   * Handle tools list
   */
  private handleToolsList(corsHeaders: Record<string, string>): Response {
    const tools = this.mcpServer.listTools();
    return new Response(JSON.stringify({ tools, count: tools.length }, null, 2), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  /**
   * Handle tools/call - execute tool and optionally broadcast result
   */
  private async handleToolsCall(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
    let body: { name: string; arguments: Record<string, unknown>; broadcast?: boolean };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!body.name) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'Request body must include "name" field',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const result = await this.mcpServer.callTool({
      name: body.name,
      arguments: body.arguments || {},
    });

    // Parse result
    const content = result.content[0];
    let data: unknown;
    try {
      data = content?.type === 'text' ? JSON.parse(content.text) : content;
    } catch {
      data = content?.text;
    }

    // Broadcast to all SSE clients if requested
    if (body.broadcast) {
      this.broadcast({
        event: 'tool-result',
        data: JSON.stringify({
          tool: body.name,
          result: data,
          isError: result.isError,
          timestamp: new Date().toISOString(),
        }),
      });
    }

    return new Response(JSON.stringify({ result: data, isError: result.isError }, null, 2), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  /**
   * Handle broadcast to all clients
   */
  private async handleBroadcast(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
    let body: { event?: string; data: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (body.data === undefined) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'Request body must include "data" field',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const recipientCount = this.broadcast({
      event: body.event || 'message',
      data: typeof body.data === 'string' ? body.data : JSON.stringify(body.data),
    });

    return new Response(JSON.stringify({
      broadcast: true,
      recipients: recipientCount,
      timestamp: new Date().toISOString(),
    }, null, 2), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  /**
   * Handle health check
   */
  private handleHealth(): Response {
    return new Response(JSON.stringify({
      status: 'ok',
      clients: this.clients.size,
      timestamp: new Date().toISOString(),
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Send SSE event to specific client
   */
  private sendEvent(client: SSEClient, event: SSEEvent): void {
    let message = '';

    if (event.id) {
      message += `id: ${event.id}\n`;
      client.lastEventId = event.id;
    }

    if (event.event) {
      message += `event: ${event.event}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    // Handle multi-line data
    const dataLines = event.data.split('\n');
    for (const line of dataLines) {
      message += `data: ${line}\n`;
    }

    message += '\n';

    try {
      client.controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Client disconnected
      this.clients.delete(client.id);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: SSEEvent): number {
    let count = 0;
    for (const client of this.clients.values()) {
      this.sendEvent(client, event);
      count++;
    }
    return count;
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      // Send comment as heartbeat (SSE spec)
      for (const client of this.clients.values()) {
        try {
          client.controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch {
          this.clients.delete(client.id);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop the SSE server
   */
  async stop(): Promise<void> {
    this.stopHeartbeat();

    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        client.controller.close();
      } catch {
        // Ignore errors
      }
    }
    this.clients.clear();

    if (this.server) {
      this.server.stop();
      this.server = null;
      if (this.config.debug) {
        console.log('SSE Server stopped');
      }
    }
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    const { host, port } = this.config;
    const displayHost = host === '0.0.0.0' ? 'localhost' : host;
    return `http://${displayHost}:${port}/sse`;
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an SSE server instance
 */
export function createSSEServer(config?: SSEServerConfig): SSEServer {
  const mcpServer = createMCPServer(config);
  return new SSEServer(mcpServer, config);
}

export default SSEServer;
