# Constraints - READ THIS FIRST

These constraints are **MANDATORY**. Violating them invalidates the test.

---

## What You MAY Do

| Action | Location | Purpose |
|--------|----------|---------|
| Read documentation | `/docs/README.md` | Navigation hub |
| Read documentation | `/docs/decisions.md` | Architecture decisions |
| Read guides | `/docs/guides/**` | Learn how to use the tools |
| Read task files | `/test/ai-usability/**` | Understand your mission |
| Use MCP tools | `use`, `query`, `patch`, `run`, `generate` | Complete the scenarios |
| Create new projects | Anywhere reasonable | For scenario 2 |
| Write your report | `/test/ai-usability/reports/` | Submit findings |

---

## What You MUST NOT Do

### ❌ NO Source Code Access

You are NOT allowed to read any files in these directories:

```
/src/               ❌ FORBIDDEN
/packages/tool/src/ ❌ FORBIDDEN
/**/src/            ❌ FORBIDDEN
```

This includes:
- Tool implementations
- Core logic
- Server code
- Type definitions (if in src)

**Why?** Real users don't read source code. They rely on documentation.

### ❌ NO Internal Documentation Access

You are NOT allowed to read internal planning/implementation docs:

```
/docs/plan/         ❌ FORBIDDEN (internal planning)
/docs/spec/         ❌ FORBIDDEN (technical specs)
/docs/testing/      ❌ FORBIDDEN (test documentation)
/docs/knowledge/    ❌ FORBIDDEN (internal knowledge)
/docs/system-prompt/ ❌ FORBIDDEN (system prompts)
```

**Why?** These contain implementation details and decisions that real users don't have access to. You should only use user-facing documentation.

### ❌ NO Test Code Access

You are NOT allowed to read any test files:

```
/test/**/*.test.ts  ❌ FORBIDDEN
/test/**/*.spec.ts  ❌ FORBIDDEN
/__tests__/         ❌ FORBIDDEN
```

**Why?** Tests show expected behavior. Real users don't have this advantage.

### ❌ NO Fixture Inspection (Except for Loading)

You may NOT read fixture files for understanding:

```
/test/fixtures/**/*.json  ❌ FORBIDDEN (for inspection)
```

**Exception:** You MAY load the test project via the `use` tool:
```json
use({ project: "/home/z/my-project/graph-os/packages/tool/test/fixtures/test-project" })
```

This is allowed because it's the normal user workflow.

### ❌ NO Example Copying

You may NOT:
- Search for existing examples in the codebase
- Look at how other code uses the tools
- Copy patterns from tests or fixtures

**Why?** We're testing if documentation alone is sufficient.

---

## Verification

In your report, you must affirm:

```markdown
## Constraint Compliance

- [ ] I did NOT read any source code files
- [ ] I did NOT read any test files
- [ ] I did NOT inspect fixture files directly
- [ ] I did NOT read internal docs (plan/, spec/, testing/, knowledge/, system-prompt/)
- [ ] I only used allowed documentation (README.md, decisions.md, guides/)
- [ ] I completed all actions using only the tools and docs
```

If you cannot check all boxes, explain what you accessed and why.

---

## If You Get Stuck

If you cannot proceed because documentation is insufficient:

1. **STOP** - Do not search for code examples
2. **DOCUMENT** - Note exactly what you were trying to do and what info was missing
3. **GUESS** - Make your best attempt based on available info
4. **REPORT** - Include this in your findings

**Important:** Getting stuck is valuable data! It means our documentation has gaps.

---

## Self-Check Before Proceeding

Ask yourself:

- [ ] Have I read `/docs/README.md`?
- [ ] Have I read `/docs/guides/getting-started.md`?
- [ ] Have I read `/docs/guides/concepts.md`?
- [ ] Do I understand what each tool does?
- [ ] Am I relying ONLY on documentation?

If you answered "no" to any of these, go back and read before using tools.

---

## The Spirit of the Test

This is not about passing or failing. This is about discovering:

- Is our documentation complete?
- Are our error messages helpful?
- Is the system discoverable?
- Where do users get stuck?

Your honest struggle helps us improve. Don't cheat yourself or us by looking at the answers.
