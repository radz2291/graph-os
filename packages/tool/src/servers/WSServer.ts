/**
 * WebSocket Server for Graph-OS tools
 *
 * Provides a WebSocket interface for bidirectional communication with Graph-OS tools.
 *
 * @module @graph-os/tool/servers
 */

import { MCPServer, createMCPServer, type MCPServerConfig } from './MCPServer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * WebSocket Server configuration
 */
export interface WSServerConfig extends MCPServerConfig {
  /** Host to bind to */
  host?: string;
  /** Port to listen on */
  port?: number;
  /** Maximum message size in bytes */
  maxMessageSize?: number;
  /** Ping interval in milliseconds */
  pingInterval?: number;
}

/**
 * WebSocket message
 */
interface WSMessage {
  type: 'request' | 'response' | 'notification';
  id?: string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/**
 * WebSocket client data
 */
interface WSClientData {
  clientId: string;
  connectedAt: Date;
  subscriptions: Set<string>;
}

// =============================================================================
// WEBSOCKET SERVER CLASS
// =============================================================================

/**
 * WebSocket Server implementation for Graph-OS tools
 *
 * Provides bidirectional communication for:
 * - Tool discovery and execution
 * - Real-time updates and notifications
 * - Runtime event streaming
 *
 * Protocol:
 * - Client sends: { type: 'request', id: 'xxx', method: 'tools/call', params: {...} }
 * - Server responds: { type: 'response', id: 'xxx', result: {...} }
 * - Server notifies: { type: 'notification', method: 'runtime/started', params: {...} }
 *
 * @example
 * ```typescript
 * const server = new WSServer(mcpServer, { port: 8085 });
 * await server.start();
 * ```
 */
export class WSServer {
  private mcpServer: MCPServer;
  private config: WSServerConfig;
  private server: ReturnType<typeof Bun.serve<WSClientData>> | null = null;
  private clients: Map<string, WSClientData> = new Map();
  private pingTimer: Timer | null = null;

  constructor(mcpServer: MCPServer, config: WSServerConfig = {}) {
    this.mcpServer = mcpServer;
    this.config = {
      host: config.host || '0.0.0.0',
      port: config.port || 8085,
      maxMessageSize: config.maxMessageSize || 1024 * 1024, // 1MB
      pingInterval: config.pingInterval || 30000,
      ...config,
    };
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    const { host, port } = this.config;

    this.server = Bun.serve<WSClientData>({
      port,
      hostname: host,
      development: false,

      fetch: (request, server) => {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers for HTTP requests
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        // WebSocket upgrade
        if (path === '/ws' && request.method === 'GET') {
          const clientId = this.generateClientId();
          const success = server.upgrade(request, {
            data: {
              clientId,
              connectedAt: new Date(),
              subscriptions: new Set(),
            },
          });

          if (success) {
            return undefined as unknown as Response; // Bun will handle the upgrade
          }

          return new Response('WebSocket upgrade failed', { status: 400 });
        }

        // HTTP endpoints
        switch (path) {
          case '/health':
            return new Response(JSON.stringify({
              status: 'ok',
              clients: this.clients.size,
              timestamp: new Date().toISOString(),
            }, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });

          case '/tools':
            const tools = this.mcpServer.listTools();
            return new Response(JSON.stringify({ tools, count: tools.length }, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });

          default:
            return new Response(JSON.stringify({
              error: 'Not found',
              availableEndpoints: [
                'GET /ws (WebSocket upgrade)',
                'GET /tools',
                'GET /health',
              ],
            }, null, 2), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }
      },

      websocket: {
        open: (ws) => {
          const data = ws.data as WSClientData;
          this.clients.set(data.clientId, data);

          // Send welcome message
          this.sendToClient(ws, {
            type: 'notification',
            method: 'connected',
            params: {
              clientId: data.clientId,
              serverInfo: this.mcpServer.getServerInfo(),
              capabilities: this.mcpServer.getCapabilities(),
            },
          });

          if (this.config.debug) {
            console.log(`WebSocket client connected: ${data.clientId}`);
          }
        },

        message: (ws, message) => {
          const data = ws.data as WSClientData;

          try {
            const text = typeof message === 'string' ? message : message.toString('utf-8');
            const parsed: WSMessage = JSON.parse(text);
            this.handleMessage(ws, data, parsed);
          } catch (error) {
            this.sendToClient(ws, {
              type: 'response',
              id: undefined,
              error: {
                code: -32700,
                message: 'Parse error: Invalid JSON',
              },
            });
          }
        },

        close: (ws) => {
          const data = ws.data as WSClientData;
          this.clients.delete(data.clientId);

          if (this.config.debug) {
            console.log(`WebSocket client disconnected: ${data.clientId}`);
          }
        },
      },
    });

    // Start ping interval
    this.startPing();

    if (this.config.debug) {
      console.log(`WebSocket Server started on ws://${host}:${port}/ws`);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(
    ws: import('bun').ServerWebSocket<WSClientData>,
    clientData: WSClientData,
    message: WSMessage
  ): Promise<void> {
    const { type, id, method, params } = message;

    // Validate message structure
    if (!type) {
      this.sendToClient(ws, {
        type: 'response',
        id,
        error: { code: -32600, message: 'Invalid request: missing type' },
      });
      return;
    }

    // Handle different message types
    switch (type) {
      case 'request':
        await this.handleRequest(ws, clientData, id, method, params);
        break;

      case 'notification':
        // Handle subscriptions, etc.
        this.handleNotification(ws, clientData, method, params);
        break;

      default:
        this.sendToClient(ws, {
          type: 'response',
          id,
          error: { code: -32600, message: `Unknown message type: ${type}` },
        });
    }
  }

  /**
   * Handle request message
   */
  private async handleRequest(
    ws: import('bun').ServerWebSocket<WSClientData>,
    clientData: WSClientData,
    id: string | undefined,
    method: string | undefined,
    params: Record<string, unknown> | undefined
  ): Promise<void> {
    if (!method) {
      this.sendToClient(ws, {
        type: 'response',
        id,
        error: { code: -32600, message: 'Invalid request: missing method' },
      });
      return;
    }

    try {
      let result: unknown;

      switch (method) {
        case 'initialize':
          const initResponse = await this.mcpServer.handleRequest({ method: 'initialize' });
          result = initResponse.result;
          break;

        case 'tools/list':
          result = { tools: this.mcpServer.listTools() };
          break;

        case 'tools/call':
          if (!params?.name) {
            this.sendToClient(ws, {
              type: 'response',
              id,
              error: { code: -32602, message: 'Invalid params: missing tool name' },
            });
            return;
          }

          const toolResult = await this.mcpServer.callTool({
            name: params.name as string,
            arguments: (params.arguments as Record<string, unknown>) || {},
          });

          const content = toolResult.content[0];
          try {
            result = content?.type === 'text' ? JSON.parse(content.text) : content;
          } catch {
            result = content?.text;
          }

          if (toolResult.isError) {
            this.sendToClient(ws, {
              type: 'response',
              id,
              error: { code: 0, message: 'Tool execution error', data: result },
            });
            return;
          }
          break;

        case 'subscribe':
          // Subscribe to events
          if (params?.events && Array.isArray(params.events)) {
            for (const event of params.events) {
              clientData.subscriptions.add(event);
            }
            result = { subscribed: Array.from(clientData.subscriptions) };
          } else {
            this.sendToClient(ws, {
              type: 'response',
              id,
              error: { code: -32602, message: 'Invalid params: events must be an array' },
            });
            return;
          }
          break;

        case 'unsubscribe':
          // Unsubscribe from events
          if (params?.events && Array.isArray(params.events)) {
            for (const event of params.events) {
              clientData.subscriptions.delete(event);
            }
            result = { subscribed: Array.from(clientData.subscriptions) };
          }
          break;

        default:
          this.sendToClient(ws, {
            type: 'response',
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          });
          return;
      }

      this.sendToClient(ws, {
        type: 'response',
        id,
        result,
      });

    } catch (error) {
      this.sendToClient(ws, {
        type: 'response',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      });
    }
  }

  /**
   * Handle notification message
   */
  private handleNotification(
    ws: import('bun').ServerWebSocket<WSClientData>,
    _clientData: WSClientData,
    method: string | undefined,
    params: Record<string, unknown> | undefined
  ): void {
    switch (method) {
      case 'ping':
        // Respond with pong
        this.sendToClient(ws, {
          type: 'notification',
          method: 'pong',
          params: { timestamp: Date.now() },
        });
        break;

      case 'heartbeat':
        // Just acknowledge
        break;

      default:
        if (this.config.debug) {
          console.log(`Unknown notification from ${_clientData.clientId}:`, method, params);
        }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: import('bun').ServerWebSocket<WSClientData>, message: WSMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      // Client disconnected
      const data = ws.data as WSClientData | undefined;
      if (data) {
        this.clients.delete(data.clientId);
      }
    }
  }

  /**
   * Broadcast notification to all clients (or those subscribed)
   */
  broadcast(method: string, params: Record<string, unknown>): number {
    if (!this.server) return 0;

    let count = 0;
    const message: WSMessage = {
      type: 'notification',
      method,
      params,
    };

    // Use the server's publish mechanism for efficiency
    for (const [clientId, clientData] of this.clients) {
      // Check if client is subscribed to this event
      if (clientData.subscriptions.size === 0 || clientData.subscriptions.has(method)) {
        this.server.publish(clientId, JSON.stringify(message));
        count++;
      }
    }

    return count;
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (!this.server) return;

      for (const clientId of this.clients.keys()) {
        try {
          this.server.publish(clientId, JSON.stringify({
            type: 'notification',
            method: 'ping',
            params: { timestamp: Date.now() },
          }));
        } catch {
          this.clients.delete(clientId);
        }
      }
    }, this.config.pingInterval);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    this.stopPing();

    // Close all client connections
    if (this.server) {
      // Publish close message to all
      for (const clientId of this.clients.keys()) {
        this.server.publish(clientId, JSON.stringify({
          type: 'notification',
          method: 'closing',
          params: { reason: 'Server shutting down' },
        }));
      }
    }

    this.clients.clear();

    if (this.server) {
      this.server.stop();
      this.server = null;
      if (this.config.debug) {
        console.log('WebSocket Server stopped');
      }
    }
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    const { host, port } = this.config;
    const displayHost = host === '0.0.0.0' ? 'localhost' : host;
    return `ws://${displayHost}:${port}/ws`;
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
 * Create a WebSocket server instance
 */
export function createWSServer(config?: WSServerConfig): WSServer {
  const mcpServer = createMCPServer(config);
  return new WSServer(mcpServer, config);
}

export default WSServer;
