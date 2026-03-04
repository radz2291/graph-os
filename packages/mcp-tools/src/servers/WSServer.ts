/**
 * WebSocket Server - Real-time bidirectional server for Graph-OS tools
 * 
 * Provides WebSocket endpoints for real-time tool execution and events.
 * 
 * @module @graph-os/mcp-tools/servers
 */

import * as http from 'http';
import * as crypto from 'crypto';
import type { MCPServer } from './MCPServer';

// =============================================================================
// Types
// =============================================================================

export interface WSServerConfig {
  /** Port to listen on */
  port?: number;
  /** Host to bind to */
  host?: string;
  /** Maximum connections */
  maxConnections?: number;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
}

interface WebSocketMessage {
  id?: string;
  type: 'execute' | 'list' | 'info' | 'ping' | 'subscribe' | 'unsubscribe';
  tool?: string;
  arguments?: Record<string, unknown>;
  timestamp?: string;
}

interface WebSocketConnection {
  id: string;
  socket: any;
  isAlive: boolean;
  subscriptions: Set<string>;
}

// =============================================================================
// WSServer Class
// =============================================================================

/**
 * WebSocket Server implementation for Graph-OS tools
 * 
 * Provides real-time bidirectional communication for tool execution.
 * 
 * @example
 * ```typescript
 * const server = new WSServer(mcpServer, {
 *   port: 3002,
 *   host: 'localhost'
 * });
 * 
 * server.start();
 * 
 * // Message format:
 * // { type: 'list' } - List all tools
 * // { type: 'execute', tool: 'create_cartridge', arguments: {...} }
 * // { type: 'ping' } - Heartbeat
 * ```
 */
export class WSServer {
  private config: Required<WSServerConfig>;
  private mcpServer: MCPServer;
  private httpServer: http.Server | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(mcpServer: MCPServer, config: WSServerConfig = {}) {
    this.mcpServer = mcpServer;
    this.config = {
      port: config.port || 3002,
      host: config.host || 'localhost',
      maxConnections: config.maxConnections || 100,
      heartbeatInterval: config.heartbeatInterval || 30000,
      debug: config.debug || false,
    };
  }

  /**
   * Start the WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer();

      this.httpServer.on('upgrade', (request, socket, head) => {
        this.handleUpgrade(request, socket, head);
      });

      this.httpServer.on('error', reject);

      this.httpServer.listen(this.config.port, this.config.host, () => {
        if (this.config.debug) {
          console.log(`WebSocket Server started on ws://${this.config.host}:${this.config.port}`);
        }
        
        // Start heartbeat
        this.startHeartbeat();
        resolve();
      });
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all connections
    for (const [id, conn] of this.connections) {
      this.closeConnection(id, 'Server shutting down');
    }
    this.connections.clear();

    // Close HTTP server
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }

      this.httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.httpServer = null;
          resolve();
        }
      });
    });
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get server address info
   */
  address(): { port: number; host: string } | null {
    if (!this.httpServer) return null;
    return {
      port: this.config.port,
      host: this.config.host,
    };
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: unknown): void {
    const data = JSON.stringify(message);
    for (const conn of this.connections.values()) {
      this.sendToConnection(conn, data);
    }
  }

  /**
   * Handle WebSocket upgrade request
   */
  private handleUpgrade(request: http.IncomingMessage, socket: any, head: Buffer): void {
    // Check max connections
    if (this.connections.size >= this.config.maxConnections) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    // Generate WebSocket accept key
    const acceptKey = request.headers['sec-websocket-key'];
    if (!acceptKey) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const hash = crypto
      .createHash('sha1')
      .update(acceptKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    // Send upgrade response
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${hash}`,
    ];
    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

    // Create connection
    const connId = crypto.randomUUID();
    const conn: WebSocketConnection = {
      id: connId,
      socket,
      isAlive: true,
      subscriptions: new Set(),
    };
    this.connections.set(connId, conn);

    if (this.config.debug) {
      console.log(`WebSocket connected: ${connId}`);
    }

    // Handle incoming data
    let buffer = Buffer.alloc(0);
    socket.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      this.processBuffer(conn, buffer);
      buffer = Buffer.alloc(0);
    });

    // Handle close
    socket.on('close', () => {
      this.closeConnection(connId, 'Connection closed');
    });

    // Handle error
    socket.on('error', (err: Error) => {
      if (this.config.debug) {
        console.error(`WebSocket error (${connId}):`, err.message);
      }
      this.closeConnection(connId, 'Connection error');
    });
  }

  /**
   * Process incoming WebSocket buffer
   */
  private processBuffer(conn: WebSocketConnection, buffer: Buffer): void {
    if (buffer.length < 2) return;

    const fin = (buffer[0] & 0x80) !== 0;
    const opcode = buffer[0] & 0x0f;
    const masked = (buffer[1] & 0x80) !== 0;
    let payloadLen = buffer[1] & 0x7f;

    let offset = 2;

    if (payloadLen === 126) {
      payloadLen = buffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLen === 127) {
      payloadLen = Number(buffer.readBigUInt64BE(2));
      offset = 10;
    }

    if (masked) {
      const mask = buffer.slice(offset, offset + 4);
      offset += 4;
      const payload = buffer.slice(offset, offset + payloadLen);
      
      // Unmask
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= mask[i % 4];
      }
      
      this.handleMessage(conn, payload.toString('utf8'));
    } else {
      const payload = buffer.slice(offset, offset + payloadLen);
      this.handleMessage(conn, payload.toString('utf8'));
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(conn: WebSocketConnection, data: string): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case 'ping':
          this.sendToConnection(conn, JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        case 'list':
          const tools = this.mcpServer.listTools();
          this.sendToConnection(conn, JSON.stringify({
            id: message.id,
            type: 'tools',
            count: tools.length,
            tools,
          }));
          break;

        case 'execute':
          if (!message.tool) {
            this.sendError(conn, message.id, 'Missing tool name');
            return;
          }
          const result = await this.mcpServer.callTool({
            name: message.tool,
            arguments: message.arguments || {},
          });
          this.sendToConnection(conn, JSON.stringify({
            id: message.id,
            type: 'result',
            tool: message.tool,
            ...result,
          }));
          break;

        default:
          this.sendError(conn, message.id, `Unknown message type: ${(message as any).type}`);
      }
    } catch (error) {
      this.sendError(conn, undefined, error instanceof Error ? error.message : 'Invalid message');
    }
  }

  /**
   * Send error to connection
   */
  private sendError(conn: WebSocketConnection, id: string | undefined, message: string): void {
    this.sendToConnection(conn, JSON.stringify({
      id,
      type: 'error',
      error: message,
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Send data to connection
   */
  private sendToConnection(conn: WebSocketConnection, data: string): void {
    const payload = Buffer.from(data, 'utf8');
    const frame = Buffer.alloc(2 + payload.length);
    
    frame[0] = 0x81; // FIN + Text frame
    frame[1] = payload.length;
    payload.copy(frame, 2);
    
    conn.socket.write(frame);
  }

  /**
   * Close connection
   */
  private closeConnection(connId: string, reason: string): void {
    const conn = this.connections.get(connId);
    if (conn) {
      try {
        conn.socket.destroy();
      } catch {}
      this.connections.delete(connId);
      
      if (this.config.debug) {
        console.log(`WebSocket disconnected: ${connId} (${reason})`);
      }
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const [id, conn] of this.connections) {
        if (!conn.isAlive) {
          this.closeConnection(id, 'Heartbeat timeout');
          continue;
        }
        
        conn.isAlive = false;
        this.sendToConnection(conn, JSON.stringify({ type: 'ping' }));
      }
    }, this.config.heartbeatInterval);
  }
}

/**
 * Create a WebSocket server instance
 */
export function createWSServer(mcpServer: MCPServer, config?: WSServerConfig): WSServer {
  return new WSServer(mcpServer, config);
}

export default WSServer;
