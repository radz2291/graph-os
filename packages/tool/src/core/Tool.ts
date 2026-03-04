/**
 * Base Tool class and related types
 *
 * @module @graph-os/tool/core
 */

import type { ErrorCode, NextAction } from './types';

// =============================================================================
// TOOL DEFINITION
// =============================================================================

/**
 * Tool definition for MCP protocol
 */
export interface ToolDefinition {
  /** Tool name */
  name: string;
  /** One-line purpose */
  purpose: string;
  /** When to use this tool */
  whenToUse: string[];
  /** When NOT to use this tool */
  whenNotToUse: string[];
  /** Natural language triggers */
  triggers: string[];
  /** Parameter schema */
  parameters: ParameterDefinition[];
  /** Return type description */
  returnType: string;
  /** Usage examples */
  examples: Array<{
    input: Record<string, unknown>;
    description: string;
  }>;
}

/**
 * Parameter definition for tool
 */
export interface ParameterDefinition {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Required flag */
  required: boolean;
  /** Description */
  description: string;
  /** Default value */
  default?: unknown;
  /** Enum values */
  enum?: string[];
  /** Hints for each enum value */
  hints?: Record<string, string>;
  /** Usage examples */
  examples?: unknown[];
}

// =============================================================================
// TOOL RESULT
// =============================================================================

/**
 * Base result structure for all tools
 */
export interface ToolResult<TData = unknown> {
  /** One-line summary */
  summary: string;
  /** Result status */
  status: 'ok' | 'empty' | 'error' | 'partial' | 'dry_run' | 'not_found' | 'timeout' | 'assertion_failed' | 'stopped';
  /** Key metrics */
  metrics?: Record<string, number | boolean>;
  /** Primary data */
  data?: TData;
  /** Visual representation */
  visual?: string;
  /** Issues found */
  issues?: Array<{
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    location: string;
    fix?: unknown;
  }>;
  /** Suggested next actions */
  nextActions?: NextAction[];
  /** Raw data (for full output) */
  raw?: unknown;
  /** Error details */
  error?: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  /** Recovery options */
  recovery?: {
    suggestions: string[];
    fix?: unknown;
    alternatives?: Array<{
      description: string;
      action: string;
      params: Record<string, unknown>;
    }>;
  };
}

// =============================================================================
// BASE TOOL CLASS
// =============================================================================

/**
 * Abstract base class for all tools
 */
export abstract class BaseTool<TParams, TResult> {
  /** Tool name */
  abstract readonly name: string;
  /** Tool definition */
  abstract readonly definition: ToolDefinition;

  /**
   * Execute the tool with given parameters
   */
  abstract execute(params: TParams): Promise<ToolResult<TResult>>;

  /**
   * Validate parameters against tool definition
   */
  validate(params: unknown): params is TParams {
    if (typeof params !== 'object' || params === null) {
      return false;
    }

    const p = params as Record<string, unknown>;

    for (const param of this.definition.parameters) {
      if (param.required && !(param.name in p)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a success result
   */
  protected success(
    summary: string,
    data?: Partial<TResult>,
    options?: {
      metrics?: Record<string, number | boolean>;
      visual?: string;
      nextActions?: NextAction[];
    }
  ): ToolResult<TResult> {
    return {
      summary,
      status: 'ok',
      metrics: options?.metrics,
      data: data as TResult,
      visual: options?.visual,
      nextActions: options?.nextActions,
    };
  }

  /**
   * Create an error result
   */
  protected error(
    code: ErrorCode,
    message: string,
    options?: {
      details?: unknown;
      recovery?: ToolResult['recovery'];
    }
  ): ToolResult<TResult> {
    return {
      summary: `Error: ${message}`,
      status: 'error',
      error: {
        code,
        message,
        details: options?.details,
      },
      recovery: options?.recovery,
    };
  }

  /**
   * Create an empty result
   */
  protected empty(summary: string, options?: { metrics?: Record<string, number | boolean> }): ToolResult<TResult> {
    return {
      summary,
      status: 'empty',
      metrics: options?.metrics,
    };
  }

  /**
   * Create a partial result
   */
  protected partial(
    summary: string,
    data?: Partial<TResult>,
    options?: {
      metrics?: Record<string, number | boolean>;
      issues?: ToolResult['issues'];
      recovery?: ToolResult['recovery'];
    }
  ): ToolResult<TResult> {
    return {
      summary,
      status: 'partial',
      metrics: options?.metrics,
      data: data as TResult,
      issues: options?.issues,
      recovery: options?.recovery,
    };
  }
}
