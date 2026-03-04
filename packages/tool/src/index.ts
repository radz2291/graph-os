/**
 * @graph-os/tool
 *
 * Graph-OS MCP Tools v2 - Minimal AI interface for graph manipulation
 *
 * This package provides 5 tools for AI agents to interact with Graph-OS:
 * - use: Context & config management
 * - query: Read & explore graph
 * - patch: Modify graph topology
 * - run: Execute & test
 * - generate: Scaffold & create
 *
 * @module @graph-os/tool
 * @version 2.0.0
 */

// =============================================================================
// Core Exports
// =============================================================================

export {
  BaseTool,
  type ToolDefinition,
  type ParameterDefinition,
  type ToolResult,
} from './core/Tool';

export {
  SessionManager,
  type SessionState,
} from './core/SessionState';

export type { HistoryEntry, NextAction } from './core/types';

export {
  CacheManager,
  type CacheEntry,
  CACHE_KEYS,
  CACHE_TTL,
  CACHE_TAGS,
  globalCacheManager,
} from './core/CacheManager';

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Project Configuration
  GraphOSProjectConfig,
  CartridgeConfig,
  RuntimeConfig,
  CustomNodesConfig,
  OutputConfig,
  HistoryConfig,
  WatchConfig,

  // Tool Parameters
  UseParams,
  UseResult,
  QueryParams,
  QueryResult,
  QueryWhere,
  PatchParams,
  PatchResult,
  PatchOperation,
  RunParams,
  RunResult,
  RunSignal,
  GenerateParams,
  GenerateResult,

  // Output Types
  CartridgeQueryData,
  NodeQueryData,
  SignalQueryData,
  TopologyQueryData,
  SignalPath,

  // Error Types
  ValidationError,
  ErrorCode,
  ErrorResponse,

  // Checkpoint
  Checkpoint,
} from './core/types';

export { ErrorCode as ErrorCodes } from './core/types';

// =============================================================================
// Tool Exports
// =============================================================================

export { UseTool, createUseTool } from './tools/use';
export { QueryTool, createQueryTool } from './tools/query';
export { PatchTool, createPatchTool } from './tools/patch';
export { RunTool, createRunTool } from './tools/run';
export { GenerateTool, createGenerateTool } from './tools/generate';

export { ToolRegistry, globalToolRegistry, registerAllTools } from './tools/registry';

// =============================================================================
// Server Exports
// =============================================================================

export {
  MCPServer,
  createMCPServer,
  type MCPServerConfig,
  type MCPToolCall,
} from './servers/MCPServer';

export {
  SSEServer,
  createSSEServer,
  type SSEServerConfig,
} from './servers/SSEServer';

export {
  HTTPServer,
  createHTTPServer,
  type HTTPServerConfig,
} from './servers/HTTPServer';

export {
  WSServer,
  createWSServer,
  type WSServerConfig,
} from './servers/WSServer';

// =============================================================================
// Output Exports
// =============================================================================

export { OutputFormatter, type FormatOptions } from './output/Formatter';

// =============================================================================
// Utility Exports
// =============================================================================

export const TOOL_VERSION = '2.0.0';
export const TOOL_NAMES = ['use', 'query', 'patch', 'run', 'generate'] as const;
export type ToolName = typeof TOOL_NAMES[number];

/**
 * Get all tool definitions for MCP tools/list
 */
export function getAllToolDefinitions(): import('./core/Tool').ToolDefinition[] {
  // Lazy import to avoid circular dependencies
  const { globalToolRegistry } = require('./tools/registry');
  return globalToolRegistry.listAll();
}
