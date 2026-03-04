# Getting Started with Graph-OS

> Your first 5 minutes with Graph-OS MCP Tools. No technical background required.

---

## What is Graph-OS?

Graph-OS helps you build applications by connecting building blocks together. Think of it like a flowchart that actually runs.

**In simple terms:**
- You have **nodes** (building blocks that do things)
- You connect them with **wires** (like drawing arrows between boxes)
- Messages called **signals** flow through the wires
- The result is a working application

---

## The 5 Tools You'll Use

Graph-OS gives you 5 simple tools. Here's what each one does:

| Tool | What It Does | When to Use |
|------|--------------|-------------|
| **USE** | Choose a project | "I want to work on my auth project" |
| **QUERY** | Ask questions | "What nodes do I have?" or "Show me the flowchart" |
| **PATCH** | Make changes | "Add a new node" or "Connect these two" |
| **RUN** | Test things | "Run this and see what happens" |
| **GENERATE** | Create new things | "Make me a login flow" or "Create a new project" |

---

## Your First Session

### Step 1: Start a New Project

Tell Graph-OS to create a project for you:

```
Use the GENERATE tool with:
  project: { name: "my-first-app", path: "./my-first-app" }
```

Graph-OS will create a folder with everything you need.

### Step 2: Load Your Project

```
Use the USE tool with:
  project: "./my-first-app"
```

Now Graph-OS knows which project you're working on.

### Step 3: See What You Have

```
Use the QUERY tool with:
  from: "topology"
  select: "mermaid"
```

This shows you a visual diagram of your application. For a new project, it might be empty - that's okay!

### Step 4: Add Your First Node

A node is like a single step in your process. Let's add an input node:

```
Use the PATCH tool with:
  ops: [{ op: "add", path: "/nodes/-", value: { id: "start", type: "control.input", config: {} } }]
```

### Step 5: Add Another Node

Let's add a second node that processes the input:

```
Use the PATCH tool with:
  ops: [{ op: "add", path: "/nodes/-", value: { id: "process", type: "logic.transform", config: {} } }]
```

### Step 6: Connect Them

Now connect the two nodes with a wire:

```
Use the PATCH tool with:
  ops: [{ op: "add", path: "/wires/-", value: { from: "start", to: "process", signalType: "DATA.INPUT" } }]
```

### Step 7: See Your Work

```
Use the QUERY tool with:
  from: "topology"
  select: "mermaid"
```

Now you'll see a diagram like:

```
graph LR
    start --> process
```

**Congratulations!** You've built your first graph.

---

## Common Tasks

### "I want to see all my nodes"

```
QUERY with: { from: "nodes" }
```

### "I want to see all connections"

```
QUERY with: { from: "wires" }
```

### "I want to remove a node"

```
PATCH with: { ops: [{ op: "remove", path: "/nodes/0" }], confirm: true }
```

(Note: You need `confirm: true` for deletions as a safety measure)

### "I want to test sending a signal"

```
RUN with: {
  mode: "inject",
  signal: { type: "DATA.INPUT", payload: { message: "Hello!" } }
}
```

### "I want to create a login flow automatically"

```
GENERATE with: { pattern: { builtin: "auth-flow", output: "patch" } }
```

---

## Understanding the Response

Every tool gives you a response with these parts:

| Field | What It Means |
|-------|---------------|
| `status` | "ok" = success, "error" = something went wrong |
| `summary` | A human-readable explanation of what happened |
| `data` | The actual data (if you asked for data) |
| `visual` | A diagram (if you asked for topology) |

**Example:**

```json
{
  "status": "ok",
  "summary": "Found 2 nodes in your graph",
  "data": [
    { "id": "start", "type": "control.input" },
    { "id": "process", "type": "logic.transform" }
  ]
}
```

---

## Tips for Beginners

### 1. Use Dry Run First
Before making changes, use `dryRun: true` to preview what will happen:

```
PATCH with: { ops: [...], dryRun: true }
```

### 2. Ask Questions First
Use QUERY to understand your current state before making changes.

### 3. Read the Summary
The `summary` field always tells you what happened in plain language.

### 4. Check for Errors
If `status` is "error", look at the `error` field - it tells you what went wrong and how to fix it.

### 5. Use Generate for Common Patterns
Don't build everything from scratch. Use `GENERATE` with built-in patterns:

- `auth-flow` - Login/signup flow
- `crud` - Create, Read, Update, Delete operations
- `form-validation` - Form with validation
- `rate-limiting` - Protect against too many requests

---

## Important: GENERATE vs PATCH

**A common source of confusion:**

| Tool | What It Creates | Where It Goes |
|------|-----------------|---------------|
| `GENERATE` | Templates & scaffolds | Files on disk |
| `PATCH` | Actual nodes/wires | Into your cartridge |

### GENERATE Creates Files

`GENERATE` creates **template files** that you can use as starting points:

```
GENERATE { node: { type: "custom.my-node", category: "logic" } }
// Creates: src/nodes/custom/my-node.ts (a template file)
```

**This does NOT add anything to your cartridge!**

### PATCH Adds to Cartridge

`PATCH` adds actual nodes and wires to your **currently loaded cartridge**:

```
PATCH { ops: [{ op: "add", path: "/nodes/-", value: { id: "my-node", type: "logic.transform" } }] }
// Adds a node to your cartridge immediately
```

### The Typical Workflow

1. **GENERATE** a pattern to get started:
   ```
   GENERATE { pattern: { builtin: "auth-flow", output: "patch" } }
   ```
   This returns patch operations you can apply.

2. **PATCH** those operations to add them to your cartridge:
   ```
   PATCH { ops: <the patch operations from GENERATE> }
   ```

**Remember:** GENERATE = templates/files, PATCH = actual changes to your graph.

---

## Important: Session Persistence

**Your session (loaded project) persists within a single process.**

### What This Means

When using Graph-OS through an **MCP server** (like Claude Desktop):
- Session persists across multiple tool calls
- Load once with `USE`, then call `QUERY`, `PATCH`, etc.
- Everything works in the same process

When using Graph-OS via **CLI** (direct commands):
- Each command runs in a new process
- Session is NOT preserved between commands
- You must combine operations or use the HTTP server

### Recommended: Use MCP Server

The MCP server mode is the primary way to use Graph-OS:

```bash
# Start the server (runs persistently)
bun run server.ts --mode stdio

# Or for HTTP access:
bun run server.ts --mode http --port 3000
```

### If Using CLI

Combine operations in a single call:

```bash
# WRONG - session lost between calls
bun -e "await useTool.execute({project: '/path'})"
bun -e "await queryTool.execute({from: 'nodes'})"  # Error: no session!

# RIGHT - combine in single process
bun -e "
  await useTool.execute({project: '/path'});
  const result = await queryTool.execute({from: 'nodes'});
  console.log(result);
"
```

---

## What's Next?

- Read **[Concepts Explained](./concepts.md)** to understand nodes, wires, and signals
- Check **[Common Patterns](./patterns.md)** for recipes you can copy
- See **[FAQ](./faq.md)** if you have questions

---

## Getting Help

If something goes wrong:

1. Read the `error` field in the response - it usually tells you what to do
2. Check that you've loaded a project with `USE`
3. Use `QUERY { from: "cartridge", select: "validation" }` to check for issues
4. Look at the **[FAQ](./faq.md)** for common problems
