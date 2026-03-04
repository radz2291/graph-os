# Frequently Asked Questions

> Common questions and answers about Graph-OS MCP Tools.

---

## Getting Started

### Q: What do I need to start using Graph-OS?

**A:** You need:
1. A way to call the tools (Claude Desktop, or any MCP client)
2. A folder to store your projects

That's it. No database, no server setup required.

### Q: How do I create a new project?

**A:** Use the GENERATE tool:
```json
GENERATE with: { "project": { "name": "my-app", "path": "./my-app" } }
```

Or use the USE tool with init:
```json
USE with: { "init": { "name": "my-app", "path": "./my-app" } }
```

### Q: How do I load an existing project?

**A:** Use the USE tool:
```json
USE with: { "project": "./path/to/your/project" }
```

---

## Tools

### Q: Which tool should I use?

**A:** Ask yourself what you're trying to do:

| I want to... | Use this tool |
|--------------|---------------|
| Load a project or check current state | `USE` |
| See what's in my project | `QUERY` |
| Add, remove, or change things | `PATCH` |
| Run or test my graph | `RUN` |
| Create something new (node, pattern, project) | `GENERATE` |

### Q: Can I use multiple tools at once?

**A:** No, each tool call is separate. But you can chain them:

1. `USE { project: "./my-app" }` - Load project
2. `QUERY { from: "nodes" }` - See nodes
3. `PATCH { ops: [...] }` - Add a node
4. `QUERY { from: "topology" }` - See the result

### Q: Why do I get "SESSION_NOT_INITIALIZED" error?

**A:** You tried to use QUERY, PATCH, or RUN without loading a project first.

**Fix:** Call `USE { project: "./your-project" }` first.

---

## Nodes & Wires

### Q: How do I add a node?

**A:** Use PATCH:
```json
PATCH with: {
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "my-node", "type": "logic.transform", "config": {} } }
  ]
}
```

### Q: How do I connect two nodes?

**A:** Use PATCH to add a wire:
```json
PATCH with: {
  "ops": [
    { "op": "add", "path": "/wires/-", "value": { "from": "node-a", "to": "node-b", "signalType": "DATA.FLOW" } }
  ]
}
```

### Q: How do I remove a node?

**A:** You need to know the node's position (index) and use confirm:
```json
PATCH with: {
  "ops": [{ "op": "remove", "path": "/nodes/0" }],
  "confirm": true
}
```

**Tip:** Use `dryRun: true` first to see what will happen:
```json
PATCH with: {
  "ops": [{ "op": "remove", "path": "/nodes/0" }],
  "dryRun": true
}
```

### Q: Why do I need "confirm" for some operations?

**A:** As a safety measure, destructive operations (remove, replace) require explicit confirmation. This prevents accidental data loss.

### Q: What types of nodes are available?

**A:** Common node types:

| Type | Category | What It Does |
|------|----------|--------------|
| `control.input` | Control | Receives input, starts flow |
| `control.output` | Control | Produces output, ends flow |
| `logic.transform` | Logic | Transforms data |
| `logic.validator` | Logic | Validates data |
| `logic.router` | Logic | Routes based on conditions |
| `external.api` | External | Calls external APIs |
| `external.database` | External | Database operations |
| `ui.display` | UI | Shows something to user |

### Q: How do I see my graph visually?

**A:** Query topology with mermaid format:
```json
QUERY with: { "from": "topology", "select": "mermaid" }
```

The `visual` field will contain a diagram you can render.

---

## Signals

### Q: What is a signal?

**A:** A signal is a message that travels through your graph. It carries:
- **Type**: What kind of message (e.g., `USER.LOGIN`)
- **Payload**: The actual data (e.g., `{ email: "user@example.com" }`)

### Q: How do signals flow?

**A:** Signals flow along wires from one node to the next:
```
Node A ──[signal]──▶ Node B ──[signal]──▶ Node C
```

### Q: How do I test sending a signal?

**A:** Use RUN with inject mode:
```json
RUN with: {
  "mode": "inject",
  "signal": { "type": "TEST.SIGNAL", "payload": { "data": "test" } }
}
```

### Q: What signal types should I use?

**A:** Use descriptive names that reflect business events:

| Good Signal Names | Not Recommended |
|-------------------|-----------------|
| `USER.SIGNED_UP` | `SIGNAL1` |
| `ORDER.PLACED` | `DATA` |
| `EMAIL.SENT` | `OUTPUT` |
| `ERROR.VALIDATION` | `ERR` |

**Pattern:** Use `CATEGORY.ACTION` format.

---

## Cartridges

### Q: What is a cartridge?

**A:** A cartridge is a module within your project. It contains its own set of nodes and wires. Use cartridges to:
- Organize related functionality
- Split work between teams
- Load only what you need

### Q: How do I switch between cartridges?

**A:** Use the USE tool:
```json
USE with: { "cartridge": "auth" }
```

### Q: How do I see all cartridges?

**A:** Query the project state:
```json
USE with: {}
```

The response includes available cartridges.

### Q: Can nodes in different cartridges connect?

**A:** Not directly. Each cartridge is a separate graph. They communicate through:
- Shared signal registries
- External triggers
- Composite patterns

---

## Errors

### Q: I got an error. How do I understand what went wrong?

**A:** Look at the `error` field in the response:
```json
{
  "status": "error",
  "error": {
    "code": "NODE_NOT_FOUND",
    "message": "Node 'my-node' does not exist",
    "suggestions": ["Check the node ID", "Query nodes to see available IDs"]
  }
}
```

The `suggestions` field tells you how to fix it.

### Q: Common errors and fixes

| Error | What It Means | How to Fix |
|-------|---------------|------------|
| `SESSION_NOT_INITIALIZED` | No project loaded | Call `USE { project: "..." }` |
| `PROJECT_NOT_FOUND` | Project folder doesn't exist | Check the path, or create project |
| `CARTRIDGE_NOT_FOUND` | Cartridge doesn't exist | Check cartridge name |
| `NODE_NOT_FOUND` | Referenced node doesn't exist | Check node ID |
| `VALIDATION_ERROR` | Data doesn't match schema | Check your input format |
| `DUPLICATE_ID` | ID already exists | Use a different ID |

### Q: How do I recover from an error?

**A:** Most errors are recoverable:

1. **Read the error message** - It tells you what's wrong
2. **Check suggestions** - It tells you how to fix it
3. **Fix the issue** - Correct your input
4. **Retry** - Call the tool again

---

## Testing & Running

### Q: How do I test my graph?

**A:** Use RUN with test mode:
```json
RUN with: {
  "mode": "test",
  "signal": { "type": "TEST.INPUT", "payload": { "value": 42 } },
  "expect": { "signals": ["TEST.OUTPUT"], "timeout": 5000 }
}
```

### Q: How do I debug what's happening?

**A:** Use RUN with debug mode:
```json
RUN with: {
  "mode": "debug",
  "signal": { "type": "TEST.SIGNAL", "payload": {} },
  "trace": true
}
```

This gives you a step-by-step trace of signal flow.

### Q: How do I see the history of what happened?

**A:** Use QUERY with history:
```json
QUERY with: { "from": "history" }
```

---

## MCP & Servers

### Q: How do I use Graph-OS with Claude Desktop?

**A:** Add to your Claude Desktop config:
```json
{
  "mcpServers": {
    "graph-os": {
      "command": "bun",
      "args": ["run", "/path/to/graph-os/packages/tool/src/bin/server.ts"]
    }
  }
}
```

### Q: What server modes are available?

| Mode | Use Case | How to Start |
|------|----------|--------------|
| `stdio` | Claude Desktop | Default mode |
| `http` | REST API | `--mode http --port 3000` |
| `sse` | Real-time updates | `--mode sse --port 3000` |
| `ws` | WebSocket | `--mode ws --port 3000` |

### Q: How do I call tools via HTTP?

**A:** Start HTTP server and call endpoints:

```bash
bun run server.ts --mode http --port 3000
```

Then call tools:
```bash
curl http://localhost:3000/tools/call -d '{"name": "use", "arguments": {}}'
```

---

## Files & Storage

### Q: Where is my project data stored?

**A:** In the project folder you specify:
```
my-project/
├── graph-os.config.json        # Project config
├── cartridges/
│   └── *.cartridge.json        # Graph definitions
└── registries/
    ├── signals.json            # Signal types
    └── composites.json         # Reusable patterns
```

### Q: Can I use git with Graph-OS projects?

**A:** Yes! All files are JSON, perfect for git:
```bash
cd my-project
git init
git add .
git commit -m "Initial project"
```

### Q: How do I share a project?

**A:** Just share the folder. It's all JSON files:
- Zip and send
- Push to git repository
- Copy to shared drive

---

## Performance

### Q: Is there a limit on graph size?

**A:** No hard limit, but practical limits exist:
- **Nodes**: Recommended < 100 per cartridge for readability
- **Wires**: Recommended < 200 per cartridge
- **Cartridges**: No practical limit

For large graphs, use cartridges to split into modules.

### Q: How does caching work?

**A:** QUERY results are cached automatically. Cache is invalidated when:
- You make changes with PATCH
- You reload the project
- You switch cartridges
- You use `fresh: true`

---

## Still Have Questions?

1. Check the **[Getting Started](./getting-started.md)** guide
2. Read **[Concepts Explained](./concepts.md)** for fundamentals
3. Look at **[Common Patterns](./patterns.md)** for examples
4. Review **[Tool Reference](./tool-reference.md)** for detailed tool docs
