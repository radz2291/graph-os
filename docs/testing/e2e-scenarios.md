# End-to-End Test Scenarios

**Version:** 2.0.0  
**Last Updated:** Phase 6 - Integration & Cleanup

---

## Overview

This document describes the end-to-end test scenarios for validating the Graph-OS MCP Tools v2.0.0. Each scenario tests a complete workflow using multiple tools together.

---

## Test Utilities

The following test utilities are available in `test/utils/`:

| Utility | File | Description |
|---------|------|-------------|
| `CartridgeBuilder` | `cartridge-builder.ts` | Build test cartridges programmatically |
| `PatchBuilder` | `patch-builder.ts` | Build topology patches for testing |
| `assertSuccess` | `result-assertions.ts` | Assert tool result is successful |
| `assertFailure` | `result-assertions.ts` | Assert tool result failed |
| `assertPerformance` | `result-assertions.ts` | Assert performance within bounds |
| `measureTime` | `result-assertions.ts` | Measure execution time |

---

## Scenario 1: Build Complete Feature

**Goal:** Test building a complete feature with `apply_topology_patch`

**Tools Used:**
- `create_cartridge` - Create empty cartridge
- `apply_topology_patch` - Add nodes and wires
- `simulate_modification` - Validate changes
- `validate_cartridge` - Final validation

**Steps:**
1. Create empty cartridge with `create_cartridge`
2. Use `apply_topology_patch` to add 5 nodes:
   - 1 input node
   - 2 transformer nodes
   - 1 validator node
   - 1 display node
3. Use `apply_topology_patch` to add 4 wires connecting them
4. Use `simulate_modification` to validate the changes
5. Use `validate_cartridge` to ensure final structure is valid

**Expected Results:**
- All nodes added successfully
- All wires connected correctly
- No validation errors
- Execution time < 200ms

---

## Scenario 2: Generate UI Bindings

**Goal:** Test React component generation with `generate_ui_binding`

**Tools Used:**
- `create_cartridge` - Create cartridge with control nodes
- `generate_ui_binding` - Generate React components

**Steps:**
1. Create cartridge with:
   - 2 `control.input` nodes
   - 2 `control.display` nodes
2. Use `generate_ui_binding` for each input node
3. Use `generate_ui_binding` for each display node
4. Verify generated code compiles
5. Verify signal bindings are correct

**Expected Results:**
- Components generated for all nodes
- TypeScript code is valid
- Signal hooks are correctly named
- Execution time < 100ms per component

---

## Scenario 3: Extract to Composite

**Goal:** Test automatic composite extraction with `extract_to_composite`

**Tools Used:**
- `create_cartridge` - Create clustered cartridge
- `extract_to_composite` - Extract cluster to composite
- `validate_cartridge` - Validate both cartridges

**Steps:**
1. Create cartridge with 50 nodes in 5 clusters
2. Use `extract_to_composite` to extract a 10-node cluster
3. Verify composite cartridge generated
4. Verify parent graph healed (composite node added)
5. Verify wires updated correctly
6. Validate both cartridges

**Expected Results:**
- Composite has exactly 10 nodes
- Parent has composite reference node
- Input/output signals detected correctly
- Wires connected to composite node
- Execution time < 500ms

---

## Scenario 4: Global Rename

**Goal:** Test distributed renaming with `refactor_semantics`

**Tools Used:**
- `create_cartridge` - Create multi-cartridge project
- `refactor_semantics` - Rename signal globally

**Steps:**
1. Create 3 interconnected cartridges
2. Create signal registry with shared signals
3. Use `refactor_semantics` to rename a signal
4. Verify signal registry updated
5. Verify all cartridges updated
6. Verify all wires updated

**Expected Results:**
- Signal renamed in registry
- All occurrences in cartridges updated
- All wire signal types updated
- No broken references
- Execution time < 2s

---

## Scenario 5: Scaffold Custom Node

**Goal:** Test custom node scaffolding with `scaffold_node_impl`

**Tools Used:**
- `scaffold_node_impl` - Generate custom node implementation
- `create_cartridge` - Create cartridge using custom node
- `validate_cartridge` - Validate cartridge

**Steps:**
1. Use `scaffold_node_impl` to create `logic-custom` node
2. Verify TypeScript file generated
3. Verify JSDoc comments present
4. Create cartridge using the custom node
5. Validate cartridge

**Expected Results:**
- Implementation file created
- Interface definitions generated
- JSDoc documentation present
- Execution time < 50ms

---

## Scenario 6: Query Topology

**Goal:** Test universal query system with `query_topology`

**Tools Used:**
- `create_cartridge` - Create complex cartridge (100+ nodes)
- `query_topology` - Query subgraphs, nodes, signals

**Steps:**
1. Create cartridge with 100 nodes
2. Use `query_topology` for subgraph (depth 2)
3. Use `query_topology` for subgraph (depth 5)
4. Use `query_topology` for node details
5. Use `query_topology` for signal registry
6. Use `query_topology` for path finding

**Expected Results:**
- Subgraph depth 2 returns correct neighborhood
- Subgraph depth 5 returns extended neighborhood
- Node details include connections
- Path finding returns valid paths
- Depth 2: < 50ms, Depth 5: < 500ms

---

## Scenario 7: Simulate Modification

**Goal:** Test pre-flight validation with `simulate_modification`

**Tools Used:**
- `create_cartridge` - Create test cartridge
- `simulate_modification` - Validate before applying
- `apply_topology_patch` - Apply validated changes

**Steps:**
1. Create cartridge with valid structure
2. Create patch that would cause circular dependency
3. Use `simulate_modification` to detect issue
4. Verify errors detected
5. Fix patch and re-simulate
6. Apply validated patch

**Expected Results:**
- Circular dependency detected in simulation
- Error messages are clear
- Execution trace generated
- Valid patch applies successfully
- Execution time < 1s

---

## Scenario 8: Lint and Fix

**Goal:** Test auto-correction with `lint_and_fix`

**Tools Used:**
- `create_cartridge` - Create broken cartridge
- `lint_and_fix` - Detect and fix issues
- `validate_cartridge` - Verify fixes

**Steps:**
1. Create cartridge with issues:
   - Unregistered signals
   - Duplicate wires
   - Missing node references
2. Use `lint_and_fix` with auto-fix enabled
3. Verify signals registered
4. Verify duplicates removed
5. Validate fixed cartridge

**Expected Results:**
- All issues detected
- Auto-fix applied correctly
- Cartridge valid after fixes
- Execution time < 100ms

---

## Performance Benchmarks

All scenarios must meet the following performance targets:

| Tool | Target (Small) | Target (Large) |
|------|---------------|----------------|
| `apply_topology_patch` | < 200ms | < 2s |
| `generate_ui_binding` | < 100ms | N/A |
| `simulate_modification` | < 1s | < 5s |
| `lint_and_fix` | < 100ms | N/A |
| `scaffold_node_impl` | < 50ms | N/A |
| `refactor_semantics` | < 2s | < 10s |
| `query_topology` | < 50ms (depth 2) | < 500ms (depth 5) |
| `extract_to_composite` | < 500ms | < 3s |

---

## Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run specific scenario
npm run test:e2e -- --grep "Scenario 1"

# Run with coverage
npm run test:e2e -- --coverage
```

---

## Test Data Cleanup

All test scenarios should use the test utilities for cleanup:

```typescript
import { cleanupTestFiles } from '../utils/result-assertions';

afterEach(() => {
  cleanupTestFiles();
});
```

---

**Document Status:** ✅ Complete  
**Phase:** 6 - Integration & Cleanup
