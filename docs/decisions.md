# Architectural Decisions

> This document captures key design decisions for Graph-OS MCP Tools v2. It is intended for AI agents and developers who need to understand WHY the system is designed this way.

---

## Decision 1: Five-Tool Architecture

### The Problem
We needed an interface for AI agents to interact with graph-based projects. The challenge was finding the right granularity:

- **Too few tools**: Each tool becomes a "god object" that does too much, making it hard for AI to reason about intent
- **Too many tools**: Fragmented interface, AI loses context, harder to discover capabilities

### The Decision
Split into **5 focused tools**, each with a single responsibility:

| Tool | Job | Mental Model |
|------|-----|--------------|
| `use` | Context management | "Where am I? What project is loaded?" |
| `query` | Read-only exploration | "What's there? Show me the nodes/wires/signals" |
| `patch` | Modifications | "Change this - add/remove/replace" |
| `run` | Execution & testing | "Run this - start/stop/inject signals" |
| `generate` | Creation & scaffolding | "Create new - nodes/patterns/projects" |

### Why This Works
1. **Single responsibility**: Each tool has ONE job, making behavior predictable
2. **AI reasoning**: Agents can map intent → tool easily ("I need to change something" → `patch`)
3. **Discoverability**: 5 tools is small enough to remember, large enough to be useful
4. **Error isolation**: Problems in one tool don't cascade to others

### Alternatives Rejected
- **Single mega-tool**: `graph-os` with 50+ parameters. Rejected because AI struggles with complex parameter combinations
- **20+ micro-tools**: One tool per operation. Rejected because AI loses context switching between too many tools
- **REST-style resources**: `/nodes`, `/wires`, etc. Rejected because MCP protocol requires tool-based interface

---

## Decision 2: MCP Protocol

### The Problem
We needed a standard way for AI assistants (Claude, GPT, etc.) to interact with Graph-OS.

### The Decision
Adopt the **Model Context Protocol (MCP)** as the primary interface.

### Why MCP
1. **Industry standard**: Supported by Claude Desktop, and other AI assistants
2. **Tool-based**: Fits naturally with our 5-tool architecture
3. **JSON-RPC**: Simple, well-understood protocol
4. **Discovery**: `tools/list` lets AI discover capabilities at runtime
5. **Future-proof**: Emerging standard with growing ecosystem

### Server Modes
We provide 4 server modes for different use cases:

| Mode | Best For | Protocol |
|------|----------|----------|
| `stdio` | Claude Desktop, local AI | stdin/stdout JSON-RPC |
| `http` | REST API, webhooks, testing | HTTP REST |
| `sse` | Real-time updates, browser clients | Server-Sent Events |
| `ws` | Bidirectional real-time | WebSocket |

### Alternatives Rejected
- **Custom REST API**: Works but not standard for AI assistants
- **GraphQL**: Overkill for our needs, steeper learning curve
- **gRPC**: Too complex, requires code generation

---

## Decision 3: Cartridge-Based Projects

### The Problem
Real projects grow large. A single graph with 100+ nodes becomes unmanageable.

### The Decision
Projects are organized into **cartridges** - independent, focused sub-graphs.

```
my-project/
├── graph-os.config.json        # Project configuration
├── cartridges/
│   ├── root.cartridge.json     # Main application flow
│   ├── auth.cartridge.json     # Authentication logic
│   └── api.cartridge.json      # API endpoints
└── registries/
    ├── signals.json            # Signal type definitions
    └── composites.json         # Reusable sub-graphs
```

### Why Cartridges
1. **Modularity**: Each cartridge handles one concern (auth, api, etc.)
2. **Team collaboration**: Different teams can own different cartridges
3. **Performance**: Load only what you need
4. **Reusability**: Cartridges can be shared between projects

### The Mental Model
Think of cartridges like **modules** or **packages**:
- Each has its own nodes and wires
- Each can be developed independently
- Together they form the complete application

---

## Decision 4: JSON-Patch for Modifications

### The Problem
We needed a way to modify graphs that is:
- Atomic (all changes succeed or all fail)
- Expressive (add, remove, replace, move)
- Standard (no custom syntax to learn)
- AI-friendly (easy for agents to construct)

### The Decision
Use **RFC 6902 JSON-Patch** as the modification format.

### Example
```json
{
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "new-node", "type": "logic.transform" } },
    { "op": "replace", "path": "/nodes/0/config", "value": { "enabled": true } },
    { "op": "remove", "path": "/wires/1" }
  ]
}
```

### Why JSON-Patch
1. **Standard**: RFC 6902 is an IETF standard
2. **Atomic**: Operations are applied in sequence, rollback on failure
3. **Expressive**: 6 operations (add, remove, replace, move, copy, test)
4. **AI-friendly**: JSON structure that AI agents can easily generate
5. **Path-based**: Intuitive `/nodes/-`, `/wires/0` syntax

### Safety Features
- **Dry-run mode**: Preview changes without applying
- **Confirm flag**: Destructive operations require explicit confirmation
- **Validation**: Schema validation before applying

---

## Decision 5: Signal-Based Communication

### The Problem
How do nodes communicate? We needed a model that is:
- Decoupled (nodes don't need to know about each other)
- Observable (easy to trace what happened)
- Flexible (support async workflows)

### The Decision
Use **signals** as the communication primitive.

### What is a Signal?
A signal is a typed message that flows through the graph:

```json
{
  "type": "USER.SIGNED_UP",
  "payload": { "email": "user@example.com", "name": "John" },
  "metadata": { "timestamp": "2024-01-15T10:30:00Z" }
}
```

### How Signals Flow
1. A node **emits** a signal
2. The signal travels along **wires** (connections)
3. Connected nodes **handle** the signal
4. Handlers can emit new signals (chaining)

### Why Signals
1. **Decoupling**: Nodes only know about signal types, not other nodes
2. **Observability**: Every signal can be logged, traced, debugged
3. **Flexibility**: One signal can trigger multiple handlers
4. **Pattern matching**: `AUTH.*` matches `AUTH.SUCCESS`, `AUTH.FAILURE`, etc.
5. **Domain modeling**: Signal types reflect business events (`USER.SIGNED_UP`, `ORDER.PLACED`)

### Signal Registry
All signals are defined in a central registry:
```json
{
  "signals": [
    { "type": "USER.SIGNED_UP", "description": "Emitted when a new user registers", "payload": {...} }
  ]
}
```

---

## Decision 6: Dual Output Format

### The Problem
Tools need to communicate with both AI agents (who want structured data) and humans (who want readable text).

### The Decision
Every tool returns **both** structured data and human-readable summary.

### Example Output
```json
{
  "status": "ok",
  "summary": "Found 12 nodes in the current cartridge",
  "data": [
    { "id": "user-input", "type": "control.input", "config": {} },
    { "id": "validate-email", "type": "logic.validator", "config": { "schema": "email" } }
  ],
  "visual": "graph LR\n  A[user-input] --> B[validate-email]"
}
```

### Why Dual Output
1. **AI consumption**: `data` field contains structured JSON for programmatic use
2. **Human readability**: `summary` provides natural language description
3. **Visual aid**: `visual` field provides diagrams (Mermaid, ASCII)
4. **Debugging**: Both views help troubleshoot issues

---

## Decision 7: Session State Management

### The Problem
AI agents need to maintain context across multiple tool calls. "What project am I working on?"

### The Decision
Use a **global session manager** that persists state across tool invocations.

### What Gets Tracked
- Current project path
- Active cartridge
- Configuration state
- Cache state

### Why Global Session
1. **Continuity**: AI doesn't need to re-specify project on every call
2. **Efficiency**: Loaded once, used many times
3. **Simplicity**: Single source of truth

### Session Lifecycle
```
use({ project: "/path" })  → Session initialized
use({ cartridge: "auth" }) → Switch cartridge
use({})                    → Get current state
```

---

## Summary: Design Principles

These decisions follow a common set of principles:

| Principle | Manifestation |
|-----------|---------------|
| **Simplicity** | 5 tools, not 50 |
| **Standards** | MCP, JSON-Patch, JSON-RPC |
| **Modularity** | Cartridges, signals, composites |
| **AI-first** | Structured outputs, predictable behavior |
| **Human-friendly** | Summaries, visuals, natural language |
| **Safety** | Dry-run, confirm, validation |
