# Graph-OS Constitution

**Fundamental Principles That Guide ALL Graph-OS Development**

---

## 📜 Preamble

This Constitution establishes the fundamental principles of Graph-OS architecture. All agents, developers, and systems MUST adhere to these principles.

**These principles are NON-NEGOTIABLE.**
**Violations are architectural debt.**
**Compliance is required for correctness.**

---

## 🎯 Principle 1: Signal-First Architecture

### Definition
Graph-OS architecture is signal-driven. Signals are the primary mechanism for communication between nodes.

### Rule
- **All** node communication MUST occur via signals
- **No** direct method calls between nodes in different composites
- **All** signals MUST be registered in signal-registry.json
- **No** signals may be invented at runtime

### Why This Matters
- Decouples components
- Enables distributed execution
- Makes architecture explicit and traceable
- Prevents hidden dependencies

### Violation Examples
- Node A calls Node B.method() directly
- Signal names invented at runtime without registration
- Communication via shared state instead of signals

### Correct Examples
- Node A emits SIGNAL.LOGIN_REQUEST
- Node B receives SIGNAL.LOGIN_REQUEST via wire
- Signal is registered in signal-registry.json

---

## 🎯 Principle 2: Topology is Explicit, Not Implicit

### Definition
Graph-OS topology is explicit JSON definitions, not implicit code structure.

### Rule
- **All** composites MUST be defined as JSON cartridge files
- **No** topology defined in TypeScript code or class definitions
- **All** node connections MUST be defined in wires array
- **No** node connections defined in implementation code

### Why This Matters
- Architecture is readable and inspectable
- Validation is possible without running code
- Graph-Os Platform can enforce constraints
- Prevents hidden dependencies

### Violation Examples
- Node types defined as TypeScript classes
- Wires created via method calls in code
- Topology inferred from directory structure

### Correct Examples
- Composite defined as .cartridge.json
- Nodes defined in JSON nodes array
- Wires defined in JSON wires array

---

## 🎯 Principle 3: Separation of Architecture and Runtime

### Definition
Architecture defines WHAT (topology, signals). Runtime implements HOW (processing, logic).

### Rule
- **Architecture** (cartridges/) = JSON files defining topology
- **Runtime** (src/) = TypeScript files implementing node logic
- **No** mixing of architecture and runtime in same files
- **No** code references in JSON cartridges

### Why This Matters
- Enables independent evolution of topology and implementation
- Makes architecture portable (runtime-agnostic)
- Allows multiple runtime implementations
- Prevents architectural drift

### Violation Examples
- Cartridge JSON has "task": "src/..." property
- Runtime code creates topology dynamically
- Directory structure defines architecture instead of JSON

### Correct Examples
- Cartridge JSON = pure topology (nodes, wires, signals)
- Runtime code = pure implementation (Node.process methods)
- Architecture and runtime in separate directories

---

## 🎯 Principle 4: Composites Are Boundary Units

### Definition
Composites are the fundamental units of encapsulation. They define clear boundaries for functionality.

### Rule
- **All** composites MUST declare inputs and outputs
- **All** wires crossing composite boundaries MUST use declared signals
- **All** internal node communication is invisible outside composite
- **All** composites MUST stay within size constraints

### Why This Matters
- Enables composability
- Makes system modular and testable
- Prevents god-composites
- Enforces clear interfaces

### Violation Examples
- Composite has no inputs/outputs declared
- Internal nodes directly accessible from outside
- Composite exceeds 30 nodes

### Correct Examples
- Composite declares inputs array
- Composite declares outputs array
- Composite has 5-30 nodes
- Internal wires don't cross boundary

---

## 🎯 Principle 5: Hierarchy is Controlled Depth

### Definition
Graph-OS enforces controlled hierarchy depth to prevent complexity explosion.

### Rule
- **All** applications MUST stay within maxHierarchyDepth (3 levels)
- **No** nested composites exceeding depth limits
- **No** circular dependencies in hierarchy

### Why This Matters
- Prevents unmanageable complexity
- Keeps architecture understandable
- Enables mental model of system
- Prevents infinite recursion

### Violation Examples
- Hierarchy depth exceeds 3 (application → composite → composite → composite)
- Circular references between composites
- Unclear or ambiguous nesting

### Correct Examples
- Root cartridge (level 0)
- Top-level composites (level 1)
- Nested composites only (level 2)
- Maximum depth: 3 levels

---

## 🎯 Principle 6: Constraints are Enforced, Not Optional

### Definition
Graph-OS architectural constraints are rules, not guidelines. They are enforced by validation.

### Rule
- **All** constraints MUST be met before cartridges are considered valid
- **No** "temporary" violations allowed
- **All** validators MUST pass before deployment
- **All** constraint violations MUST be fixed

### Why This Matters
- Prevents architectural debt
- Ensures system remains maintainable
- Catches problems early
- Guarantees quality

### Violation Examples
- "Just this one time" exceeding node count
- Skipping validation because "it's too complex"
- Manually adjusting constraints to fit code
- Ignoring validation errors

### Correct Examples
- All validators run before deployment
- All errors fixed immediately
- All constraints respected
- System only deployed when valid

---

## 🎯 Principle 7: Registry is Source of Truth

### Definition
Registries (composite-registry.json, signal-registry.json) are the authoritative source.

### Rule
- **All** composites MUST be registered in composite-registry.json
- **All** signals MUST be registered in signal-registry.json
- **No** composites or signals may exist without registry entry
- **All** registry metadata MUST be accurate (node counts, timestamps)

### Why This Matters
- Single source of truth for architecture
- Enables quick lookups without parsing files
- Prevents orphaned resources
- Makes architecture discoverable

### Violation Examples
- Composite created but not registered
- Signal used but not registered
- Registry has wrong node count
- Registry not updated after changes

### Correct Examples
- Composite created → registry updated
- Signal created → registry updated
- Node count accurate in registry
- LastModified timestamp updated

---

## 🎯 Principle 8: Agents Have Clear, Non-Overlapping Roles

### Definition
Each agent has a specific domain of expertise. Roles do not overlap.

### Rule
- **Architect Agent** designs topology ONLY (JSON cartridges)
- **Implementor Agent** implements logic ONLY (TypeScript code)
- **Incubator Agent** generates ideas ONLY (concept docs)
- **Inspector Agent** validates ONLY (validation reports)
- **UI Agent** designs frontend ONLY (React/Vue components)
- **No** agent performs another agent's role

### Why This Matters
- Reduces cognitive load (each agent expert in 1 domain)
- Prevents confusion about responsibilities
- Enables specialization and expertise
- Eliminates "who does what?" ambiguity

### Violation Examples
- Architect Agent writing TypeScript code
- Implementor Agent designing topology
- Inspector Agent creating JSON cartridges
- UI Agent implementing backend logic

### Correct Examples
- Architect Agent: Creates .cartridge.json
- Implementor Agent: Creates .ts files
- Incubator Agent: Creates .md concept docs
- Inspector Agent: Creates validation reports
- UI Agent: Creates .tsx components

---

## 🎯 Principle 9: Accessibility is Mandatory, Not Optional

### Definition
Graph-OS applications must be accessible to all users. Accessibility is enforced.

### Rule
- **All** UI components MUST meet WCAG 2.1 AA standards
- **All** interactive elements MUST be keyboard navigable
- **All** content MUST be screen reader compatible
- **All** UI MUST pass accessibility validation

### Why This Matters
- Inclusive design for all users
- Legal compliance in many jurisdictions
- Better UX for everyone
- Prevents accessibility debt

### Violation Examples
- No ARIA labels on interactive elements
- Color contrast below 4.5:1 ratio
- No keyboard navigation support
- No alt text for images

### Correct Examples
- WCAG AA compliance (color, contrast, text size)
- ARIA roles and labels
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader compatibility

---

## 🎯 Principle 10: Validation is Continuous, Not One-Time

### Definition
Validation occurs continuously, not just at the end. Every change must be validated.

### Rule
- **All** changes MUST be validated immediately
- **No** batching changes without validation
- **All** failed validations MUST be fixed before proceeding
- **No** ignoring validation errors

### Why This Matters
- Catches issues early (when cheapest to fix)
- Prevents accumulation of errors
- Ensures continuous quality
- Prevents "works on my machine" problems

### Violation Examples
- Making 10 changes then validating once
- Ignoring "minor" validation errors
- Proceeding despite failed validation
- Not running validators at all

### Correct Examples
- Make 1 change → validate
- Fix error → validate again
- All validators pass → proceed to next change
- Repeat for every change

---

## ⚖️ Non-Negotiable Constraints

### Top-Level Constraints
- Max 30 nodes per composite
- Max 50 wires per composite
- Max 10 signals per composite
- Max 3 hierarchy depth
- Max 7 top-level composites in root
- Max 7 composites per subsystem

### Naming Constraints
- Signals MUST follow NAMESPACE.ACTION pattern
- Composites MUST follow composite.domain.feature pattern
- No forbidden signal prefixes (TEMP_, TEST_, XXX_, etc.)

### Structural Constraints
- Cartridges MUST be in cartridges/ directory
- Runtime code MUST be in src/ directory
- No code references in JSON cartridges
- No runtime code in cartridges/

---

## ✅ Compliance Checklist

### For Every Agent
- [ ] Read constitution before acting
- [ ] Understand principles relevant to role
- [ ] Follow non-negotiable constraints
- [ ] Validate output against constitution
- [ ] Report constitution violations

### For Every Change
- [ ] Signal-First: All communication via signals
- [ ] Topology-Explicit: JSON cartridges only
- [ ] Separation: Architecture and runtime separate
- [ ] Boundary: Composite IO declared
- [ ] Hierarchy: Depth ≤ 3
- [ ] Constraints: All validators pass
- [ ] Registry: Accurate metadata
- [ ] Validation: Immediate after change

---

## 🚨 Constitution Violations

### What is a Violation?
Any action that contradicts a principle or constraint in this Constitution.

### What to Do on Violation?
1. **STOP** - Do not proceed with violating action
2. **IDENTIFY** - Which principle was violated
3. **FIX** - Correct the action to comply
4. **VALIDATE** - Ensure fix is compliant
5. **REPORT** - Document violation and fix

### Who Can Declare Violation?
- Any agent detecting a violation
- Any agent asked to violate a principle
- Any validation failure

### Appeals Process
If an agent believes a principle needs exception:
1. Document reasoning clearly
2. Explain why exception is necessary
3. Propose alternative approach
4. Get approval from architect
5. Document exception in constitution.md

---

## 📜 Constitutional Authority

### This Constitution Is
- **Authoritative** source of architectural truth
- **Non-negotiable** set of principles
- **Universal** for all Graph-OS development
- **Living** document (can be amended with consensus)

### Amendment Process
1. Propose amendment with reasoning
2. Get consensus from all agents
3. Document change clearly
4. Update constitution.md
5. Communicate change to all agents

---

## 🎯 Constitutional Summary

**These 10 Principles Define Graph-OS Architecture:**

1. **Signal-First** - All communication via signals
2. **Topology-Explicit** - JSON cartridges define structure
3. **Separation** - Architecture vs. runtime
4. **Boundaries** - Composites encapsulate functionality
5. **Hierarchy** - Controlled depth prevents complexity
6. **Constraints** - Enforced, not optional
7. **Registry** - Source of truth
8. **Agent Roles** - Clear, non-overlapping
9. **Accessibility** - Mandatory, not optional
10. **Validation** - Continuous, not one-time

**These principles ensure:**
- ✅ Consistent architecture across all agents
- ✅ Maintainable system over time
- ✅ High quality output
- ✅ Prevent architectural drift

**All agents MUST read and comply with this Constitution before acting.**

---

## 📖 Next: Read Knowledge Base

After reading this Constitution, continue with:
- **concepts.md** - Core definitions (what is X?)
- **definitions.md** - Common terminology (shared language)
- **agent-roles.md** - Agent boundaries (what DO/DON'T)
- **constraints.md** - All architectural rules (reference)
- **workflows.md** - Standard patterns (how to work together)

**Constitution is the foundation. Knowledge base provides implementation details.**
