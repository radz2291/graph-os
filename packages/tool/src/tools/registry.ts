/**
 * Tool Registry - Central registry for all Graph-OS tools
 *
 * @module @graph-os/tool/tools
 */

import type { BaseTool } from '../core/Tool';
import type { ToolDefinition } from '../core/types';

// Import all tools
import { UseTool, createUseTool } from './use';
import { QueryTool, createQueryTool } from './query';
import { PatchTool, createPatchTool } from './patch';
import { RunTool, createRunTool } from './run';
import { GenerateTool, createGenerateTool } from './generate';

// =============================================================================
// TOOL REGISTRY
// =============================================================================

/**
 * Registry for all Graph-OS tools
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool<any, any>> = new Map();

  /**
   * Register a tool
   */
  register(tool: BaseTool<any, any>): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): BaseTool<any, any> | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool definitions
   */
  listAll(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  /**
   * Get all tool names
   */
  names(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool count
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }
}

// =============================================================================
// GLOBAL REGISTRY
// =============================================================================

/**
 * Global tool registry instance
 */
export const globalToolRegistry = new ToolRegistry();

// =============================================================================
// REGISTRATION FUNCTION
// =============================================================================

/**
 * Register all built-in tools
 */
export function registerAllTools(): void {
  globalToolRegistry.register(createUseTool());
  globalToolRegistry.register(createQueryTool());
  globalToolRegistry.register(createPatchTool());
  globalToolRegistry.register(createRunTool());
  globalToolRegistry.register(createGenerateTool());
}

// Auto-register on module load
registerAllTools();

// =============================================================================
// EXPORTS
// =============================================================================

export { UseTool, QueryTool, PatchTool, RunTool, GenerateTool };
