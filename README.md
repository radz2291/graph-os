# Graph-OS MVP v1.0.0

**Node-based, Signal-driven Architecture Platform for AI-Driven Development**

Graph-OS is a revolutionary platform that enables AI agents to build, modify, and execute complex applications through a visual, signal-driven architecture. Instead of generating code, AI uses MCP tools to manipulate graph structures that execute in a deterministic, observable runtime.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run the CLI
npx @graph-os/cli start --cartridge ./examples/cartridges/app.cartridge.json
```

## 📦 Package Structure

```
graph-os-mvp-v2/
├── packages/
│   ├── core/              # Core interfaces, types, and schemas
│   ├── runtime/           # GraphRuntime execution engine
│   ├── validators/        # Cartridge validation pipeline
│   ├── mcp-tools/         # AI development tools (18 tools)
│   ├── testing/           # Testing framework for cartridges
│   ├── cli/               # Command-line interface
│   ├── react-bridge/      # React hooks for Graph-OS
│   └── standards/         # Documentation and standards
├── examples/
│   └── react-login/       # Login flow sample app
├── docs/
│   ├── guides/            # Quick start and tutorials
│   └── api/               # API reference
└── worklog.md             # Development history
```

## 🔧 Core Concepts

### Signals
Messages that flow between nodes following `NAMESPACE.ACTION` format:
```json
{
  "type": "AUTH.LOGIN_REQUEST",
  "payload": { "email": "user@example.com", "password": "..." },
  "timestamp": "2024-01-15T10:30:00Z",
  "sourceNodeId": "login-form"
}
```

### Nodes
Processing units that receive signals, process them, and emit new signals:
- **Logic**: `logic.validate`, `logic.transform`
- **Control**: `control.input`, `control.display`
- **Infra**: `infra.api.client`, `infra.storage.local`
- **UI**: `ui.component`, `ui.layout`, `ui.page`

### Wires
Connections that route signals between nodes based on signal type.

### Cartridges
JSON files defining a complete application graph:
```json
{
  "version": "1.0.0",
  "name": "auth-flow",
  "nodes": [...],
  "wires": [...]
}
```

## 🛠️ High-Level API

```typescript
import { GraphRuntime, createRuntime } from '@graph-os/runtime';

// Create runtime with cartridge
const runtime = await createRuntime({
  cartridgePath: './cartridges/app.cartridge.json'
});

// Start processing
await runtime.start();

// Emit signals
runtime.emit('USER.LOGIN', { email: 'user@example.com' });

// Subscribe to signals
runtime.subscribe('AUTH.SUCCESS', (signal) => {
  console.log('User authenticated:', signal.payload);
});

// Stop when done
await runtime.stop();
```

## 🤖 MCP Tools (18 Tools)

### Architecture Tools
- `create_cartridge` - Create new cartridge
- `create_signal` - Register signal type
- `validate_cartridge` - Deep validation
- `run_cartridge` - Execute with real runtime

### Modify Tools
- `add_node` - Add node with type validation
- `add_wire` - Add wire with connection validation

### Query Tools
- `get_cartridge` - View cartridge structure
- `get_node` - View node configuration

### Revision Tools
- `update_node` - Update node config
- `update_wire` - Update wire connection
- `remove_node` - Remove node
- `remove_wire` - Remove wire

### Composite Tools
- `create_composite` - Create reusable composite
- `add_composite_ref` - Reference composite
- `list_composites` - List available composites

### Testing Tools
- `mcp_test_scenario` - Integration testing
- `mcp_verify_node` - Unit testing (<5ms)
- `mcp_snapshot_regression` - Regression testing

## ✅ What's New in v1.0.0

### Critical Fixes
1. **Type-Only Exports**: Interfaces use `export type` for browser compatibility
2. **Dependency Resolution**: All packages properly declare dependencies
3. **API Consistency**: `GraphRuntime` matches documentation

### MCP Tools Integration
1. **Real Runtime**: `run_cartridge` uses actual GraphRuntime engine
2. **Deep Validation**: `validate_cartridge` uses ValidationPipeline
3. **Type Validation**: `add_node` validates and suggests node types
4. **Connection Validation**: `add_wire` validates signal format and connections
5. **High-Fidelity Testing**: TestRunner uses real runtime when available

## 🧪 Running Tests

```bash
# Core integration test
node integration-test.js

# MCP tools integration test  
node mcp-tools-integration-test.js
```

## 📚 Documentation

- **Quick Start Guide**: `docs/guides/quick-start.md`
- **API Reference**: `docs/api/api-reference.md`
- **MCP Tools Reference**: `docs/api/mcp-tools-reference.md`
- **Full Documentation**: `Graph-OS-Documentation.docx`

## 🏗️ Building from Source

```bash
# Build each package
cd packages/core && npm run build
cd ../runtime && npm run build
cd ../validators && npm run build
cd ../mcp-tools && npm install && npm run build
cd ../testing && npm run build
cd ../cli && npm run build
cd ../react-bridge && npm run build
```

## 📋 Requirements

- Node.js 18+
- npm or bun
- TypeScript 5.3+

## 📄 License

MIT License - See LICENSE file for details.

## 🙏 Credits

Graph-OS Team - Building the future of AI-driven development.
