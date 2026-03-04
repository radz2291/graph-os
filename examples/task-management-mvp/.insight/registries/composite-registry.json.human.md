# composite-registry.json - Engineer's Subconscious Thinking

## File Overview
This is the **authoritative source of truth** for all composites in the task-management-mvp application. It defines the complete list of available cartridge composites that can be referenced in the graph. Currently, this is empty because the MVP uses a single root cartridge without nested composites.

## Line-by-Line Thinking

### Lines 1-4: Registry Metadata
**Thinking:** I'm defining registry metadata with version and empty composites array. The version is "1.0.0" because this is MVP. The composites array is currently empty because the application uses a flat architecture (no nested composites).

**Why:** Metadata is essential for registry evolution and future compatibility. The empty composites array indicates that this application is currently simple - a single root cartridge with all nodes defined directly (no composite references).

**Architectural Decision:** I chose to keep this registry empty initially because the MVP focuses on demonstrating core Graph-OS concepts (signals, nodes, wires) without the complexity of nested composites. This keeps the architecture simple and easier to understand for new developers.

**Future Consideration:** When the application grows and features become more complex, this registry will be populated with composite definitions. For example, if we add task filtering, searching, and categorization features, each could be implemented as a composite cartridge and registered here.

---

## Big Picture Understanding

### Registry as Source of Truth

**Principle:** The composite-registry.json is the authoritative source for all composite cartridge definitions in the application.

**Why This Matters:**
1. **Discoverability:** Developers can find all available composites in one place
2. **Validation:** Runtime can verify that composite references are valid
3. **Documentation:** Composite metadata is documented centrally
4. **Consistency:** Ensures composite naming and structure follows conventions

**Impact on Architecture:**
- Root cartridge can reference composites registered here
- Node types of format `composite.*` must be registered here
- Runtime uses this registry to load and validate composite cartridges

### When to Use Composites

**Current State (MVP):**
- No composites used
- All nodes defined directly in root cartridge
- Simple, flat architecture
- Easy to understand and debug

**Future State (Phase 2+):**
- Use composites for feature grouping
- Break root cartridge into smaller, focused composites
- Create reusable composites across different applications
- Implement proper hierarchy (root → composite → composite)

**Decision Points:**

| Complexity Level | Approach | When to Use |
|-----------------|---------|---------------|
| **Simple** (1-30 nodes) | Flat architecture (root cartridge only) | MVP, small features, simple workflows |
| **Medium** (31-100 nodes) | Some composites + root | Medium-sized features, some reusability |
| **Complex** (101+ nodes) | Heavy use of composites | Large applications, high reusability needs |

### Composite Naming Convention

**Pattern:** `composite.domain.feature`

**Why This Pattern Matters:**
1. **Discoverability:** Easy to find composites by domain (auth, task, trading)
2. **Conflict Prevention:** Different domains can't have naming collisions
3. **Semantic Meaning:** Composite name immediately indicates its purpose
4. **Consistency:** All composites follow the same convention

**Examples:**
- ✅ `composite.auth.login` - User login authentication flow
- ✅ `composite.task.crud` - Task create, read, update, delete operations
- ✅ `composite.task.filter` - Task filtering and searching capabilities
- ✅ `composite.ui.shell` - Application layout and navigation

**Invalid Names:**
- ❌ `task.crud` - Missing `composite.` prefix
- ❌ `Composite.Auth.Login` - Wrong case (should be UPPER_CASE)
- ❌ `composite.task_crud` - Wrong separator (should be `.` not `_`)

### Composite Definition Structure

**Future Structure (When Composites Added):**
```json
{
  "version": "1.0.0",
  "composites": [
    {
      "name": "composite.task.crud",
      "description": "Task CRUD operations (create, read, update, delete)",
      "nodeCount": 12,
      "signalCount": 6,
      "lastModified": "2026-02-24T12:00:00.000Z"
    },
    {
      "name": "composite.task.filter",
      "description": "Task filtering, sorting, and searching",
      "nodeCount": 8,
      "signalCount": 4,
      "lastModified": "2026-02-24T12:00:00.000Z"
    }
  ]
}
```

**Metadata Fields:**
- **name:** Composite identifier (must match cartridge filename)
- **description:** Human-readable explanation of composite's purpose
- **nodeCount:** Number of nodes in composite (constraint: 5-30)
- **signalCount:** Number of unique signals in composite (constraint: ≤ 10)
- **lastModified:** Timestamp of last composite update (for evolution tracking)

### Integration with Cartridges

**Composite Reference in Root Cartridge:**
```json
// In root.cartridge.json
{
  "nodes": [
    {
      "id": "task-crud-composite",
      "type": "composite.task.crud",
      "description": "Handles all task CRUD operations",
      "config": { /* composite-specific config */ }
    }
  ],
  "wires": [
    /* Wires that interact with composite node */
  ]
}
```

**Registration Requirement:**
```json
// In composite-registry.json
{
  "version": "1.0.0",
  "composites": [
    {
      "name": "composite.task.crud",
      /* ... other metadata */
    }
  ]
}
```

**Why Both Are Needed:**
1. **Root cartridge** defines how composite is used (wires, connections)
2. **Registry** defines that composite exists and its metadata
3. **Runtime** validates both to ensure consistency

### Hierarchy and Depth Constraints

**Current Architecture (MVP):**
```
Level 0: root.cartridge.json
├── task-input node
├── task-validator node
├── task-storage node
└── task-display node

Depth: 1 level (root only)
```

**Future Architecture (Phase 2+):**
```
Level 0: root.cartridge.json
├── task-crud-composite (composite.task.crud)
└── task-filter-composite (composite.task.filter)

Level 1: composite.task.crud.cartridge.json
├── task-create node
├── task-read node
├── task-update node
└── task-delete node

Depth: 2 levels (root → composite)
```

**Maximum Allowed Depth:**
```
Level 0: root.cartridge.json (root cartridge)
    ↓
Level 1: Top-level composites (direct children of root)
    ↓
Level 2: Nested composites (children of Level 1 composites)
    ↓
Level 3: Deep nesting (MAX DEPTH)

Constraint: Maximum 3 levels total
```

**Why Depth Constraint Matters:**
- **Complexity Management:** Deep nesting becomes hard to understand
- **Debugging Difficulty:** Deep hierarchies are hard to trace
- **Performance:** Each nesting level adds signal routing overhead
- **Cognitive Load:** Developers struggle with deep structures

### Size Constraints

**Per Composite Constraints:**
- **Max 30 nodes per composite** (Enforced by Graph-OS Constitution)
- **Max 10 signals per composite** (Enforced by Graph-OS Constitution)

**Per Root Cartridge Constraints:**
- **Max 7 top-level composites** (Direct children of root)
- **Max 50 wires per composite** (Enforced by Graph-OS Constitution)

**Why Size Constraints Matter:**
- **Prevents God-Composites:** Ensures each composite has single responsibility
- **Maintains Understandability:** Smaller composites are easier to reason about
- **Enables Composability:** Focused composites can be reused effectively
- **Performance:** Smaller composites process signals faster

### Empty Registry Strategy

**Why Registry is Currently Empty:**
1. **MVP Simplicity:** Flat architecture is easier to understand
2. **Demonstration Focus:** Core concepts (signals, nodes, wires) are the priority
3. **No Complexity:** No need for composites at this scale
4. **Learning Path:** Flat to composite evolution teaches incremental complexity

**When to Populate Registry:**
- **When node count exceeds 30** (constraint limit reached)
- **When features become complex** (need better organization)
- **When reusability is needed** (same composite in multiple applications)
- **When hierarchy is needed** (clear separation of concerns)

**Evolution Path:**
```
Phase 1 (Current): Empty registry, flat architecture
    ↓ (when adding features)
Phase 2: First composite registered (e.g., composite.task.crud)
    ↓ (when more complexity)
Phase 3: Multiple composites (task.crud, task.filter, task.export)
    ↓ (when scaling)
Phase 4: Nested composites (task.crud calls task.storage internal composite)
```

### Future Composite Planning

**Potential Composites to Add:**

**1. composite.task.crud**
- **Purpose:** Handle all task CRUD operations
- **Nodes:** task-create, task-read, task-update, task-delete
- **Signals:** TASK.CREATE_REQUEST, TASK.CREATED, TASK.UPDATE_REQUEST, etc.
- **Why:** Isolates task data operations into reusable component

**2. composite.task.filter**
- **Purpose:** Handle task filtering, sorting, and searching
- **Nodes:** filter-by-status, sort-by-date, search-by-title
- **Signals:** TASK.FILTER_REQUEST, TASK.FILTERED, TASK.SORT_REQUEST, etc.
- **Why:** Encapsulates complex query logic

**3. composite.task.export**
- **Purpose:** Handle task export to different formats (CSV, JSON, PDF)
- **Nodes:** export-csv, export-json, export-pdf
- **Signals:** TASK.EXPORT_REQUEST, TASK.EXPORTED, etc.
- **Why:** Isolates export functionality and enables format extensions

**4. composite.ui.task-list**
- **Purpose:** Render task list with pagination, sorting UI
- **Nodes:** pagination-control, sort-control, display-control
- **Signals:** UI.LIST_PAGE_REQUEST, UI.LIST_RENDERED, etc.
- **Why:** Separates UI logic from business logic

### Testing Considerations

**Unit Tests Needed (When Composites Added):**
1. **Registration Validation:** Verify composite metadata is correct
2. **Node Count Validation:** Ensure nodeCount ≤ 30
3. **Signal Count Validation:** Ensure signalCount ≤ 10
4. **Naming Convention:** Verify `composite.domain.feature` pattern
5. **Uniqueness:** Ensure no duplicate composite names

**Integration Tests Needed:**
1. **Composite Loading:** Runtime loads composite cartridge
2. **Wire Connection:** Wires connect to composite node correctly
3. **Signal Routing:** Signals flow into and out of composite
4. **Error Handling:** Errors in composite don't crash runtime

**End-to-End Tests Needed:**
1. **Composite Reference:** Root cartridge uses composite node
2. **Nested Composites:** Composite references another composite
3. **Hierarchy Depth:** Verify depth doesn't exceed 3 levels
4. **Size Constraints:** Verify all constraints are met

### Migration Strategy

**From Flat to Composite Architecture:**

**Step 1: Identify Refactoring Candidates**
- Look for groups of nodes with related functionality
- Example: task-create, task-read, task-update, task-delete → composite.task.crud
- Example: filter-by-status, sort-by-date → composite.task.filter

**Step 2: Create Composite Cartridges**
- Extract node definitions into new `.cartridge.json` files
- Define inputs and outputs for composite
- Create signals for composite communication
- Register composite in composite-registry.json

**Step 3: Update Root Cartridge**
- Replace extracted nodes with composite node references
- Update wires to connect to composite inputs/outputs
- Verify signal flow remains correct
- Test that functionality is preserved

**Step 4: Validate and Deploy**
- Run validation on updated architecture
- Test all workflows (should still work)
- Update documentation (insight files)
- Deploy to production

**Example Migration:**
```json
// Before (Flat root cartridge)
{
  "nodes": [
    {"id": "create-task", "type": "logic.create", ...},
    {"id": "read-task", "type": "logic.read", ...},
    {"id": "update-task", "type": "logic.update", ...},
    {"id": "delete-task", "type": "logic.delete", ...}
  ]
}

// After (Composite architecture)
{
  "nodes": [
    {"id": "task-crud", "type": "composite.task.crud", ...}
  ]
}

// Plus: composite.task.crud.cartridge.json (new file)
{
  "nodes": [
    {"id": "create-task", "type": "logic.create", ...},
    {"id": "read-task", "type": "logic.read", ...},
    {"id": "update-task", "type": "logic.update", ...},
    {"id": "delete-task", "type": "logic.delete", ...}
  ],
  "inputs": ["TASK.CREATE_REQUEST", "TASK.UPDATE_REQUEST", ...],
  "outputs": ["TASK.CREATED", "TASK.UPDATED", ...]
}
```

### Lessons Learned

**Why Empty Registry Initially:**
- **Decision:** Start with flat architecture for MVP simplicity
- **Benefit:** Easier to understand core concepts
- **Benefit:** Faster development (no composite management overhead)
- **Tradeoff:** Will require refactoring as application grows

**Future Considerations:**
- **Composite Reusability:** Plan for cross-application use
- **Hierarchy Management:** Keep depth under 3 levels
- **Constraint Compliance:** Always validate against Graph-OS Constitution
- **Documentation:** Keep composite metadata up to date

**Best Practices Applied:**
1. **Registry as Source of Truth:** Single place for composite definitions
2. **Naming Convention:** `composite.domain.feature` pattern
3. **Size Constraints:** Respecting max 30 nodes, 10 signals
4. **Empty Registry Strategy:** Start simple, evolve as needed
5. **Future Planning:** Roadmap for composite adoption

---

## Summary

This composite registry is currently **empty by design** for the Task Management MVP. The application uses a flat architecture (single root cartridge with all nodes defined directly). As the application grows in complexity and features, this registry will be populated with composite definitions to enable better organization, reusability, and separation of concerns.

**Current State:** Empty registry, flat architecture (Level 0 only)  
**Future State:** Multiple composites, hierarchical architecture (up to Level 3)  
**Constraint Compliance:** Max 30 nodes, 10 signals per composite (when added)  
**Evolution Path:** Gradual migration from flat to composite architecture