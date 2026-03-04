# Mandatory Checklist

You MUST perform ALL actions listed below. Check each box when completed.

**Minimum required: 22 tool invocations**

---

## USE Tool (Required: 3+ calls) - 6 points

- [ ] Load an existing project: `use({ project: "path/to/project" })`
- [ ] Check current state: `use({})`
- [ ] Switch to a different cartridge: `use({ cartridge: "name" })`
- [ ] Attempt to load non-existent project (error test)
- [ ] Attempt to switch to non-existent cartridge (error test)
- [ ] Use `detect: true` to detect project

**Notes:**
```
[Document any issues or observations with USE tool]
```

---

## QUERY Tool (Required: 5+ calls) - 10 points

- [ ] Query nodes: `query({ from: "nodes" })`
- [ ] Query wires: `query({ from: "wires" })`
- [ ] Query signals: `query({ from: "signals" })`
- [ ] Query topology with mermaid: `query({ from: "topology", select: "mermaid" })`
- [ ] Query with filter: `query({ from: "nodes", where: { ... } })`
- [ ] Query cartridge summary: `query({ from: "cartridge", select: "summary" })`
- [ ] Query cartridge validation: `query({ from: "cartridge", select: "validation" })`
- [ ] Query state: `query({ from: "state" })`
- [ ] Query with `fresh: true` to bypass cache
- [ ] Query history: `query({ from: "history" })`

**Notes:**
```
[Document any issues or observations with QUERY tool]
```

---

## PATCH Tool (Required: 5+ calls) - 10 points

- [ ] Add a node: `patch({ ops: [{ op: "add", path: "/nodes/-", value: {...} }] })`
- [ ] Add a wire: `patch({ ops: [{ op: "add", path: "/wires/-", value: {...} }] })`
- [ ] Use dry-run before change: `patch({ ops: [...], dryRun: true })`
- [ ] Add multiple nodes in batch (2+ in one call)
- [ ] Replace a value: `patch({ ops: [{ op: "replace", path: "...", value: ... }] })`
- [ ] Remove with confirm: `patch({ ops: [{ op: "remove", path: "..." }], confirm: true })`
- [ ] Attempt remove WITHOUT confirm (should error)
- [ ] Use explain mode: `patch({ ops: [...], explain: true })`

**Notes:**
```
[Document any issues or observations with PATCH tool]
```

---

## RUN Tool (Required: 3+ calls) - 6 points

- [ ] Inject a test signal: `run({ mode: "inject", signal: {...} })`
- [ ] Run in test mode: `run({ mode: "test", signal: {...}, expect: {...} })`
- [ ] Run in debug mode: `run({ mode: "debug", signal: {...}, trace: true })`
- [ ] Use breakpoints: `run({ mode: "debug", signal: {...}, breakpoints: [...] })`
- [ ] Test with snapshot: `run({ mode: "test", signal: {...}, expect: { snapshot: true } })`
- [ ] Attempt inject without signal (should error)

**Notes:**
```
[Document any issues or observations with RUN tool]
```

---

## GENERATE Tool (Required: 3+ calls) - 6 points

- [ ] Generate a node template: `generate({ node: { type: "...", category: "..." } })`
- [ ] Generate with template option: `generate({ node: { ..., template: "validator" } })`
- [ ] Generate a built-in pattern: `generate({ pattern: { builtin: "auth-flow" } })`
- [ ] Generate another pattern: `generate({ pattern: { builtin: "crud" } })`
- [ ] Generate a project: `generate({ project: { name: "...", path: "..." } })`
- [ ] Generate with project template: `generate({ project: { ..., template: "auth" } })`

**Notes:**
```
[Document any issues or observations with GENERATE tool]
```

---

## Error Recovery (Required) - 10 points

- [ ] Triggered SESSION_NOT_INITIALIZED error
- [ ] Read and understood the error message
- [ ] Successfully recovered using error suggestions
- [ ] Triggered validation error
- [ ] Successfully recovered from validation error
- [ ] Triggered NODE_NOT_FOUND or similar error
- [ ] Error message included helpful suggestions

**Document your error recovery experience:**
```
[What error did you encounter? Was the message helpful? How did you recover?]
```

---

## Documentation Usage (Required) - 12 points

- [ ] Read `/docs/README.md`
- [ ] Read `/docs/guides/getting-started.md`
- [ ] Read `/docs/guides/concepts.md`
- [ ] Read `/docs/guides/patterns.md`
- [ ] Read `/docs/guides/faq.md`
- [ ] Read `/docs/guides/tool-reference.md`
- [ ] Read `/docs/decisions.md`
- [ ] Found information I needed in docs
- [ ] Docs were well organized
- [ ] Docs used clear language

**Documentation gaps found:**
```
[What was missing or unclear in the documentation?]
```

---

## Task Completion - 40 points

### Scenario 1: Explore Existing Project (15 points)
- [ ] Successfully loaded test project
- [ ] Explored nodes, wires, signals
- [ ] Viewed topology diagram
- [ ] Switched cartridges

### Scenario 2: Build Registration Flow (15 points)
- [ ] Created new project
- [ ] Created multiple nodes
- [ ] Connected nodes with wires
- [ ] Verified topology
- [ ] Tested with signal injection

### Scenario 3: Error Recovery (10 points)
- [ ] Triggered intentional errors
- [ ] Recovered successfully
- [ ] Used dry-run appropriately

---

## Summary

| Category | Required | Completed | Points |
|----------|----------|-----------|--------|
| USE Tool | 3+ | ?/6 | ?/6 |
| QUERY Tool | 5+ | ?/10 | ?/10 |
| PATCH Tool | 5+ | ?/8 | ?/10 |
| RUN Tool | 3+ | ?/6 | ?/6 |
| GENERATE Tool | 3+ | ?/6 | ?/6 |
| Error Recovery | Required | ?/7 | ?/10 |
| Documentation | Required | ?/10 | ?/12 |
| Task Completion | Required | ?/11 | ?/40 |

**Total Invocations:** ? (minimum 22)
**Total Score:** ?/100 (passing = 70)

---

## Items I Could NOT Complete

If you could not complete any item above, explain why:

```markdown
### Item: [e.g., "Query history"]
- Reason: [Why couldn't you complete this?]
- Error message (if any): [...]
- What was missing: [What would have helped?]
```

---

## Final Check

Before submitting your report:

- [ ] I completed all mandatory items OR explained why I couldn't
- [ ] I made at least 22 tool invocations
- [ ] I documented issues I encountered
- [ ] I followed all constraints in `/constraints.md`
