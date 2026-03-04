/**
 * MCP Server - Model Context Protocol server for Graph-OS tools
 * 
 * Implements the MCP protocol for AI clients (Claude Desktop, etc.)
 * 
 * @module @graph-os/mcp-tools/servers
 */

import type { MCPTool } from '../core/MCPTool';
import { registerBuiltInTools } from '../index';
import type { MCPToolRegistry } from '../registry/ToolRegistry';

// =============================================================================
// Types
// =============================================================================

export interface MCPServerConfig {
  /** Server name */
  name?: string;
  /** Server version */
  version?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// =============================================================================
// MCPServer Class
// =============================================================================

/**
 * MCP Server implementation for Graph-OS tools
 * 
 * Provides a server that implements the Model Context Protocol,
 * allowing AI clients to discover and call Graph-OS tools.
 * 
 * @example
 * ```typescript
 * const server = new MCPServer({
 *   name: 'graph-os-mcp',
 *   version: '2.0.0'
 * });
 * 
 * // Handle tool list request
 * const tools = server.listTools();
 * 
 * // Handle tool call
 * const result = await server.callTool({
 *   name: 'create_cartridge',
 *   arguments: { name: 'my-app', description: 'My app' }
 * });
 * ```
 */
export class MCPServer {
  private config: MCPServerConfig;
  private registry: MCPToolRegistry;

  constructor(config: MCPServerConfig = {}) {
    this.config = {
      name: config.name || 'graph-os-mcp',
      version: config.version || '2.0.0',
      debug: config.debug || false,
    };

    // Import and create registry
    const { MCPToolRegistry } = require('../registry/ToolRegistry');
    this.registry = new MCPToolRegistry();

    // Register all built-in tools
    registerBuiltInTools(this.registry);
  }

  /**
   * Get server info
   */
  getServerInfo(): { name: string; version: string } {
    return {
      name: this.config.name!,
      version: this.config.version!,
    };
  }

  /**
   * List all available tools
   */
  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
      }>;
      required: string[];
    };
  }> {
    const tools = this.registry.listAll();

    return tools.map((toolDef) => {
      // Convert parameters to JSON Schema format
      const properties: Record<string, { type: string; description: string }> = {};
      const required: string[] = [];

      for (const param of toolDef.parameters) {
        properties[param.name] = {
          type: param.type,
          description: param.description,
        };
        if (param.required) {
          required.push(param.name);
        }
      }

      return {
        name: toolDef.name,
        description: toolDef.description,
        inputSchema: {
          type: 'object' as const,
          properties,
          required,
        },
      };
    });
  }

  /**
   * Call a tool by name with arguments
   */
  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    const { name, arguments: args } = call;

    try {
      // Get tool from registry
      const tool = this.registry.get(name);

      if (!tool) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Tool not found: ${name}`,
              availableTools: this.registry.listAll().map((d) => d.name),
            }, null, 2),
          }],
          isError: true,
        };
      }

      // Validate parameters
      if (!tool.validateParams(args)) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Invalid parameters for tool: ${name}`,
              expected: tool.definition.parameters
                .filter(p => p.required)
                .map(p => p.name),
            }, null, 2),
          }],
          isError: true,
        };
      }

      // Execute tool
      let result;
      // We check if the tool has the executeWrapper (BaseMCPTool instances will have this)
      if ('executeWrapper' in tool && typeof (tool as any).executeWrapper === 'function') {
        result = await (tool as any).executeWrapper(args);
      } else {
        result = await tool.execute(args);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
        isError: !result.success,
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }, null, 2),
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle MCP protocol request
   */
  async handleRequest(request: {
    method: string;
    params?: Record<string, unknown>;
  }): Promise<{ result?: unknown; error?: { code: number; message: string } }> {
    const { method, params } = request;

    switch (method) {
      case 'initialize':
        return {
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: this.getServerInfo(),
          },
        };

      case 'tools/list':
        return {
          result: {
            tools: this.listTools(),
          },
        };

      case 'tools/call':
        if (!params || typeof params !== 'object') {
          return {
            error: { code: -32602, message: 'Invalid params' },
          };
        }
        return {
          result: await this.callTool({
            name: (params as Record<string, unknown>).name as string,
            arguments: (params as Record<string, unknown>).arguments as Record<string, unknown>,
          }),
        };

      case 'notifications/initialized':
        // Silence initialization notifications as per MCP spec
        return { result: {} };

      default:
        return {
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          },
        };
    }
  }
}

/**
 * Create an MCP server instance
 */
export function createMCPServer(config?: MCPServerConfig): MCPServer {
  return new MCPServer(config);
}

export default MCPServer;
