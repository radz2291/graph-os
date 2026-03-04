/**
 * MCP Tool Registry - Manages registration and discovery of MCP tools
 * 
 * @module @graph-os/mcp-tools
 */

import { MCPTool, MCPToolDefinition, MCPToolResult } from '../core/MCPTool';

type AnyMCPTool = MCPTool<any, any>;

/**
 * Registry for MCP tools.
 */
export class MCPToolRegistry {
  private tools: Map<string, AnyMCPTool> = new Map();

  /**
   * Registers a tool with the registry.
   * 
   * @param tool - The tool to register
   */
  register(tool: AnyMCPTool): void {
    const name = tool.definition.name;
    if (this.tools.has(name)) {
      console.warn(`Overwriting existing tool: ${name}`);
    }
    this.tools.set(name, tool);
  }

  /**
   * Gets a tool by name.
   * 
   * @param name - Tool name
   * @returns The tool, or undefined if not found
   */
  get(name: string): AnyMCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks if a tool exists.
   * 
   * @param name - Tool name
   * @returns True if the tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Lists all registered tools.
   * 
   * @returns Array of tool definitions
   */
  listAll(): MCPToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition);
  }

  /**
   * Lists tools by category.
   * 
   * @param category - Tool category prefix (e.g., 'architecture')
   * @returns Array of tool definitions
   */
  listByCategory(category: string): MCPToolDefinition[] {
    return Array.from(this.tools.values())
      .filter((tool) => tool.definition.name.startsWith(category))
      .map((tool) => tool.definition);
  }

  /**
   * Executes a tool by name.
   * 
   * @param name - Tool name
   * @param params - Tool parameters
   * @returns Tool execution result
   */
  async execute(name: string, params: Record<string, unknown>): Promise<MCPToolResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`,
      };
    }

    if (!tool.validateParams(params)) {
      return {
        success: false,
        error: `Invalid parameters for tool: ${name}`,
      };
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Gets the number of registered tools.
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Clears all registered tools.
   */
  clear(): void {
    this.tools.clear();
  }
}

// Global registry instance
export const globalToolRegistry = new MCPToolRegistry();
