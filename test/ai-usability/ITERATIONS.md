# Test Iteration History

This document tracks all AI usability test iterations. Each iteration represents one complete test cycle: blind AI test → report → improvements.

---

## Iteration Template

```markdown
## Iteration N - YYYY-MM-DD

### Test Agent
- Model: [e.g., Claude 3.5 Sonnet, GPT-4, etc.]
- Session Type: [Fresh session / Continuation]

### Scenario Tested
- [ ] Scenario 1: Explore existing project
- [ ] Scenario 2: Build new graph
- [ ] Scenario 3: Debug broken graph
- [ ] Custom: [describe]

### Score: XX/100

### Issues Found:
1. [Issue description]
   - Severity: [Critical / High / Medium / Low]
   - Category: [Documentation / Error Message / Tool Behavior / Missing Feature]
   - Recommendation: [How to fix]

### What Worked Well:
1. [Positive finding]

### Fixes Applied:
1. [What was changed in Graph-OS]

### Next Focus:
- [What to test in next iteration]
```

---

## Iteration 0 - Baseline (Not Yet Run)

This is a placeholder for the first actual test.

### Expected Behavior:
- AI reads documentation
- AI uses tools to complete scenarios
- AI reports findings

### Hypotheses to Test:
1. Documentation is sufficient for a blind AI to use tools
2. Error messages provide actionable guidance
3. Tool naming is intuitive
4. Workflow is discoverable

---

## Iterations Log

## Iteration 1 - 2024-03-04

### Test Agent
- Model: Claude (acting as blind test agent)
- Session Type: Simulated blind test

### Scenario Tested
- [x] Scenario 1: Explore existing project
- [x] Scenario 2: Build new graph
- [x] Scenario 3: Error recovery

### Score: 84/100 (PASS)

### Issues Found:
1. RUN mode "start" times out
   - Severity: Critical
   - Category: Tool Behavior
   - Recommendation: Add timeout parameter or make start mode non-blocking

2. Session not persistent across CLI invocations
   - Severity: High
   - Category: Documentation
   - Recommendation: Document CLI vs MCP server usage patterns

3. GENERATE pattern name shows "undefined"
   - Severity: High
   - Category: Tool Behavior
   - Recommendation: Include pattern name in summary message

4. GENERATE creates files, not cartridge entries
   - Severity: Medium
   - Category: Documentation
   - Recommendation: Clarify in docs that GENERATE creates templates, PATCH adds to cartridges

### What Worked Well:
1. Error messages include clear codes, messages, and recovery suggestions
2. Topology mermaid visualization is clean and useful
3. Documentation examples are copy-paste ready
4. Cartridge switching is seamless

### Fixes Applied:
1. **GENERATE pattern name** - Fixed `options.name || options.builtin || 'custom-pattern'` fallback
2. **RUN timeout** - Added `timeout` parameter and `withTimeout` helper for runtime start operations
3. **Documentation** - Added sections for GENERATE vs PATCH and session persistence

### Next Focus:
- Fix RUN tool timeout issue
- Test RUN tool after fix
- Verify GENERATE output clarity

---

## Iteration 2 - 2024-03-04

### Test Agent
- Model: Claude (acting as blind test agent)
- Session Type: HTTP Server testing

### Scenario Tested
- [x] Scenario 1: Explore existing project (continued from iter 1)
- [x] Scenario 2: Build new graph (continued from iter 1)
- [x] Scenario 3: Error recovery (continued from iter 1)
- [x] Focus: Untested tool paths

### Score: 88/100 (PASS)

### Issues Found:
1. GENERATE tool doesn't write files to disk
   - Severity: Critical
   - Category: Tool Behavior
   - Recommendation: Implement file writing or document limitation

2. PATCH remove by node ID fails
   - Severity: High
   - Category: Tool Behavior
   - Recommendation: Support node IDs or document numeric-only requirement

3. Module type not set in package.json
   - Severity: Medium
   - Category: Build/Configuration
   - Recommendation: Add `"type": "module"` to package.json

4. Test project has invalid node types
   - Severity: Medium
   - Category: Test Data
   - Recommendation: Fix `logic.validator` to `logic.validate`

### What Worked Well:
1. GENERATE pattern name now shows correctly (iter 1 fix verified)
2. PATCH explain mode provides useful step-by-step trace
3. RUN debug mode with trace shows execution details
4. RUN test mode assertions correctly identify failed expectations
5. Checkpoint system works for all PATCH operations

### Fixes Applied:
1. **TypeScript build errors** - Added `pattern` to GenerateResult, fixed timeoutId typing
2. **Module type** - Added `"type": "module"` to package.json

### Next Focus:
- Fix GENERATE file writing
- Support node IDs in PATCH remove
- Fix test fixture node types

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Iterations | 3 |
| Average Score | 86.7 |
| Pass Rate | 100% |
| Critical Issues Found | 2 |
| Issues Resolved | 4 |

---

## Iteration 3 - 2024-03-04

### Test Agent
- Model: Claude (acting as blind test agent)
- Session Type: HTTP Server testing

### Scenario Tested
- [x] Phase A: PATCH advanced operations
- [x] Phase B: RUN full workflow
- [x] Phase C: GENERATE remaining
- [x] Phase D: QUERY advanced

### Score: 88/100 (PASS)

### Issues Found:
1. QUERY where filters not working (upstream, downstream, path, handlesSignal)
   - Severity: High
   - Category: Tool Behavior
   - Recommendation: Implement filter logic in query tool

2. RUN trace and history not returning data
   - Severity: High
   - Category: Tool Behavior
   - Recommendation: Implement trace collection in runtime execution

3. QUERY select options not working (paths, graph)
   - Severity: Medium
   - Category: Tool Behavior
   - Recommendation: Implement proper select handling

4. QUERY limit and depth parameters ignored
   - Severity: Medium
   - Category: Tool Behavior
   - Recommendation: Implement result limiting

5. Vue bindings not implemented
   - Severity: Medium
   - Category: Tool Behavior
   - Recommendation: Complete Vue/Svelte generators

### What Worked Well:
1. PATCH advanced operations (copy, move, test) all work correctly
2. Named checkpoints with clear naming
3. GENERATE uiBinding (React) produces useful TypeScript hooks
4. GENERATE composite extraction with helpful nextActions
5. RUN complete workflow (start → inject → stop)

### Fixes Applied:
None required during testing - fixes from iter 2 verified working

### Next Focus:
- Fix QUERY where filters
- Implement RUN trace/history
- Complete Vue/Svelte binding generation
