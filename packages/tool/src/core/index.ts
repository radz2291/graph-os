/**
 * Core module exports
 *
 * @module @graph-os/tool/core
 */

export {
  BaseTool,
  type ToolDefinition,
  type ParameterDefinition,
  type ToolResult,
} from './Tool';

export {
  SessionManager,
  type SessionState,
  type SignalRegistry,
  type CompositeRegistry,
} from './SessionState';

// Re-export types that are defined in types.ts
export type { NextAction, HistoryEntry } from './types';

export {
  CacheManager,
  type CacheEntry,
  CACHE_KEYS,
  CACHE_TTL,
  CACHE_TAGS,
  globalCacheManager,
} from './CacheManager';

export {
  ERROR_MESSAGES,
  formatError,
  createErrorResult,
  getAllErrorCodes,
  isValidErrorCode,
  getErrorDefinition,
  getErrorsBySeverity,
  type ErrorMessageDefinition,
  type FormattedError,
} from './ErrorMessages';

export * from './types';
