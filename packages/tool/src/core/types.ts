/**
 * Shared type definitions for Graph-OS Tool v2
 *
 * @module @graph-os/tool/core
 */

// =============================================================================
// PROJECT CONFIGURATION
// =============================================================================

/**
 * Complete project configuration for Graph-OS
 */
export interface GraphOSProjectConfig {
  /** Project name */
  name: string;
  /** Project version */
  version?: string;
  /** Project root directory - all paths relative to this */
  root: string;
  /** Currently active cartridge alias */
  activeCartridge: string;
  /** Map of cartridge alias to configuration */
  cartridges: Record<string, CartridgeConfig>;
  /** Path to signal registry (relative to root) */
  signalRegistry: string;
  /** Path to composite registry (relative to root) */
  compositeRegistry: string;
  /** Runtime settings */
  runtime?: RuntimeConfig;
  /** Custom node configuration */
  customNodes?: CustomNodesConfig;
  /** Output settings */
  output?: OutputConfig;
  /** History/checkpoint settings */
  history?: HistoryConfig;
  /** Watch mode settings */
  watch?: WatchConfig;
}

/**
 * Cartridge configuration
 */
export interface CartridgeConfig {
  /** Path to cartridge file (relative to root) */
  path: string;
  /** Human-readable description */
  description?: string;
  /** Signal registry override */
  signalRegistry?: string;
  /** Composite registry override */
  compositeRegistry?: string;
}

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Maximum signal queue size */
  maxQueueSize?: number;
  /** Signal processing timeout (ms) */
  timeout?: number;
  /** Auto-start on load */
  autoStart?: boolean;
}

/**
 * Custom nodes configuration
 */
export interface CustomNodesConfig {
  /** Directory containing custom node implementations */
  directory: string;
  /** Auto-discover and register nodes */
  autoRegister?: boolean;
  /** File pattern for discovery */
  pattern?: string;
}

/**
 * Output configuration
 */
export interface OutputConfig {
  /** Build output directory */
  dist: string;
  /** JSON output format */
  format?: 'compact' | 'pretty';
  /** Generate source maps */
  sourceMaps?: boolean;
  /** Minify output */
  minify?: boolean;
}

/**
 * History configuration
 */
export interface HistoryConfig {
  /** Enable history/checkpoints */
  enabled?: boolean;
  /** Maximum checkpoints to keep */
  maxCheckpoints?: number;
  /** History storage directory */
  directory?: string;
  /** Auto-checkpoint before modifications */
  autoCheckpoint?: boolean;
}

/**
 * Watch configuration
 */
export interface WatchConfig {
  /** Enable file watching */
  enabled?: boolean;
  /** Glob patterns to ignore */
  ignore?: string[];
  /** Debounce interval (ms) */
  debounce?: number;
}

// =============================================================================
// TOOL PARAMETERS
// =============================================================================

/**
 * Parameters for use tool
 */
export interface UseParams {
  /** Path to project root or config file */
  project?: string;
  /** Auto-detect project from current directory */
  detect?: boolean;
  /** Switch active cartridge */
  cartridge?: string;
  /** Configuration modifications */
  config?: {
    set?: Partial<GraphOSProjectConfig>;
    addCartridge?: { alias: string; path: string; description?: string };
    removeCartridge?: string;
  };
  /** Initialize new project */
  init?: {
    name: string;
    path: string;
    template?: 'minimal' | 'auth' | 'crud' | 'blank';
    includeReact?: boolean;
    author?: string;
  };
  /** Rollback to checkpoint by ID */
  rollback?: string;
}

/**
 * Result from use tool
 */
export interface UseResult {
  summary: string;
  status: 'ok' | 'error' | 'not_found';
  metrics?: {
    cartridges?: number;
    nodes?: number;
    wires?: number;
  };
  config?: GraphOSProjectConfig;
  state?: {
    activeCartridge: string;
    runtimeStatus: 'stopped' | 'running' | 'error';
    lastOperation?: string;
    checkpointsAvailable: number;
  };
  nextActions?: NextAction[];
  error?: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * Parameters for query tool
 */
export interface QueryParams {
  /** Target to query from */
  from: 'cartridge' | 'nodes' | 'wires' | 'signals' | 'composites' | 'topology' | 'state' | 'history' | 'checkpoints';
  /** Filter criteria */
  where?: QueryWhere;
  /** Output format */
  select?: 'summary' | 'full' | 'compact' | 'graph' | 'mermaid' | 'stats' | 'paths' | 'validation';
  /** Override active cartridge */
  cartridge?: string;
  /** Maximum depth for nested queries */
  depth?: number;
  /** Maximum results to return */
  limit?: number;
  /** Skip cache and force fresh read */
  fresh?: boolean;
}

/**
 * Filter criteria for query tool
 */
export interface QueryWhere {
  /** Exact ID match */
  id?: string;
  /** Pattern match on type (supports * wildcard) */
  type?: string;
  /** Signal type pattern (finds nodes that handle this signal) */
  handlesSignal?: string;
  /** Find nodes upstream from this node */
  upstream?: string;
  /** Find nodes downstream from this node */
  downstream?: string;
  /** Find signal flow path between nodes */
  path?: { from: string; to: string };
  /** Full-text search in descriptions */
  search?: string;
  /** Filter by validation status */
  valid?: boolean;
}

/**
 * Result from query tool
 */
export interface QueryResult {
  summary: string;
  status: 'ok' | 'empty' | 'error' | 'partial';
  metrics?: {
    count: number;
    valid?: boolean;
    issues?: number;
  };
  data?: unknown;
  visual?: string;
  issues?: QueryIssue[];
  nextActions?: NextAction[];
  raw?: unknown;
}

/**
 * Query issue
 */
export interface QueryIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  location: string;
  fix?: PatchOperation;
}

/**
 * Parameters for patch tool
 */
export interface PatchParams {
  /** JSON Patch operations */
  ops: PatchOperation[];
  /** Preview changes without applying */
  dryRun?: boolean;
  /** Required for destructive operations */
  confirm?: boolean;
  /** Skip validation */
  skipValidation?: boolean;
  /** Create named checkpoint */
  checkpoint?: string | boolean;
  /** Target cartridge */
  cartridge?: string;
  /** Target registry instead of cartridge */
  target?: 'cartridge' | 'signals' | 'composites';
  /** Return step-by-step trace */
  explain?: boolean;
}

/**
 * JSON Patch operation (RFC 6902)
 */
export type PatchOperation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown };

/**
 * Result from patch tool
 */
export interface PatchResult {
  summary: string;
  status: 'ok' | 'partial' | 'error' | 'dry_run';
  metrics?: {
    applied: number;
    failed: number;
    nodes: number;
    wires: number;
  };
  changes?: Array<{
    op: string;
    path: string;
    description: string;
    status: 'applied' | 'failed' | 'skipped';
  }>;
  checkpoint?: { id: string; name: string; timestamp: Date };
  validation?: { valid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] };
  recovery?: { rollback: PatchOperation[]; retry: PatchOperation[]; suggestions: string[] };
  nextActions?: NextAction[];
  trace?: Array<{
    step: number;
    op: PatchOperation;
    status: 'pending' | 'validating' | 'applying' | 'complete' | 'failed';
    duration: number;
    message?: string;
  }>;
}

/**
 * Parameters for run tool
 */
export interface RunParams {
  /** Execution mode */
  mode: 'start' | 'stop' | 'inject' | 'test' | 'debug' | 'watch';
  /** Signal to inject */
  signal?: RunSignal;
  /** Test expectations */
  expect?: {
    signals?: string[];
    timeout?: number;
    snapshot?: boolean | string;
    state?: { nodesProcessed?: number; signalsEmitted?: number };
  };
  /** Enable execution tracing */
  trace?: boolean;
  /** Node IDs to pause at */
  breakpoints?: string[];
  /** Include signal history */
  history?: boolean;
  /** Enable file watching */
  watch?: boolean;
  /** Override active cartridge */
  cartridge?: string;
  /** Timeout for runtime operations (ms), default 5000 */
  timeout?: number;
}

/**
 * Signal for run tool
 */
export interface RunSignal {
  type: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Result from run tool
 */
export interface RunResult {
  summary: string;
  status: 'ok' | 'error' | 'timeout' | 'assertion_failed' | 'stopped';
  metrics?: {
    signalsProcessed: number;
    signalsEmitted: number;
    nodesExecuted: number;
    duration: number;
  };
  test?: {
    passed: boolean;
    assertions: Array<{ expected: string; actual: string; passed: boolean }>;
    snapshot?: { created: boolean; matched: boolean; path?: string };
  };
  trace?: Array<{
    timestamp: number;
    signal: { type: string; payload: unknown; sourceNodeId: string };
    nodeId: string;
    nodeType: string;
    duration: number;
    output?: unknown;
    error?: string;
  }>;
  signalHistory?: Array<{ type: string; payload: unknown; timestamp: Date; sourceNodeId: string }>;
  errors?: Array<{ nodeId: string; error: string; signal: unknown; timestamp: number }>;
  nextActions?: NextAction[];
}

/**
 * Parameters for generate tool
 */
export interface GenerateParams {
  /** Generate custom node */
  node?: {
    type: string;
    category: 'logic' | 'control' | 'infra' | 'ui';
    template?: 'validator' | 'transformer' | 'api-client' | 'storage' | 'input' | 'display' | 'blank';
    description?: string;
    output?: string;
    register?: boolean;
    hints?: { inputSignals?: string[]; outputSignals?: string[]; configSchema?: Record<string, unknown> };
  };
  /** Generate pattern */
  pattern?: {
    name?: string;
    description?: string;
    params?: Record<string, unknown>;
    output?: 'patch' | 'file' | 'composite';
    builtin?: 'auth-flow' | 'crud' | 'form-validation' | 'rate-limiting' | 'cache-aside';
  };
  /** Generate UI binding */
  uiBinding?: {
    component: string;
    signals: string[];
    framework?: 'react' | 'vue' | 'svelte';
    output?: string;
    types?: boolean;
  };
  /** Generate project */
  project?: { name: string; path: string; template?: 'minimal' | 'auth' | 'crud' | 'blank'; includeReact?: boolean; author?: string };
  /** Extract composite */
  composite?: { name: string; nodes: string[]; description?: string; autoMap?: boolean };
}

/**
 * Result from generate tool
 */
export interface GenerateResult {
  summary: string;
  status: 'ok' | 'error' | 'partial';
  metrics?: { filesGenerated: number; linesOfCode: number };
  pattern?: string;
  files?: Array<{ path: string; description: string; language: string }>;
  patch?: PatchOperation[];
  code?: Array<{ filename: string; content: string }>;
  registration?: { type: string; registered: boolean; path: string };
  nextActions?: NextAction[];
}

// =============================================================================
// QUERY OUTPUT TYPES
// =============================================================================

/**
 * Cartridge query data
 */
export interface CartridgeQueryData {
  name: string;
  version: string;
  description: string;
  nodeCount: number;
  wireCount: number;
  inputCount: number;
  outputCount: number;
}

/**
 * Node query data
 */
export interface NodeQueryData {
  id: string;
  type: string;
  description: string;
  config?: Record<string, unknown>;
  wiresIn?: number;
  wiresOut?: number;
}

/**
 * Signal query data
 */
export interface SignalQueryData {
  type: string;
  description: string;
  payloadSchema?: Record<string, unknown>;
  emittedBy: string[];
  consumedBy: string[];
}

/**
 * Topology query data
 */
export interface TopologyQueryData {
  entryPoints: string[];
  exitPoints: string[];
  signalPaths: SignalPath[];
}

/**
 * Signal path
 */
export interface SignalPath {
  start: string;
  end: string;
  signalType: string;
  path: string[];
}

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * Suggested next action for AI
 */
export interface NextAction {
  /** Tool to call */
  action: 'use' | 'query' | 'patch' | 'run' | 'generate';
  /** Human-readable description */
  description: string;
  /** Pre-filled parameters */
  params?: Record<string, unknown>;
  /** Priority for execution */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  fix?: PatchOperation;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  suggestion?: string;
}

/**
 * Tool definition for MCP protocol
 */
export interface ToolDefinition {
  name: string;
  purpose: string;
  whenToUse: string[];
  whenNotToUse: string[];
  triggers: string[];
  parameters: ParameterDefinition[];
  returnType: string;
  examples: Array<{
    input: Record<string, unknown>;
    description: string;
  }>;
}

/**
 * Parameter definition for tool
 */
export interface ParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: unknown;
  enum?: string[];
  hints?: Record<string, string>;
  examples?: unknown[];
}

/**
 * Error codes
 */
export enum ErrorCode {
  // Session errors
  SESSION_NOT_INITIALIZED = 'SESSION_NOT_INITIALIZED',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  CARTRIDGE_NOT_FOUND = 'CARTRIDGE_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CHECKPOINT_NOT_FOUND = 'CHECKPOINT_NOT_FOUND',

  // Query errors
  TARGET_NOT_FOUND = 'TARGET_NOT_FOUND',
  FILTER_NO_MATCH = 'FILTER_NO_MATCH',
  INVALID_QUERY = 'INVALID_QUERY',

  // Patch errors
  PATCH_VALIDATION_FAILED = 'PATCH_VALIDATION_FAILED',
  PATCH_REQUIRES_CONFIRM = 'PATCH_REQUIRES_CONFIRM',
  PATCH_NODE_NOT_FOUND = 'PATCH_NODE_NOT_FOUND',
  PATCH_SIGNAL_NOT_REGISTERED = 'PATCH_SIGNAL_NOT_REGISTERED',
  PATCH_WIRE_INVALID = 'PATCH_WIRE_INVALID',
  PATCH_CIRCULAR_DEPENDENCY = 'PATCH_CIRCULAR_DEPENDENCY',
  PATCH_TYPE_EXISTS = 'PATCH_TYPE_EXISTS',

  // Run errors
  RUNTIME_NOT_STARTED = 'RUNTIME_NOT_STARTED',
  RUNTIME_ALREADY_RUNNING = 'RUNTIME_ALREADY_RUNNING',
  SIGNAL_TIMEOUT = 'SIGNAL_TIMEOUT',
  ASSERTION_FAILED = 'ASSERTION_FAILED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Generate errors
  GENERATE_TYPE_EXISTS = 'GENERATE_TYPE_EXISTS',
  GENERATE_TEMPLATE_NOT_FOUND = 'GENERATE_TEMPLATE_NOT_FOUND',
  GENERATE_WRITE_FAILED = 'GENERATE_WRITE_FAILED',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
}

/**
 * Checkpoint for rollback
 */
export interface Checkpoint {
  id: string;
  name: string;
  timestamp: Date;
  description: string;
  operations: PatchOperation[];
  snapshot: unknown;
}

/**
 * History entry
 */
export interface HistoryEntry {
  id: string;
  timestamp: Date;
  tool: string;
  params: Record<string, unknown>;
  result: unknown;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  summary: string;
  status: 'error';
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
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
