# Graph-OS MCP Tools v2 - Level 3 Specification

**Version:** 2.0.0
**Status:** Draft
**Package:** `@graph-os/tool`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Configuration](#3-project-configuration)
4. [Tool Specifications](#4-tool-specifications)
   - 4.1 [use](#41-use---context--config-management)
   - 4.2 [query](#42-query---read--explore)
   - 4.3 [patch](#43-patch---modify-graph)
   - 4.4 [run](#44-run---execute--test)
   - 4.5 [generate](#45-generate---scaffold--create)
5. [Shared Types](#5-shared-types)
6. [Output Specification](#6-output-specification)
7. [Error Handling](#7-error-handling)
8. [Session State Management](#8-session-state-management)
9. [Caching Strategy](#9-caching-strategy)
10. [Test Specification](#10-test-specification)

---

## 1. Overview

### 1.1 Purpose

Graph-OS MCP Tools v2 provides a minimal, efficient interface for AI agents to interact with Graph-OS graphs. The design follows these principles:

- **Minimal cognitive load**: 5 tools instead of 23
- **CRUD mental model**: Where, Read, Write, Execute, Create
- **Agent-optimized outputs**: Token-efficient, actionable, structured
- **Safe by default**: Validation, dry-run, checkpoints built-in

### 1.2 Design Goals

| Goal | Approach |
|------|----------|
| Reduce tool count | Consolidate operations by intent |
| Optimize for AI | Structured outputs, minimal tokens |
| Enable autonomy | nextActions, recovery suggestions |
| Ensure safety | Validation, confirmation, rollback |
| Support scaling | Multi-cartridge, caching, streaming |

### 1.3 Tool Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GRAPH-OS MCP v2 - 5 TOOLS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│   │   use    │   │  query   │   │  patch   │   │   run    │   │ generate │ │
│   │          │   │          │   │          │   │          │   │          │ │
│   │ "WHERE"  │   │  "READ"  │   │ "WRITE"  │   │ "EXECUTE"│   │  "CREATE"│ │
│   │          │   │          │   │          │   │          │   │          │ │
│   │ Context  │   │ Explore  │   │  Modify  │   │   Test   │   │ Scaffold │ │
│   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│                                                                              │
│   Project        Topology      Cartridge     Runtime        Custom Nodes   │
│   Config         Signals       Wires         Execution      Patterns       │
│   Session        Nodes         Signals       Testing        UI Bindings    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture

### 2.1 Package Structure

```
packages/tool/
├── src/
│   ├── index.ts                    # Main exports
│   ├── core/
│   │   ├── ToolRegistry.ts         # Tool registration
│   │   ├── SessionState.ts         # Session management
│   │   ├── CacheManager.ts         # Caching layer
│   │   └── types.ts                # Shared types
│   ├── tools/
│   │   ├── use.ts                  # Context tool
│   │   ├── query.ts                # Query tool
│   │   ├── patch.ts                # Patch tool
│   │   ├── run.ts                  # Run tool
│   │   └── generate.ts             # Generate tool
│   ├── output/
│   │   ├── Formatter.ts            # Output formatting
│   │   └── Compressor.ts           # Token optimization
│   ├── servers/
│   │   ├── MCPServer.ts            # MCP protocol server
│   │   ├── SSEServer.ts            # Server-Sent Events
│   │   ├── HTTPServer.ts           # REST API
│   │   └── WSServer.ts             # WebSocket
│   └── bin/
│       └── server.ts               # CLI entry point
├── test/
│   ├── tools/
│   │   ├── use.test.ts
│   │   ├── query.test.ts
│   │   ├── patch.test.ts
│   │   ├── run.test.ts
│   │   └── generate.test.ts
│   ├── integration/
│   │   ├── workflow.test.ts
│   │   ├── multi-cartridge.test.ts
│   │   └── error-recovery.test.ts
│   └── fixtures/
│       ├── test-project/
│       └── mock-cartridges/
├── package.json
└── tsconfig.json
```

### 2.2 Dependency Graph

```
@graph-os/tool
├── @graph-os/core (types, interfaces)
├── @graph-os/runtime (execution engine)
├── @graph-os/validators (validation pipeline)
└── external:
    ├── fast-json-patch (JSON Patch operations)
    └── ajv (JSON Schema validation)
```

### 2.3 Core Components

```typescript
// Core abstractions

interface Tool {
  readonly name: string;
  readonly definition: ToolDefinition;
  execute(params: unknown): Promise<ToolResult>;
  validate(params: unknown): ValidationResult;
}

interface ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  listAll(): ToolDefinition[];
}

interface SessionState {
  config: GraphOSProjectConfig | null;
  activeCartridge: Cartridge | null;
  runtime: GraphRuntime | null;
  history: HistoryEntry[];
  cache: CacheStore;
}
```

---

## 3. Project Configuration

### 3.1 Configuration Schema

```typescript
interface GraphOSProjectConfig {
  // ═══════════════════════════════════════════════════════════════
  // CORE IDENTITY
  // ═══════════════════════════════════════════════════════════════
  
  /** Project name (required) */
  name: string;
  
  /** Project version */
  version?: string;
  
  /** Project root directory - all paths relative to this (required) */
  root: string;
  
  // ═══════════════════════════════════════════════════════════════
  // CARTRIDGE MAPPING
  // ═══════════════════════════════════════════════════════════════
  
  /** Currently active cartridge alias */
  activeCartridge: string;
  
  /** Map of cartridge alias to configuration */
  cartridges: Record<string, CartridgeConfig>;
  
  // ═══════════════════════════════════════════════════════════════
  // REGISTRIES
  // ═══════════════════════════════════════════════════════════════
  
  /** Path to signal registry (relative to root) */
  signalRegistry: string;
  
  /** Path to composite registry (relative to root) */
  compositeRegistry: string;
  
  // ═══════════════════════════════════════════════════════════════
  // RUNTIME SETTINGS
  // ═══════════════════════════════════════════════════════════════
  
  runtime?: RuntimeConfig;
  
  // ═══════════════════════════════════════════════════════════════
  // CUSTOM NODES
  // ═══════════════════════════════════════════════════════════════
  
  customNodes?: CustomNodesConfig;
  
  // ═══════════════════════════════════════════════════════════════
  // OUTPUT SETTINGS
  // ═══════════════════════════════════════════════════════════════
  
  output?: OutputConfig;
  
  // ═══════════════════════════════════════════════════════════════
  // HISTORY / CHECKPOINTS
  // ═══════════════════════════════════════════════════════════════
  
  history?: HistoryConfig;
  
  // ═══════════════════════════════════════════════════════════════
  // WATCH MODE
  // ═══════════════════════════════════════════════════════════════
  
  watch?: WatchConfig;
}

// ─────────────────────────────────────────────────────────────────
// SUB-CONFIGS
// ─────────────────────────────────────────────────────────────────

interface CartridgeConfig {
  /** Path to cartridge file (relative to root) */
  path: string;
  
  /** Human-readable description */
  description?: string;
  
  /** Signal registry override (optional) */
  signalRegistry?: string;
  
  /** Composite registry override (optional) */
  compositeRegistry?: string;
}

interface RuntimeConfig {
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

interface CustomNodesConfig {
  /** Directory containing custom node implementations */
  directory: string;
  
  /** Auto-discover and register nodes */
  autoRegister?: boolean;
  
  /** File pattern for discovery */
  pattern?: string;
}

interface OutputConfig {
  /** Build output directory */
  dist: string;
  
  /** JSON output format */
  format?: 'compact' | 'pretty';
  
  /** Generate source maps */
  sourceMaps?: boolean;
  
  /** Minify output */
  minify?: boolean;
}

interface HistoryConfig {
  /** Enable history/checkpoints */
  enabled?: boolean;
  
  /** Maximum checkpoints to keep */
  maxCheckpoints?: number;
  
  /** History storage directory */
  directory?: string;
  
  /** Auto-checkpoint before modifications */
  autoCheckpoint?: boolean;
}

interface WatchConfig {
  /** Enable file watching */
  enabled?: boolean;
  
  /** Glob patterns to ignore */
  ignore?: string[];
  
  /** Debounce interval (ms) */
  debounce?: number;
}
```

### 3.2 Default Configuration

```typescript
const DEFAULT_CONFIG: Partial<GraphOSProjectConfig> = {
  version: '1.0.0',
  activeCartridge: 'main',
  cartridges: {
    main: {
      path: 'cartridges/root.cartridge.json'
    }
  },
  signalRegistry: 'registries/signal-registry.json',
  compositeRegistry: 'registries/composite-registry.json',
  runtime: {
    debug: false,
    logLevel: 'info',
    maxQueueSize: 1000,
    timeout: 30000,
    autoStart: false
  },
  customNodes: {
    directory: 'src/nodes',
    autoRegister: true,
    pattern: '**/*.node.ts'
  },
  output: {
    dist: 'dist',
    format: 'pretty',
    sourceMaps: true,
    minify: false
  },
  history: {
    enabled: true,
    maxCheckpoints: 10,
    directory: '.graph-os/history',
    autoCheckpoint: true
  },
  watch: {
    enabled: false,
    ignore: ['node_modules', 'dist', '.git'],
    debounce: 100
  }
};
```

### 3.3 Configuration File Example

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "root": "/projects/my-app",
  "activeCartridge": "auth",
  "cartridges": {
    "auth": {
      "path": "cartridges/auth-flow.cartridge.json",
      "description": "User authentication flow"
    },
    "user": {
      "path": "cartridges/user-management.cartridge.json",
      "description": "User CRUD operations"
    },
    "payment": {
      "path": "cartridges/payment-flow.cartridge.json",
      "description": "Payment processing"
    }
  },
  "signalRegistry": "registries/signals.json",
  "compositeRegistry": "registries/composites.json",
  "runtime": {
    "debug": false,
    "logLevel": "info"
  },
  "customNodes": {
    "directory": "src/nodes",
    "autoRegister": true
  },
  "history": {
    "enabled": true,
    "maxCheckpoints": 10
  }
}
```

---

## 4. Tool Specifications

### 4.1 `use` - Context & Config Management

#### 4.1.1 Purpose

```
Establish and manage project context. This is the entry point for all sessions.
```

#### 4.1.2 When to Use

```
- Starting a new session
- Loading a project
- Switching between cartridges
- Checking current context/state
- Modifying project configuration
- Creating a new project
```

#### 4.1.3 When NOT to Use

```
- Querying graph data (use query)
- Modifying the graph (use patch)
- Executing runtime (use run)
```

#### 4.1.4 Triggers

```
start, load, switch, where, current, config, init, create project
```

#### 4.1.5 Parameters

```typescript
interface UseParams {
  // ═══════════════════════════════════════════════════════════════
  // MODE 1: LOAD PROJECT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Path to project root or config file.
   * Relative paths resolved from current working directory.
   * @example "/projects/my-app"
   * @example "./my-app"
   * @example "./graph-os.config.json"
   */
  project?: string;
  
  /**
   * Auto-detect project from current directory.
   * Walks up directory tree looking for graph-os.config.json.
   * @default false
   */
  detect?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // MODE 2: SWITCH CARTRIDGE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Switch active cartridge.
   * Must be a valid alias from config.cartridges.
   * @example "auth"
   * @example "payment"
   */
  cartridge?: string;
  
  // ═══════════════════════════════════════════════════════════════
  // MODE 3: MODIFY CONFIG
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Configuration modifications.
   */
  config?: {
    /**
     * Update specific config values.
     * Merges with existing config.
     */
    set?: Partial<GraphOSProjectConfig>;
    
    /**
     * Add a cartridge to the project.
     */
    addCartridge?: {
      alias: string;
      path: string;
      description?: string;
    };
    
    /**
     * Remove a cartridge from the project.
     */
    removeCartridge?: string;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // MODE 4: CREATE NEW PROJECT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Initialize a new project.
   */
  init?: {
    /** Project name (required) */
    name: string;
    
    /** Project path (required) */
    path: string;
    
    /** Starter template */
    template?: 'minimal' | 'auth' | 'crud' | 'blank';
    
    /** Include React bridge */
    includeReact?: boolean;
    
    /** Author name */
    author?: string;
  };
}
```

#### 4.1.6 Return Types

```typescript
interface UseResult {
  // Layer 1: Instant comprehension
  summary: string;
  status: 'ok' | 'error' | 'not_found';
  metrics?: {
    cartridges?: number;
    nodes?: number;
    wires?: number;
  };
  
  // Layer 2: Primary data
  config?: GraphOSProjectConfig;
  state?: {
    activeCartridge: string;
    runtimeStatus: 'stopped' | 'running' | 'error';
    lastOperation?: string;
    checkpointsAvailable: number;
  };
  
  // Layer 3: Next actions
  nextActions?: NextAction[];
  
  // Layer 4: Error details (if status === 'error')
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

#### 4.1.7 Behavior Specification

##### Load Project

```
1. Resolve project path (relative → absolute)
2. Look for graph-os.config.json
3. If not found in path, walk up directory tree
4. Load and validate config
5. Resolve all relative paths to absolute
6. Set session state
7. Return config + state
```

##### Switch Cartridge

```
1. Validate cartridge alias exists in config
2. Load cartridge file
3. Validate cartridge structure
4. Update session.activeCartridge
5. Clear any running runtime
6. Return new state
```

##### Modify Config

```
1. Apply modifications to current config
2. Validate changes
3. Save to graph-os.config.json
4. Update session state
5. Return updated config
```

##### Init Project

```
1. Create directory structure
2. Generate graph-os.config.json
3. Create default cartridge if template specified
4. Create registries
5. Load as current context
6. Return new project info
```

#### 4.1.8 Examples

```typescript
// Example 1: Load project by path
use({ project: '/projects/my-app' })
// → { summary: "Loaded project: my-app (auth cartridge)", status: "ok", ... }

// Example 2: Auto-detect
use({ detect: true })
// → { summary: "Found project: my-app at /projects/my-app", ... }

// Example 3: Check current state
use()
// → { summary: "Project: my-app | Cartridge: auth | Nodes: 8 | Runtime: stopped", ... }

// Example 4: Switch cartridge
use({ cartridge: 'payment' })
// → { summary: "Switched to payment cartridge", status: "ok", ... }

// Example 5: Add cartridge
use({ config: { addCartridge: { alias: 'notifications', path: 'cartridges/notif.json' } } })
// → { summary: "Added notifications cartridge to project", ... }

// Example 6: Create new project
use({ init: { name: 'new-app', path: '/projects/new-app', template: 'auth' } })
// → { summary: "Created project: new-app with auth template", ... }
```

---

### 4.2 `query` - Read & Explore

#### 4.2.1 Purpose

```
Read and explore graph topology, signals, nodes, wires, and runtime state.
```

#### 4.2.2 When to Use

```
- Understanding current graph structure
- Finding nodes that handle specific signals
- Validating graph before modifications
- Debugging signal flow paths
- Getting visual representation of topology
- Checking runtime state
```

#### 4.2.3 When NOT to Use

```
- Modifying the graph (use patch)
- Executing the runtime (use run)
- Generating new structures (use generate)
```

#### 4.2.4 Triggers

```
show, list, find, get, what, how many, validate, check, search, where does
```

#### 4.2.5 Parameters

```typescript
interface QueryParams {
  // ═══════════════════════════════════════════════════════════════
  // TARGET (required)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Target to query from.
   */
  from: 'cartridge' | 'nodes' | 'wires' | 'signals' | 'composites' | 'topology' | 'state' | 'history';
  
  // ═══════════════════════════════════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Filter criteria.
   */
  where?: {
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
    path?: {
      from: string;
      to: string;
    };
    
    /** Full-text search in descriptions */
    search?: string;
    
    /** Filter by validation status */
    valid?: boolean;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // OUTPUT FORMAT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Output format.
   * @default "summary"
   */
  select?: 'summary' | 'full' | 'compact' | 'graph' | 'mermaid' | 'stats' | 'paths' | 'validation';
  
  // ═══════════════════════════════════════════════════════════════
  // OPTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Override active cartridge.
   */
  cartridge?: string;
  
  /**
   * Maximum depth for nested queries.
   * @default 1
   */
  depth?: number;
  
  /**
   * Maximum results to return.
   * @default 100
   */
  limit?: number;
  
  /**
   * Skip cache and force fresh read.
   * @default false
   */
  fresh?: boolean;
}
```

#### 4.2.6 Return Types

```typescript
interface QueryResult {
  // Layer 1: Instant comprehension
  summary: string;
  status: 'ok' | 'empty' | 'error' | 'partial';
  metrics?: {
    count: number;
    valid?: boolean;
    issues?: number;
  };
  
  // Layer 2: Primary data
  data?: unknown;
  
  // Layer 3: Visual representation
  visual?: string;  // Mermaid diagram, ASCII art, table
  
  // Layer 4: Validation issues
  issues?: Array<{
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    location: string;
    fix?: PatchOperation;
  }>;
  
  // Layer 5: Next actions
  nextActions?: NextAction[];
  
  // Layer 6: Raw data (select: 'full')
  raw?: unknown;
}

// Type-specific data structures

interface CartridgeQueryData {
  name: string;
  version: string;
  description: string;
  nodeCount: number;
  wireCount: number;
  inputCount: number;
  outputCount: number;
}

interface NodeQueryData {
  id: string;
  type: string;
  description: string;
  config?: Record<string, unknown>;
  wiresIn?: number;
  wiresOut?: number;
}

interface SignalQueryData {
  type: string;
  description: string;
  payloadSchema?: Record<string, unknown>;
  emittedBy: string[];
  consumedBy: string[];
}

interface TopologyQueryData {
  entryPoints: string[];
  exitPoints: string[];
  signalPaths: SignalPath[];
}

interface SignalPath {
  start: string;
  end: string;
  signalType: string;
  path: string[];  // Node IDs
}
```

#### 4.2.7 Behavior Specification

##### Query Cartridge

```
select: 'summary' → Name, counts, validation status
select: 'full' → Complete cartridge JSON
select: 'validation' → Validation report with issues
select: 'stats' → Numeric metrics only
```

##### Query Nodes

```
where.id → Single node details
where.type → Nodes matching type pattern
where.handlesSignal → Nodes that process this signal
where.upstream → Nodes feeding into specified node
where.downstream → Nodes fed by specified node
```

##### Query Signals

```
(no filter) → All registered signals
where.type → Signals matching pattern
where.handlesSignal → Signals emitted/consumed by node
```

##### Query Topology

```
select: 'summary' → Entry/exit points, path count
select: 'mermaid' → Mermaid flowchart code
select: 'graph' → Adjacency list
select: 'paths' → All signal flow paths
```

#### 4.2.8 Examples

```typescript
// Example 1: Get topology diagram
query({ from: 'topology', select: 'mermaid' })
// → { summary: "login-flow: 8 nodes, 9 wires", visual: "graph LR\n  ...", ... }

// Example 2: Find logic nodes
query({ from: 'nodes', where: { type: 'logic.*' } })
// → { summary: "Found 3 logic nodes", data: [...], ... }

// Example 3: Find nodes handling AUTH signals
query({ from: 'nodes', where: { handlesSignal: 'AUTH.*' } })
// → { summary: "Found 4 nodes handling AUTH signals", ... }

// Example 4: Get signal flow path
query({ from: 'topology', select: 'paths', where: { path: { from: 'email-input', to: 'auth-api' } } })
// → { summary: "Path found: 3 hops", data: { path: ['email-input', 'validator', 'auth-api'] }, ... }

// Example 5: Validate cartridge
query({ from: 'cartridge', select: 'validation' })
// → { summary: "1 warning found", issues: [...], ... }

// Example 6: Get runtime state
query({ from: 'state' })
// → { summary: "Runtime running, 15 signals processed", ... }
```

---

### 4.3 `patch` - Modify Graph

#### 4.3.1 Purpose

```
Modify graph topology using JSON Patch operations (RFC 6902).
```

#### 4.3.2 When to Use

```
- Adding/removing nodes
- Adding/removing wires
- Modifying node configuration
- Registering new signals
- Creating composites
- Any graph modification
```

#### 4.3.3 When NOT to Use

```
- Reading graph state (use query)
- Executing runtime (use run)
- Generating code/scaffolds (use generate)
```

#### 4.3.4 Triggers

```
add, remove, update, modify, change, create, delete, connect, disconnect
```

#### 4.3.5 Parameters

```typescript
interface PatchParams {
  // ═══════════════════════════════════════════════════════════════
  // OPERATIONS (required)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * JSON Patch operations (RFC 6902).
   */
  ops: PatchOperation[];
  
  // ═══════════════════════════════════════════════════════════════
  // SAFETY OPTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Preview changes without applying.
   * Returns what would happen without modifying files.
   * @default false
   */
  dryRun?: boolean;
  
  /**
   * Required for destructive operations (remove, replace).
   * Destructive ops without this will return an error.
   * @default false
   */
  confirm?: boolean;
  
  /**
   * Skip validation (dangerous).
   * Use only when you know the patch is valid.
   * @default false
   */
  skipValidation?: boolean;
  
  /**
   * Create named checkpoint before applying.
   * Set to true for auto-generated name, or provide custom name.
   * @default true (if history.enabled)
   */
  checkpoint?: string | boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // TARGET OPTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Target cartridge.
   * @default config.activeCartridge
   */
  cartridge?: string;
  
  /**
   * Target registry instead of cartridge.
   * 'signals' → signalRegistry
   * 'composites' → compositeRegistry
   */
  target?: 'cartridge' | 'signals' | 'composites';
  
  // ═══════════════════════════════════════════════════════════════
  // DEBUG OPTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Return step-by-step execution trace.
   * @default false
   */
  explain?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// PATCH OPERATIONS (RFC 6902 JSON Patch)
// ─────────────────────────────────────────────────────────────────

type PatchOperation = 
  | AddOperation
  | RemoveOperation
  | ReplaceOperation
  | MoveOperation
  | CopyOperation
  | TestOperation;

interface AddOperation {
  op: 'add';
  path: string;
  value: unknown;
}

interface RemoveOperation {
  op: 'remove';
  path: string;
}

interface ReplaceOperation {
  op: 'replace';
  path: string;
  value: unknown;
}

interface MoveOperation {
  op: 'move';
  from: string;
  path: string;
}

interface CopyOperation {
  op: 'copy';
  from: string;
  path: string;
}

interface TestOperation {
  op: 'test';
  path: string;
  value: unknown;
}

// ─────────────────────────────────────────────────────────────────
// GRAPH-SPECIFIC PATHS
// ─────────────────────────────────────────────────────────────────

/**
 * Common paths for cartridge modifications:
 * 
 * /nodes/-              → Add node (append)
 * /nodes/{index}        → Access node by index
 * /nodes/{index}/config → Modify node config
 * /wires/-              → Add wire (append)
 * /wires/{index}        → Access wire by index
 * /inputs/-             → Add input port
 * /outputs/-            → Add output port
 * 
 * For signal registry:
 * /signals/-            → Add signal type
 * /signals/{type}       → Access signal by type
 * 
 * For composite registry:
 * /composites/-         → Add composite
 * /composites/{name}    → Access composite by name
 */
```

#### 4.3.6 Return Types

```typescript
interface PatchResult {
  // Layer 1: Instant comprehension
  summary: string;
  status: 'ok' | 'partial' | 'error' | 'dry_run';
  metrics?: {
    applied: number;
    failed: number;
    nodes: number;
    wires: number;
  };
  
  // Layer 2: Change summary
  changes?: Array<{
    op: string;
    path: string;
    description: string;
    status: 'applied' | 'failed' | 'skipped';
  }>;
  
  // Layer 3: Checkpoint info
  checkpoint?: {
    id: string;
    name: string;
    timestamp: Date;
  };
  
  // Layer 4: Validation result
  validation?: {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };
  
  // Layer 5: Recovery options (on error/partial)
  recovery?: {
    rollback: PatchOperation[];  // Ops to undo changes
    retry: PatchOperation[];     // Ops to retry with fixes
    suggestions: string[];
  };
  
  // Layer 6: Next actions
  nextActions?: NextAction[];
  
  // Layer 7: Execution trace (if explain: true)
  trace?: Array<{
    step: number;
    op: PatchOperation;
    status: 'pending' | 'validating' | 'applying' | 'complete' | 'failed';
    duration: number;
    message?: string;
  }>;
}
```

#### 4.3.7 Behavior Specification

##### Add Operation

```
1. Validate operation structure
2. Check if path is valid for addition
3. Validate value against schema (if applicable)
4. For nodes: check type exists, generate ID if needed
5. For wires: validate from/to nodes exist, signal registered
6. Apply to in-memory structure
7. Run validation pipeline
8. Save to file
9. Create checkpoint (if enabled)
```

##### Remove Operation

```
1. Check confirm: true (required for remove)
2. Validate path exists
3. For nodes: check for connected wires (error if any)
4. For wires: safe to remove
5. Apply removal
6. Run validation
7. Save to file
8. Create checkpoint
```

##### Replace Operation

```
1. Check confirm: true (required for replace)
2. Validate path exists
3. Validate new value
4. Apply replacement
5. Run validation
6. Save to file
7. Create checkpoint
```

##### Validation Pipeline

```
Run after every patch (unless skipValidation: true):

1. Schema validation (JSON Schema)
2. Node type validation (type must be registered)
3. Wire connectivity validation (from/to must exist)
4. Signal type validation (signal must be registered)
5. Size constraints (max nodes, max wires)
6. Circular dependency check
7. Orphaned node detection
```

#### 4.3.8 Examples

```typescript
// Example 1: Add node
patch({
  ops: [
    { 
      op: 'add', 
      path: '/nodes/-', 
      value: {
        id: 'email-validator',
        type: 'logic.validate',
        description: 'Validate email format',
        config: {
          schema: { type: 'object', properties: { email: { type: 'string' } } },
          successSignalType: 'EMAIL.VALID',
          failureSignalType: 'EMAIL.INVALID'
        }
      }
    }
  ]
})
// → { summary: "Added node: email-validator", status: "ok", ... }

// Example 2: Add wire
patch({
  ops: [
    { op: 'add', path: '/wires/-', value: { from: 'email-input', to: 'email-validator', signalType: 'INPUT.EMAIL' } }
  ]
})
// → { summary: "Added wire: email-input → email-validator", status: "ok", ... }

// Example 3: Remove node (requires confirm)
patch({
  ops: [{ op: 'remove', path: '/nodes/5' }],
  confirm: true
})
// → { summary: "Removed node at index 5", status: "ok", ... }

// Example 4: Dry run preview
patch({
  ops: [
    { op: 'add', path: '/nodes/-', value: { id: 'test', type: 'logic.validate', config: {} } }
  ],
  dryRun: true
})
// → { summary: "[DRY RUN] Would add 1 node", status: "dry_run", ... }

// Example 5: Batch operations
patch({
  ops: [
    { op: 'add', path: '/signals/-', value: { type: 'AUTH.LOGIN', description: 'Login request' } },
    { op: 'add', path: '/nodes/-', value: { id: 'login-validator', type: 'logic.validate', config: {} } },
    { op: 'add', path: '/wires/-', value: { from: 'input', to: 'login-validator', signalType: 'AUTH.LOGIN' } }
  ],
  target: 'signals'  // First op targets signal registry, rest target cartridge
})
// → { summary: "Applied 3 operations", status: "ok", ... }

// Example 6: Explain mode
patch({
  ops: [...],
  explain: true
})
// → { summary: "...", trace: [...], ... }
```

---

### 4.4 `run` - Execute & Test

#### 4.4.1 Purpose

```
Execute the graph runtime, inject signals, test scenarios, and debug.
```

#### 4.4.2 When to Use

```
- Starting the runtime
- Injecting signals into running graph
- Running test scenarios
- Debugging signal flow
- Watching for live changes
```

#### 4.4.3 When NOT to Use

```
- Reading graph state (use query)
- Modifying the graph (use patch)
- Generating scaffolds (use generate)
```

#### 4.4.4 Triggers

```
start, stop, run, execute, test, debug, inject, send, watch, trace
```

#### 4.4.5 Parameters

```typescript
interface RunParams {
  // ═══════════════════════════════════════════════════════════════
  // MODE (required)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Execution mode.
   */
  mode: 'start' | 'stop' | 'inject' | 'test' | 'debug' | 'watch';
  
  // ═══════════════════════════════════════════════════════════════
  // SIGNAL (for inject/test/debug modes)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Signal to inject into the graph.
   */
  signal?: {
    type: string;
    payload: unknown;
    metadata?: Record<string, unknown>;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // TEST OPTIONS (for test mode)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Test expectations.
   */
  expect?: {
    /** Expected signal types to be emitted */
    signals?: string[];
    
    /** Maximum execution time (ms) */
    timeout?: number;
    
    /** Create snapshot for regression testing */
    snapshot?: boolean | string;
    
    /** Expected final state */
    state?: {
      nodesProcessed?: number;
      signalsEmitted?: number;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // DEBUG OPTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Enable execution tracing.
   * @default false
   */
  trace?: boolean;
  
  /**
   * Node IDs to pause at (for step debugging).
   */
  breakpoints?: string[];
  
  /**
   * Include signal history in output.
   * @default false
   */
  history?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // WATCH OPTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Enable file watching for live reload.
   * @default false
   */
  watch?: boolean;
  
  /**
   * Callback events (for SSE/WebSocket).
   */
  callbacks?: {
    onSignal?: boolean;
    onNode?: boolean;
    onError?: boolean;
    onComplete?: boolean;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // TARGET OPTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Override active cartridge.
   */
  cartridge?: string;
}
```

#### 4.4.6 Return Types

```typescript
interface RunResult {
  // Layer 1: Instant comprehension
  summary: string;
  status: 'ok' | 'error' | 'timeout' | 'assertion_failed' | 'stopped';
  metrics?: {
    signalsProcessed: number;
    signalsEmitted: number;
    nodesExecuted: number;
    duration: number;
  };
  
  // Layer 2: Test results (for test mode)
  test?: {
    passed: boolean;
    assertions: Array<{
      expected: string;
      actual: string;
      passed: boolean;
    }>;
    snapshot?: {
      created: boolean;
      matched: boolean;
      path?: string;
    };
  };
  
  // Layer 3: Execution trace (if trace: true)
  trace?: Array<{
    timestamp: number;
    signal: Signal;
    nodeId: string;
    nodeType: string;
    duration: number;
    output?: Signal[];
    error?: string;
  }>;
  
  // Layer 4: Signal history (if history: true)
  signalHistory?: Signal[];
  
  // Layer 5: Errors
  errors?: Array<{
    nodeId: string;
    error: string;
    signal: Signal;
    timestamp: number;
  }>;
  
  // Layer 6: Next actions
  nextActions?: NextAction[];
}

interface Signal {
  type: string;
  payload: unknown;
  timestamp: Date;
  sourceNodeId: string;
  metadata?: Record<string, unknown>;
}
```

#### 4.4.7 Behavior Specification

##### Start Mode

```
1. Load cartridge into runtime
2. Initialize all nodes
3. Connect wires
4. Start signal processing loop
5. Return runtime status
```

##### Inject Mode

```
1. Check runtime is running
2. Create signal object
3. Inject into signal queue
4. Wait for processing to complete
5. Return emitted signals
```

##### Test Mode

```
1. Start runtime
2. Inject signal
3. Collect all emitted signals
4. Compare against expectations
5. Generate test report
6. Stop runtime
```

##### Debug Mode

```
1. Start runtime in debug mode
2. Enable tracing
3. Set breakpoints
4. Inject signal
5. Pause at breakpoints
6. Return detailed trace
```

##### Watch Mode

```
1. Start runtime
2. Enable file watcher
3. On file change:
   - Reload cartridge
   - Re-initialize nodes
   - Preserve runtime state
4. Stream events via callbacks
```

#### 4.4.8 Examples

```typescript
// Example 1: Start runtime
run({ mode: 'start' })
// → { summary: "Runtime started: 8 nodes ready", status: "ok", ... }

// Example 2: Inject signal
run({
  mode: 'inject',
  signal: { type: 'USER.LOGIN', payload: { email: 'test@example.com', password: 'secret' } }
})
// → { summary: "Signal processed: 3 nodes executed", metrics: { signalsProcessed: 1, signalsEmitted: 2 }, ... }

// Example 3: Run test
run({
  mode: 'test',
  signal: { type: 'USER.LOGIN', payload: { email: 'test@example.com', password: 'secret' } },
  expect: {
    signals: ['AUTH.SUCCESS'],
    timeout: 5000
  }
})
// → { summary: "✅ Test passed: AUTH.SUCCESS emitted", test: { passed: true, ... }, ... }

// Example 4: Debug with trace
run({
  mode: 'debug',
  signal: { type: 'USER.LOGIN', payload: { email: 'invalid' } },
  trace: true,
  breakpoints: ['email-validator']
})
// → { summary: "Paused at email-validator", trace: [...], ... }

// Example 5: Watch mode
run({ mode: 'watch', callbacks: { onSignal: true } })
// → { summary: "Watching for changes...", status: "ok", ... }

// Example 6: Stop runtime
run({ mode: 'stop' })
// → { summary: "Runtime stopped", status: "stopped", ... }
```

---

### 4.5 `generate` - Scaffold & Create

#### 4.5.1 Purpose

```
Generate code, patterns, scaffolds, and UI bindings.
```

#### 4.5.2 When to Use

```
- Creating custom node implementations
- Generating reusable patterns
- Creating UI bindings for signals
- Initializing new projects
- Creating composite templates
```

#### 4.5.3 When NOT to Use

```
- Modifying existing graphs (use patch)
- Reading graph state (use query)
- Executing runtime (use run)
```

#### 4.5.4 Triggers

```
create, scaffold, generate, new, add custom, pattern, template
```

#### 4.5.5 Parameters

```typescript
interface GenerateParams {
  // ═══════════════════════════════════════════════════════════════
  // MODE 1: CUSTOM NODE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate custom node implementation.
   */
  node?: {
    /** Node type identifier */
    type: string;
    
    /** Node category */
    category: 'logic' | 'control' | 'infra' | 'ui';
    
    /** Base template */
    template?: 'validator' | 'transformer' | 'api-client' | 'storage' | 'input' | 'display' | 'blank';
    
    /** Description for code comments */
    description?: string;
    
    /** Output file path (default: config.customNodes.directory) */
    output?: string;
    
    /** Register after generating */
    register?: boolean;
    
    /** Custom implementation hints */
    hints?: {
      inputSignals?: string[];
      outputSignals?: string[];
      configSchema?: Record<string, unknown>;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // MODE 2: PATTERN
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate pattern (reusable graph template).
   */
  pattern?: {
    /** Pattern name */
    name: string;
    
    /** Natural language description of pattern */
    description?: string;
    
    /** Parameters for pattern generation */
    params?: Record<string, unknown>;
    
    /** Output format */
    output?: 'patch' | 'file' | 'composite';
    
    /** Built-in pattern to use */
    builtin?: 'auth-flow' | 'crud' | 'form-validation' | 'rate-limiting' | 'cache-aside';
  };
  
  // ═══════════════════════════════════════════════════════════════
  // MODE 3: UI BINDING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate UI bindings for React/Vue/etc.
   */
  uiBinding?: {
    /** Component name */
    component: string;
    
    /** Signals to bind */
    signals: string[];
    
    /** Target framework */
    framework?: 'react' | 'vue' | 'svelte';
    
    /** Output directory */
    output?: string;
    
    /** Include type definitions */
    types?: boolean;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // MODE 4: PROJECT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate new project scaffold.
   */
  project?: {
    /** Project name */
    name: string;
    
    /** Project path */
    path: string;
    
    /** Starter template */
    template?: 'minimal' | 'auth' | 'crud' | 'blank';
    
    /** Include React bridge */
    includeReact?: boolean;
    
    /** Author name */
    author?: string;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // MODE 5: COMPOSITE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Extract nodes into a composite.
   */
  composite?: {
    /** Composite name */
    name: string;
    
    /** Nodes to extract */
    nodes: string[];
    
    /** Description */
    description?: string;
    
    /** Auto-map signals */
    autoMap?: boolean;
  };
}
```

#### 4.5.6 Return Types

```typescript
interface GenerateResult {
  // Layer 1: Instant comprehension
  summary: string;
  status: 'ok' | 'error' | 'partial';
  metrics?: {
    filesGenerated: number;
    linesOfCode: number;
  };
  
  // Layer 2: Generated artifacts
  files?: Array<{
    path: string;
    description: string;
    language: string;
  }>;
  
  // Layer 3: Patch operations (if output: 'patch')
  patch?: PatchOperation[];
  
  // Layer 4: Generated code (for preview)
  code?: Array<{
    filename: string;
    content: string;
  }>;
  
  // Layer 5: Registration info (for nodes)
  registration?: {
    type: string;
    registered: boolean;
    path: string;
  };
  
  // Layer 6: Next actions
  nextActions?: NextAction[];
}
```

#### 4.5.7 Behavior Specification

##### Generate Node

```
1. Parse node type and category
2. Select template
3. Generate TypeScript implementation
4. Generate config interface
5. Add documentation comments
6. Write to output path
7. Register if requested
8. Return file info + next actions
```

##### Generate Pattern

```
1. Parse pattern intent
2. If builtin: load template
3. Generate nodes, wires, signals
4. If output: 'patch' → return patch ops
5. If output: 'file' → save as pattern file
6. If output: 'composite' → create composite cartridge
```

##### Generate UI Binding

```
1. Analyze signal types
2. Generate framework-specific hooks
3. Generate type definitions
4. Create component bindings
5. Write to output directory
```

##### Generate Composite

```
1. Validate nodes exist
2. Identify boundary signals
3. Create composite definition
4. Generate signal mappings
5. Save to composite registry
```

#### 4.5.8 Examples

```typescript
// Example 1: Generate custom node
generate({
  node: {
    type: 'custom.rate-limiter',
    category: 'logic',
    template: 'validator',
    description: 'Rate limits requests per user',
    register: true
  }
})
// → { summary: "Generated custom.rate-limiter", files: [...], registration: { registered: true, ... }, ... }

// Example 2: Generate pattern as patch
generate({
  pattern: {
    name: 'email-validation',
    description: 'Email validation with rate limiting',
    output: 'patch'
  }
})
// → { summary: "Generated email-validation pattern", patch: [...], ... }

// Example 3: Generate UI bindings
generate({
  uiBinding: {
    component: 'LoginForm',
    signals: ['AUTH.SUCCESS', 'AUTH.FAILURE'],
    framework: 'react'
  }
})
// → { summary: "Generated React bindings for LoginForm", files: [...], ... }

// Example 4: Generate project
generate({
  project: {
    name: 'new-app',
    path: '/projects/new-app',
    template: 'auth'
  }
})
// → { summary: "Created project: new-app", files: [...], ... }

// Example 5: Extract composite
generate({
  composite: {
    name: 'auth-validator',
    nodes: ['email-validator', 'password-validator', 'credentials-transform']
  }
})
// → { summary: "Extracted composite: auth-validator", files: [...], ... }
```

---

## 5. Shared Types

### 5.1 Common Interfaces

```typescript
// ─────────────────────────────────────────────────────────────────
// NEXT ACTION (used in all tool results)
// ─────────────────────────────────────────────────────────────────

interface NextAction {
  /** Tool to call */
  action: 'use' | 'query' | 'patch' | 'run' | 'generate';
  
  /** Human-readable description */
  description: string;
  
  /** Pre-filled parameters */
  params?: Record<string, unknown>;
  
  /** Priority for execution */
  priority: 'high' | 'medium' | 'low';
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION ERROR
// ─────────────────────────────────────────────────────────────────

interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  fix?: PatchOperation;
}

// ─────────────────────────────────────────────────────────────────
// CHECKPOINT
// ─────────────────────────────────────────────────────────────────

interface Checkpoint {
  id: string;
  name: string;
  timestamp: Date;
  description: string;
  operations: PatchOperation[];
  snapshot: unknown;  // Cartridge/Registry state at checkpoint
}

// ─────────────────────────────────────────────────────────────────
// HISTORY ENTRY
// ─────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  timestamp: Date;
  tool: string;
  params: Record<string, unknown>;
  result: ToolResult;
}
```

### 5.2 Tool Definition Interface

```typescript
interface ToolDefinition {
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

interface ParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: unknown;
  enum?: string[];
  hints?: Record<string, string>;
  examples?: unknown[];
}
```

---

## 6. Output Specification

### 6.1 Output Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYERED OUTPUT MODEL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: INSTANT COMPREHENSION (Always included, <100 tokens) │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ summary: string          → One-line result description      ││
│  │ status: enum             → ok | empty | error | partial     ││
│  │ metrics: { count, ... }  → Key numeric indicators           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Layer 2: PRIMARY DATA (Included when relevant)                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ data: any                → Compact structured result        ││
│  │ visual: string           → Mermaid/table representation     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Layer 3: DECISION SUPPORT (Optional, helps AI decide)          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ issues: [...]            → Problems that need attention     ││
│  │ nextActions: [...]       → Suggested next operations        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Layer 4: DEEP DATA (Only when specifically requested)          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ raw: any                 → Full unprocessed data            ││
│  │ trace: [...]             → Execution trace                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Token Optimization Rules

```typescript
// Rule 1: Compact node representation
// Before (156 tokens):
{ "id": "email-validator", "type": "logic.validate", "description": "Validate email format", "config": { "schema": {...}, "successSignalType": "EMAIL.VALID", "failureSignalType": "EMAIL.INVALID" } }

// After (47 tokens):
["email-validator", "logic.validate", "EMAIL.VALID|EMAIL.INVALID"]

// Rule 2: Omit defaults
// Don't include fields with default values

// Rule 3: Use arrays for homogeneous data
// Before: { "node1": {...}, "node2": {...} }
// After: [[...], [...]]

// Rule 4: Truncate large payloads
// Show first 3 items + "and N more"

// Rule 5: Use references for repeated data
// Define once, reference by ID
```

### 6.3 Output Formatter

```typescript
class OutputFormatter {
  /**
   * Format tool result with token optimization.
   */
  format(result: unknown, options: FormatOptions): FormattedOutput {
    const layers = this.extractLayers(result, options);
    
    if (options.maxTokens) {
      this.optimizeTokens(layers, options.maxTokens);
    }
    
    return this.serialize(layers, options.format);
  }
  
  /**
   * Extract output layers based on select mode.
   */
  private extractLayers(result: unknown, options: FormatOptions): OutputLayers {
    return {
      layer1: this.extractSummary(result),
      layer2: options.select !== 'summary' ? this.extractData(result) : undefined,
      layer3: this.extractActions(result),
      layer4: options.select === 'full' ? result : undefined,
    };
  }
  
  /**
   * Optimize output to fit token budget.
   */
  private optimizeTokens(layers: OutputLayers, maxTokens: number): void {
    // Progressive truncation strategy
    // 1. Truncate raw data
    // 2. Compress visual representation
    // 3. Limit nextActions
    // 4. Summarize data if needed
  }
}

interface FormatOptions {
  select?: 'summary' | 'full' | 'compact';
  maxTokens?: number;
  format?: 'json' | 'text';
}
```

---

## 7. Error Handling

### 7.1 Error Categories

```typescript
enum ErrorCode {
  // Session errors
  SESSION_NOT_INITIALIZED = 'SESSION_NOT_INITIALIZED',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  CARTRIDGE_NOT_FOUND = 'CARTRIDGE_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  
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
  
  // Run errors
  RUNTIME_NOT_STARTED = 'RUNTIME_NOT_STARTED',
  RUNTIME_ALREADY_RUNNING = 'RUNTIME_ALREADY_RUNNING',
  SIGNAL_TIMEOUT = 'SIGNAL_TIMEOUT',
  ASSERTION_FAILED = 'ASSERTION_FAILED',
  
  // Generate errors
  GENERATE_TYPE_EXISTS = 'GENERATE_TYPE_EXISTS',
  GENERATE_TEMPLATE_NOT_FOUND = 'GENERATE_TEMPLATE_NOT_FOUND',
  GENERATE_WRITE_FAILED = 'GENERATE_WRITE_FAILED',
}
```

### 7.2 Error Response Structure

```typescript
interface ErrorResponse {
  summary: string;
  status: 'error';
  
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  
  recovery?: {
    /** Suggested actions to fix the error */
    suggestions: string[];
    
    /** Pre-built patch to fix the error */
    fix?: PatchOperation;
    
    /** Alternative approaches */
    alternatives?: Array<{
      description: string;
      action: string;
      params: Record<string, unknown>;
    }>;
  };
}
```

### 7.3 Error Examples

```typescript
// Error: Node not found
{
  summary: "Node 'auth-validator' not found",
  status: "error",
  error: {
    code: "PATCH_NODE_NOT_FOUND",
    message: "Wire references node 'auth-validator' which does not exist",
    details: {
      missingNode: "auth-validator",
      availableNodes: ["email-validator", "password-validator", "auth-api"]
    }
  },
  recovery: {
    suggestions: [
      "Create the node first",
      "Use an existing node: email-validator, password-validator"
    ],
    alternatives: [
      {
        description: "Create auth-validator node",
        action: "patch",
        params: { ops: [{ op: "add", path: "/nodes/-", value: { id: "auth-validator", type: "logic.validate", config: {} } }] }
      }
    ]
  }
}

// Error: Requires confirmation
{
  summary: "Destructive operation requires confirmation",
  status: "error",
  error: {
    code: "PATCH_REQUIRES_CONFIRM",
    message: "Remove operation requires confirm: true",
    details: {
      operation: { op: "remove", path: "/nodes/3" },
      impact: "Will remove node 'rate-limiter' and disconnect 2 wires"
    }
  },
  recovery: {
    suggestions: [
      "Add confirm: true to proceed",
      "Use dryRun: true to preview first"
    ]
  }
}
```

---

## 8. Session State Management

### 8.1 Session State Structure

```typescript
interface SessionState {
  // ═══════════════════════════════════════════════════════════════
  // PROJECT CONTEXT
  // ═══════════════════════════════════════════════════════════════
  
  /** Loaded project configuration */
  config: GraphOSProjectConfig | null;
  
  /** Config file path */
  configPath: string | null;
  
  // ═══════════════════════════════════════════════════════════════
  // ACTIVE CARTRIDGE
  // ═══════════════════════════════════════════════════════════════
  
  /** Current cartridge alias */
  activeCartridge: string | null;
  
  /** Loaded cartridge data */
  cartridgeData: Cartridge | null;
  
  /** Cartridge file path */
  cartridgePath: string | null;
  
  // ═══════════════════════════════════════════════════════════════
  // REGISTRIES
  // ═══════════════════════════════════════════════════════════════
  
  /** Signal registry */
  signalRegistry: SignalRegistry | null;
  
  /** Composite registry */
  compositeRegistry: CompositeRegistry | null;
  
  // ═══════════════════════════════════════════════════════════════
  // RUNTIME
  // ═══════════════════════════════════════════════════════════════
  
  /** Active runtime instance */
  runtime: GraphRuntime | null;
  
  /** Runtime status */
  runtimeStatus: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  
  // ═══════════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════════
  
  /** Operation history */
  history: HistoryEntry[];
  
  /** Checkpoints */
  checkpoints: Checkpoint[];
  
  // ═══════════════════════════════════════════════════════════════
  // CACHE
  // ═══════════════════════════════════════════════════════════════
  
  /** Query result cache */
  cache: Map<string, CacheEntry>;
  
  /** Cache invalidation version */
  cacheVersion: number;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
  tags: string[];
}
```

### 8.2 Session Manager

```typescript
class SessionManager {
  private state: SessionState;
  
  /**
   * Load project and initialize session.
   */
  async loadProject(path: string): Promise<void> {
    // 1. Find and load config
    // 2. Validate config
    // 3. Resolve paths
    // 4. Load active cartridge
    // 5. Load registries
    // 6. Initialize cache
  }
  
  /**
   * Switch active cartridge.
   */
  async switchCartridge(alias: string): Promise<void> {
    // 1. Validate alias exists
    // 2. Stop runtime if running
    // 3. Load new cartridge
    // 4. Update state
    // 5. Invalidate cache
  }
  
  /**
   * Create checkpoint.
   */
  createCheckpoint(name?: string): Checkpoint {
    // 1. Snapshot current state
    // 2. Generate ID
    // 3. Store in history
    // 4. Return checkpoint
  }
  
  /**
   * Rollback to checkpoint.
   */
  async rollback(checkpointId: string): Promise<void> {
    // 1. Find checkpoint
    // 2. Restore snapshot
    // 3. Write to file
    // 4. Update state
    // 5. Invalidate cache
  }
  
  /**
   * Get cached value.
   */
  getCached<T>(key: string): T | null {
    const entry = this.state.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.state.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }
  
  /**
   * Set cached value.
   */
  setCached(key: string, data: unknown, ttl: number = 60000, tags: string[] = []): void {
    this.state.cache.set(key, { data, timestamp: Date.now(), ttl, tags });
  }
  
  /**
   * Invalidate cache by tags.
   */
  invalidateCache(tags: string[]): void {
    for (const [key, entry] of this.state.cache) {
      if (entry.tags.some(t => tags.includes(t))) {
        this.state.cache.delete(key);
      }
    }
    this.state.cacheVersion++;
  }
}
```

---

## 9. Caching Strategy

### 9.1 Cache Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CACHING STRATEGY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Query     │────▶│    Cache    │────▶│   Result    │       │
│  │   Request   │     │   Manager   │     │   Return    │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                   ▲               │
│         │                   ▼                   │               │
│         │            ┌─────────────┐            │               │
│         │            │   Memory    │            │               │
│         │            │   Cache     │────────────┘               │
│         │            └─────────────┘                            │
│         │                   │                                   │
│         │         Cache Hit │ Cache Miss                        │
│         │                   ▼                                   │
│         │            ┌─────────────┐                            │
│         └───────────▶│   File      │                            │
│                      │   System    │                            │
│                      └─────────────┘                            │
│                                                                  │
│  Invalidation Triggers:                                         │
│  - patch operations                                             │
│  - cartridge switch                                             │
│  - file changes (watch mode)                                    │
│  - explicit fresh: true                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Cache Keys

```typescript
// Cache key format: "{type}:{target}:{hash}"

const CACHE_KEYS = {
  // Cartridge data
  CARTRIDGE: (alias: string) => `cartridge:${alias}:data`,
  CARTRIDGE_VALIDATION: (alias: string) => `cartridge:${alias}:validation`,
  
  // Node queries
  NODES: (alias: string, filter: string) => `nodes:${alias}:${hash(filter)}`,
  NODE: (alias: string, id: string) => `node:${alias}:${id}`,
  
  // Signal queries
  SIGNALS: (registry: string) => `signals:${registry}:all`,
  SIGNAL: (registry: string, type: string) => `signal:${registry}:${type}`,
  
  // Topology
  TOPOLOGY: (alias: string, format: string) => `topology:${alias}:${format}`,
  PATHS: (alias: string) => `paths:${alias}:all`,
};
```

### 9.3 Cache TTLs

```typescript
const CACHE_TTL = {
  CARTRIDGE: 60000,      // 1 minute
  NODES: 30000,          // 30 seconds
  SIGNALS: 300000,       // 5 minutes (rarely changes)
  TOPOLOGY: 30000,       // 30 seconds
  VALIDATION: 10000,     // 10 seconds
};
```

---

## 10. Test Specification

### 10.1 Test Structure

```
test/
├── tools/
│   ├── use.test.ts
│   ├── query.test.ts
│   ├── patch.test.ts
│   ├── run.test.ts
│   └── generate.test.ts
├── integration/
│   ├── workflow.test.ts
│   ├── multi-cartridge.test.ts
│   ├── error-recovery.test.ts
│   ├── caching.test.ts
│   └── session.test.ts
├── e2e/
│   ├── ai-session.test.ts
│   ├── token-optimization.test.ts
│   └── mcp-protocol.test.ts
└── fixtures/
    ├── test-project/
    │   ├── graph-os.config.json
    │   ├── cartridges/
    │   │   ├── auth.cartridge.json
    │   │   └── user.cartridge.json
    │   └── registries/
    │       ├── signals.json
    │       └── composites.json
    └── mock-cartridges/
        ├── minimal.json
        ├── complex.json
        └── invalid.json
```

### 10.2 Unit Tests

#### 10.2.1 `use` Tool Tests

```typescript
describe('use tool', () => {
  describe('load project', () => {
    it('should load project from explicit path', async () => {
      const result = await use({ project: '/fixtures/test-project' });
      expect(result.status).toBe('ok');
      expect(result.config?.name).toBe('test-project');
    });
    
    it('should auto-detect project from cwd', async () => {
      process.chdir('/fixtures/test-project');
      const result = await use({ detect: true });
      expect(result.status).toBe('ok');
    });
    
    it('should return error if project not found', async () => {
      const result = await use({ project: '/nonexistent' });
      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('PROJECT_NOT_FOUND');
    });
    
    it('should return current state when called without params', async () => {
      await use({ project: '/fixtures/test-project' });
      const result = await use();
      expect(result.state?.activeCartridge).toBe('auth');
    });
  });
  
  describe('switch cartridge', () => {
    beforeEach(async () => {
      await use({ project: '/fixtures/test-project' });
    });
    
    it('should switch to valid cartridge', async () => {
      const result = await use({ cartridge: 'user' });
      expect(result.status).toBe('ok');
      expect(result.state?.activeCartridge).toBe('user');
    });
    
    it('should error for invalid cartridge', async () => {
      const result = await use({ cartridge: 'nonexistent' });
      expect(result.status).toBe('error');
    });
    
    it('should stop runtime when switching', async () => {
      await run({ mode: 'start' });
      await use({ cartridge: 'user' });
      const state = await use();
      expect(state.state?.runtimeStatus).toBe('stopped');
    });
  });
  
  describe('modify config', () => {
    it('should add cartridge', async () => {
      const result = await use({
        config: { addCartridge: { alias: 'new', path: 'cartridges/new.json' } }
      });
      expect(result.config?.cartridges['new']).toBeDefined();
    });
    
    it('should update runtime settings', async () => {
      const result = await use({
        config: { set: { runtime: { debug: true } } }
      });
      expect(result.config?.runtime?.debug).toBe(true);
    });
  });
  
  describe('init project', () => {
    it('should create minimal project', async () => {
      const result = await use({
        init: { name: 'new-project', path: '/tmp/new-project', template: 'minimal' }
      });
      expect(result.status).toBe('ok');
      expect(fs.existsSync('/tmp/new-project/graph-os.config.json')).toBe(true);
    });
  });
});
```

#### 10.2.2 `query` Tool Tests

```typescript
describe('query tool', () => {
  beforeEach(async () => {
    await use({ project: '/fixtures/test-project' });
  });
  
  describe('cartridge queries', () => {
    it('should return cartridge summary', async () => {
      const result = await query({ from: 'cartridge', select: 'summary' });
      expect(result.summary).toContain('test-project');
      expect(result.metrics?.count).toBeDefined();
    });
    
    it('should return validation status', async () => {
      const result = await query({ from: 'cartridge', select: 'validation' });
      expect(result.issues).toBeDefined();
    });
    
    it('should return full cartridge', async () => {
      const result = await query({ from: 'cartridge', select: 'full' });
      expect(result.raw).toBeDefined();
      expect((result.raw as any).nodes).toBeDefined();
    });
  });
  
  describe('node queries', () => {
    it('should return all nodes', async () => {
      const result = await query({ from: 'nodes' });
      expect(result.metrics?.count).toBeGreaterThan(0);
    });
    
    it('should filter by type pattern', async () => {
      const result = await query({ from: 'nodes', where: { type: 'logic.*' } });
      const nodes = result.data as NodeQueryData[];
      expect(nodes.every(n => n.type.startsWith('logic'))).toBe(true);
    });
    
    it('should find nodes by signal', async () => {
      const result = await query({ from: 'nodes', where: { handlesSignal: 'AUTH.LOGIN' } });
      expect(result.metrics?.count).toBeGreaterThan(0);
    });
    
    it('should find upstream nodes', async () => {
      const result = await query({ from: 'nodes', where: { upstream: 'auth-api' } });
      expect(result.metrics?.count).toBeGreaterThan(0);
    });
    
    it('should find downstream nodes', async () => {
      const result = await query({ from: 'nodes', where: { downstream: 'email-input' } });
      expect(result.metrics?.count).toBeGreaterThan(0);
    });
  });
  
  describe('topology queries', () => {
    it('should return mermaid diagram', async () => {
      const result = await query({ from: 'topology', select: 'mermaid' });
      expect(result.visual).toContain('graph');
    });
    
    it('should return signal paths', async () => {
      const result = await query({ from: 'topology', select: 'paths' });
      expect((result.data as TopologyQueryData).signalPaths).toBeDefined();
    });
    
    it('should find specific path', async () => {
      const result = await query({
        from: 'topology',
        select: 'paths',
        where: { path: { from: 'email-input', to: 'auth-api' } }
      });
      expect(result.summary).toContain('path');
    });
  });
  
  describe('signal queries', () => {
    it('should return all signals', async () => {
      const result = await query({ from: 'signals' });
      expect(result.metrics?.count).toBeGreaterThan(0);
    });
    
    it('should filter by type pattern', async () => {
      const result = await query({ from: 'signals', where: { type: 'AUTH.*' } });
      const signals = result.data as SignalQueryData[];
      expect(signals.every(s => s.type.startsWith('AUTH'))).toBe(true);
    });
  });
  
  describe('caching', () => {
    it('should cache results', async () => {
      const r1 = await query({ from: 'nodes' });
      const r2 = await query({ from: 'nodes' });
      // Should use cached result (verify via timing or mock)
    });
    
    it('should bypass cache with fresh: true', async () => {
      const r1 = await query({ from: 'nodes' });
      // Modify cartridge
      await patch({ ops: [{ op: 'add', path: '/nodes/-', value: { id: 'new', type: 'logic.validate', config: {} } }] });
      const r2 = await query({ from: 'nodes', fresh: true });
      expect(r2.metrics?.count).toBeGreaterThan(r1.metrics?.count || 0);
    });
  });
});
```

#### 10.2.3 `patch` Tool Tests

```typescript
describe('patch tool', () => {
  beforeEach(async () => {
    await use({ project: '/fixtures/test-project' });
  });
  
  describe('add operations', () => {
    it('should add node', async () => {
      const result = await patch({
        ops: [{ op: 'add', path: '/nodes/-', value: { id: 'test-node', type: 'logic.validate', config: {} } }]
      });
      expect(result.status).toBe('ok');
      expect(result.changes?.[0].status).toBe('applied');
    });
    
    it('should add wire', async () => {
      const result = await patch({
        ops: [{ op: 'add', path: '/wires/-', value: { from: 'email-input', to: 'email-validator', signalType: 'INPUT.EMAIL' } }]
      });
      expect(result.status).toBe('ok');
    });
    
    it('should validate node type exists', async () => {
      const result = await patch({
        ops: [{ op: 'add', path: '/nodes/-', value: { id: 'test', type: 'nonexistent.type', config: {} } }]
      });
      expect(result.status).toBe('error');
    });
    
    it('should validate wire connects existing nodes', async () => {
      const result = await patch({
        ops: [{ op: 'add', path: '/wires/-', value: { from: 'nonexistent', to: 'email-validator', signalType: 'X' } }]
      });
      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('PATCH_NODE_NOT_FOUND');
    });
  });
  
  describe('remove operations', () => {
    it('should require confirm for remove', async () => {
      const result = await patch({
        ops: [{ op: 'remove', path: '/nodes/0' }]
      });
      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('PATCH_REQUIRES_CONFIRM');
    });
    
    it('should remove node with confirm', async () => {
      const result = await patch({
        ops: [{ op: 'remove', path: '/nodes/0' }],
        confirm: true
      });
      expect(result.status).toBe('ok');
    });
    
    it('should prevent removing node with connected wires', async () => {
      // Add node with wire
      await patch({ ops: [{ op: 'add', path: '/nodes/-', value: { id: 'x', type: 'logic.validate', config: {} } }] });
      await patch({ ops: [{ op: 'add', path: '/wires/-', value: { from: 'x', to: 'y', signalType: 'Z' } }] });
      
      const result = await patch({
        ops: [{ op: 'remove', path: '/nodes/x' }],
        confirm: true
      });
      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('PATCH_WIRE_INVALID');
    });
  });
  
  describe('dry run', () => {
    it('should preview without applying', async () => {
      const before = await query({ from: 'nodes' });
      const result = await patch({
        ops: [{ op: 'add', path: '/nodes/-', value: { id: 'dry-run-test', type: 'logic.validate', config: {} } }],
        dryRun: true
      });
      const after = await query({ from: 'nodes' });
      
      expect(result.status).toBe('dry_run');
      expect(before.metrics?.count).toBe(after.metrics?.count);
    });
  });
  
  describe('batch operations', () => {
    it('should apply multiple ops atomically', async () => {
      const result = await patch({
        ops: [
          { op: 'add', path: '/signals/-', value: { type: 'TEST.SIGNAL', description: 'Test' } },
          { op: 'add', path: '/nodes/-', value: { id: 'test-handler', type: 'logic.validate', config: {} } }
        ]
      });
      expect(result.status).toBe('ok');
    });
    
    it('should rollback on partial failure', async () => {
      const result = await patch({
        ops: [
          { op: 'add', path: '/nodes/-', value: { id: 'valid-node', type: 'logic.validate', config: {} } },
          { op: 'add', path: '/wires/-', value: { from: 'nonexistent', to: 'x', signalType: 'Y' } }
        ]
      });
      expect(result.status).toBe('error');
      expect(result.recovery?.rollback).toBeDefined();
    });
  });
  
  describe('checkpoints', () => {
    it('should create checkpoint on success', async () => {
      const result = await patch({
        ops: [{ op: 'add', path: '/nodes/-', value: { id: 'cp-test', type: 'logic.validate', config: {} } }],
        checkpoint: 'before-test'
      });
      expect(result.checkpoint?.name).toBe('before-test');
    });
  });
});
```

#### 10.2.4 `run` Tool Tests

```typescript
describe('run tool', () => {
  beforeEach(async () => {
    await use({ project: '/fixtures/test-project' });
  });
  
  describe('start mode', () => {
    it('should start runtime', async () => {
      const result = await run({ mode: 'start' });
      expect(result.status).toBe('ok');
    });
    
    it('should error if already running', async () => {
      await run({ mode: 'start' });
      const result = await run({ mode: 'start' });
      expect(result.status).toBe('error');
    });
  });
  
  describe('inject mode', () => {
    beforeEach(async () => {
      await run({ mode: 'start' });
    });
    
    it('should inject signal', async () => {
      const result = await run({
        mode: 'inject',
        signal: { type: 'USER.LOGIN', payload: { email: 'test@example.com' } }
      });
      expect(result.metrics?.signalsProcessed).toBeGreaterThan(0);
    });
    
    it('should return emitted signals', async () => {
      const result = await run({
        mode: 'inject',
        signal: { type: 'INPUT.EMAIL', payload: { email: 'test@example.com' } },
        history: true
      });
      expect(result.signalHistory).toBeDefined();
      expect(result.signalHistory?.length).toBeGreaterThan(0);
    });
  });
  
  describe('test mode', () => {
    it('should pass with expected signals', async () => {
      const result = await run({
        mode: 'test',
        signal: { type: 'INPUT.EMAIL', payload: { email: 'test@example.com' } },
        expect: { signals: ['EMAIL.VALID'] }
      });
      expect(result.test?.passed).toBe(true);
    });
    
    it('should fail with wrong expectations', async () => {
      const result = await run({
        mode: 'test',
        signal: { type: 'INPUT.EMAIL', payload: { email: 'test@example.com' } },
        expect: { signals: ['NONEXISTENT.SIGNAL'] }
      });
      expect(result.test?.passed).toBe(false);
      expect(result.status).toBe('assertion_failed');
    });
    
    it('should timeout if signal not processed', async () => {
      const result = await run({
        mode: 'test',
        signal: { type: 'INPUT.EMAIL', payload: { email: 'test@example.com' } },
        expect: { signals: ['X'], timeout: 100 }
      });
      expect(result.status).toBe('timeout');
    });
  });
  
  describe('debug mode', () => {
    it('should return trace', async () => {
      const result = await run({
        mode: 'debug',
        signal: { type: 'INPUT.EMAIL', payload: { email: 'test@example.com' } },
        trace: true
      });
      expect(result.trace).toBeDefined();
      expect(result.trace?.length).toBeGreaterThan(0);
    });
    
    it('should pause at breakpoint', async () => {
      const result = await run({
        mode: 'debug',
        signal: { type: 'INPUT.EMAIL', payload: { email: 'test@example.com' } },
        breakpoints: ['email-validator']
      });
      expect(result.summary).toContain('Paused');
    });
  });
  
  describe('stop mode', () => {
    it('should stop runtime', async () => {
      await run({ mode: 'start' });
      const result = await run({ mode: 'stop' });
      expect(result.status).toBe('stopped');
    });
  });
});
```

#### 10.2.5 `generate` Tool Tests

```typescript
describe('generate tool', () => {
  beforeEach(async () => {
    await use({ project: '/fixtures/test-project' });
  });
  
  describe('node generation', () => {
    it('should generate node implementation', async () => {
      const result = await generate({
        node: {
          type: 'custom.test-node',
          category: 'logic',
          template: 'validator'
        }
      });
      expect(result.status).toBe('ok');
      expect(result.files).toBeDefined();
      expect(result.files?.length).toBeGreaterThan(0);
    });
    
    it('should register node if requested', async () => {
      const result = await generate({
        node: {
          type: 'custom.registered-node',
          category: 'logic',
          register: true
        }
      });
      expect(result.registration?.registered).toBe(true);
    });
    
    it('should error if type already exists', async () => {
      await generate({ node: { type: 'custom.duplicate', category: 'logic' } });
      const result = await generate({ node: { type: 'custom.duplicate', category: 'logic' } });
      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('GENERATE_TYPE_EXISTS');
    });
  });
  
  describe('pattern generation', () => {
    it('should generate pattern as patch', async () => {
      const result = await generate({
        pattern: {
          name: 'test-pattern',
          description: 'Test pattern',
          output: 'patch'
        }
      });
      expect(result.patch).toBeDefined();
    });
    
    it('should generate builtin pattern', async () => {
      const result = await generate({
        pattern: {
          name: 'auth',
          builtin: 'auth-flow',
          output: 'patch'
        }
      });
      expect(result.patch).toBeDefined();
      expect(result.patch?.length).toBeGreaterThan(0);
    });
  });
  
  describe('ui binding generation', () => {
    it('should generate React hooks', async () => {
      const result = await generate({
        uiBinding: {
          component: 'TestForm',
          signals: ['AUTH.SUCCESS', 'AUTH.FAILURE'],
          framework: 'react'
        }
      });
      expect(result.files).toBeDefined();
      expect(result.files?.some(f => f.language === 'typescript')).toBe(true);
    });
  });
  
  describe('project generation', () => {
    it('should generate minimal project', async () => {
      const result = await generate({
        project: {
          name: 'generated-project',
          path: '/tmp/generated-project',
          template: 'minimal'
        }
      });
      expect(result.status).toBe('ok');
      expect(fs.existsSync('/tmp/generated-project/graph-os.config.json')).toBe(true);
    });
  });
  
  describe('composite extraction', () => {
    it('should extract nodes to composite', async () => {
      const result = await generate({
        composite: {
          name: 'test-composite',
          nodes: ['email-validator', 'password-validator']
        }
      });
      expect(result.status).toBe('ok');
      expect(result.files?.some(f => f.path.includes('composite'))).toBe(true);
    });
  });
});
```

### 10.3 Integration Tests

```typescript
describe('Integration: Full Workflow', () => {
  it('should complete typical AI session workflow', async () => {
    // 1. Load project
    const load = await use({ project: '/fixtures/test-project' });
    expect(load.status).toBe('ok');
    
    // 2. Query topology
    const topology = await query({ from: 'topology', select: 'mermaid' });
    expect(topology.visual).toBeDefined();
    
    // 3. Find nodes
    const nodes = await query({ from: 'nodes', where: { type: 'logic.*' } });
    expect(nodes.metrics?.count).toBeGreaterThan(0);
    
    // 4. Add node
    const add = await patch({
      ops: [{ op: 'add', path: '/nodes/-', value: { id: 'test', type: 'logic.validate', config: {} } }]
    });
    expect(add.status).toBe('ok');
    
    // 5. Run test
    const test = await run({
      mode: 'test',
      signal: { type: 'TEST', payload: {} },
      expect: { signals: [] }
    });
    expect(test.status).toBe('ok');
    
    // 6. Verify next actions
    expect(add.nextActions).toBeDefined();
  });
});

describe('Integration: Multi-Cartridge', () => {
  it('should switch between cartridges', async () => {
    await use({ project: '/fixtures/test-project' });
    
    // Work on auth
    await use({ cartridge: 'auth' });
    const authNodes = await query({ from: 'nodes' });
    
    // Switch to user
    await use({ cartridge: 'user' });
    const userNodes = await query({ from: 'nodes' });
    
    expect(authNodes.data).not.toEqual(userNodes.data);
  });
});

describe('Integration: Error Recovery', () => {
  it('should recover from failed patch', async () => {
    await use({ project: '/fixtures/test-project' });
    
    const result = await patch({
      ops: [{ op: 'add', path: '/wires/-', value: { from: 'nonexistent', to: 'x', signalType: 'Y' } }]
    });
    
    expect(result.status).toBe('error');
    expect(result.recovery?.suggestions).toBeDefined();
    
    // Apply recovery suggestion
    if (result.recovery?.fix) {
      const fix = await patch({ ops: [result.recovery.fix] });
      expect(fix.status).toBe('ok');
    }
  });
});
```

### 10.4 E2E Tests

```typescript
describe('E2E: AI Session Simulation', () => {
  it('should simulate typical AI reasoning flow', async () => {
    // Simulate AI discovering and working with a project
    
    // Step 1: AI discovers project
    const discovery = await use({ detect: true });
    expect(discovery.summary).toBeDefined();
    
    // Step 2: AI understands structure
    const understanding = await query({ from: 'topology', select: 'summary' });
    expect(understanding.metrics).toBeDefined();
    
    // Step 3: AI identifies what to modify
    const target = await query({ from: 'nodes', where: { type: 'logic.validate' } });
    
    // Step 4: AI previews change
    const preview = await patch({
      ops: [{ op: 'replace', path: `/nodes/0/config/schema`, value: { type: 'object' } }],
      dryRun: true
    });
    expect(preview.status).toBe('dry_run');
    
    // Step 5: AI applies change
    const applied = await patch({
      ops: [{ op: 'replace', path: `/nodes/0/config/schema`, value: { type: 'object' } }],
      confirm: true
    });
    expect(applied.status).toBe('ok');
    
    // Step 6: AI verifies with test
    const verified = await run({
      mode: 'test',
      signal: { type: 'TEST', payload: {} },
      expect: { timeout: 5000 }
    });
    expect(verified.status).not.toBe('error');
  });
});

describe('E2E: Token Optimization', () => {
  it('should produce compact output under token limit', async () => {
    await use({ project: '/fixtures/test-project' });
    
    const result = await query({ from: 'nodes', select: 'summary' });
    
    const tokenCount = JSON.stringify(result).length / 4; // Rough estimate
    expect(tokenCount).toBeLessThan(500);
  });
});
```

---

## Appendix A: JSON Schema for Configuration

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "root", "activeCartridge", "cartridges", "signalRegistry", "compositeRegistry"],
  "properties": {
    "name": { "type": "string" },
    "version": { "type": "string" },
    "root": { "type": "string" },
    "activeCartridge": { "type": "string" },
    "cartridges": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["path"],
        "properties": {
          "path": { "type": "string" },
          "description": { "type": "string" },
          "signalRegistry": { "type": "string" },
          "compositeRegistry": { "type": "string" }
        }
      }
    },
    "signalRegistry": { "type": "string" },
    "compositeRegistry": { "type": "string" },
    "runtime": {
      "type": "object",
      "properties": {
        "debug": { "type": "boolean" },
        "logLevel": { "enum": ["debug", "info", "warn", "error"] },
        "maxQueueSize": { "type": "integer" },
        "timeout": { "type": "integer" }
      }
    },
    "customNodes": {
      "type": "object",
      "required": ["directory"],
      "properties": {
        "directory": { "type": "string" },
        "autoRegister": { "type": "boolean" },
        "pattern": { "type": "string" }
      }
    },
    "output": {
      "type": "object",
      "properties": {
        "dist": { "type": "string" },
        "format": { "enum": ["compact", "pretty"] },
        "sourceMaps": { "type": "boolean" }
      }
    },
    "history": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "maxCheckpoints": { "type": "integer" },
        "directory": { "type": "string" }
      }
    }
  }
}
```

---

## Appendix B: Migration Guide from v1 to v2

| v1 Tool | v2 Equivalent |
|---------|---------------|
| `project_context` | `use({ project })` / `use()` |
| `scaffold_project` | `use({ init: {...} })` or `generate({ project: {...} })` |
| `create_cartridge` | `use({ init: {...} })` or `patch({ target: 'cartridge', ops: [...] })` |
| `validate_cartridge` | `query({ from: 'cartridge', select: 'validation' })` |
| `run_cartridge` | `run({ mode: 'start' })` |
| `visualize_cartridge` | `query({ from: 'topology', select: 'mermaid' })` |
| `create_signal` | `patch({ target: 'signals', ops: [{ op: 'add', ... }] })` |
| `list_signals` | `query({ from: 'signals' })` |
| `get_signal` | `query({ from: 'signals', where: { type: '...' } })` |
| `remove_signal` | `patch({ target: 'signals', ops: [{ op: 'remove', ... }], confirm: true })` |
| `create_composite` | `generate({ composite: {...} })` |
| `list_composites` | `query({ from: 'composites' })` |
| `test_scenario` | `run({ mode: 'test', ... })` |
| `verify_node` | `run({ mode: 'test', ... })` |
| `snapshot_regression` | `run({ mode: 'test', expect: { snapshot: true } })` |
| `apply_topology_patch` | `patch({ ops: [...] })` |
| `query_topology` | `query({ from: 'topology' })` |
| `extract_to_composite` | `generate({ composite: {...} })` |
| `generate_ui_binding` | `generate({ uiBinding: {...} })` |
| `scaffold_node_impl` | `generate({ node: {...} })` |
| `refactor_semantics` | `patch({ ops: [...] })` (multiple ops) |
| `simulate_modification` | `patch({ dryRun: true })` |
| `lint_and_fix` | `query({ from: 'cartridge', select: 'validation' })` + `patch` |
| `bundle_project` | `run({ mode: 'build' })` (future) |

---

**Document End**
