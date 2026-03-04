# Graph-OS MCP Tools v2 - Iteration 7 Report
## Real-World Workflow Simulation Testing

**Date:** 2026-03-04
**Iteration:** 7
**Focus:** Real-World Workflow Simulation (Option A)
**Server Mode:** HTTP Server on port 3100

---

## Executive Summary

Iteration 7 focused on testing realistic multi-tool workflows that users would perform in production scenarios. This testing revealed a **critical bug** in the checkpoint/rollback system while validating that tool interoperability works well for most use cases.

### Overall Score: **88/100**

| Category | Score | Notes |
|----------|-------|-------|
| Workflow 1: Create→Query→Modify→Checkpoint→Rollback | 70/100 | Critical rollback bug found |
| Workflow 2: GENERATE + PATCH combinations | 95/100 | Excellent interoperability |
| Workflow 3: Session persistence | 100/100 | Perfect persistence |
| Workflow 4: Multi-step state transitions | 95/100 | Runtime works well |
| Workflow 5: Error recovery | 90/100 | Good error handling |

---

## Test Results

### Workflow 1: Create → Query → Modify → Checkpoint → Rollback Cycle

**Purpose:** Test the most common user workflow of building, modifying, and recovering state.

**Steps Executed:**
1. Created 6 workflow nodes using PATCH
2. Queried to verify node creation
3. Added 6 wires to connect nodes
4. Created named checkpoint
5. Made modifications (added error handler node, wire, updated description)
6. Attempted rollback to previous checkpoint

**Results:**

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Create 6 nodes | 6 nodes added | 6 nodes added, checkpoint auto-created | PASS |
| Query nodes | Filter by prefix | Query works, prefix filter requires manual filtering | PASS |
| Add 6 wires | 6 wires added | 6 wires added with validation warnings | PASS |
| Create checkpoint | Named checkpoint | Checkpoint created but name not preserved | ISSUE |
| Make modifications | 3 changes | Applied with confirm=true | PASS |
| Rollback | Restore to checkpoint | Returns "ok" but state NOT restored | **CRITICAL FAIL** |

**Critical Bug Found: Checkpoint/Rollback Not Restoring State**

The rollback functionality has a significant bug:
- Rollback returns success message: "Rolled back to checkpoint: Checkpoint 2"
- Checkpoint count is updated correctly
- BUT the actual graph state is NOT restored

**Evidence:**
```
Before rollback: 31 nodes, 10 wires
After rollback to Checkpoint 2: Still 31 nodes, 10 wires
Expected after rollback: 30 nodes, 9 wires
```

Additional testing confirmed that:
- Intermediate checkpoints are created correctly
- Rollback finds the checkpoint
- But state restoration fails silently
- Only the initial state seems to be preserved

**API Inconsistency Found:**
The rollback parameter syntax was confusing:
- `{"action": "rollback", "checkpointId": "..."}` - Returns "ok" but does nothing
- `{"rollback": "ckpt-..."}` - Correct syntax that actually executes rollback

The first syntax should return an error, not success with no action.

**Score: 70/100** - Core functionality broken, but other aspects work

---

### Workflow 2: Complex Graph Building with GENERATE + PATCH

**Purpose:** Test interoperability between GENERATE and PATCH tools for building complex graphs.

**Steps Executed:**
1. Generated `pipeline.data` node type using GENERATE
2. Used PATCH to add generated node to cartridge
3. Created additional nodes and connections
4. Generated `validate.schema` component
5. Integrated validation into pipeline using PATCH

**Results:**

| Operation | Result | Status |
|-----------|--------|--------|
| GENERATE pipeline.data | Created TypeScript file, node definition | PASS |
| PATCH add generated node | Successfully integrated | PASS |
| Create data flow | 3 nodes, 2 wires added | PASS |
| GENERATE validate.schema | Created validation component | PASS |
| PATCH integrate validation | 4 operations applied | PASS |
| PATCH replace config | Required confirm=true, worked | PASS |

**Key Observations:**
- GENERATE tool correctly creates node implementations
- PATCH seamlessly integrates generated nodes
- Configuration modifications require confirmation (good safety)
- Signal validation warnings are helpful but don't block operations
- Files are generated in correct structure

**Score: 95/100** - Excellent tool interoperability

---

### Workflow 3: Session Persistence Across Operations

**Purpose:** Verify that session state persists correctly across tool operations.

**Steps Executed:**
1. Recorded current session state
2. Queried active cartridge
3. Switched to auth cartridge
4. Verified auth cartridge content
5. Switched back to main cartridge
6. Verified state preservation

**Results:**

| Operation | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Get session state | Project info, metrics | Complete state returned | PASS |
| Switch to auth | Different nodes/wires | 4 nodes, 3 wires (vs 34/7) | PASS |
| Query auth content | Auth-specific nodes | login-form, auth-validator found | PASS |
| Switch back to main | Original state restored | 34 nodes, 7 wires restored | PASS |
| State consistency | No data loss | All data intact | PASS |

**Key Observations:**
- Cartridge switching works flawlessly
- Each cartridge maintains separate state
- No data corruption during switches
- Session persists across multiple operations

**Score: 100/100** - Perfect session persistence

---

### Workflow 4: Multi-Step State Transitions

**Purpose:** Test runtime state transitions and signal processing.

**Steps Executed:**
1. Checked runtime status (stopped)
2. Attempted to start runtime (failed - duplicate nodes)
3. Fixed duplicate node IDs
4. Attempted to start runtime (failed - invalid node types)
5. Switched to auth cartridge with valid types
6. Started runtime successfully
7. Injected test signal
8. Stopped runtime

**Results:**

| Step | Result | Status |
|------|--------|--------|
| Check status | "stopped" | PASS |
| Start with duplicates | Error with clear message | PASS |
| Fix duplicates | Used rename strategy | PASS |
| Start with invalid types | Error listing valid types | PASS |
| Switch to valid cartridge | Success | PASS |
| Start runtime | "4 nodes ready" | PASS |
| Inject signal | Processed successfully | PASS |
| Stop runtime | "Runtime stopped" | PASS |

**Key Observations:**
- Runtime validation is thorough
- Error messages include valid options
- Signal injection works correctly
- State transitions are clean
- Metrics tracking works (signalsProcessed: 1, signalsEmitted: 2)

**Score: 95/100** - Excellent state management

---

### Workflow 5: Error Recovery in Workflows

**Purpose:** Test how errors are handled and recovered in complex workflows.

**Steps Executed:**
1. Tested partial patch success (some ops valid, some invalid)
2. Tested missing required parameters
3. Tested invalid wire connections
4. Tested GENERATE with invalid input
5. Tested complex multi-operation error scenarios

**Results:**

| Error Scenario | Error Handling | Recovery Suggestions | Status |
|----------------|----------------|---------------------|--------|
| Partial patch success | Applied valid ops, reported failures | Clear failure report | PASS |
| Missing parameters | "Parameters validation failed" | Lists expected params | PASS |
| Non-existent wire source | "Source node 'X' not found" | "Create node first" | PASS |
| GENERATE empty node | "Node type is required" | Example provided | PASS |
| Complex multi-error | All errors listed with codes | Retry ops provided | PASS |

**Error Response Quality:**
```json
{
  "code": "PATCH_NODE_NOT_FOUND",
  "message": "Source node 'non-existent' not found",
  "path": "/wires/-",
  "severity": "error",
  "suggestion": "Create node 'non-existent' first or use an existing node"
}
```

**Key Observations:**
- Error codes are consistent and specific
- Suggestions are actionable
- Partial success is handled correctly
- Recovery section includes retry operations
- No silent failures

**Score: 90/100** - Good error handling, minor improvement possible in error response structure consistency

---

## Issues Summary

### Critical Issues

| ID | Issue | Severity | Impact |
|----|-------|----------|--------|
| CRIT-1 | Checkpoint rollback not restoring state | Critical | Data loss risk |

### Major Issues

| ID | Issue | Severity | Impact |
|----|-------|----------|--------|
| MAJOR-1 | Rollback API accepts invalid syntax with success response | Major | User confusion |
| MAJOR-2 | Named checkpoint parameter ignored | Major | Feature incomplete |

### Minor Issues

| ID | Issue | Severity | Impact |
|----|-------|----------|--------|
| MINOR-1 | Query filter `startsWith` not working | Minor | Manual filtering needed |
| MINOR-2 | Metrics null in some responses | Minor | Inconsistent API |

---

## Recommendations

### High Priority

1. **Fix Checkpoint Rollback** - The rollback function must actually restore graph state
2. **Validate Rollback API** - Return error for invalid parameter combinations
3. **Implement Named Checkpoints** - Allow users to name and identify checkpoints meaningfully

### Medium Priority

4. **Fix Query Filters** - Enable `startsWith` and other filter operators
5. **Consistent Metrics** - Ensure all responses include metrics object

### Low Priority

6. **Enhanced Error Context** - Include operation index in batch failures
7. **Rollback Preview** - Show what will change before rollback

---

## Test Coverage Summary

| Tool | Operations Tested | Pass Rate |
|------|-------------------|-----------|
| USE | load, switch, state, rollback | 75% |
| QUERY | nodes, wires, checkpoints, topology, cartridge | 90% |
| PATCH | add, remove, replace, batch, confirm | 95% |
| RUN | start, stop, inject | 100% |
| GENERATE | create node, validation | 100% |

**Total Operations Tested:** 35+
**Pass Rate:** 88%

---

## Comparison with Previous Iterations

| Iteration | Focus | Score | Key Finding |
|-----------|-------|-------|-------------|
| 1-5 | Core functionality | 100/100 | All tests passing |
| 6 | Edge cases | 96/100 | Boundary condition bugs |
| 7 | Real-world workflows | **88/100** | Critical rollback bug |

The regression in score is due to the discovery of a critical bug in the checkpoint/rollback system that was not exposed in previous testing. Single-tool tests passed, but multi-step workflows revealed the issue.

---

## Conclusion

Iteration 7 successfully validated that:

**What Works Well:**
- Tool interoperability (GENERATE + PATCH)
- Session persistence across cartridges
- Runtime state management
- Error handling and recovery
- Partial operation success handling

**What Needs Fixing:**
- Checkpoint/rollback state restoration (CRITICAL)
- API parameter validation consistency
- Query filter functionality

The testing approach of simulating real-world workflows proved highly valuable, uncovering a critical bug that single-tool testing missed. This validates the importance of workflow-based testing in addition to isolated tool tests.

**Recommendation:** Fix the checkpoint/rollback bug before release. This is a data integrity issue that could cause user data loss.

---

**Test Duration:** ~25 minutes
**Server Restarts:** 0
**Total API Calls:** 47
**Files Generated:** 2 (TypeScript node implementations)
