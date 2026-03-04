# AI Usability Test Report - Iteration 3

## Metadata

| Field | Value |
|-------|-------|
| **Iteration Number** | 3 |
| **Date** | 2024-03-04 |
| **Agent Model** | Claude (acting as blind test agent) |
| **Session Type** | HTTP Server testing |
| **Time Spent** | ~30 minutes |

---

## Constraint Compliance

- [x] I did NOT read any source code files in `/src/` for understanding behavior
- [x] I did NOT read any test files
- [x] I did NOT inspect fixture files directly (only loaded via tools)
- [x] I did NOT read internal docs (plan/, spec/, testing/, knowledge/, system-prompt/)
- [x] I only used allowed documentation (README.md, decisions.md, guides/)
- [x] I completed all actions using only the tools and docs

---

## Score Summary

| Category | Points Earned | Max Points |
|----------|---------------|------------|
| USE Tool | 6 | 6 |
| QUERY Tool | 6 | 10 |
| PATCH Tool | 10 | 10 |
| RUN Tool | 6 | 6 |
| GENERATE Tool | 6 | 6 |
| Error Recovery | 10 | 10 |
| Documentation | 12 | 12 |
| Task Completion | 32 | 40 |
| **TOTAL** | **88** | **100** |

**Result:** PASS (88/100)

**Total Tool Invocations:** 35+

---

## Test Focus: Phases A, B, C, D

This iteration focused on advanced and untested tool paths:

### Phase A: PATCH Advanced Operations
| Operation | Tested | Result |
|-----------|--------|--------|
| `op: 'copy'` | ✅ | Works - duplicates nodes |
| `op: 'move'` | ✅ | Works - reorders nodes |
| `op: 'test'` | ✅ | Works - conditional validation |
| `target: 'signals'` | ✅ | Works - modifies signal registry |
| Wire removal (by index) | ✅ | Works |
| Named checkpoints | ✅ | Works - creates named restore points |

### Phase B: RUN Full Workflow
| Mode | Tested | Result |
|------|--------|--------|
| `mode: 'start'` with timeout | ✅ | Works - timeout parameter accepted |
| `mode: 'inject'` | ✅ | Works - signal injection successful |
| `mode: 'debug'` with trace | ⚠️ | Partial - mode works but trace empty |
| `mode: 'test'` with expect | ⚠️ | Partial - assertions work but signals don't propagate |
| `mode: 'watch'` | ✅ | Works - starts file watching |
| `mode: 'stop'` | ✅ | Works - stops runtime |
| `history: true` | ❌ | Not working - signalHistory always null |

### Phase C: GENERATE Remaining
| Generator | Tested | Result |
|-----------|--------|--------|
| `uiBinding` (React) | ✅ | Works - generates TypeScript hooks |
| `uiBinding` (Vue) | ⚠️ | Partial - returns TODO placeholder |
| `uiBinding` (Svelte) | Not tested | - |
| `composite` extraction | ✅ | Works - extracts nodes to composite |
| `project` (from iter 2) | ✅ | Fixed - now writes files to disk |

### Phase D: QUERY Advanced
| Feature | Tested | Result |
|---------|--------|--------|
| `from: 'composites'` | ✅ | Works - returns composite list |
| `select: 'paths'` on topology | ❌ | Not working - returns summary only |
| `select: 'graph'` on topology | ❌ | Not working - returns summary only |
| `where.upstream` | ❌ | Not working - returns all nodes |
| `where.downstream` | ❌ | Not working - returns all nodes |
| `where.path` | ❌ | Not working - returns all nodes |
| `where.handlesSignal` | ❌ | Not working - returns all nodes |
| `limit` parameter | ❌ | Not working - ignores limit |
| `depth` parameter | ❌ | Not working - no visible effect |

---

## Issues Found

### Critical Issues (Blocked my progress)

None in this iteration.

### High Priority Issues (Significantly impacted experience)

#### Issue 1: QUERY Where Filters Not Working
- **Description:** Advanced where filters (upstream, downstream, path, handlesSignal) don't filter results
- **When:** Testing QUERY with where parameters
- **Expected:** Filtered results based on where clause
- **Actual:** Returns all nodes regardless of filter
- **Impact:** Cannot trace signal paths or find connected nodes
- **Suggestion:** Implement filter logic in query tool

#### Issue 2: RUN Trace and History Not Working
- **Description:** `trace: true` and `history: true` parameters don't return data
- **When:** Testing RUN debug mode and signal injection
- **Expected:** Array of trace steps or signal history
- **Actual:** Empty trace array, null signalHistory
- **Impact:** Cannot debug signal flow or view execution history
- **Suggestion:** Implement trace collection in runtime execution

### Medium Priority Issues (Minor friction)

#### Issue 3: QUERY Select Options Ignored
- **Description:** `select: 'paths'` and `select: 'graph'` return summary instead of detailed format
- **When:** Testing QUERY topology with advanced selects
- **Expected:** Paths array or adjacency list graph
- **Actual:** Returns `{ nodes: X, wires: Y }` summary
- **Suggestion:** Implement proper select handling for topology

#### Issue 4: QUERY Limit Parameter Ignored
- **Description:** `limit: 3` still returns all nodes
- **When:** Testing QUERY with limit
- **Expected:** Only 3 nodes returned
- **Actual:** All 13 nodes returned
- **Suggestion:** Implement result limiting

#### Issue 5: Vue UI Bindings Not Implemented
- **Description:** `framework: 'vue'` returns placeholder "// TODO: Generate vue bindings"
- **When:** Testing GENERATE uiBinding with Vue
- **Expected:** Generated Vue composables
- **Actual:** Placeholder comment only
- **Suggestion:** Implement Vue binding generation

---

## What Worked Well

### 1. PATCH Advanced Operations
All RFC 6902 operations work correctly:
```
copy  → duplicates nodes/wires
move  → reorders nodes/wires
test  → conditional validation passes/fails
```

### 2. Named Checkpoints
Clear checkpoint naming for rollback:
```json
{
  "id": "ckpt-1772599681750-7nwhmi52u",
  "name": "named-checkpoint-test",
  "timestamp": "2026-03-04T04:48:01.750Z"
}
```

### 3. GENERATE uiBinding (React)
Generates useful TypeScript hooks:
```typescript
export type LoginFormSignal = "AUTH.LOGIN" | "AUTH.SUCCESS" | "AUTH.FAILURE";

export function useLoginFormSignals() {
  const signals = useSignal('AUTH.LOGIN'), ...
  return { 'AUTH.LOGIN': signals[0], ... };
}
```

### 4. GENERATE Composite Extraction
Extracts nodes with helpful nextActions:
```json
{
  "summary": "Extracted composite: validation-block",
  "files": [{ "path": "composites/validation-block.composite.json" }],
  "nextActions": [{
    "action": "patch",
    "description": "Reference the composite in cartridge",
    "params": { "ops": [{ "op": "add", "path": "/composites/-", ... }] }
  }]
}
```

### 5. RUN Complete Workflow
The start → inject → stop cycle works smoothly:
```
Start: "Runtime started: 4 nodes ready"
Inject: "Signal AUTH.LOGIN processed"
Stop: "Runtime stopped"
```

---

## Tool-by-Tool Feedback

### USE Tool
- **Discoverability:** Easy
- **Usability:** Easy
- **Issues:** None
- **Suggestions:** None

### QUERY Tool
- **Discoverability:** Easy
- **Usability:** Medium - some filters don't work
- **Issues:** where filters, limit, depth, select: 'paths'/'graph' not working
- **Suggestions:** Implement missing filter logic

### PATCH Tool
- **Discoverability:** Medium - RFC 6902 needs learning
- **Usability:** Easy once syntax understood
- **Issues:** None in this iteration
- **Suggestions:** None

### RUN Tool
- **Discoverability:** Medium - multiple modes
- **Usability:** Medium - trace/history missing
- **Issues:** trace and history parameters don't return data
- **Suggestions:** Implement trace collection

### GENERATE Tool
- **Discoverability:** Easy
- **Usability:** Easy
- **Issues:** Vue bindings not implemented
- **Suggestions:** Complete Vue/Svelte generators

---

## Documentation Feedback

### Documentation that was helpful:
- `tool-reference.md` - Detailed PATCH operation examples (from iter 1)
- `patterns.md` - Built-in pattern names

### Documentation that was missing:
- Detailed explanation of where filter syntax and expected behavior
- RUN trace/history expected output format
- Which QUERY select options are actually supported

### Suggestions for documentation:
- Mark unimplemented features clearly in docs
- Add expected output examples for each where filter type
- Document which RUN modes support which parameters

---

## Overall Experience

### Rating: 8.5/10

### One sentence summary:
Core functionality works well, but advanced QUERY filters and RUN tracing need implementation.

### What was the best part?
PATCH advanced operations (copy, move, test) all work correctly with good explain mode.

### What was the most frustrating part?
QUERY filters being silently ignored instead of returning errors or filtered results.

### Would you recommend this to another AI/developer?
- [x] Yes, with some reservations

**Why:**
Solid foundation, good documentation, but some advertised features (filters, tracing) don't work yet.

---

## Top 3 Recommendations

### 1. Fix QUERY Where Filters
**Why:** Critical for signal path tracing and node discovery
**How:** Implement filter logic for upstream, downstream, path, handlesSignal

### 2. Implement RUN Trace and History
**Why:** Essential for debugging signal flow
**How:** Collect execution steps during runtime and return in trace/history fields

### 3. Implement QUERY Limit and Select Options
**Why:** Basic functionality that's documented but not working
**How:** Add result slicing for limit, implement paths/graph select formats

---

## Checklist Submission

### USE Tool - 6 points

- [x] Load an existing project
- [x] Check current state
- [x] Switch to a different cartridge

### QUERY Tool - 6/10 points

- [x] Query nodes
- [x] Query wires
- [x] Query signals
- [x] Query topology with mermaid
- [x] Query from: 'composites'
- [ ] Query with working where filter (not working)
- [ ] Query select: 'paths' (not working)
- [ ] Query select: 'graph' (not working)
- [ ] Query with working limit (not working)
- [ ] Query upstream/downstream (not working)

**Note:** -4 points for non-working advanced features.

### PATCH Tool - 10 points

- [x] Add a node
- [x] Add a wire
- [x] Use dry-run before change
- [x] Add multiple nodes in batch
- [x] Replace a value
- [x] Remove with confirm
- [x] Use explain mode
- [x] op: 'copy' (new in iter 3)
- [x] op: 'move' (new in iter 3)
- [x] op: 'test' (new in iter 3)
- [x] target: 'signals' (new in iter 3)
- [x] Named checkpoints (new in iter 3)

### RUN Tool - 6 points

- [x] mode: 'start' with timeout (new in iter 3)
- [x] mode: 'inject' (verified in iter 3)
- [x] mode: 'debug' (new in iter 3)
- [x] mode: 'test' with expect (new in iter 3)
- [x] mode: 'watch' (new in iter 3)
- [x] mode: 'stop' (verified in iter 3)

**Note:** trace and history don't return data but modes work.

### GENERATE Tool - 6 points

- [x] Generate a node template
- [x] Generate with template option
- [x] Generate a built-in pattern
- [x] Generate a project (writes files now)
- [x] Generate with project template
- [x] Generate uiBinding (React) - new in iter 3
- [x] Generate composite - new in iter 3

### Error Recovery - 10 points

- [x] Triggered SESSION_NOT_INITIALIZED error
- [x] Read and understood error messages
- [x] Successfully recovered
- [x] Error messages include helpful suggestions

### Documentation - 12 points

- [x] Read all allowed documentation
- [x] Found information needed
- [x] Docs well organized
- [x] Docs use clear language

---

## Comparison with Previous Iterations

| Metric | Iteration 1 | Iteration 2 | Iteration 3 | Change |
|--------|-------------|-------------|-------------|--------|
| Score | 84/100 | 88/100 | 88/100 | = |
| Tool Invocations | 25+ | 18+ | 35+ | +17 |
| Critical Issues | 1 | 1 | 0 | -1 |
| High Issues | 2 | 2 | 2 | = |
| Medium Issues | 2 | 2 | 3 | +1 |

### Progress Since Iteration 2:
1. ✅ GENERATE now writes files to disk (from iter 2 fix)
2. ✅ PATCH remove by node ID works (from iter 2 fix)
3. ✅ PATCH advanced operations (copy, move, test) all work
4. ✅ RUN complete workflow verified
5. ✅ GENERATE uiBinding and composite work

### New Issues Found:
1. ❌ QUERY where filters not implemented
2. ❌ RUN trace/history not returning data
3. ❌ QUERY select options not working
4. ❌ Vue bindings not implemented

---

*End of Report - Iteration 3*
