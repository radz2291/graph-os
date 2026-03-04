/**
 * MCP Server - Model Context Protocol server for Graph-OS tools
 *
 * Implements the MCP protocol for AI clients (Claude Desktop, etc.)
 *
 * @module @graph-os/tool/servers
 */

import { globalToolRegistry, registerAllTools } from '../tools/registry';

// =============================================================================
// TYPES
// =============================================================================

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  /** Server name */
  name?: string;
  /** Server version */
  version?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * MCP tool call request
 */
export interface MCPToolCall {
  /** Tool name */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
}

/**
 * MCP tool result
 */
export interface MCPToolResult {
  /** Result content */
  content: Array<{
    type: 'text';
    text: string;
  }>;
  /** Is error flag */
  isError?: boolean;
}

/**
 * MCP capabilities
 */
export interface MCPCapabilities {
  tools?: {};
  resources?: {};
  prompts?: {};
}

/**
 * MCP server info
 */
export interface MCPServerInfo {
  name: string;
  version: string;
}

/**
 * MCP protocol response
 */
export interface MCPResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

// =============================================================================
// MCP SERVER CLASS
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
 *   name: 'use',
 *   arguments: { project: '/path/to/project' }
 * });
 * ```
 */
export class MCPServer {
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig = {}) {
    this.config = {
      name: config.name || 'graph-os-tool',
      version: config.version || '2.0.0',
      debug: config.debug || false,
    };

    // Ensure tools are registered
    registerAllTools();
  }

  /**
   * Get server info
   */
  getServerInfo(): MCPServerInfo {
    return {
      name: this.config.name!,
      version: this.config.version!,
    };
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): MCPCapabilities {
    return {
      tools: {},
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
        enum?: string[];
        default?: unknown;
      }>;
      required: string[];
    };
  }> {
    const tools = globalToolRegistry.listAll();

    return tools.map((toolDef) => {
      // Convert parameters to JSON Schema format
      const properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        default?: unknown;
      }> = {};
      const required: string[] = [];

      for (const param of toolDef.parameters) {
        properties[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.enum ? { enum: param.enum } : {}),
          ...(param.default !== undefined ? { default: param.default } : {}),
        };
        if (param.required) {
          required.push(param.name);
        }
      }

      return {
        name: toolDef.name,
        description: `${toolDef.purpose}\n\nWhen to use: ${toolDef.whenToUse.join(', ')}`,
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
      const tool = globalToolRegistry.get(name);

      if (!tool) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              summary: `Tool not found: ${name}`,
              status: 'error',
              error: {
                code: 'TOOL_NOT_FOUND',
                message: `Tool '${name}' is not registered`,
                availableTools: globalToolRegistry.names(),
              },
            }, null, 2),
          }],
          isError: true,
        };
      }

      // Validate parameters
      if (!tool.validate(args)) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              summary: `Invalid parameters for tool: ${name}`,
              status: 'error',
              error: {
                code: 'INVALID_PARAMETERS',
                message: 'Parameters validation failed',
                expected: tool.definition.parameters
                  .filter(p => p.required)
                  .map(p => p.name),
              },
            }, null, 2),
          }],
          isError: true,
        };
      }

      // Execute tool
      const result = await tool.execute(args);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
        isError: result.status === 'error',
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            summary: `Error executing tool: ${name}`,
            status: 'error',
            error: {
              code: 'EXECUTION_ERROR',
              message: error instanceof Error ? error.message : String(error),
            },
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
  }): Promise<MCPResponse> {
    const { method, params } = request;

    switch (method) {
      case 'initialize':
        return {
          result: {
            protocolVersion: '2024-11-05',
            capabilities: this.getCapabilities(),
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

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an MCP server instance
 */
export function createMCPServer(config?: MCPServerConfig): MCPServer {
  return new MCPServer(config);
}

export default MCPServer;
