# Graph-OS MCP Tools v2 - Implementation Phases

**Package:** `@graph-os/tool`
**Methodology:** Progressive Native Decoupling (PND)
**Status:** Planning

---

## Overview

This document breaks down the implementation of `@graph-os/tool` into phases following the PND methodology. Each phase builds upon the previous, ensuring stability before proceeding.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PND IMPLEMENTATION LAYERS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 5: SKIN                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Tests, Error Messages, Documentation, Polish                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 4: INTERFACE                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MCP Server, File System, Session Persistence                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 3: MUSCLES                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Core Tool Logic (use, query, patch, run, generate)                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 2: NERVOUS SYSTEM                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Types, Interfaces, Session State, Cache Infrastructure              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 1: SKELETON                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ File Structure, Package Config, Empty Exports, Build Setup          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Skeleton (Environment Setup)

**Goal:** Create the file structure and verify the package builds.

**Duration:** ~30 minutes

### 1.1 Package Structure

```
packages/tool/
├── package.json                    # Package definition
├── tsconfig.json                   # TypeScript config
├── src/
│   ├── index.ts                    # Main exports
│   ├── core/
│   │   ├── index.ts
│   │   ├── types.ts                # Shared types (empty)
│   │   ├── Tool.ts                 # Base tool class (empty)
│   │   ├── SessionState.ts         # Session manager (empty)
│   │   └── CacheManager.ts         # Cache layer (empty)
│   ├── tools/
│   │   ├── index.ts
│   │   ├── use.ts                  # Context tool (empty)
│   │   ├── query.ts                # Query tool (empty)
│   │   ├── patch.ts                # Patch tool (empty)
│   │   ├── run.ts                  # Run tool (empty)
│   │   └── generate.ts             # Generate tool (empty)
│   ├── output/
│   │   ├── index.ts
│   │   └── Formatter.ts            # Output formatting (empty)
│   ├── servers/
│   │   ├── index.ts
│   │   ├── MCPServer.ts            # MCP protocol (empty)
│   │   ├── SSEServer.ts            # SSE server (empty)
│   │   ├── HTTPServer.ts           # REST server (empty)
│   │   └── WSServer.ts             # WebSocket (empty)
│   └── bin/
│       └── server.ts               # CLI entry (empty)
└── test/
    ├── setup.ts
    └── tools/
        ├── use.test.ts             # Empty test
        ├── query.test.ts           # Empty test
        ├── patch.test.ts           # Empty test
        ├── run.test.ts             # Empty test
        └── generate.test.ts        # Empty test
```

### 1.2 Tasks

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Create `package.json` with dependencies | ⬜ |
| 1.2 | Create `tsconfig.json` | ⬜ |
| 1.3 | Create all source files with empty exports | ⬜ |
| 1.4 | Create all test files with empty `describe` blocks | ⬜ |
| 1.5 | Run `bun install` and verify dependencies | ⬜ |
| 1.6 | Run `bun run build` and verify compilation | ⬜ |

### 1.3 Verification Criteria

```bash
# Should compile without errors
bun run build

# Should have dist/ output
ls dist/
# Expected: index.js, core/, tools/, output/, servers/
```

### 1.4 package.json Template

```json
{
  "name": "@graph-os/tool",
  "version": "2.0.0",
  "description": "Graph-OS MCP Tools v2 - Minimal AI interface for graph manipulation",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "graph-os-tool": "./dist/bin/server.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "bun test",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@graph-os/core": "file:../core",
    "@graph-os/runtime": "file:../runtime",
    "@graph-os/validators": "file:../validators",
    "fast-json-patch": "^3.1.1",
    "ajv": "^8.12.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "bun-types": "^1.0.0"
  }
}
```

---

## Phase 2: Nervous System (Types & Infrastructure)

**Goal:** Define all types, interfaces, and infrastructure without implementation.

**Duration:** ~2 hours

### 2.1 Core Types (`src/core/types.ts`)

Define all shared types:

| Type | Description |
|------|-------------|
| `ToolResult` | Base result structure for all tools |
| `NextAction` | Suggested next action |
| `GraphOSProjectConfig` | Project configuration schema |
| `SessionState` | Session state structure |
| `CacheEntry` | Cache entry structure |
| `Checkpoint` | Checkpoint structure |
| `ValidationError` | Validation error structure |
| `ErrorCode` | Error code enum |

### 2.2 Tool Parameter Types

| File | Types to Define |
|------|-----------------|
| `tools/use.ts` | `UseParams`, `UseResult` |
| `tools/query.ts` | `QueryParams`, `QueryResult`, `QueryWhere` |
| `tools/patch.ts` | `PatchParams`, `PatchResult`, `PatchOperation` |
| `tools/run.ts` | `RunParams`, `RunResult`, `RunSignal` |
| `tools/generate.ts` | `GenerateParams`, `GenerateResult` |

### 2.3 Session State Infrastructure (`src/core/SessionState.ts`)

```typescript
// Define the class structure with empty methods
class SessionManager {
  state: SessionState;
  
  constructor() {}
  async loadProject(path: string): Promise<void> { throw new Error('Not implemented'); }
  async switchCartridge(alias: string): Promise<void> { throw new Error('Not implemented'); }
  createCheckpoint(name?: string): Checkpoint { throw new Error('Not implemented'); }
  async rollback(id: string): Promise<void> { throw new Error('Not implemented'); }
  getCached<T>(key: string): T | null { return null; }
  setCached(key: string, data: unknown, ttl?: number, tags?: string[]): void {}
  invalidateCache(tags: string[]): void {}
}
```

### 2.4 Cache Infrastructure (`src/core/CacheManager.ts`)

```typescript
// Define cache keys and TTL constants
const CACHE_KEYS = { ... };
const CACHE_TTL = { ... };

class CacheManager {
  private cache: Map<string, CacheEntry>;
  
  get<T>(key: string): T | null { return null; }
  set(key: string, value: unknown, ttl?: number, tags?: string[]): void {}
  invalidate(tags: string[]): void {}
  clear(): void {}
}
```

### 2.5 Base Tool Class (`src/core/Tool.ts`)

```typescript
interface ToolDefinition {
  name: string;
  purpose: string;
  whenToUse: string[];
  whenNotToUse: string[];
  triggers: string[];
  parameters: ParameterDefinition[];
  returnType: string;
  examples: Array<{ input: unknown; description: string }>;
}

abstract class BaseTool<TParams, TResult> {
  abstract name: string;
  abstract definition: ToolDefinition;
  
  abstract execute(params: TParams): Promise<ToolResult<TResult>>;
  validate(params: unknown): params is TParams { return false; }
  protected success(summary: string, data: Partial<TResult>): ToolResult<TResult> { throw new Error('Not implemented'); }
  protected error(code: string, message: string, recovery?: object): ToolResult<TResult> { throw new Error('Not implemented'); }
}
```

### 2.6 Tasks

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | Define all shared types in `core/types.ts` | ⬜ |
| 2.2 | Define `UseParams` and `UseResult` types | ⬜ |
| 2.3 | Define `QueryParams` and `QueryResult` types | ⬜ |
| 2.4 | Define `PatchParams` and `PatchResult` types | ⬜ |
| 2.5 | Define `RunParams` and `RunResult` types | ⬜ |
| 2.6 | Define `GenerateParams` and `GenerateResult` types | ⬜ |
| 2.7 | Create empty `SessionManager` class | ⬜ |
| 2.8 | Create empty `CacheManager` class | ⬜ |
| 2.9 | Create abstract `BaseTool` class | ⬜ |
| 2.10 | Run build and verify all types compile | ⬜ |

### 2.7 Verification Criteria

```bash
# Should compile without errors
bun run build

# Types should be exported
bun -e "import * as t from '@graph-os/tool'; console.log(Object.keys(t))"
# Expected: [ 'types', 'SessionManager', 'CacheManager', 'BaseTool', ... ]
```

---

## Phase 3: Muscles (Core Logic Implementation)

**Goal:** Implement the core logic of each tool in isolation.

**Duration:** ~8 hours

### 3.1 Tool Implementation Order

```
use → query → patch → run → generate
```

**Dependency Graph:**
- `use` has no dependencies (entry point)
- `query` depends on `use` (needs session)
- `patch` depends on `use`, `query` (needs context, validation)
- `run` depends on `use`, `patch` (needs context, may modify)
- `generate` has no runtime dependencies (file generation)

### 3.2 Phase 3.1: Implement `use` Tool

**Files:**
- `src/tools/use.ts`

**Logic to Implement:**

```
┌─────────────────────────────────────────────────────────────────┐
│                     USE TOOL FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  loadProject(path):                                              │
│  1. Resolve path to absolute                                     │
│  2. Walk up directory tree looking for graph-os.config.json      │
│  3. Load and parse config                                        │
│  4. Validate config structure                                    │
│  5. Resolve all relative paths                                   │
│  6. Set session.config                                           │
│  7. Load active cartridge                                        │
│  8. Return config + state                                        │
│                                                                  │
│  switchCartridge(alias):                                         │
│  1. Validate alias exists in config.cartridges                   │
│  2. Load cartridge file                                          │
│  3. Update session.activeCartridge                               │
│  4. Clear cache                                                  │
│  5. Return new state                                             │
│                                                                  │
│  modifyConfig(changes):                                          │
│  1. Apply changes to current config                              │
│  2. Validate                                                     │
│  3. Save to file                                                 │
│  4. Return updated config                                        │
│                                                                  │
│  initProject(options):                                           │
│  1. Create directory structure                                   │
│  2. Generate graph-os.config.json                                │
│  3. Create default cartridge                                     │
│  4. Create registries                                            │
│  5. Load as current context                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Test Scenarios:**
- Load project by explicit path
- Load project by auto-detect
- Return current state
- Switch cartridge
- Add cartridge to config
- Init new project
- Error: project not found
- Error: invalid config

### 3.3 Phase 3.2: Implement `query` Tool

**Files:**
- `src/tools/query.ts`

**Logic to Implement:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY TOOL FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  query(params):                                                  │
│  1. Check session is initialized                                 │
│  2. Check cache (if not fresh)                                   │
│  3. Route to query handler based on `from`                      │
│                                                                  │
│  queryCartridge(select):                                         │
│  - summary: name, counts, validation status                      │
│  - full: complete JSON                                           │
│  - validation: run ValidationPipeline                            │
│  - stats: numeric metrics                                        │
│                                                                  │
│  queryNodes(where, select):                                      │
│  - no filter: return all nodes                                   │
│  - where.id: return single node                                  │
│  - where.type: pattern match (logic.*, *.validate)               │
│  - where.handlesSignal: find nodes with matching wires           │
│  - where.upstream: traverse wires backwards                      │
│  - where.downstream: traverse wires forwards                     │
│                                                                  │
│  querySignals(where):                                            │
│  - Load signal registry                                          │
│  - Filter by type pattern                                        │
│  - Include emittedBy/consumedBy mappings                         │
│                                                                  │
│  queryTopology(select):                                          │
│  - summary: entry/exit points, path count                        │
│  - mermaid: generate mermaid flowchart                           │
│  - graph: adjacency list                                         │
│  - paths: enumerate all signal paths                             │
│                                                                  │
│  queryState():                                                   │
│  - Return runtime status, signal counts, history                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Test Scenarios:**
- Query cartridge summary
- Query full cartridge
- Query validation status
- Query all nodes
- Query nodes by type pattern
- Query nodes by signal
- Query upstream/downstream
- Query signals
- Query topology as mermaid
- Query signal paths
- Cache hit/miss behavior
- fresh: true bypasses cache

### 3.4 Phase 3.3: Implement `patch` Tool

**Files:**
- `src/tools/patch.ts`

**Logic to Implement:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATCH TOOL FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  patch(params):                                                  │
│  1. Check session is initialized                                 │
│  2. Validate params.ops structure                                │
│  3. Check for destructive ops (remove, replace)                  │
│     - If found and !confirm: return error                        │
│  4. If dryRun: simulate and return preview                       │
│  5. Create checkpoint (if enabled)                               │
│  6. Apply operations one by one                                  │
│  7. Run validation after each op                                 │
│  8. If any fail and atomic: rollback                             │
│  9. Save to file                                                 │
│  10. Invalidate cache                                            │
│  11. Return result                                               │
│                                                                  │
│  applyOperation(op):                                             │
│  - add: validate path, validate value schema, append/set         │
│  - remove: validate path exists, check dependencies              │
│  - replace: validate path exists, validate new value             │
│  - move/copy: validate paths, perform operation                  │
│  - test: validate condition                                      │
│                                                                  │
│  validateAfterOp(op):                                            │
│  - Node type must be registered                                  │
│  - Wire from/to must exist                                       │
│  - Signal type must be registered                                │
│  - No orphaned nodes                                             │
│  - No circular dependencies                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Test Scenarios:**
- Add node
- Add wire
- Remove node (with confirm)
- Remove node (without confirm - error)
- Remove node with wires - error
- Replace node config
- Dry run preview
- Batch operations
- Atomic rollback on failure
- Checkpoint creation
- explain: true trace

### 3.5 Phase 3.4: Implement `run` Tool

**Files:**
- `src/tools/run.ts`

**Logic to Implement:**

```
┌─────────────────────────────────────────────────────────────────┐
│                     RUN TOOL FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  run(params):                                                    │
│  1. Route to handler based on mode                               │
│                                                                  │
│  start():                                                        │
│  1. Check not already running                                    │
│  2. Create GraphRuntime from cartridge                           │
│  3. Initialize nodes                                             │
│  4. Start processing loop                                        │
│  5. Return status                                                │
│                                                                  │
│  stop():                                                         │
│  1. Check is running                                             │
│  2. Stop runtime                                                 │
│  3. Return status                                                │
│                                                                  │
│  inject(signal):                                                 │
│  1. Check is running                                             │
│  2. Create Signal object                                         │
│  3. Emit to runtime                                              │
│  4. Wait for processing                                          │
│  5. Collect results                                              │
│  6. Return metrics + history                                     │
│                                                                  │
│  test(signal, expect):                                           │
│  1. Start runtime (if not running)                               │
│  2. Inject signal                                                │
│  3. Collect all emitted signals                                  │
│  4. Compare against expectations                                 │
│  5. Generate test report                                         │
│  6. Stop runtime                                                 │
│  7. Return test result                                           │
│                                                                  │
│  debug(signal, trace, breakpoints):                              │
│  1. Start runtime in debug mode                                  │
│  2. Enable tracing                                               │
│  3. Set breakpoints                                              │
│  4. Inject signal                                                │
│  5. Return detailed trace                                        │
│                                                                  │
│  watch():                                                        │
│  1. Start runtime                                                │
│  2. Start file watcher                                           │
│  3. On change: reload cartridge, preserve state                  │
│  4. Stream events                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Test Scenarios:**
- Start runtime
- Stop runtime
- Inject signal
- Test with passing expectations
- Test with failing expectations
- Test with timeout
- Debug with trace
- Debug with breakpoints

### 3.6 Phase 3.5: Implement `generate` Tool

**Files:**
- `src/tools/generate.ts`

**Logic to Implement:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   GENERATE TOOL FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  generate(params):                                               │
│  1. Route to handler based on mode                               │
│                                                                  │
│  generateNode(options):                                          │
│  1. Validate type doesn't exist                                  │
│  2. Load template                                                │
│  3. Generate TypeScript implementation                           │
│  4. Generate config interface                                    │
│  5. Write to output path                                         │
│  6. Register if requested                                        │
│  7. Return file info                                             │
│                                                                  │
│  generatePattern(options):                                       │
│  1. If builtin: load template                                    │
│  2. Else: generate from description                              │
│  3. If output: 'patch': return patch ops                         │
│  4. If output: 'file': save pattern file                         │
│  5. If output: 'composite': create composite                     │
│                                                                  │
│  generateUIBinding(options):                                     │
│  1. Analyze signal types                                         │
│  2. Generate hooks (useSignal, useEmitSignal)                    │
│  3. Generate type definitions                                    │
│  4. Write files                                                  │
│                                                                  │
│  generateProject(options):                                       │
│  1. Create directory structure                                   │
│  2. Generate graph-os.config.json                                │
│  3. If template: copy template files                             │
│  4. Create registries                                            │
│  5. Return project info                                          │
│                                                                  │
│  generateComposite(options):                                     │
│  1. Validate nodes exist                                         │
│  2. Identify boundary signals                                    │
│  3. Create composite definition                                  │
│  4. Generate signal mappings                                     │
│  5. Save to registry                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Test Scenarios:**
- Generate custom node
- Generate node with registration
- Generate pattern as patch
- Generate builtin pattern
- Generate UI binding
- Generate project
- Extract composite

### 3.7 Tasks

| Task | Description | Status |
|------|-------------|--------|
| 3.1 | Implement `use` tool core logic | ⬜ |
| 3.2 | Implement `SessionManager` load/switch methods | ⬜ |
| 3.3 | Implement `query` tool for cartridge | ⬜ |
| 3.4 | Implement `query` tool for nodes | ⬜ |
| 3.5 | Implement `query` tool for signals/topology | ⬜ |
| 3.6 | Implement `CacheManager` get/set/invalidate | ⬜ |
| 3.7 | Implement `patch` tool operation handlers | ⬜ |
| 3.8 | Implement `patch` validation pipeline | ⬜ |
| 3.9 | Implement `patch` dry-run and checkpoint | ⬜ |
| 3.10 | Implement `run` tool start/stop modes | ⬜ |
| 3.11 | Implement `run` tool inject/test modes | ⬜ |
| 3.12 | Implement `run` tool debug mode | ⬜ |
| 3.13 | Implement `generate` tool node mode | ⬜ |
| 3.14 | Implement `generate` tool pattern mode | ⬜ |
| 3.15 | Implement `generate` tool other modes | ⬜ |
| 3.16 | Run all unit tests | ⬜ |

### 3.8 Verification Criteria

```bash
# Run all tests
bun test

# Expected: All tests pass
# Each tool should work with mock data
```

---

## Phase 4: Interface (Integration)

**Goal:** Connect tools to MCP server and file system.

**Duration:** ~4 hours

### 4.1 File System Integration

**Files:**
- `src/core/SessionState.ts` - Add actual file reading
- `src/tools/use.ts` - Add file system operations
- `src/tools/patch.ts` - Add file writing

**Logic:**
```typescript
// Use Node.js fs/promises for file operations
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
```

### 4.2 MCP Server Integration

**Files:**
- `src/servers/MCPServer.ts`
- `src/bin/server.ts`

**Logic:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP SERVER FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  onInitialize():                                                 │
│  - Return protocol version and capabilities                      │
│                                                                  │
│  onToolsList():                                                  │
│  - Return all 5 tool definitions                                 │
│                                                                  │
│  onToolsCall(name, arguments):                                   │
│  1. Get tool from registry                                       │
│  2. Validate parameters                                          │
│  3. Execute tool                                                 │
│  4. Format result                                                │
│  5. Return MCP response                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Output Formatting

**Files:**
- `src/output/Formatter.ts`

**Logic:**
```typescript
class OutputFormatter {
  format(result: unknown, options: FormatOptions): string {
    // 1. Extract layers
    // 2. Apply token optimization
    // 3. Serialize to JSON
    // 4. Apply compact representations
  }
  
  optimizeNodes(nodes: NodeQueryData[]): CompactNode[] {
    // Convert verbose nodes to compact array format
    // ["id", "type", "outputSignalTypes"]
  }
  
  truncate(data: unknown, maxTokens: number): unknown {
    // Truncate large arrays
    // Summarize large objects
  }
}
```

### 4.4 CLI Entry Point

**Files:**
- `src/bin/server.ts`

```typescript
#!/usr/bin/env node

// Parse CLI arguments
// Create MCP/SSE/HTTP/WS server
// Start listening
// Handle shutdown
```

### 4.5 Tasks

| Task | Description | Status |
|------|-------------|--------|
| 4.1 | Add file system operations to SessionManager | ⬜ |
| 4.2 | Add file writing to patch tool | ⬜ |
| 4.3 | Implement MCPServer handlers | ⬜ |
| 4.4 | Implement tool registry and registration | ⬜ |
| 4.5 | Implement OutputFormatter | ⬜ |
| 4.6 | Implement CLI entry point | ⬜ |
| 4.7 | Test MCP server with Claude Desktop | ⬜ |
| 4.8 | Test HTTP server endpoints | ⬜ |

### 4.6 Verification Criteria

```bash
# Build and run server
bun run build
node dist/bin/server.js --port 8084

# Test tools/call endpoint
curl -X POST http://localhost:8084/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "use", "arguments": {"detect": true}}'
```

---

## Phase 5: Skin (Polish & Testing)

**Goal:** Add tests, documentation, error messages, and polish.

**Duration:** ~4 hours

### 5.1 Comprehensive Tests

**Test Structure:**
```
test/
├── tools/
│   ├── use.test.ts           # All use scenarios
│   ├── query.test.ts         # All query scenarios
│   ├── patch.test.ts         # All patch scenarios
│   ├── run.test.ts           # All run scenarios
│   └── generate.test.ts      # All generate scenarios
├── integration/
│   ├── workflow.test.ts      # Full AI session simulation
│   ├── multi-cartridge.test.ts
│   ├── error-recovery.test.ts
│   └── caching.test.ts
├── e2e/
│   ├── ai-session.test.ts
│   └── mcp-protocol.test.ts
└── fixtures/
    ├── test-project/         # Test project structure
    └── mock-cartridges/      # Test cartridge files
```

### 5.2 Error Messages

Define clear, actionable error messages:

```typescript
const ERROR_MESSAGES = {
  SESSION_NOT_INITIALIZED: {
    message: 'No project loaded. Call use({ project: "path" }) first.',
    suggestion: 'Use use({ detect: true }) to auto-detect a project.'
  },
  PROJECT_NOT_FOUND: {
    message: 'Project not found at {path}',
    suggestion: 'Check the path or use use({ detect: true }) to find a project.'
  },
  PATCH_REQUIRES_CONFIRM: {
    message: 'Destructive operation requires confirmation',
    suggestion: 'Add confirm: true to proceed, or use dryRun: true to preview.'
  },
  // ... more error messages
};
```

### 5.3 Documentation

- API Reference (generated from JSDoc)
- Migration Guide (v1 → v2)
- Usage Examples
- Tool Description Templates

### 5.4 Performance Optimization

- Profile token usage
- Optimize cache hit rates
- Benchmark tool execution times

### 5.5 Tasks

| Task | Description | Status |
|------|-------------|--------|
| 5.1 | Write comprehensive use tool tests | ⬜ |
| 5.2 | Write comprehensive query tool tests | ⬜ |
| 5.3 | Write comprehensive patch tool tests | ⬜ |
| 5.4 | Write comprehensive run tool tests | ⬜ |
| 5.5 | Write comprehensive generate tool tests | ⬜ |
| 5.6 | Write integration tests | ⬜ |
| 5.7 | Write E2E tests | ⬜ |
| 5.8 | Create test fixtures | ⬜ |
| 5.9 | Define all error messages | ⬜ |
| 5.10 | Add JSDoc documentation | ⬜ |
| 5.11 | Verify all tests pass | ⬜ |

### 5.6 Verification Criteria

```bash
# All tests pass
bun test

# Coverage > 80%
bun test --coverage

# Build succeeds
bun run build

# Server starts
node dist/bin/server.js --help
```

---

## Summary

### Phase Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Skeleton | 30 min | None |
| Phase 2: Nervous System | 2 hours | Phase 1 |
| Phase 3: Muscles | 8 hours | Phase 2 |
| Phase 4: Interface | 4 hours | Phase 3 |
| Phase 5: Skin | 4 hours | Phase 4 |
| **Total** | **~18.5 hours** | |

### Dependency Graph

```
Phase 1 (Skeleton)
    │
    ▼
Phase 2 (Nervous System)
    │
    ▼
Phase 3 (Muscles)
    ├─────────────┬─────────────┬─────────────┐
    │             │             │             │
    ▼             ▼             ▼             ▼
  use         query        patch       generate
    │             │             │             │
    └─────────────┴──────┬──────┴─────────────┘
                         │
                         ▼
                    run (depends on use, patch)
                         │
                         ▼
                  Phase 4 (Interface)
                         │
                         ▼
                  Phase 5 (Skin)
```

### Success Criteria

After all phases complete:

1. ✅ Package builds without errors
2. ✅ All 5 tools are functional
3. ✅ All tests pass (>80% coverage)
4. ✅ MCP server works with Claude Desktop
5. ✅ Token-optimized outputs
6. ✅ Clear error messages with recovery suggestions
7. ✅ Complete API documentation

---

**Document End**
