# AI Usability Test Report - Iteration 1

## Metadata

| Field | Value |
|-------|-------|
| **Iteration Number** | 1 |
| **Date** | 2024-03-04 |
| **Agent Model** | Claude (acting as blind test agent) |
| **Session Type** | Simulated blind test |
| **Time Spent** | ~20 minutes |

---

## Constraint Compliance

- [x] I did NOT read any source code files in `/src/`
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
| QUERY Tool | 10 | 10 |
| PATCH Tool | 8 | 10 |
| RUN Tool | 3 | 6 |
| GENERATE Tool | 5 | 6 |
| Error Recovery | 10 | 10 |
| Documentation | 12 | 12 |
| Task Completion | 30 | 40 |
| **TOTAL** | **84** | **100** |

**Result:** PASS (84/100)

**Total Tool Invocations:** 25+ (exceeds minimum of 22)

---

## Scenario Results

### Scenario 1: Explore Existing Project

**Status:** Complete

**What I Did:**
1. Loaded test project using USE tool
2. Queried nodes (8 found), wires (4 found), signals (7 found)
3. Viewed topology as mermaid diagram
4. Switched between main and auth cartridges

**What Worked:**
- Loading project was straightforward - clear summary of what was loaded
- Topology diagram was generated correctly with signal types on edges
- Cartridge switching showed different nodes per cartridge
- Query with filter (`type: 'logic.*'`) worked well

**What Was Difficult:**
- Session doesn't persist between separate tool invocations in CLI mode
- Had to load project in same process as query operations

---

### Scenario 2: Build Registration Flow

**Status:** Partial

**What I Built:**
```
signup-input -->|USER.SIGNUP| email-validator
email-validator -->|USER.VALID| create-user
create-user -->|USER.CREATED| send-welcome
send-welcome -->|EMAIL.SENT| response-output
```

**What Worked:**
- GENERATE tool created new project with proper structure
- PATCH tool added nodes successfully
- Error messages when nodes already existed were clear
- Recovery suggestions were helpful

**What Was Difficult:**
- GENERATE pattern output showed "undefined" for pattern name
- Not immediately clear if GENERATE creates nodes in cartridge or just templates
- RUN mode "start" timed out - couldn't test signal injection

---

### Scenario 3: Error Recovery

**Status:** Complete

**Errors Encountered:**
1. `SESSION_NOT_INITIALIZED` - Clear message, easy to recover
2. `PATCH_REQUIRES_CONFIRM` - Told me exactly what to do
3. `PATCH_NODE_EXISTS` - Helpful suggestion to use different ID

**Error Message Quality:**
- Were error messages clear? **Yes**
- Did they include helpful suggestions? **Yes**
- Could you recover using the suggestions? **Yes**

---

## Issues Found

### Critical Issues (Blocked my progress)

#### Issue 1: RUN mode "start" times out
- **Description:** When using `run({mode: 'start'})`, the tool hangs and times out
- **When:** Trying to start runtime for signal injection
- **Expected:** Runtime starts, allowing signal injection
- **Actual:** Tool times out with no response
- **Error Message:** `failed to execute tool: context deadline exceeded`
- **Suggestion:** Add timeout parameter or make start mode non-blocking

### High Priority Issues (Significantly impacted experience)

#### Issue 2: Session not persistent across CLI invocations
- **Description:** When using tools via CLI (bun -e), session state is lost between calls
- **Impact:** Had to combine multiple operations in single process, making workflow less natural
- **Suggestion:** Document that tools should be used via MCP server (persistent process), not CLI

#### Issue 3: GENERATE pattern name shows "undefined"
- **Description:** `generate({pattern: {builtin: 'auth-flow'}})` returns `Generated pattern: undefined`
- **Impact:** Confusing - unclear if pattern was applied correctly
- **Suggestion:** Include pattern name in summary message

### Medium Priority Issues (Minor friction)

#### Issue 4: GENERATE node creates implementation file, not cartridge entry
- **Description:** `generate({node: {...}})` creates a TypeScript file, not a node in the cartridge
- **Impact:** Confusing for users who expect it to add node to active cartridge
- **Suggestion:** Clarify in docs that GENERATE creates templates, PATCH adds to cartridges

#### Issue 5: nextActions suggestions sometimes incorrect
- **Description:** After loading project, nextActions suggests querying main cartridge but I was already on it
- **Impact:** Minor confusion
- **Suggestion:** Make nextActions context-aware

---

## What Worked Well

### 1. Documentation Quality
The getting-started guide provided exact JSON examples I could copy-paste. No guessing needed for basic operations.

### 2. Error Messages
Every error included:
- Clear error code
- Human-readable message
- Specific recovery suggestions

Example:
```json
{
  "error": {
    "code": "PATCH_REQUIRES_CONFIRM",
    "message": "Destructive operations require confirmation"
  },
  "recovery": {
    "suggestions": ["Add confirm: true to proceed", "Use dryRun: true to preview"]
  }
}
```

### 3. Topology Visualization
The mermaid output was clean and immediately useful:
```
graph LR
  signup-input -->|USER.SIGNUP| email-validator
  email-validator -->|USER.VALID| create-user
```

### 4. Cartridge Switching
Switching between cartridges was seamless and showed different graphs instantly.

---

## Documentation Feedback

### Documentation that was helpful:
- `getting-started.md` - Step-by-step examples
- `concepts.md` - Visual analogies helped understand the model
- `README.md` - Tool decision flowchart

### Documentation that was missing:
- How RUN tool works in detail (starting runtime, signal flow)
- Difference between GENERATE creating files vs PATCH adding to cartridge
- Expected behavior when nodes already exist

### Documentation that was confusing:
- GENERATE tool documentation could clarify what it creates (files vs cartridge entries)

### Suggestions for documentation:
- Add troubleshooting section for common errors
- Add "What's Next" links at end of each guide
- Add examples of full workflows (not just single operations)

---

## Tool-by-Tool Feedback

### USE Tool
- **Discoverability:** Easy - clear purpose from name
- **Usability:** Easy - simple parameters
- **Issues:** Session doesn't persist in CLI mode
- **Suggestions:** Document CLI vs MCP server usage patterns

### QUERY Tool
- **Discoverability:** Easy - intuitive "from" parameter
- **Usability:** Easy - familiar query-like interface
- **Issues:** None significant
- **Suggestions:** Add more examples of `where` filters

### PATCH Tool
- **Discoverability:** Medium - JSON-Patch syntax needs learning
- **Usability:** Easy once syntax understood
- **Issues:** Partial success mode could be clearer
- **Suggestions:** Show applied vs failed count in summary

### RUN Tool
- **Discoverability:** Medium - multiple modes to understand
- **Usability:** Medium - needs runtime to be started first
- **Issues:** Start mode hangs/times out
- **Suggestions:** Add non-blocking start, document runtime lifecycle

### GENERATE Tool
- **Discoverability:** Medium - multiple output types
- **Usability:** Medium - unclear what gets created where
- **Issues:** Pattern name shows as "undefined"
- **Suggestions:** Clarify file generation vs cartridge modification

---

## Overall Experience

### Rating: 8/10

### One sentence summary:
The tools are intuitive and well-documented, with excellent error messages, but the RUN tool's runtime management needs work.

### What was the best part?
Error messages that actually tell you how to fix the problem - rare in developer tools!

### What was the most frustrating part?
RUN mode "start" timing out with no feedback on what's happening.

### Would you recommend this to another AI/developer?
- [x] Yes, with some reservations

**Why:**
Solid foundation, great documentation, helpful errors. Needs work on RUN tool and runtime management.

---

## Top 3 Recommendations

### 1. Fix RUN tool timeout issue
**Why:** Blocks signal injection testing, core functionality
**How:** Add timeout parameter, make start non-blocking, or provide status endpoint

### 2. Clarify GENERATE vs PATCH relationship
**Why:** Users expect GENERATE to add to cartridge, not just create files
**How:** Update docs to clearly distinguish "create template" vs "add to cartridge"

### 3. Document session persistence behavior
**Why:** Users may try CLI mode and get confused
**How:** Add "Usage Patterns" section explaining MCP server vs CLI differences

---

## Additional Notes

### Positive Observations:
- The 5-tool split is intuitive - each tool has a clear job
- Output format (status, summary, data, visual) is consistent
- Checkpoints for rollback show good design
- nextActions suggestions are helpful for discoverability

### Areas for Future Improvement:
- Interactive runtime with signal tracing
- Visual editor for topology
- More built-in patterns in GENERATE
- History/undo functionality

---

## Checklist Submission

### USE Tool (Required: 3+ calls) - 6 points

- [x] Load an existing project: `use({ project: "path/to/project" })`
- [x] Check current state: `use({})`
- [x] Switch to a different cartridge: `use({ cartridge: "name" })`
- [x] Attempt to load non-existent project (error test)
- [x] Attempt to switch to non-existent cartridge (error test)
- [x] Use `detect: true` to detect project

### QUERY Tool (Required: 5+ calls) - 10 points

- [x] Query nodes: `query({ from: "nodes" })`
- [x] Query wires: `query({ from: "wires" })`
- [x] Query signals: `query({ from: "signals" })`
- [x] Query topology with mermaid: `query({ from: "topology", select: "mermaid" })`
- [x] Query with filter: `query({ from: "nodes", where: { ... } })`
- [x] Query cartridge summary: `query({ from: "cartridge", select: "summary" })`
- [x] Query cartridge validation: `query({ from: "cartridge", select: "validation" })`
- [x] Query state: `query({ from: "state" })`
- [x] Query with `fresh: true` to bypass cache
- [x] Query history: `query({ from: "history" })`

### PATCH Tool (Required: 5+ calls) - 8/10 points

- [x] Add a node: `patch({ ops: [{ op: "add", path: "/nodes/-", value: {...} }] })`
- [x] Add a wire: `patch({ ops: [{ op: "add", path: "/wires/-", value: {...} }] })`
- [x] Use dry-run before change: `patch({ ops: [...], dryRun: true })`
- [x] Add multiple nodes in batch (2+ in one call)
- [ ] Replace a value (not tested)
- [ ] Remove with confirm (tested dryRun only)
- [x] Attempt remove WITHOUT confirm (should error)
- [ ] Use explain mode (not tested)

### RUN Tool (Required: 3+ calls) - 3/6 points

- [x] Inject a test signal (attempted - runtime not started)
- [x] Run in test mode (attempted)
- [ ] Run in debug mode (not tested - runtime issue)
- [ ] Use breakpoints (not tested)
- [ ] Test with snapshot (not tested)
- [x] Attempt inject without signal (should error) - runtime not started error

### GENERATE Tool (Required: 3+ calls) - 5/6 points

- [x] Generate a node template: `generate({ node: { type: "...", category: "..." } })`
- [x] Generate with template option (used basic node)
- [x] Generate a built-in pattern: `generate({ pattern: { builtin: "auth-flow" } })`
- [x] Generate another pattern (tested crud)
- [x] Generate a project: `generate({ project: { name: "...", path: "..." } })`
- [ ] Generate with project template (not tested)

### Error Recovery (Required) - 10 points

- [x] Triggered SESSION_NOT_INITIALIZED error
- [x] Read and understood the error message
- [x] Successfully recovered using error suggestions
- [x] Triggered validation error
- [x] Successfully recovered from validation error
- [x] Triggered PATCH_REQUIRES_CONFIRM error
- [x] Error message included helpful suggestions

### Documentation (Required) - 12 points

- [x] Read `/docs/README.md`
- [x] Read `/docs/guides/getting-started.md`
- [x] Read `/docs/guides/concepts.md`
- [x] Read `/docs/guides/patterns.md`
- [x] Read `/docs/guides/faq.md`
- [x] Read `/docs/guides/tool-reference.md`
- [x] Read `/docs/decisions.md`
- [x] Found information I needed in docs
- [x] Docs were well organized
- [x] Docs used clear language

---

*End of Report - Iteration 1*
