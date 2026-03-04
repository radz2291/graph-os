# @graph-os/standards

Architecture standards and documentation for Graph-OS platform.

## Overview

This package contains the architectural standards, guidelines, and best practices for developing Graph-OS applications.

## Contents

- **Architecture Documentation**: Core concepts and definitions
- **Signal Naming Conventions**: Standard naming patterns for signals
- **Node Development Guide**: How to create custom nodes
- **Cartridge Design Patterns**: Best practices for cartridge design

## Documentation

### Core Concepts

#### Signals
Signals are the fundamental message units in Graph-OS. They flow between nodes through wires, carrying structured data and metadata.

```typescript
interface Signal {
  type: string;              // NAMESPACE.ACTION format
  payload: unknown;          // Structured data
  timestamp: Date;           // ISO 8601 timestamp
  sourceNodeId: string;      // Node that emitted signal
  metadata?: Record<string, unknown>;
}
```

#### Nodes
Nodes are the processing units in Graph-OS. Each node:
- Has a unique identifier
- Has a type that determines its behavior
- Can be configured with type-specific options
- Has a lifecycle (initialize, process, destroy)

```typescript
interface Node {
  id: string;
  type: string;
  config: NodeConfig;
  
  initialize(): Promise<void>;
  process(signal: Signal): Promise<Signal | Signal[] | null>;
  destroy(): Promise<void>;
}
```

#### Cartridges
A Cartridge defines the topology of a Graph-OS application:
- What nodes exist
- How they are wired together
- What signals flow between them

### Signal Naming Convention

Signals use `NAMESPACE.ACTION` format:

- **NAMESPACE**: UPPERCASE_WITH_UNDERSCORES (e.g., USER, AUTH, DATA)
- **ACTION**: UPPERCASE_WITH_UNDERSCORES (e.g., LOGIN_REQUEST, SUCCESS, FAILURE)

Examples:
- `USER.LOGIN_REQUEST`
- `AUTH.SUCCESS`
- `VALIDATION.FAILURE`
- `DATA.TRANSFORMED`

### Constraints

| Constraint | Limit | Description |
|------------|-------|-------------|
| Max Nodes | 30 | Per cartridge |
| Max Wires | 50 | Per cartridge |
| Max Signal Types | 10 | Per cartridge |
| Max Hierarchy Depth | 3 | Levels of nesting |
| Max Top-level Composites | 7 | Per cartridge |

## License

MIT
