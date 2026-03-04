# AI Usability Test Framework

This framework enables systematic testing of Graph-OS MCP Tools by blind AI agents.

---

## Purpose

Validate that Graph-OS delivers on its promises:
- Documentation is sufficient without code access
- Error messages are helpful
- Tools are discoverable
- Tasks are completable

---

## Quick Start

### Step 1: Verify Framework is Ready

```bash
ls test/ai-usability/
# Should show: README.md, VERSION.md, ITERATIONS.md, task.md, constraints.md, checklist.md, report-template.md, scenarios/, reports/
```

### Step 2: Open New Session

Open a NEW chat session with any AI model (Claude, GPT, etc.)

### Step 3: Give This Instruction

Copy and paste this exact instruction to the test agent:

```
Read the file at /home/z/my-project/graph-os/test/ai-usability/task.md and follow ALL instructions exactly. Start by reading constraints.md and checklist.md before using any tools.
```

### Step 4: Wait for Report

The test agent will:
- Read documentation
- Use tools
- Complete scenarios
- Generate a report

### Step 5: Review and Improve

Back in this (main) session:
1. Read the report in `reports/iteration-N-report.md`
2. Discuss findings
3. Make improvements to Graph-OS
4. Update `VERSION.md` with changes
5. Increment iteration number
6. Repeat

---

## File Structure

```
test/ai-usability/
├── README.md              # This file (for humans)
├── VERSION.md             # Current version being tested
├── ITERATIONS.md          # History of all test iterations
├── task.md                # Main task (AI reads this first)
├── constraints.md         # Rules AI must follow
├── checklist.md           # Mandatory actions (ensures comprehensiveness)
├── report-template.md     # AI fills this out
├── scenarios/
│   ├── scenario-1-explore.md
│   ├── scenario-2-build.md
│   └── scenario-3-debug.md
└── reports/
    └── (generated reports go here)
```

---

## Iteration Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  MAIN SESSION                      TEST SESSION                │
│  ┌────────────────┐               ┌────────────────┐           │
│  │ 1. Read report │               │ 1. Read task   │           │
│  │ 2. Discuss     │               │ 2. Follow      │
│  │ 3. Improve     │               │    constraints │           │
│  │ 4. Update      │               │ 3. Complete    │           │
│  │    VERSION.md  │               │    checklist   │           │
│  │ 5. Say "Ready  │               │ 4. Use tools   │           │
│  │    for next"   │               │ 5. Fill report │           │
│  └────────────────┘               └────────────────┘           │
│         │                                 │                     │
│         │◄──────── report ────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scoring System

| Category | Points | Description |
|----------|--------|-------------|
| USE Tool | 6 | Comprehensive usage of USE tool |
| QUERY Tool | 10 | All query types tested |
| PATCH Tool | 10 | All patch operations tested |
| RUN Tool | 6 | All run modes tested |
| GENERATE Tool | 6 | All generate types tested |
| Error Recovery | 10 | Error handling and recovery |
| Documentation | 12 | Docs quality assessment |
| Task Completion | 40 | Scenarios completed |
| **Total** | **100** | Passing = 70+ |

---

## Checklist Compliance

The test agent MUST complete all items in `checklist.md`:
- Minimum 22 tool invocations
- All 5 tools used comprehensively
- Error recovery demonstrated
- All 3 scenarios attempted

---

## Updating After Each Iteration

### In VERSION.md:
```markdown
## Version: 2.0.0-alpha.N  (increment N)

## Changes Since Last Test:
- [List changes made]

## Test Focus This Iteration:
- [What to focus on testing]
```

### In ITERATIONS.md:
Append:
```markdown
## Iteration N - YYYY-MM-DD

### Score: XX/100

### Issues Found:
1. [Issue]

### Fixes Applied:
1. [Fix]
```

---

## Tips for Good Tests

1. **Use fresh sessions** - No prior context about Graph-OS
2. **Don't help the agent** - Let them struggle and discover
3. **Use different models** - Claude, GPT, etc. have different capabilities
4. **Document everything** - Even small friction points matter
5. **Be patient** - The agent may take 30+ minutes

---

## What We're Measuring

| Metric | Success Looks Like |
|--------|-------------------|
| Discoverability | Agent finds the right tool without hints |
| Documentation | Agent completes tasks using only docs |
| Error Messages | Agent recovers using error suggestions |
| Task Completion | Agent builds working graph |
| User Experience | Agent rates 7+/10 satisfaction |

---

## Known Test Artifacts

The test agent may create:
- `/tmp/registration-demo/` - Project from Scenario 2
- Nodes added to test fixture during Scenario 3

These are expected and can be cleaned up between iterations.
