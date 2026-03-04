/**
 * SSE Server - Server-Sent Events transport for Graph-OS tools
 * 
 * Implements the SSE transport for the Model Context Protocol,
 * allowing browser-based and cloud-native clients (like Dify) to connect.
 * 
 * @module @graph-os/mcp-tools/servers
 */

import * as http from 'http';
import * as url from 'url';
import type { MCPServer } from './MCPServer';

// =============================================================================
// Types
// =============================================================================

export interface SSEServerConfig {
    /** Port to listen on */
    port?: number;
    /** Host to bind to (e.g., '0.0.0.0' for external access) */
    host?: string;
    /** Enable debug logging */
    debug?: boolean;
}

interface JSONRPCRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: Record<string, unknown>;
}

// =============================================================================
// SSEServer Class
// =============================================================================

/**
 * SSE Server implementation for Graph-OS tools
 * 
 * Provides an MCP SSE transport following the @Architectural_Directive.
 */
export class SSEServer {
    private config: Required<SSEServerConfig>;
    private mcpServer: MCPServer;
    private server: http.Server | null = null;
    private connections: Set<http.ServerResponse> = new Set();

    constructor(mcpServer: MCPServer, config: SSEServerConfig = {}) {
        this.mcpServer = mcpServer;
        this.config = {
            port: config.port || 8084,
            host: config.host || '0.0.0.0',
            debug: config.debug || false,
        };
    }

    /**
     * Start the SSE server
     */
    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });

            this.server.on('error', reject);

            this.server.listen(this.config.port, this.config.host, () => {
                if (this.config.debug) {
                    console.log(`SSE Server started on http://${this.config.host}:${this.config.port}`);
                    console.log(`SSE Endpoint: http://${this.config.host}:${this.config.port}/sse`);
                    console.log(`Message Endpoint: http://${this.config.host}:${this.config.port}/message`);
                }
                resolve();
            });
        });
    }

    /**
     * Stop the SSE server
     */
    stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }

            // Close all SSE connections
            for (const res of this.connections) {
                res.end();
            }
            this.connections.clear();

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
     * Handle incoming HTTP request
     */
    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // Set CORS headers - CRITICAL for Dify
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
            if (pathname === '/sse' && method === 'GET') {
                await this.handleSSE(req, res);
            } else if (pathname === '/message' && method === 'POST') {
                await this.handleMessage(req, res);
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        } catch (error) {
            if (this.config.debug) {
                console.error('Request handling error:', error);
            }
            if (!res.headersSent) {
                res.writeHead(500);
                res.end(error instanceof Error ? error.message : 'Internal Server Error');
            }
        }
    }

    /**
     * Handle GET /sse - Established EventSource stream
     */
    private async handleSSE(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // Standard SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        // Send initial endpoint event
        res.write(`event: endpoint\ndata: /message\n\n`);

        this.connections.add(res);

        if (this.config.debug) {
            console.log('SSE client connected');
        }

        req.on('close', () => {
            this.connections.delete(res);
            if (this.config.debug) {
                console.log('SSE client disconnected');
            }
        });

        // Keepalive
        const timer = setInterval(() => {
            if (res.writable) {
                res.write(': keepalive\n\n');
            } else {
                clearInterval(timer);
            }
        }, 15000);
    }

    /**
     * Handle POST /message - Process JSON-RPC messages
     */
    private async handleMessage(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const body = await this.readBody(req);

        let jsonRPC: JSONRPCRequest;
        try {
            jsonRPC = JSON.parse(body);
        } catch (e) {
            res.writeHead(400);
            res.end('Invalid JSON');
            return;
        }

        if (this.config.debug) {
            console.log(`Received MCP request [${jsonRPC.id}]: ${jsonRPC.method}`);
        }

        // Process via MCPServer
        const mcpResponse = await this.mcpServer.handleRequest({
            method: jsonRPC.method,
            params: jsonRPC.params,
        });

        // ONLY respond if it's a request (has an ID). Notifications MUST NOT have responses.
        if (jsonRPC.id !== undefined && jsonRPC.id !== null) {
            // Wrap result back into JSON-RPC 2.0 response including original ID
            const wrappedResponse = {
                jsonrpc: '2.0',
                id: jsonRPC.id,
                ...mcpResponse,
            };

            if (this.config.debug) {
                console.log(`Sending response for [${jsonRPC.id}]`);
            }

            const eventData = `data: ${JSON.stringify(wrappedResponse)}\n\n`;

            for (const connRes of this.connections) {
                if (connRes.writable) {
                    connRes.write(eventData);
                }
            }
        } else if (this.config.debug) {
            console.log(`Processed notification: ${jsonRPC.method} (no response sent)`);
        }

        // Also send success back to the POST request
        res.writeHead(202); // Accepted
        res.end('Accepted');
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
}

/**
 * Create an SSE server instance
 */
export function createSSEServer(mcpServer: MCPServer, config?: SSEServerConfig): SSEServer {
    return new SSEServer(mcpServer, config);
}

export default SSEServer;
