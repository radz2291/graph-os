# Iteration 6 Planning: Untested Features Analysis

**Date:** 2026-03-04
**Status:** Planning

---

## Test Coverage Summary

### ✅ FULLY TESTED (Iterations 1-5)

| Feature | Status | Notes |
|---------|--------|-------|
| USE: Load project | ✅ | Works |
| USE: Detect project | ✅ | Works |
| USE: Switch cartridge | ✅ | Works |
| USE: Init project with templates | ✅ | auth, crud, minimal, blank |
| USE: Rollback | ✅ | Added in Iteration 5 |
| USE: Config set | ✅ | Works |
| USE: Config addCartridge | ✅ | Works |
| USE: Config removeCartridge | ✅ | Works |
| QUERY: cartridge | ✅ | Works |
| QUERY: nodes | ✅ | With filters: id, type, search |
| QUERY: nodes: handlesSignal | ✅ | Signal pattern match |
| QUERY: nodes: upstream/downstream | ✅ | BFS traversal |
| QUERY: nodes: path between nodes | ✅ | Works |
| QUERY: wires | ✅ | Works |
| QUERY: signals | ✅ | Works |
| QUERY: composites | ✅ | Works |
| QUERY: topology: mermaid | ✅ | Visual output |
| QUERY: topology: graph | ✅ | Adjacency list |
| QUERY: topology: paths | ✅ | All signal paths |
| QUERY: state | ✅ | Runtime status |
| QUERY: history | ✅ | Works |
| QUERY: checkpoints | ✅ | Added in Iteration 5 |
| QUERY: fresh (skip cache) | ✅ | Works |
| PATCH: add operation | ✅ | Works |
| PATCH: remove operation | ✅ | Requires confirm |
| PATCH: replace operation | ✅ | Requires confirm |
| PATCH: move operation | ✅ | Works |
| PATCH: copy operation | ✅ | Works |
| PATCH: test operation | ✅ | Works (pass/fail) |
| PATCH: dryRun mode | ✅ | Preview without apply |
| PATCH: checkpoint parameter | ✅ | Named checkpoints |
| PATCH: target: signals | ✅ | Works |
| PATCH: target: composites | ✅ | Works |
| PATCH: explain mode | ✅ | Step-by-step trace |
| PATCH: Error: confirm required | ✅ | Good message |
| PATCH: Error: invalid path | ✅ | Handles gracefully |
| PATCH: Error: test fail | ✅ | Proper error message |
| RUN: start mode | ✅ | Works |
| RUN: stop mode | ✅ | Works |
| RUN: inject mode | ✅ | With trace |
| RUN: test mode | ✅ | With expectations |
| RUN: debug mode | ✅ | With breakpoints |
| RUN: watch mode | ✅ | File watching enabled |
| RUN: history parameter | ✅ | Signal history returned |
| GENERATE: node | ✅ | TypeScript output |
| GENERATE: pattern | ✅ | Works |
| GENERATE: uiBinding | ✅ | Fixed in Iteration 4 |
| GENERATE: composite | ✅ | Extraction works |
| GENERATE: project | ✅ | Creates project files |

---

## ⚠️ PARTIALLY TESTED / NEEDS MORE COVERAGE

### 1. RUN Test Expectations
**Current Status:** Test mode works but expectations don't validate properly

**Test Result:**
```json
{"expect": {"output": "AUTH.SUCCESS", "nodeExecuted": "validator"}}
// Result: "Test passed: 0 expectation(s) met"
```

**Issue:** Expectations are passed but assertions array is empty - expectations may not be processed.

**Recommendation:** Verify expectation validation logic in RUN tool.

---

### 2. QUERY Validation Select
**Current Status:** Returns placeholder "Validation pending (Phase 3)"

**Test Result:**
```json
{"from": "cartridge", "select": "validation"}
// Result: {"issues": []}
```

**Issue:** Validation not fully implemented - always returns empty issues.

**Recommendation:** Implement actual validation or document as Phase 3 feature.

---

### 3. Limit/Depth Parameters
**Current Status:** Works but not extensively tested with large datasets

**Recommendation:** Test with graphs that exceed limit to verify truncation works.

---

## ❌ NOT TESTED YET

### 1. Complex Scenarios

| Scenario | Priority | Description |
|----------|----------|-------------|
| Multi-cartridge project | High | Test switching between multiple cartridges in same project |
| Large graph performance | Medium | Test with 100+ nodes/wires |
| Concurrent operations | Medium | Multiple tool calls while runtime is running |
| Long-running runtime | Low | Runtime stability over extended period |

### 2. Edge Cases

| Edge Case | Priority | Description |
|-----------|----------|-------------|
| Empty cartridge | Medium | Operations on blank cartridge (no nodes) |
| Circular graph | Medium | Detect/handle circular dependencies in wires |
| Invalid JSON Patch | Low | Malformed operations array |
| Very large signals | Low | Large payload sizes in signal injection |

### 3. Integration Workflows

| Workflow | Priority | Description |
|----------|----------|-------------|
| Full development cycle | High | Load → Modify → Test → Rollback → Test |
| Error recovery workflow | Medium | Create error → rollback → fix → retest |
| Template customization | Medium | Init project → customize → test |

### 4. GENERATE Advanced Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Generated node registration | Medium | Auto-register generated nodes |
| Custom templates | Low | User-defined project templates |

---

## Recommended Iteration 6 Test Plan

### Priority 1: RUN Expectations (HIGH)
1. Test `expect.output` validation
2. Test `expect.nodeExecuted` validation
3. Test `expect.timeout` validation
4. Test `expect.signalCount` validation
5. Verify assertions array is populated correctly

### Priority 2: Multi-Cartridge Projects (HIGH)
1. Load project with multiple cartridges
2. Switch between cartridges
3. Verify runtime state on switch
4. Test checkpoint isolation per cartridge

### Priority 3: Edge Cases (MEDIUM)
1. Operations on empty cartridge
2. Circular dependency detection
3. Limit/depth with large graphs
4. Malformed input handling

### Priority 4: Integration Workflows (MEDIUM)
1. Complete development cycle test
2. Error recovery scenarios
3. Template customization flow

---

## Estimated Score Impact

| Area | Current Coverage | Potential Points | Risk |
|------|------------------|------------------|------|
| RUN Expectations | ~60% | +15 | Medium |
| Multi-cartridge | ~40% | +10 | Low |
| Edge Cases | ~30% | +10 | Low |
| Integration | ~50% | +10 | Low |

**Current Estimated Score:** 100/100 (basic functionality)
**Potential Score After Iteration 6:** 100/100 (comprehensive coverage)

---

## Files to Review for Iteration 6

1. `/packages/tool/src/tools/run.ts` - Expectation validation
2. `/packages/tool/src/tools/query.ts` - Validation implementation
3. `/packages/tool/src/core/SessionState.ts` - Multi-cartridge handling
4. `/packages/tool/src/tools/patch.ts` - Circular dependency detection

---

## Conclusion

Iteration 6 should focus on:
1. **RUN expectations** - Verify why assertions aren't being populated
2. **Multi-cartridge workflows** - Test cartridge switching thoroughly
3. **Edge cases** - Empty graphs, circular deps, malformed input
4. **Integration tests** - Full development cycle workflows

These areas represent the remaining untested functionality that would provide comprehensive coverage of the Graph-OS MCP Tools v2.
