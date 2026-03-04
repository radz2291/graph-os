# Graph-OS MCP Tools Documentation

> Version 2.0

---

## Quick Navigation

| What You Need | Go To |
|---------------|-------|
| "Just starting, help me!" | [Getting Started](./guides/getting-started.md) |
| "Explain nodes, wires, signals" | [Concepts Explained](./guides/concepts.md) |
| "How do I build X?" | [Common Patterns](./guides/patterns.md) |
| "I have a question" | [FAQ](./guides/faq.md) |
| "Which tool should I use?" | [Tool Reference](./guides/tool-reference.md) |
| "Why is it designed this way?" | [Architectural Decisions](./decisions.md) |

---

## Documentation Structure

```
docs/
├── README.md                    # You are here
├── decisions.md                 # Design decisions (AI-readable)
└── guides/
    ├── getting-started.md       # First 5 minutes
    ├── concepts.md              # Nodes, wires, signals explained
    ├── patterns.md              # Common recipes
    ├── faq.md                   # Frequently asked questions
    └── tool-reference.md        # Detailed tool documentation
```

---

## The 5 Tools at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                      Which Tool Should I Use?                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   "I need to load a project"                                    │
│   "Where am I? What's my current state?"                        │
│   ────────────────────────────────────────────▶ USE             │
│                                                                 │
│   "Show me the nodes"                                           │
│   "What signals are defined?"                                   │
│   "Draw me a diagram of my graph"                               │
│   ────────────────────────────────────────────▶ QUERY           │
│                                                                 │
│   "Add a node"                                                  │
│   "Remove this wire"                                            │
│   "Change this configuration"                                   │
│   ────────────────────────────────────────────▶ PATCH           │
│                                                                 │
│   "Run this graph"                                              │
│   "Test with this signal"                                       │
│   "Debug what's happening"                                      │
│   ────────────────────────────────────────────▶ RUN             │
│                                                                 │
│   "Create a new node type"                                      │
│   "Generate an auth flow"                                       │
│   "Start a new project"                                         │
│   ────────────────────────────────────────────▶ GENERATE        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts Summary

| Concept | Simple Explanation |
|---------|-------------------|
| **Node** | A processing unit - does one thing |
| **Wire** | A connection - carries data between nodes |
| **Signal** | A message - flows through wires |
| **Cartridge** | A module - groups related nodes and wires |
| **Composite** | A template - reusable sub-graph |

---

## Getting Help

1. **Error messages** include suggestions - read them!
2. **FAQ** covers common questions
3. **Patterns** show working examples
4. **Tool Reference** has detailed parameters

---

## For AI Agents

If you're an AI agent reading this:
- Start with [decisions.md](./decisions.md) to understand design rationale
- Use [tool-reference.md](./guides/tool-reference.md) for exact parameters
- Follow patterns from [patterns.md](./guides/patterns.md)
- Handle errors using codes from [faq.md](./guides/faq.md)
