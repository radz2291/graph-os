# Graph-OS MCP Tools v2 - Tool Reference

**Version:** 2.0.0
**Package:** `@graph-os/tool`

---

## Overview

Graph-OS MCP Tools v2 provides **5 unified tools** that replace the previous 23+ granular tools. Each tool follows a consistent pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                     TOOL EXECUTION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Validate parameters                                      │
│  2. Check session state (if required)                       │
│  3. Execute core logic                                       │
│  4. Format layered output                                    │
│  5. Suggest next actions                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### The 5 Tools

| Tool | Purpose | Entry Point |
|------|---------|-------------|
| **use** | Establish & manage project context | ✅ Always first |
| **query** | Read graph topology, nodes, signals | Read operations |
| **patch** | Modify graph with JSON Patch | Write operations |
| **run** | Execute runtime, inject signals, test | Execution |
| **generate** | Scaffold nodes, patterns, projects | Code generation |

### Response Format

All tools return a consistent `ToolResult` structure:

```typescript
interface ToolResult<T> {
  summary: string;           // Human-readable summary
  status: 'ok' | 'error' | 'partial' | 'dry_run';
  metrics?: {                // Operation metrics
    [key: string]: number;
  };
  data?: T;                  // Tool-specific data
  visual?: string;           // Visual representation (mermaid, tables)
  issues?: ValidationError[];// Warnings/errors encountered
  nextActions?: NextAction[];// Suggested next steps
  error?: {
    code: string;
    message: string;
    recovery?: object;
  };
}
```

---

## 1. USE Tool

**Purpose:** Establish and manage project context. Entry point for all Graph-OS sessions.

### When to Use

- Starting a new session
- Loading an existing project
- Switching between cartridges
- Checking current context/state
- Modifying project configuration
- Creating a new project (scaffolding)

### When NOT to Use

- Reading graph topology (use `query`)
- Modifying nodes/wires (use `patch`)
- Running the graph (use `run`)

### Triggers

`load`, `init`, `project`, `context`, `switch`, `cartridge`, `state`, `config`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project` | string | No* | Path to project root or config file |
| `detect` | boolean | No* | Auto-detect project from current directory |
| `cartridge` | string | No | Switch active cartridge by alias |
| `config` | object | No | Configuration modifications |
| `init` | object | No | Initialize a new project |

*At least one of `project`, `detect`, or `init` is required for the first call.

### Modes

#### Mode 1: Get Current State

```json
{}
```

Returns current session state without any side effects.

**Response:**
```json
{
  "summary": "Project: my-app (main cartridge, 5 nodes, 3 wires)",
  "status": "ok",
  "data": {
    "config": { /* GraphOSProjectConfig */ },
    "state": {
      "activeCartridge": "main",
      "runtimeStatus": "stopped",
      "checkpointsAvailable": 2
    },
    "metrics": {
      "cartridges": 1,
      "nodes": 5,
      "wires": 3
    }
  }
}
```

#### Mode 2: Load Project

```json
{
  "project": "/path/to/project"
}
```

Loads a project from the specified path. The path can be:
- A directory containing `graph-os.config.json`
- A direct path to a config file

**Response:**
```json
{
  "summary": "Loaded project: my-app (main cartridge, 5 nodes, 3 wires)",
  "status": "ok",
  "data": {
    "config": {
      "name": "my-app",
      "version": "1.0.0",
      "root": "/path/to/project",
      "activeCartridge": "main",
      "cartridges": {
        "main": { "path": "cartridges/root.cartridge.json" }
      }
    },
    "state": { "activeCartridge": "main", "runtimeStatus": "stopped" },
    "metrics": { "cartridges": 1, "nodes": 5, "wires": 3 }
  },
  "nextActions": [
    { "action": "query", "description": "Explore the cartridge topology", "params": { "from": "topology", "select": "mermaid" } }
  ]
}
```

#### Mode 3: Auto-Detect Project

```json
{
  "detect": true
}
```

Walks up the directory tree looking for `graph-os.config.json`. Useful when called from within a project directory.

#### Mode 4: Switch Cartridge

```json
{
  "cartridge": "auth-flow"
}
```

Switches to a different cartridge within the loaded project.

**Response:**
```json
{
  "summary": "Switched to cartridge: auth-flow (8 nodes, 5 wires)",
  "status": "ok"
}
```

#### Mode 5: Initialize New Project

```json
{
  "init": {
    "name": "my-new-project",
    "path": "/path/to/create",
    "description": "Optional description",
    "template": "minimal",
    "includeReact": true
  }
}
```

Creates a new project with the following structure:

```
my-new-project/
├── graph-os.config.json
├── cartridges/
│   └── root.cartridge.json
└── registries/
    ├── signals.json
    └── composites.json
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | Required | Project name |
| `path` | string | Required | Where to create the project |
| `description` | string | "" | Project description |
| `template` | string | "minimal" | Template: "minimal", "full", "empty" |
| `includeReact` | boolean | false | Include React UI bindings |

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `SESSION_NOT_INITIALIZED` | No project loaded | Call `use({ project: "path" })` or `use({ detect: true })` |
| `PROJECT_NOT_FOUND` | Config file not found | Check the path or use `detect: true` |
| `INVALID_CONFIG` | Config validation failed | Fix the config file structure |
| `CARTRIDGE_NOT_FOUND` | Cartridge alias not found | Check `cartridges` in config |
| `INIT_PATH_EXISTS` | Init path already exists | Use a different path or delete existing |

### Examples

#### Quick Start Workflow

```json
// 1. Create a new project
{ "init": { "name": "my-app", "path": "./my-app" } }

// 2. The project is automatically loaded
// 3. Check state
{}

// 4. Switch cartridge (if multiple)
{ "cartridge": "auth-flow" }
```

#### Load Existing Project

```json
// From absolute path
{ "project": "/home/user/projects/my-app" }

// From config file
{ "project": "/home/user/projects/my-app/graph-os.config.json" }

// Auto-detect from current directory
{ "detect": true }
```

---

## 2. QUERY Tool

**Purpose:** Read and explore graph topology, signals, nodes, wires, and runtime state.

### When to Use

- Understanding current graph structure
- Finding nodes that handle specific signals
- Validating graph before modifications
- Debugging signal flow paths
- Getting visual representation of topology
- Checking runtime state

### When NOT to Use

- Modifying the graph (use `patch`)
- Running the graph (use `run`)
- Loading a project (use `use`)

### Triggers

`query`, `get`, `find`, `list`, `show`, `search`, `explore`, `topology`, `where`, `select`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Target to query from |
| `select` | string | No | What to return |
| `where` | object | No | Filter conditions |
| `fresh` | boolean | No | Bypass cache (default: false) |

### Query Targets (`from`)

| Target | Description |
|--------|-------------|
| `cartridge` | Query cartridge metadata and validation |
| `nodes` | Query nodes with optional filters |
| `wires` | Query wires/connections |
| `signals` | Query signal registry |
| `composites` | Query composite definitions |
| `topology` | Query graph topology/structure |
| `state` | Query runtime state |

---

### Query: Cartridge

**Purpose:** Get cartridge metadata, validation status, or full content.

#### Select Options

| Select | Returns |
|--------|---------|
| `summary` | Name, version, counts (default) |
| `full` | Complete cartridge JSON |
| `validation` | Run ValidationPipeline |
| `stats` | Numeric metrics only |

#### Examples

```json
// Summary (default)
{ "from": "cartridge" }

// Full cartridge
{ "from": "cartridge", "select": "full" }

// Validation status
{ "from": "cartridge", "select": "validation" }

// Stats only
{ "from": "cartridge", "select": "stats" }
```

**Response (validation):**
```json
{
  "summary": "Cartridge validation: 5 nodes, 3 wires, all valid",
  "status": "ok",
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      { "code": "ORPHAN_NODE", "message": "Node 'debug' has no connections", "severity": "warning" }
    ],
    "stats": {
      "nodes": 5,
      "wires": 3,
      "entryPoints": 1,
      "exitPoints": 1
    }
  }
}
```

---

### Query: Nodes

**Purpose:** Find and list nodes with optional filtering.

#### Select Options

| Select | Returns |
|--------|---------|
| `list` | Full node objects (default) |
| `compact` | Minimal array format `["id", "type"]` |
| `ids` | Just node IDs |

#### Where Filters

| Filter | Type | Description |
|--------|------|-------------|
| `id` | string | Exact node ID match |
| `type` | string | Type pattern (supports wildcards) |
| `handlesSignal` | string | Find nodes that handle this signal type |
| `upstream` | string | Find nodes upstream from this node ID |
| `downstream` | string | Find nodes downstream from this node ID |

#### Examples

```json
// All nodes
{ "from": "nodes" }

// Compact format
{ "from": "nodes", "select": "compact" }

// By ID
{ "from": "nodes", "where": { "id": "validator" } }

// By type pattern
{ "from": "nodes", "where": { "type": "logic.*" } }

// Nodes handling a signal
{ "from": "nodes", "where": { "handlesSignal": "USER.LOGIN" } }

// Upstream nodes
{ "from": "nodes", "where": { "upstream": "output" } }

// Downstream nodes
{ "from": "nodes", "where": { "downstream": "input" } }
```

**Response:**
```json
{
  "summary": "Found 3 nodes matching type 'logic.*'",
  "status": "ok",
  "data": [
    { "id": "validator", "type": "logic.validate", "config": { "schema": "user" } },
    { "id": "transform", "type": "logic.transform", "config": {} },
    { "id": "router", "type": "logic.router", "config": { "routes": [] } }
  ]
}
```

---

### Query: Wires

**Purpose:** List connections between nodes.

#### Select Options

| Select | Returns |
|--------|---------|
| `list` | Full wire objects (default) |
| `compact` | Minimal format `["from", "to", "signalType"]` |

#### Where Filters

| Filter | Type | Description |
|--------|------|-------------|
| `from` | string | Wires from this node |
| `to` | string | Wires to this node |
| `signalType` | string | Wires carrying this signal type |

#### Examples

```json
// All wires
{ "from": "wires" }

// Wires from specific node
{ "from": "wires", "where": { "from": "input" } }

// Wires carrying specific signal
{ "from": "wires", "where": { "signalType": "USER.LOGIN" } }
```

---

### Query: Topology

**Purpose:** Understand graph structure and signal flow paths.

#### Select Options

| Select | Returns |
|--------|---------|
| `summary` | Entry/exit points, path count |
| `mermaid` | Mermaid flowchart diagram |
| `graph` | Adjacency list representation |
| `paths` | All signal paths from entry to exit |

#### Examples

```json
// Summary
{ "from": "topology" }

// Mermaid diagram
{ "from": "topology", "select": "mermaid" }

// Adjacency list
{ "from": "topology", "select": "graph" }

// All paths
{ "from": "topology", "select": "paths" }
```

**Response (mermaid):**
```json
{
  "summary": "Topology: 2 entry points, 1 exit, 3 paths",
  "status": "ok",
  "visual": "graph LR\n  input -->|DATA.INPUT| transform\n  transform -->|DATA.OUTPUT| output\n"
}
```

**Response (paths):**
```json
{
  "data": {
    "paths": [
      ["input", "validator", "transform", "output"],
      ["input", "validator", "error-handler"]
    ]
  }
}
```

---

### Query: Signals

**Purpose:** Explore signal registry and signal flow.

#### Select Options

| Select | Returns |
|--------|---------|
| `list` | All signal definitions |
| `summary` | Signal types with counts |

#### Where Filters

| Filter | Type | Description |
|--------|------|-------------|
| `type` | string | Signal type pattern |
| `emittedBy` | string | Signals emitted by this node type |
| `consumedBy` | string | Signals consumed by this node type |

#### Examples

```json
// All signals
{ "from": "signals" }

// By type pattern
{ "from": "signals", "where": { "type": "USER.*" } }

// Emitted by node type
{ "from": "signals", "where": { "emittedBy": "control.input" } }
```

---

### Query: State

**Purpose:** Check runtime state and signal history.

```json
{ "from": "state" }
```

**Response:**
```json
{
  "data": {
    "status": "running",
    "signalsProcessed": 42,
    "signalsEmitted": 38,
    "uptime": 12345,
    "history": [
      { "type": "USER.LOGIN", "timestamp": "2024-01-15T10:30:00Z", "source": "input" }
    ]
  }
}
```

---

### Cache Behavior

By default, query results are cached for performance. Use `fresh: true` to bypass:

```json
{ "from": "nodes", "fresh": true }
```

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `SESSION_NOT_INITIALIZED` | No project loaded | Call `use` first |
| `CARTRIDGE_NOT_FOUND` | Target cartridge not found | Check cartridge exists |
| `INVALID_WHERE_CLAUSE` | Malformed where filter | Check filter syntax |

---

## 3. PATCH Tool

**Purpose:** Modify graph topology using JSON Patch operations (RFC 6902).

### When to Use

- Adding/removing nodes
- Adding/removing wires
- Modifying node configuration
- Registering new signals
- Creating composites
- Any graph modification

### When NOT to Use

- Reading graph state (use `query`)
- Executing runtime (use `run`)
- Generating code/scaffolds (use `generate`)

### Triggers

`add`, `remove`, `update`, `modify`, `change`, `create`, `delete`, `connect`, `disconnect`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ops` | array | Yes | JSON Patch operations (RFC 6902) |
| `dryRun` | boolean | No | Preview without applying |
| `confirm` | boolean | No | Required for destructive ops |
| `skipValidation` | boolean | No | Skip validation (dangerous) |
| `checkpoint` | string\|boolean | No | Create checkpoint before |
| `target` | string | No | Target: cartridge, signals, composites |
| `explain` | boolean | No | Return step-by-step trace |

---

### JSON Patch Operations

#### Add Operation

```json
{ "op": "add", "path": "/nodes/-", "value": { "id": "my-node", "type": "logic.transform", "config": {} } }
```

**Path patterns:**
- `/nodes/-` - Append to nodes array
- `/nodes/0` - Insert at index 0
- `/wires/-` - Append wire
- `/nodes/validator/config/schema` - Set nested property

**Node structure:**
```json
{
  "id": "unique-id",
  "type": "category.name",
  "config": { /* node-specific config */ }
}
```

**Wire structure:**
```json
{
  "from": "source-node-id",
  "to": "target-node-id",
  "signalType": "NAMESPACE.TYPE"
}
```

#### Remove Operation

```json
{ "op": "remove", "path": "/nodes/2" }
```

⚠️ **Requires `confirm: true`**

Removes the element at the specified path. Will fail if the node has connected wires.

#### Replace Operation

```json
{ "op": "replace", "path": "/nodes/validator/config", "value": { "schema": "user-v2" } }
```

⚠️ **Requires `confirm: true`**

#### Move Operation

```json
{ "op": "move", "from": "/nodes/0", "path": "/nodes/3" }
```

Moves element from one location to another.

#### Copy Operation

```json
{ "op": "copy", "from": "/nodes/template", "path": "/nodes/-" }
```

Copies element to a new location.

#### Test Operation

```json
{ "op": "test", "path": "/nodes/validator/config/enabled", "value": true }
```

Validates that a value exists at the path. Fails the patch if the test fails.

---

### Dry Run Mode

Preview changes without applying:

```json
{
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "test", "type": "logic.transform" } }
  ],
  "dryRun": true
}
```

**Response:**
```json
{
  "summary": "[DRY RUN] Would apply 1 operation(s)",
  "status": "dry_run",
  "data": {
    "changes": [
      { "op": "add", "path": "/nodes/-", "description": "Add at /nodes/-", "status": "skipped" }
    ]
  }
}
```

---

### Checkpoints

Create a named checkpoint before applying changes:

```json
{
  "ops": [...],
  "checkpoint": "before-adding-auth"
}
```

Or disable checkpointing:
```json
{
  "ops": [...],
  "checkpoint": false
}
```

---

### Explain Mode

Get detailed execution trace:

```json
{
  "ops": [...],
  "explain": true
}
```

**Response:**
```json
{
  "data": {
    "trace": [
      { "step": 1, "op": {...}, "status": "validating", "duration": 2 },
      { "step": 1, "op": {...}, "status": "complete", "duration": 15, "message": "Node added" }
    ]
  }
}
```

---

### Batch Operations

Apply multiple operations atomically:

```json
{
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "validator", "type": "logic.validate" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "input", "to": "validator", "signalType": "DATA.INPUT" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "validator", "to": "output", "signalType": "DATA.OUTPUT" } }
  ]
}
```

---

### Validation

The patch tool validates:

1. **Operation structure** - Valid RFC 6902 format
2. **Node requirements** - `id` and `type` fields required
3. **Wire requirements** - `from`, `to`, `signalType` fields required
4. **Node existence** - Wire endpoints must exist
5. **No orphaned nodes** - Cannot remove node with connected wires
6. **Signal registration** - Warns if signal type not registered

---

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `SESSION_NOT_INITIALIZED` | No project loaded | Call `use` first |
| `INVALID_PARAMETERS` | Malformed operation | Check RFC 6902 format |
| `PATCH_REQUIRES_CONFIRM` | Destructive op without confirm | Add `confirm: true` |
| `PATCH_NODE_EXISTS` | Node ID already exists | Use different ID or `replace` |
| `PATCH_NODE_NOT_FOUND` | Node not found | Check node ID or index |
| `PATCH_NODE_HAS_WIRES` | Cannot remove node with wires | Remove wires first |
| `PATCH_WIRE_INVALID` | Wire missing required fields | Add `from`, `to`, `signalType` |

---

### Examples

#### Add a Complete Flow

```json
{
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "input", "type": "control.input" } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "validate", "type": "logic.validate", "config": { "schema": "user" } } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "output", "type": "control.display" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "input", "to": "validate", "signalType": "DATA.INPUT" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "validate", "to": "output", "signalType": "DATA.OUTPUT" } }
  ]
}
```

#### Remove Node and Its Wires

```json
{
  "ops": [
    { "op": "remove", "path": "/wires/1" },
    { "op": "remove", "path": "/wires/0" },
    { "op": "remove", "path": "/nodes/2" }
  ],
  "confirm": true
}
```

#### Update Node Config

```json
{
  "ops": [
    { "op": "replace", "path": "/nodes/validator/config", "value": { "schema": "user-v2", "strict": true } }
  ],
  "confirm": true
}
```

---

## 4. RUN Tool

**Purpose:** Execute the graph runtime, inject signals, test scenarios, and debug.

### When to Use

- Starting the runtime
- Injecting signals into running graph
- Running test scenarios
- Debugging signal flow
- Watching for live changes

### When NOT to Use

- Reading graph state (use `query`)
- Modifying the graph (use `patch`)
- Generating scaffolds (use `generate`)

### Triggers

`start`, `stop`, `run`, `execute`, `test`, `debug`, `inject`, `send`, `watch`, `trace`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | string | Yes | Execution mode |
| `signal` | object | No | Signal to inject |
| `expect` | object | No | Test expectations |
| `trace` | boolean | No | Enable execution tracing |
| `breakpoints` | array | No | Node IDs to pause at |
| `history` | boolean | No | Include signal history |
| `watch` | boolean | No | Enable file watching |

### Modes

| Mode | Description |
|------|-------------|
| `start` | Initialize and start the runtime |
| `stop` | Stop the running runtime |
| `inject` | Inject a signal into the running graph |
| `test` | Run a test scenario with expectations |
| `debug` | Run with execution tracing |
| `watch` | Start with file watching for live reload |

---

### Mode: Start

```json
{ "mode": "start" }
```

Initializes the GraphRuntime and starts processing.

**Response:**
```json
{
  "summary": "Runtime started: 5 nodes ready",
  "status": "ok",
  "metrics": {
    "signalsProcessed": 0,
    "signalsEmitted": 0,
    "nodesExecuted": 0,
    "duration": 45
  }
}
```

---

### Mode: Stop

```json
{ "mode": "stop" }
```

Stops the running runtime.

**Response:**
```json
{
  "summary": "Runtime stopped",
  "status": "stopped"
}
```

---

### Mode: Inject

```json
{
  "mode": "inject",
  "signal": {
    "type": "USER.LOGIN",
    "payload": {
      "email": "user@example.com",
      "password": "secret"
    }
  }
}
```

Injects a signal into the running graph. The signal propagates through connected nodes.

**Signal structure:**
```json
{
  "type": "NAMESPACE.TYPE",
  "payload": { /* signal data */ },
  "metadata": { /* optional metadata */ }
}
```

**Response:**
```json
{
  "summary": "Signal USER.LOGIN processed",
  "status": "ok",
  "metrics": {
    "signalsProcessed": 1,
    "signalsEmitted": 3,
    "nodesExecuted": 4,
    "duration": 12
  }
}
```

---

### Mode: Test

```json
{
  "mode": "test",
  "signal": {
    "type": "USER.LOGIN",
    "payload": { "email": "test@example.com", "password": "test123" }
  },
  "expect": {
    "signals": ["AUTH.SUCCESS", "USER.LOADED"],
    "timeout": 5000,
    "snapshot": "login-flow"
  }
}
```

Runs a test scenario:
1. Starts runtime if not running
2. Injects the signal
3. Collects emitted signals
4. Compares against expectations
5. Stops runtime

**Expect options:**

| Option | Type | Description |
|--------|------|-------------|
| `signals` | string[] | Expected signal types |
| `timeout` | number | Max execution time (ms) |
| `snapshot` | string\|boolean | Create/match snapshot |
| `state` | object | Expected final state |

**Response:**
```json
{
  "summary": "✅ Test passed: 2 expectation(s) met",
  "status": "ok",
  "data": {
    "test": {
      "passed": true,
      "assertions": [
        { "expected": "AUTH.SUCCESS", "actual": "AUTH.SUCCESS", "passed": true },
        { "expected": "USER.LOADED", "actual": "USER.LOADED", "passed": true }
      ],
      "snapshot": { "created": false, "matched": true }
    }
  }
}
```

---

### Mode: Debug

```json
{
  "mode": "debug",
  "signal": {
    "type": "USER.LOGIN",
    "payload": {}
  },
  "trace": true,
  "breakpoints": ["validator", "auth-service"]
}
```

Runs with detailed execution tracing:

**Response:**
```json
{
  "summary": "Debug: signal USER.LOGIN processed with trace",
  "status": "ok",
  "data": {
    "trace": [
      { "timestamp": 1704067200000, "signal": { "type": "USER.LOGIN" }, "nodeId": "input", "nodeType": "control.input", "duration": 5 },
      { "timestamp": 1704067200005, "signal": { "type": "USER.LOGIN" }, "nodeId": "validator", "nodeType": "logic.validate", "duration": 12 },
      { "timestamp": 1704067200017, "signal": { "type": "AUTH.REQUEST" }, "nodeId": "auth-service", "nodeType": "external.auth", "duration": 150 }
    ]
  }
}
```

---

### Mode: Watch

```json
{
  "mode": "watch"
}
```

Starts the runtime with file watching. Changes to cartridge files trigger automatic reload.

**Response:**
```json
{
  "summary": "Watch mode started - runtime will reload on file changes",
  "status": "ok"
}
```

---

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `SESSION_NOT_INITIALIZED` | No project loaded | Call `use` first |
| `RUNTIME_NOT_STARTED` | Runtime not running | Call `mode: "start"` first |
| `RUNTIME_ALREADY_RUNNING` | Runtime already running | Stop first or just inject |
| `INVALID_PARAMETERS` | Missing signal for inject/test/debug | Add `signal` parameter |
| `TEST_TIMEOUT` | Test exceeded timeout | Increase timeout or check graph |

---

## 5. GENERATE Tool

**Purpose:** Generate code, scaffolds, and patterns for Graph-OS projects.

### When to Use

- Generating custom node types
- Creating reusable patterns
- Generating UI bindings (React, Vue, Svelte)
- Scaffolding new projects
- Extracting composites from existing graphs

### When NOT to Use

- Loading projects (use `use`)
- Reading graph state (use `query`)
- Modifying graphs (use `patch`)

### Triggers

`generate`, `scaffold`, `create`, `init`, `new`, `pattern`, `template`

### Parameters

| Parameter | Type | Required* | Description |
|-----------|------|-----------|-------------|
| `node` | object | No* | Generate custom node |
| `pattern` | object | No* | Generate pattern |
| `uiBinding` | object | No* | Generate UI bindings |
| `project` | object | No* | Generate new project |
| `composite` | object | No* | Extract composite |

*Exactly one generator parameter required.

---

### Generator: Node

Generate a custom node type:

```json
{
  "node": {
    "type": "logic.custom-validator",
    "category": "logic",
    "description": "Custom validation node",
    "template": "validator",
    "output": "/path/to/nodes/",
    "register": true
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `type` | string | Node type (category.name) |
| `category` | string | Node category |
| `description` | string | Node description |
| `template` | string | Template: "basic", "validator", "transform", "router" |
| `output` | string | Output directory |
| `register` | boolean | Register in node registry |

**Generated files:**
- `{output}/CustomValidator.ts` - Node implementation
- `{output}/custom-validator.config.ts` - Config interface (optional)

---

### Generator: Pattern

Generate a reusable pattern:

```json
{
  "pattern": {
    "name": "auth-flow",
    "description": "Authentication flow pattern",
    "builtin": false,
    "definition": "User login with validation, auth check, and redirect",
    "output": "patch"
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Pattern name |
| `description` | string | Pattern description |
| `builtin` | boolean | Use builtin pattern |
| `definition` | string | Natural language definition |
| `output` | string | Output format: "patch", "file", "composite" |

**Builtin patterns:**
- `validation-chain` - Input validation with error handling
- `auth-flow` - Authentication flow
- `crud-operations` - CRUD operation pattern
- `event-sourcing` - Event sourcing pattern

---

### Generator: UI Binding

Generate UI framework bindings:

```json
{
  "uiBinding": {
    "framework": "react",
    "signals": ["USER.LOGIN", "USER.LOGOUT", "DATA.UPDATE"],
    "output": "/path/to/src/hooks/",
    "includeTypes": true
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `framework` | string | "react", "vue", "svelte" |
| `signals` | string[] | Signal types to generate hooks for |
| `output` | string | Output directory |
| `includeTypes` | boolean | Generate TypeScript types |

**Generated files (React):**
```typescript
// useSignal.ts
export function useSignal<T>(signalType: string): T | null;

// useEmitSignal.ts  
export function useEmitSignal(): (type: string, payload: unknown) => void;

// signals.ts
export type UserLoginSignal = { email: string; password: string };
export type UserLogoutSignal = { userId: string };
```

---

### Generator: Project

Generate a new project:

```json
{
  "project": {
    "name": "my-workflow-app",
    "path": "/path/to/create",
    "template": "full",
    "includeReact": true
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Project name |
| `path` | string | Where to create |
| `template` | string | "minimal", "full", "empty" |
| `includeReact` | boolean | Include React UI setup |

**Templates:**

| Template | Description |
|----------|-------------|
| `minimal` | Basic config + empty cartridge |
| `full` | Complete setup with examples |
| `empty` | Just config, no cartridge |

---

### Generator: Composite

Extract a composite from existing nodes:

```json
{
  "composite": {
    "name": "user-auth-block",
    "description": "User authentication block",
    "nodes": ["validator", "auth-service", "token-manager"],
    "exposeSignals": {
      "inputs": ["USER.LOGIN", "USER.LOGOUT"],
      "outputs": ["AUTH.SUCCESS", "AUTH.FAILURE"]
    }
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Composite name |
| `description` | string | Description |
| `nodes` | string[] | Node IDs to include |
| `exposeSignals` | object | Signals to expose as inputs/outputs |

---

### Response Format

```json
{
  "summary": "Generated custom node: logic.custom-validator",
  "status": "ok",
  "data": {
    "files": [
      { "path": "/path/to/nodes/CustomValidator.ts", "lines": 45 }
    ],
    "registered": true
  },
  "nextActions": [
    { "action": "patch", "description": "Add node to cartridge", "params": { "ops": [...] } }
  ]
}
```

---

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `SESSION_NOT_INITIALIZED` | No project loaded (composite only) | Call `use` first |
| `INVALID_PARAMETERS` | Missing required generator field | Add one of: node, pattern, uiBinding, project, composite |
| `GENERATION_FAILED` | Generation error | Check parameters |
| `FILE_EXISTS` | Output file already exists | Use different output path |

---

## Appendix A: Error Handling

### Error Response Format

```json
{
  "summary": "Failed to add node: duplicate ID",
  "status": "error",
  "error": {
    "code": "PATCH_NODE_EXISTS",
    "message": "Node with id 'validator' already exists",
    "recovery": {
      "suggestions": [
        "Use a different node ID",
        "Use replace operation to modify existing node"
      ]
    }
  }
}
```

### Common Error Codes

| Code | Tool | Description |
|------|------|-------------|
| `SESSION_NOT_INITIALIZED` | All | No project loaded |
| `INVALID_PARAMETERS` | All | Malformed parameters |
| `PROJECT_NOT_FOUND` | use | Project path invalid |
| `INVALID_CONFIG` | use | Config validation failed |
| `TARGET_NOT_FOUND` | query, patch | Target not found |
| `PATCH_REQUIRES_CONFIRM` | patch | Destructive op needs confirm |
| `RUNTIME_NOT_STARTED` | run | Runtime not running |
| `RUNTIME_ALREADY_RUNNING` | run | Runtime already started |
| `GENERATION_FAILED` | generate | Code generation error |

---

## Appendix B: Node Types Reference

### Categories

| Category | Prefix | Purpose |
|----------|--------|---------|
| Control | `control.` | Flow control (input, output, display) |
| Logic | `logic.` | Business logic (validate, transform, router) |
| External | `external.` | External integrations (api, database, auth) |
| Data | `data.` | Data operations (store, cache, queue) |

### Common Node Types

| Type | Description | Input Signals | Output Signals |
|------|-------------|---------------|----------------|
| `control.input` | Entry point | External | `DATA.INPUT` |
| `control.display` | Output display | Any | None |
| `logic.validate` | Validation | `DATA.*` | `VALID.*`, `ERROR.*` |
| `logic.transform` | Data transform | `DATA.*` | `DATA.*` |
| `logic.router` | Conditional routing | `DATA.*` | Multiple |
| `external.api` | HTTP API call | `REQUEST.*` | `RESPONSE.*` |
| `external.auth` | Authentication | `AUTH.REQUEST` | `AUTH.*` |
| `data.store` | State storage | `DATA.*`, `STATE.*` | `STATE.*` |

---

## Appendix C: Signal Naming Convention

```
NAMESPACE.ENTITY.ACTION
```

### Examples

| Signal | Description |
|--------|-------------|
| `USER.LOGIN` | User login event |
| `USER.LOGOUT` | User logout event |
| `DATA.INPUT` | Generic data input |
| `DATA.OUTPUT` | Generic data output |
| `AUTH.REQUEST` | Authentication request |
| `AUTH.SUCCESS` | Auth successful |
| `AUTH.FAILURE` | Auth failed |
| `ERROR.VALIDATION` | Validation error |
| `STATE.UPDATE` | State update event |

### Wildcards

- `USER.*` - All user signals
- `*.SUCCESS` - All success signals
- `DATA.**` - All data signals (multi-level)

---

## Appendix D: Server Modes

### HTTP Server

```bash
graph-os-tool --server=http --port=3000
```

Endpoints:
- `GET /health` - Health check
- `GET /info` - Server info
- `GET /tools` - List tools
- `POST /tools/call` - Execute tool

### SSE Server

```bash
graph-os-tool --server=sse --port=8084
```

Endpoints:
- `GET /sse` - SSE connection
- `POST /tools/call` - Execute tool
- `POST /broadcast` - Broadcast to clients

### WebSocket Server

```bash
graph-os-tool --server=ws --port=8085
```

Protocol:
- Request: `{ type: "request", id: "xxx", method: "tools/call", params: {...} }`
- Response: `{ type: "response", id: "xxx", result: {...} }`
- Notification: `{ type: "notification", method: "event", params: {...} }`

### MCP Server (Claude Desktop)

```bash
graph-os-tool --server=mcp --stdio
```

For Claude Desktop `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "graph-os": {
      "command": "graph-os-tool",
      "args": ["--server=mcp", "--stdio"]
    }
  }
}
```

---

**Document Version:** 2.0.0
**Last Updated:** January 2024
