# Changelog

All notable changes to the @graph-os/mcp-tools package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-XX - "The Molecular Layer"

### Breaking Changes

- **Tool Renaming**: 3 testing tools renamed (removed `mcp_` prefix)
  - `mcp_test_scenario` → `test_scenario`
  - `mcp_verify_node` → `verify_node`
  - `mcp_snapshot_regression` → `snapshot_regression`

- **Deprecated Tools Removed**: 9 microscopic tools superseded by next-gen tools
  - `add_node` → use `apply_topology_patch`
  - `add_wire` → use `apply_topology_patch`
  - `remove_node` → use `apply_topology_patch`
  - `remove_wire` → use `apply_topology_patch`
  - `update_node` → use `apply_topology_patch`
  - `update_wire` → use `apply_topology_patch`
  - `get_cartridge` → use `query_topology`
  - `get_node` → use `query_topology`
  - `add_composite_ref` → use `apply_topology_patch`

### Added - Next-Gen Tools (8)

#### Accelerator Tools
- **`apply_topology_patch`**: Universal graph modification tool. Build entire features in a single turn by applying partial graph definitions (nodes, wires, signals) to cartridges.
- **`generate_ui_binding`**: React component generation from control nodes. Generates TypeScript components with proper signal hooks.

#### Safety Tools
- **`simulate_modification`**: Pre-flight validation with execution simulation. Detects circular dependencies, type mismatches, and performance bottlenecks before applying changes.
- **`lint_and_fix`**: Automatic linting and error correction for cartridges. Detects common issues and provides auto-fix capabilities.

#### Bridge Tools
- **`scaffold_node_impl`**: Node type scaffolding from templates. Generates TypeScript implementations for custom node types.
- **`refactor_semantics`**: Distributed renaming across cartridges, registries, and implementations. Supports signal, node, and composite renaming.

#### Precision Tools
- **`query_topology`**: Universal query system for graph neighborhoods. Supports subgraph traversal, registry queries, and path finding.
- **`extract_to_composite`**: Automatic composite extraction from node clusters. Detects boundaries, generates composites, and heals parent graphs.

### Added - Core Components (4)
- **`ConflictDetector`**: Detects conflicts between cartridges and patches
- **`ConflictResolver`**: Resolves conflicts with configurable strategies
- **`GraphMerger`**: Merges graph structures with intelligent conflict handling
- **`BoundaryDetector`**: Detects input/output boundaries for composite extraction

### Added - Access Layers (3)
- **`MCPServer`**: Model Context Protocol server for AI integration
- **`HTTPServer`**: REST HTTP server for web integration
- **`WSServer`**: WebSocket server for real-time integration

### Changed
- **Tool Metadata**: All 23 tools now include `category`, `bestFor`, and `complexity` metadata
- **Directory Structure**: Reorganized tools by category (accelerator, bridge, precision, safety, architecture, composite, testing)
- **TypeScript Config**: Updated to target ES2020 for better performance

### Fixed
- Signal type validation in boundary detection
- Wire connection updates during composite extraction
- Cache invalidation in topology queries

### Performance
- `apply_topology_patch`: < 200ms (small), < 2s (large)
- `query_topology`: < 50ms (depth 2), < 500ms (depth 5)
- `simulate_modification`: < 1s (simple), < 5s (complex)
- `extract_to_composite`: < 500ms (simple), < 3s (complex)
- `lint_and_fix`: < 100ms
- `scaffold_node_impl`: < 50ms
- `generate_ui_binding`: < 100ms
- `refactor_semantics`: < 2s (local), < 10s (global)

## [1.0.0] - Initial Release

### Added
- Basic cartridge management tools
- Signal registry tools
- Composite tools
- Testing tools (with `mcp_` prefix)
- Validation tools
