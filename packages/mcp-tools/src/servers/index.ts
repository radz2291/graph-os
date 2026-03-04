/**
 * Access Layer Servers - MCP, HTTP, WebSocket
 * 
 * Three ways to access Graph-OS tools:
 * - MCP Server: Standard protocol for AI clients (Claude Desktop, ChatGPT)
 * - HTTP Server: REST API for any HTTP client
 * - WebSocket Server: Real-time bidirectional for web apps
 * 
 * @module @graph-os/mcp-tools/servers
 */

// MCP Server
export {
  MCPServer,
  createMCPServer,
  type MCPServerConfig,
  type MCPToolCall,
  type MCPToolResult as MCPResponse
} from './MCPServer';

// HTTP Server
export {
  HTTPServer,
  createHTTPServer,
  type HTTPServerConfig
} from './HTTPServer';

// WebSocket Server
export {
  WSServer,
  createWSServer,
  type WSServerConfig
} from './WSServer';

// SSE Server
export {
  SSEServer,
  createSSEServer,
  type SSEServerConfig
} from './SSEServer';
