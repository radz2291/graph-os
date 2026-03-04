# Graph-OS MCP Tools - Test Matrix

**Version:** 2.0.0  
**Last Updated:** Phase 3 Implementation

---

## Overview

This document defines the comprehensive test matrix for all 20 MCP tools in Graph-OS v2.0.0. Each tool has defined test cases, edge cases, and performance benchmarks.

---

## Tool Categories

| Category | Tools Count | Tools |
|----------|-------------|-------|
| Accelerator | 1 | apply_topology_patch |
| Bridge | 1 | generate_ui_binding |
| Safety | 2 | simulate_modification, lint_and_fix |
| Architecture | 10 | create_cartridge, validate_cartridge, run_cartridge, visualize_cartridge, create_signal, list_signals, get_signal, remove_signal, scaffold_project, bundle_project |
| Composite | 2 | create_composite, list_composites |
| Testing | 3 | test_scenario, verify_node, snapshot_regression |

---

## Accelerator Tools

### apply_topology_patch

**Test Cases:**
| ID | Test Case | Input | Expected Output |
|----|-----------|-------|-----------------|
| ATP-01 | Add single node | nodes: [{ id: 'new', type: 'logic.transform' }] | success: true, nodesAdded: 1 |
| ATP-02 | Add multiple nodes | nodes: [node1, node2, node3] | success: true, nodesAdded: 3 |
| ATP-03 | Update existing node | nodes: [{ id: 'existing', config: { new: true } }] | success: true, nodesUpdated: 1 |
| ATP-04 | Remove node | operations: [{ type: 'remove', target: 'node', id: 'old' }] | success: true, nodesRemoved: 1 |
| ATP-05 | Add wire | wires: [{ from: 'a', to: 'b', signalType: 'TEST.SIGNAL' }] | success: true, wiresAdded: 1 |
| ATP-06 | Remove wire | operations: [{ type: 'remove', target: 'wire', data: wire }] | success: true, wiresRemoved: 1 |
| ATP-07 | Merge strategy: merge | mergeStrategy: 'merge' | Conflicts resolved with merge |
| ATP-08 | Merge strategy: replace | mergeStrategy: 'replace' | Full cartridge replaced |
| ATP-09 | Merge strategy: overlay | mergeStrategy: 'overlay' | Additive only |
| ATP-10 | Merge strategy: atomic | mergeStrategy: 'atomic' | All or nothing |
| ATP-11 | Conflict resolution: preserve-existing | conflictResolution: 'preserve-existing' | Existing values kept |
| ATP-12 | Conflict resolution: use-patch | conflictResolution: 'use-patch' | Patch values used |
| ATP-13 | Snapshot creation | createSnapshot: true | snapshotPath returned |
| ATP-14 | Rollback on error | rollbackOnError: true | Cartridge restored on failure |
| ATP-15 | Validation before apply | validateBeforeApply: true | Validation errors reported |

**Edge Cases:**
- Empty cartridge
- Cartridge with 1000+ nodes
- Duplicate node IDs
- Missing cartridge file
- Invalid JSON in cartridge

**Performance Benchmarks:**
- Small cartridge (< 10 nodes): < 200ms
- Medium cartridge (10-100 nodes): < 500ms
- Large cartridge (100+ nodes): < 2s

---

## Bridge Tools

### generate_ui_binding

**Test Cases:**
| ID | Test Case | Input | Expected Output |
|----|-----------|-------|-----------------|
| GUI-01 | Generate control-input | componentType: 'control-input' | Input component generated |
| GUI-02 | Generate control-display | componentType: 'control-display' | Display component generated |
| GUI-03 | Generate logic-validator | componentType: 'logic-validator' | Validator component generated |
| GUI-04 | Generate generic | componentType: 'generic' | Generic component generated |
| GUI-05 | Include hooks | includeHooks: true | Hooks file generated |
| GUI-06 | Include types | includeTypes: true | Types file generated |
| GUI-07 | Custom component name | componentName: 'MyComponent' | Named 'MyComponent' |
| GUI-08 | Extract signals | - | Signal inputs/outputs extracted |

**Edge Cases:**
- Node not found
- No wires connected to node
- Missing output directory
- Invalid node type

**Performance Benchmarks:**
- Single component: < 100ms

---

## Safety Tools

### simulate_modification

**Test Cases:**
| ID | Test Case | Input | Expected Output |
|----|-----------|-------|-----------------|
| SM-01 | Simulate without patch | cartridgePath only | Current state validated |
| SM-02 | Simulate with patch | patch: { nodes, wires } | Patch simulated |
| SM-03 | Detect circular deps | detectCircularDeps: true | circularDependencies returned |
| SM-04 | Detect type mismatches | detectTypeMismatches: true | typeMismatches returned |
| SM-05 | Run scenario | scenarios: [{ inputSignal, expectedSignals }] | Scenario results |
| SM-06 | Execution trace | includeExecutionTrace: true | executionTrace returned |
| SM-07 | Signal flow graph | includeSignalFlow: true | signalFlow returned |
| SM-08 | Performance metrics | includePerformanceMetrics: true | performanceMetrics returned |
| SM-09 | Timeout handling | timeoutMs: 1000 | Timeout handled gracefully |
| SM-10 | Validate constraints | validateConstraints: true | Constraint errors reported |

**Edge Cases:**
- Empty cartridge
- Cartridge with cycles
- Missing signal registry
- Timeout during simulation
- Unknown node types

**Performance Benchmarks:**
- Simple cartridge (< 10 nodes): < 1s
- Complex cartridge (10-100 nodes): < 5s

### lint_and_fix

**Test Cases:**
| ID | Test Case | Input | Expected Output |
|----|-----------|-------|-----------------|
| LAF-01 | Lint signals | checkCategories: ['signals'] | Signal issues detected |
| LAF-02 | Lint wires | checkCategories: ['wires'] | Wire issues detected |
| LAF-03 | Lint nodes | checkCategories: ['nodes'] | Node issues detected |
| LAF-04 | Lint composites | checkCategories: ['composites'] | Composite issues detected |
| LAF-05 | Lint registry | checkCategories: ['registry'] | Registry issues detected |
| LAF-06 | Lint all | checkCategories: ['all'] | All issues detected |
| LAF-07 | Auto-fix: safe | fixCategory: 'safe' | Safe fixes applied |
| LAF-08 | Auto-fix: aggressive | fixCategory: 'aggressive' | Maximum fixes applied |
| LAF-09 | Auto-fix: conservative | fixCategory: 'conservative' | Minimal fixes applied |
| LAF-10 | Auto-register signals | autoRegisterSignals: true | Missing signals registered |
| LAF-11 | Deduplicate wires | deduplicateWires: true | Duplicate wires removed |
| LAF-12 | Explain fixes | explainFixes: true | Fix explanations returned |

**Edge Cases:**
- Empty cartridge
- Cartridge with all issues
- Missing signal registry
- Circular dependencies
- Broken references

**Performance Benchmarks:**
- All cartridges: < 100ms

---

## Architecture Tools

### create_cartridge

**Test Cases:**
- Create empty cartridge
- Create with nodes
- Create with wires
- Invalid name format
- Missing output path

**Performance:** < 50ms

### validate_cartridge

**Test Cases:**
- Valid cartridge
- Missing nodes
- Missing wires
- Invalid version
- Circular dependencies

**Performance:** < 200ms

### run_cartridge

**Test Cases:**
- Run with input signal
- Run without input
- Interactive mode
- Missing cartridge
- Invalid signal

**Performance:** < 100ms for signal processing

### create_signal

**Test Cases:**
- Valid signal creation
- Invalid signal format
- Duplicate signal
- Missing registry

**Performance:** < 50ms

---

## Testing Tools

### test_scenario

**Test Cases:**
- Run scenario with expected signals
- Run scenario with timeout
- Run scenario with unexpected signals
- Missing cartridge

**Performance:** < 5s for complex scenarios

### verify_node

**Test Cases:**
- Verify transform node
- Verify validate node
- Verify with expected output
- Verify error handling

**Performance:** < 5ms per node

### snapshot_regression

**Test Cases:**
- Create baseline
- Compare with baseline
- Update baseline
- Detect changes

**Performance:** < 1s

---

## Test Fixtures

| Fixture | Description | Use Case |
|---------|-------------|----------|
| empty.cartridge.json | Empty cartridge | Edge case testing |
| single-node.cartridge.json | One node, no wires | Minimal testing |
| simple-flow.cartridge.json | 4 nodes, 3 wires | Flow testing |
| complex-flow.cartridge.json | 8 nodes, 9 wires | Complex scenarios |
| broken.cartridge.json | Intentional issues | lint_and_fix testing |
| circular-deps.cartridge.json | Circular dependencies | Cycle detection |
| test-signals.json | Signal registry | Type validation |

---

## CI/CD Test Commands

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run performance benchmarks
npm run test:performance

# Run with coverage
npm run test:coverage
```

---

## Test Coverage Goals

| Category | Target Coverage |
|----------|-----------------|
| Core logic | 100% |
| Tool execution | 90% |
| Error handling | 95% |
| Edge cases | 80% |

---

**Document Status:** Complete  
**Version:** 2.0.0  
**Last Updated:** Phase 3 Implementation
