# Scenario 3: Error Recovery

## Goal
Intentionally trigger errors and practice recovering from them. This tests whether error messages are helpful.

## Time Estimate
10-15 minutes

## Difficulty
Beginner

---

## Background

Good error messages are critical for usability. This scenario tests:
- Are errors clear and actionable?
- Do suggestions actually help?
- Can users recover without external help?

---

## Steps

### Step 1: Query Without Loading (SESSION_NOT_INITIALIZED)

**Action:** Before loading any project, try to query nodes:

```json
query({ from: "nodes" })
```

**Expected:** Error with code SESSION_NOT_INITIALIZED

**Evaluate:**
- Was the error message clear?
- Did it suggest how to fix?
- Could you understand what went wrong?

### Step 2: Recover from Session Error

**Action:** Load a project and retry the query.

**Expected:** Query succeeds after loading project.

### Step 3: Invalid Cartridge Switch

**Action:** Try to switch to a cartridge that doesn't exist:

```json
use({ cartridge: "non-existent-cartridge" })
```

**Expected:** Error about cartridge not found

**Evaluate:**
- Did the error tell you which cartridges ARE available?
- Was the message helpful?

### Step 4: Add Duplicate Node

**Action:** Add a node, then try to add another with the same ID:

```json
// First add
patch({ ops: [{ op: "add", path: "/nodes/-", value: { id: "test-node", type: "logic.transform", config: {} } }] })

// Try duplicate
patch({ ops: [{ op: "add", path: "/nodes/-", value: { id: "test-node", type: "logic.transform", config: {} } }] })
```

**Expected:** Error about duplicate ID

**Evaluate:**
- Was the error specific about what was duplicated?
- Did it suggest how to fix?

### Step 5: Destructive Operation Without Confirm

**Action:** Try to remove a node without confirmation:

```json
patch({ ops: [{ op: "remove", path: "/nodes/0" }] })
```

**Expected:** Error requiring confirmation

**Evaluate:**
- Did it tell you WHY the operation was rejected?
- Did it explain how to confirm?

### Step 6: Preview with Dry Run

**Action:** Use dryRun to preview the removal:

```json
patch({ ops: [{ op: "remove", path: "/nodes/0" }], dryRun: true })
```

**Expected:** Preview of what would happen, without actually removing

**Evaluate:**
- Did dryRun show you what would change?
- Was the preview helpful?

### Step 7: Confirm the Removal

**Action:** Now remove with confirmation:

```json
patch({ ops: [{ op: "remove", path: "/nodes/0" }], confirm: true })
```

**Expected:** Node successfully removed

### Step 8: Invalid Wire Reference

**Action:** Try to create a wire referencing non-existent nodes:

```json
patch({ ops: [{ op: "add", path: "/wires/-", value: { from: "ghost-node", to: "another-ghost", signalType: "TEST.SIGNAL" } }] })
```

**Expected:** Error about nodes not found

**Evaluate:**
- Did it tell you which nodes don't exist?
- Did it list nodes that DO exist?

### Step 9: Run Without Signal

**Action:** Try to run inject mode without providing a signal:

```json
run({ mode: "inject" })
```

**Expected:** Error about missing signal

**Evaluate:**
- Was the error clear about what was missing?

### Step 10: Query Non-Existent Node

**Action:** Query for a node that doesn't exist:

```json
query({ from: "nodes", where: { id: "impossible-node-id-12345" } })
```

**Expected:** Empty result or appropriate message

**Evaluate:**
- Was the "not found" case handled gracefully?
- Did it help you understand the result?

---

## Error Evaluation Form

For each error encountered, rate:

| Error | Message Clarity (1-5) | Suggestions Helpful? (Y/N) | Recovery Easy? (Y/N) |
|-------|----------------------|---------------------------|---------------------|
| SESSION_NOT_INITIALIZED | | | |
| Cartridge not found | | | |
| Duplicate ID | | | |
| Confirm required | | | |
| Node not found (wire) | | | |
| Signal required | | | |
| Query empty result | | | |

---

## Success Criteria

- [ ] Triggered at least 5 different error types
- [ ] Successfully recovered from all errors
- [ ] Used dryRun to preview changes
- [ ] Confirmed a destructive operation properly
- [ ] Evaluated error message quality

---

## Reflection Questions

After completing this scenario:

1. Which error message was most helpful? Why?
2. Which error message was most confusing? Why?
3. Did any error make you want to look at source code? (Remember: don't actually do it!)
4. What suggestions would you add to error messages?
5. Were there errors you expected but didn't encounter?
