/**
 * Error Messages - Centralized error definitions with recovery suggestions
 *
 * Provides clear, actionable error messages for all Graph-OS tools.
 * Each error includes:
 * - A human-readable message
 * - Recovery suggestions
 * - Related error codes
 *
 * @module @graph-os/tool/core
 */

import { ErrorCode } from './types';

// =============================================================================
// ERROR MESSAGE TYPES
// =============================================================================

/**
 * Error message definition
 */
export interface ErrorMessageDefinition {
  /** Error code */
  code: ErrorCode | string;
  /** Human-readable message */
  message: string;
  /** Template variables in message (e.g., {path}) */
  variables?: string[];
  /** Recovery suggestions */
  suggestions: string[];
  /** Related documentation link */
  docUrl?: string;
  /** Related error codes */
  relatedCodes?: string[];
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Formatted error result
 */
export interface FormattedError {
  code: string;
  message: string;
  suggestions: string[];
  docUrl?: string;
  recovery?: {
    suggestions: string[];
    relatedCodes?: string[];
  };
}

// =============================================================================
// ERROR MESSAGE DEFINITIONS
// =============================================================================

/**
 * All error messages organized by category
 */
export const ERROR_MESSAGES: Record<string, ErrorMessageDefinition> = {
  // ===========================================================================
  // SESSION ERRORS
  // ===========================================================================

  SESSION_NOT_INITIALIZED: {
    code: 'SESSION_NOT_INITIALIZED',
    message: 'No project loaded. A project must be loaded before using this tool.',
    suggestions: [
      'Load a project with use({ project: "path/to/project" })',
      'Auto-detect a project with use({ detect: true })',
      'Initialize a new project with use({ init: { name: "my-project", path: "./my-project" } })',
    ],
    docUrl: '#use-tool',
    relatedCodes: ['PROJECT_NOT_FOUND', 'INVALID_CONFIG'],
    severity: 'error',
  },

  SESSION_ALREADY_INITIALIZED: {
    code: 'SESSION_ALREADY_INITIALIZED',
    message: 'Project "{name}" is already loaded.',
    variables: ['name'],
    suggestions: [
      'To switch projects, first reset the session',
      'To switch cartridges, use use({ cartridge: "cartridge-alias" })',
      'To check current state, call use({})',
    ],
    severity: 'warning',
  },

  // ===========================================================================
  // PROJECT ERRORS
  // ===========================================================================

  PROJECT_NOT_FOUND: {
    code: 'PROJECT_NOT_FOUND',
    message: 'Project not found at path: {path}',
    variables: ['path'],
    suggestions: [
      'Verify the path is correct and the directory exists',
      'Ensure graph-os.config.json exists in the project directory',
      'Use use({ detect: true }) to auto-detect a project from current directory',
      'Create a new project with use({ init: { name: "name", path: "path" } })',
    ],
    docUrl: '#use-tool---load-project',
    severity: 'error',
  },

  INVALID_CONFIG: {
    code: 'INVALID_CONFIG',
    message: 'Invalid project configuration: {reason}',
    variables: ['reason'],
    suggestions: [
      'Check that graph-os.config.json has valid JSON syntax',
      'Ensure required fields are present: name, activeCartridge, cartridges',
      'Verify cartridge paths are relative to the config file',
    ],
    docUrl: '#project-configuration',
    severity: 'error',
  },

  CARTRIDGE_NOT_FOUND: {
    code: 'CARTRIDGE_NOT_FOUND',
    message: 'Cartridge "{alias}" not found in project.',
    variables: ['alias'],
    suggestions: [
      'Check the cartridge alias in graph-os.config.json',
      'Available cartridges are listed in the config file',
      'Ensure the cartridge file exists at the specified path',
    ],
    severity: 'error',
  },

  CARTRIDGE_FILE_NOT_FOUND: {
    code: 'CARTRIDGE_FILE_NOT_FOUND',
    message: 'Cartridge file not found: {path}',
    variables: ['path'],
    suggestions: [
      'Verify the cartridge file exists',
      'Check the path in graph-os.config.json is relative to project root',
    ],
    severity: 'error',
  },

  // ===========================================================================
  // PARAMETER ERRORS
  // ===========================================================================

  INVALID_PARAMETERS: {
    code: 'INVALID_PARAMETERS',
    message: 'Invalid parameters: {reason}',
    variables: ['reason'],
    suggestions: [
      'Check the parameter format matches the expected schema',
      'Refer to the tool documentation for required parameters',
    ],
    docUrl: '#tool-reference',
    severity: 'error',
  },

  MISSING_REQUIRED_PARAMETER: {
    code: 'MISSING_REQUIRED_PARAMETER',
    message: 'Missing required parameter: {parameter}',
    variables: ['parameter'],
    suggestions: [
      'Add the required parameter to your request',
      'Check the tool documentation for required parameters',
    ],
    severity: 'error',
  },

  // ===========================================================================
  // PATCH ERRORS
  // ===========================================================================

  PATCH_REQUIRES_CONFIRM: {
    code: 'PATCH_REQUIRES_CONFIRM',
    message: 'Destructive operation requires confirmation. The following operations are destructive: {operations}',
    variables: ['operations'],
    suggestions: [
      'Add confirm: true to proceed with the operation',
      'Use dryRun: true to preview changes without applying',
      'Review the operations carefully before confirming',
    ],
    docUrl: '#patch-tool---destructive-operations',
    relatedCodes: ['PATCH_NODE_HAS_WIRES'],
    severity: 'warning',
  },

  PATCH_NODE_EXISTS: {
    code: 'PATCH_NODE_EXISTS',
    message: 'Node with id "{id}" already exists.',
    variables: ['id'],
    suggestions: [
      'Use a different, unique node ID',
      'Use replace operation to modify the existing node',
      'Use test operation to check if node exists before adding',
    ],
    severity: 'error',
  },

  PATCH_NODE_NOT_FOUND: {
    code: 'PATCH_NODE_NOT_FOUND',
    message: 'Node not found: {id}',
    variables: ['id'],
    suggestions: [
      'Check the node ID is correct',
      'Use query({ from: "nodes" }) to list all available nodes',
      'The node may have been removed in a previous operation',
    ],
    severity: 'error',
  },

  PATCH_NODE_HAS_WIRES: {
    code: 'PATCH_NODE_HAS_WIRES',
    message: 'Cannot remove node "{id}": {count} wire(s) are connected to it.',
    variables: ['id', 'count'],
    suggestions: [
      'Remove connected wires first',
      'Use query({ from: "wires", where: { from: "id" } }) to find connected wires',
      'Use replace operation to modify the node instead of removing it',
    ],
    relatedCodes: ['PATCH_REQUIRES_CONFIRM'],
    severity: 'error',
  },

  PATCH_WIRE_INVALID: {
    code: 'PATCH_WIRE_INVALID',
    message: 'Invalid wire definition: {reason}',
    variables: ['reason'],
    suggestions: [
      'Ensure wire has all required fields: from, to, signalType',
      'Verify source node exists',
      'Verify target node exists',
    ],
    severity: 'error',
  },

  PATCH_SIGNAL_NOT_REGISTERED: {
    code: 'PATCH_SIGNAL_NOT_REGISTERED',
    message: 'Signal type "{type}" is not registered.',
    variables: ['type'],
    suggestions: [
      'Register the signal in the signal registry',
      'Check for typos in the signal type name',
      'Use wildcard patterns like DATA.* for generic signals',
    ],
    severity: 'warning',
  },

  PATCH_OPERATION_FAILED: {
    code: 'PATCH_OPERATION_FAILED',
    message: 'Patch operation failed at step {step}: {reason}',
    variables: ['step', 'reason'],
    suggestions: [
      'Use explain: true to get detailed execution trace',
      'Check the operation path and value',
      'Ensure the target exists for replace/remove operations',
    ],
    severity: 'error',
  },

  // ===========================================================================
  // RUNTIME ERRORS
  // ===========================================================================

  RUNTIME_NOT_STARTED: {
    code: 'RUNTIME_NOT_STARTED',
    message: 'Runtime is not running. Start it first before injecting signals.',
    suggestions: [
      'Start the runtime with run({ mode: "start" })',
      'For testing, use mode: "test" which auto-starts the runtime',
    ],
    severity: 'error',
  },

  RUNTIME_ALREADY_RUNNING: {
    code: 'RUNTIME_ALREADY_RUNNING',
    message: 'Runtime is already running.',
    suggestions: [
      'Stop the runtime first with run({ mode: "stop" })',
      'Inject signals directly with run({ mode: "inject", signal: {...} })',
    ],
    severity: 'warning',
  },

  RUNTIME_START_FAILED: {
    code: 'RUNTIME_START_FAILED',
    message: 'Failed to start runtime: {reason}',
    variables: ['reason'],
    suggestions: [
      'Check the cartridge is valid',
      'Verify all node types are registered',
      'Check for circular dependencies in the graph',
    ],
    severity: 'error',
  },

  RUNTIME_INJECT_FAILED: {
    code: 'RUNTIME_INJECT_FAILED',
    message: 'Failed to inject signal: {reason}',
    variables: ['reason'],
    suggestions: [
      'Ensure the runtime is running',
      'Check the signal type is valid',
      'Verify the signal payload matches expected schema',
    ],
    severity: 'error',
  },

  TEST_TIMEOUT: {
    code: 'TEST_TIMEOUT',
    message: 'Test timed out after {timeout}ms.',
    variables: ['timeout'],
    suggestions: [
      'Increase the timeout in expect.timeout',
      'Check for infinite loops in the graph',
      'Verify signal handlers complete correctly',
    ],
    severity: 'error',
  },

  TEST_ASSERTION_FAILED: {
    code: 'TEST_ASSERTION_FAILED',
    message: 'Test assertion failed: expected {expected}, got {actual}',
    variables: ['expected', 'actual'],
    suggestions: [
      'Check the signal flow produces expected outputs',
      'Use debug mode to trace signal propagation',
      'Verify node configurations are correct',
    ],
    severity: 'error',
  },

  // ===========================================================================
  // GENERATION ERRORS
  // ===========================================================================

  GENERATION_FAILED: {
    code: 'GENERATION_FAILED',
    message: 'Generation failed: {reason}',
    variables: ['reason'],
    suggestions: [
      'Check the generation parameters',
      'Ensure output directory exists and is writable',
      'Verify template names are correct',
    ],
    severity: 'error',
  },

  GENERATION_FILE_EXISTS: {
    code: 'GENERATION_FILE_EXISTS',
    message: 'Output file already exists: {path}',
    variables: ['path'],
    suggestions: [
      'Use a different output path',
      'Delete the existing file first',
      'Use overwrite: true if supported',
    ],
    severity: 'error',
  },

  GENERATION_INVALID_TEMPLATE: {
    code: 'GENERATION_INVALID_TEMPLATE',
    message: 'Invalid template: {template}',
    variables: ['template'],
    suggestions: [
      'Use a builtin template: minimal, full, empty',
      'Check the template name is correct',
    ],
    severity: 'error',
  },

  // ===========================================================================
  // CACHE ERRORS
  // ===========================================================================

  CACHE_EXPIRED: {
    code: 'CACHE_EXPIRED',
    message: 'Cached data has expired for key: {key}',
    variables: ['key'],
    suggestions: [
      'The data will be refreshed automatically',
      'Use fresh: true to force a cache refresh',
    ],
    severity: 'info',
  },

  // ===========================================================================
  // TARGET ERRORS
  // ===========================================================================

  TARGET_NOT_FOUND: {
    code: 'TARGET_NOT_FOUND',
    message: 'Target not found: {target}',
    variables: ['target'],
    suggestions: [
      'Check the target name is correct',
      'Valid targets: cartridge, signals, composites',
    ],
    severity: 'error',
  },

  // ===========================================================================
  // UNKNOWN ERROR
  // ===========================================================================

  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred: {message}',
    variables: ['message'],
    suggestions: [
      'Check the error details for more information',
      'Try the operation again',
      'Report the issue if it persists',
    ],
    severity: 'error',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format an error message with variable substitution
 */
export function formatError(
  code: string,
  variables: Record<string, string | number> = {}
): FormattedError {
  const definition = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;

  // Substitute variables in message
  let message = definition.message;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(`{${key}}`, String(value));
  }

  return {
    code: definition.code,
    message,
    suggestions: definition.suggestions,
    docUrl: definition.docUrl,
    recovery: {
      suggestions: definition.suggestions,
      relatedCodes: definition.relatedCodes,
    },
  };
}

/**
 * Create an error result object for tool responses
 */
export function createErrorResult(
  code: string,
  variables: Record<string, string | number> = {},
  additionalData?: Record<string, unknown>
): {
  status: 'error';
  error: {
    code: string;
    message: string;
    recovery?: {
      suggestions: string[];
      relatedCodes?: string[];
    };
    data?: Record<string, unknown>;
  };
} {
  const formatted = formatError(code, variables);

  return {
    status: 'error',
    error: {
      code: formatted.code,
      message: formatted.message,
      recovery: formatted.recovery,
      data: additionalData,
    },
  };
}

/**
 * Get all error codes
 */
export function getAllErrorCodes(): string[] {
  return Object.keys(ERROR_MESSAGES);
}

/**
 * Check if an error code is valid
 */
export function isValidErrorCode(code: string): boolean {
  return code in ERROR_MESSAGES;
}

/**
 * Get error definition by code
 */
export function getErrorDefinition(code: string): ErrorMessageDefinition | undefined {
  return ERROR_MESSAGES[code];
}

/**
 * Get errors by severity
 */
export function getErrorsBySeverity(severity: 'error' | 'warning' | 'info'): ErrorMessageDefinition[] {
  return Object.values(ERROR_MESSAGES).filter(def => def.severity === severity);
}

// =============================================================================
// ERROR CODE CONSTANTS (re-export from types for convenience)
// =============================================================================

export { ErrorCode } from './types';
