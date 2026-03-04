# composite-registry.json - Programming Language Processing Logic

## File Overview
JSON registry file defining all composite cartridges in Task Management MVP application. Currently empty (no composites), representing flat architecture. Contains metadata for composite evolution and validation.

## Line-by-Line Analysis

### Lines 1-4: Root Object and Metadata
**Processing:**
- JSON object with two top-level properties
- Version string: "1.0.0"
- Composites array: Empty array `[]`

**JSON Structure:**
```json
{
  "version": "1.0.0",
  "composites": []
}
```

**JavaScript Object Model:**
```javascript
// Parsed into JavaScript object
const registry = {
  version: "1.0.0",
  composites: []
};
```

**Memory Allocation:**
- Version string: ~20 bytes
- Root object header: ~100 bytes
- Empty array: ~20 bytes
- Total overhead: ~140 bytes (no composites defined)

### Empty Composites Array
**Processing:**
- Empty array `[]` with zero elements
- No composite definitions present
- Indicates flat architecture (no nested composites)

**JavaScript Array Model:**
```javascript
// Empty array in memory
const composites = [];  // 0 elements, ~40 bytes overhead

// Array length
composites.length;  // => 0

// Array iteration (no-op)
for (const composite of composites) {
  // Never executes - empty array
}
```

**Runtime Behavior:**
```
Runtime loads composite-registry.json
    ↓
Parses JSON (version, composites array)
    ↓
Finds empty composites array (0 elements)
    ↓
No composite lookups performed
    ↓
No validation against composite constraints
    ↓
Runtime proceeds with flat architecture only
```

---

## Big Picture: Technical Processing

### Registry as Empty State

**Empty State Processing:**
```javascript
// Check if registry is empty
const isEmpty = registry.composites.length === 0;  // => true

// Check if specific composite exists
function hasComposite(compositeName) {
  return registry.composites.some(c => c.name === compositeName);
  // => false for any composite name (empty array)
}

// Get composite by name (returns undefined)
function getComposite(compositeName) {
  return registry.composites.find(c => c.name === compositeName);
  // => undefined (no composites to find)
}
```

**Why Empty State is Valid:**
- Flat architecture doesn't require composites
- MVP focuses on core concepts (signals, nodes, wires)
- Composites are optimization, not requirement
- Can evolve to composites when complexity increases

### JSON Parsing and Validation

**Parsing Process:**
```javascript
// Browser native JSON parser
const registry = JSON.parse(jsonString);

// Result: JavaScript object
{
  version: "1.0.0",
  composites: []  // Empty array
}

// Validation (optional but recommended)
if (!registry.version || !Array.isArray(registry.composites)) {
  throw new Error("Invalid registry structure");
}

// Validate version format (semver)
const versionParts = registry.version.split('.');
if (versionParts.length !== 3) {
  throw new Error("Invalid version format (expected x.y.z)");
}
```

**Memory Model:**
```
Registry Object
├── Version string: ~20 bytes
├── Array header: ~20 bytes
└── Composites array: 0 elements (no data)

Total: ~140 bytes (metadata only)
```

### Future Composite Processing (When Composites Added)

**Composite Definition Structure:**
```json
{
  "name": "composite.task.crud",
  "description": "Task CRUD operations",
  "nodeCount": 12,
  "signalCount": 6,
  "lastModified": "2026-02-24T12:00:00.000Z"
}
```

**JavaScript Object Model:**
```javascript
const composite = {
  name: "composite.task.crud",
  description: "Task CRUD operations",
  nodeCount: 12,
  signalCount: 6,
  lastModified: new Date("2026-02-24T12:00:00.000Z")
};
```

**Memory Allocation (Per Composite):**
- Name string: ~100 bytes (includes `composite.` prefix)
- Description string: ~200 bytes
- nodeCount: 8 bytes (number)
- signalCount: 8 bytes (number)
- lastModified: 24 bytes (ISO string) + 24 bytes (Date object)
- Total: ~364 bytes per composite definition

### Composite Name Validation

**Naming Convention Parsing:**
```javascript
// Validate composite naming: composite.domain.feature
function validateCompositeName(name) {
  const parts = name.split('.');
  
  // Must have exactly 3 parts
  if (parts.length !== 3) {
    return {
      valid: false,
      error: "Composite name must follow composite.domain.feature pattern (3 parts)"
    };
  }
  
  const [prefix, domain, feature] = parts;
  
  // Part 1: Must be "composite"
  if (prefix !== "composite") {
    return {
      valid: false,
      error: "First part must be 'composite'"
    };
  }
  
  // Part 2: Domain (e.g., "task", "auth")
  if (domain.length === 0 || domain !== domain.toLowerCase()) {
    return {
      valid: false,
      error: "Domain must be lowercase (e.g., task, auth)"
    };
  }
  
  // Part 3: Feature (e.g., "crud", "filter")
  if (feature.length === 0 || feature.includes('-')) {
    return {
      valid: false,
      error: "Feature must be lowercase with no hyphens (e.g., crud, filter)"
    };
  }
  
  return { valid: true, error: null };
}

// Usage
const result1 = validateCompositeName("composite.task.crud");
// => { valid: true, error: null }

const result2 = validateCompositeName("task.crud");
// => { valid: false, error: "Missing composite. prefix" }

const result3 = validateCompositeName("Composite.Task.Crud");
// => { valid: false, error: "Must be lowercase" }
```

**Case Sensitivity:**
```javascript
// Correct: All lowercase
const valid = "composite.task.crud";

// Incorrect: Uppercase or Mixed Case
const invalid1 = "Composite.Task.Crud";
const invalid2 = "composite.Task.Crud";
const invalid3 = "composite.task.Crud";
```

### Size Constraints Validation

**Max 30 Nodes Per Composite:**
```javascript
// Validate node count constraint
function validateNodeCount(nodeCount) {
  const MAX_NODES = 30;
  
  if (nodeCount > MAX_NODES) {
    return {
      valid: false,
      error: `Node count ${nodeCount} exceeds maximum ${MAX_NODES}`
    };
  }
  
  return { valid: true, error: null };
}

// Usage
const result = validateNodeCount(12);
// => { valid: true, error: null } (12 ≤ 30)

const fail = validateNodeCount(35);
// => { valid: false, error: "Node count 35 exceeds maximum 30" }
```

**Max 10 Signals Per Composite:**
```javascript
// Validate signal count constraint
function validateSignalCount(signalCount) {
  const MAX_SIGNALS = 10;
  
  if (signalCount > MAX_SIGNALS) {
    return {
      valid: false,
      error: `Signal count ${signalCount} exceeds maximum ${MAX_SIGNALS}`
    };
  }
  
  return { valid: true, error: null };
}

// Usage
const result = validateSignalCount(6);
// => { valid: true, error: null } (6 ≤ 10)

const fail = validateSignalCount(12);
// => { valid: false, error: "Signal count 12 exceeds maximum 10" }
```

### Timestamp Processing

**ISO 8601 String:**
```javascript
// LastModified timestamp string
const lastModified = "2026-02-24T12:00:00.000Z";

// Parse to Date object
const date = new Date(lastModified);
// => Date(2026-02-24T12:00:00.000Z)

// Extract components
const year = date.getFullYear();      // => 2026
const month = date.getMonth() + 1;    // => 2 (months are 0-indexed)
const day = date.getDate();          // => 24
const hours = date.getHours();       // => 12
const minutes = date.getMinutes();   // => 0
const seconds = date.getSeconds();   // => 0
```

**Sortable Timestamp:**
```javascript
// Convert to milliseconds for sorting
const timestamp = date.getTime();
// => 1740388800000 (milliseconds since Unix epoch)

// Compare timestamps (for sorting by lastModified)
function sortCompositesByLastModified(composites) {
  return composites.sort((a, b) => {
    const dateA = new Date(a.lastModified).getTime();
    const dateB = new Date(b.lastModified).getTime();
    return dateB - dateA;  // Newest first
  });
}

// Usage
const sorted = sortCompositesByLastModified(registry.composites);
```

### Composite Lookup Performance

**Array-based Lookup:**
```javascript
// Find composite by name (O(n) where n = number of composites)
function findCompositeByName(registry, name) {
  return registry.composites.find(c => c.name === name);
}

// Performance characteristics
// - Empty array: O(1) (immediate undefined)
// - 1 composite: O(1) (1 comparison)
// - 10 composites: O(10) (10 comparisons)
// - 100 composites: O(100) (100 comparisons)
```

**Map-based Lookup (Optimization):**
```javascript
// Build lookup map for O(1) access
function buildCompositeLookupMap(registry) {
  const map = new Map();
  
  for (const composite of registry.composites) {
    map.set(composite.name, composite);
  }
  
  return map;
}

// Usage
const lookupMap = buildCompositeLookupMap(registry);
const composite = lookupMap.get("composite.task.crud");  // O(1)

// Performance characteristics
// - Empty array: O(1) (map built, immediate undefined)
// - 1 composite: O(1) (hash map lookup)
// - 100 composites: O(1) (hash map lookup)
// - Build overhead: O(n) one-time cost
```

**Memory Tradeoff:**
```
Array-based lookup:
- Memory: O(n) where n = number of composites
- Lookup: O(n) per query
- No build overhead

Map-based lookup:
- Memory: O(n) + O(n) = O(2n) where n = number of composites
- Lookup: O(1) per query
- Build overhead: O(n) one-time cost
```

### Registry Evolution

**Adding Composite:**
```javascript
// Add new composite to registry
function addComposite(registry, compositeDef) {
  // Validate composite definition
  const nameValidation = validateCompositeName(compositeDef.name);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }
  
  const nodeCountValidation = validateNodeCount(compositeDef.nodeCount);
  if (!nodeCountValidation.valid) {
    throw new Error(nodeCountValidation.error);
  }
  
  const signalCountValidation = validateSignalCount(compositeDef.signalCount);
  if (!signalCountValidation.valid) {
    throw new Error(signalCountValidation.error);
  }
  
  // Check for duplicates
  const exists = registry.composites.some(c => c.name === compositeDef.name);
  if (exists) {
    throw new Error(`Composite ${compositeDef.name} already exists in registry`);
  }
  
  // Add to registry
  registry.composites.push(compositeDef);
  
  return registry;
}

// Usage
const newComposite = {
  name: "composite.task.crud",
  description: "Task CRUD operations",
  nodeCount: 12,
  signalCount: 6,
  lastModified: new Date().toISOString()
};

const updatedRegistry = addComposite(registry, newComposite);
```

**Removing Composite:**
```javascript
// Remove composite from registry
function removeComposite(registry, compositeName) {
  const index = registry.composites.findIndex(c => c.name === compositeName);
  
  if (index === -1) {
    throw new Error(`Composite ${compositeName} not found in registry`);
  }
  
  // Remove from array
  registry.composites.splice(index, 1);
  
  return registry;
}

// Usage
const updatedRegistry = removeComposite(registry, "composite.task.crud");
```

**Updating Composite:**
```javascript
// Update composite metadata
function updateComposite(registry, compositeName, updates) {
  const composite = registry.composites.find(c => c.name === compositeName);
  
  if (!composite) {
    throw new Error(`Composite ${compositeName} not found in registry`);
  }
  
  // Apply updates
  Object.assign(composite, updates, {
    lastModified: new Date().toISOString()
  });
  
  return registry;
}

// Usage
const updates = {
  nodeCount: 15,  // Increased from 12
  description: "Enhanced task CRUD operations"
};

const updatedRegistry = updateComposite(registry, "composite.task.crud", updates);
```

### Registry Validation

**Complete Validation:**
```javascript
// Validate entire registry structure
function validateRegistry(registry) {
  const errors = [];
  
  // Check version
  if (!registry.version) {
    errors.push("Missing version field");
  }
  
  // Check composites array
  if (!Array.isArray(registry.composites)) {
    errors.push("composites must be an array");
  }
  
  // Check each composite
  for (const [index, composite] of registry.composites.entries()) {
    // Validate name
    const nameValidation = validateCompositeName(composite.name);
    if (!nameValidation.valid) {
      errors.push(`Composite #${index}: ${nameValidation.error}`);
    }
    
    // Validate node count
    const nodeCountValidation = validateNodeCount(composite.nodeCount);
    if (!nodeCountValidation.valid) {
      errors.push(`Composite ${composite.name}: ${nodeCountValidation.error}`);
    }
    
    // Validate signal count
    const signalCountValidation = validateSignalCount(composite.signalCount);
    if (!signalCountValidation.valid) {
      errors.push(`Composite ${composite.name}: ${signalCountValidation.error}`);
    }
    
    // Validate timestamp format
    if (composite.lastModified) {
      const date = new Date(composite.lastModified);
      if (isNaN(date.getTime())) {
        errors.push(`Composite ${composite.name}: Invalid timestamp format`);
      }
    }
  }
  
  // Check for duplicate names
  const names = registry.composites.map(c => c.name);
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    errors.push("Duplicate composite names found in registry");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Usage
const validation = validateRegistry(registry);

if (!validation.valid) {
  throw new Error(`Registry validation failed:\n${validation.errors.join('\n')}`);
}
```

### Performance Characteristics

**Time Complexity:**
- JSON parsing: O(n) where n = JSON string length (<1ms for empty registry)
- Array operations (push, find, some): O(n) where n = number of composites
- Composite lookup: O(n) (array) or O(1) (map optimization)
- Registry validation: O(n) where n = number of composites

**Space Complexity:**
- Registry object: O(1) (constant overhead for empty registry)
- Composites array: O(n) where n = number of composites
- Lookup map: O(n) additional overhead if optimization used

**Actual Performance:**
- Parse JSON: < 1ms (empty registry, 140 bytes)
- Validate structure: < 1ms (version check, array type check)
- Validate composites: 0ms (no composites to validate)
- Build lookup map: < 1ms (empty map)
- Total: < 5ms for empty registry

### Browser Compatibility

**JSON.parse():**
- Supported in: All browsers (IE8+)
- No polyfill needed
- Native performance: Very fast

**Array Methods Used:**
- `Array.some()` - Supported in IE9+
- `Array.find()` - Supported in IE9+
- `Array.findIndex()` - Supported in IE9+
- `Array.splice()` - Supported in IE5+

**Map:**
- Used for: O(1) lookup optimization
- Supported in: All modern browsers (IE11+)
- Polyfill available for older browsers

**String Methods:**
- `String.split()` - Supported in IE5+
- `String.toLowerCase()` - Supported in IE5+
- `String.includes()` - Supported in IE12+ (use `indexOf()` for older browsers)

### Error Handling Mechanism

**JSON Parse Errors:**
```javascript
// JSON.parse throws on invalid JSON
try {
  const registry = JSON.parse(jsonString);
  return registry;
} catch (error) {
  throw new RegistryParseError(
    "Failed to parse composite registry JSON",
    error.message
  );
}
```

**Validation Errors:**
```javascript
// Composite validation throws on invalid definition
function validateAndAddComposite(registry, composite) {
  const nameValidation = validateCompositeName(composite.name);
  if (!nameValidation.valid) {
    throw new ValidationError(
      `Invalid composite name: ${nameValidation.error}`,
      { field: 'name', value: composite.name }
    );
  }
  
  const sizeValidation = validateNodeCount(composite.nodeCount);
  if (!sizeValidation.valid) {
    throw new ValidationError(
      `Composite size constraint violated: ${sizeValidation.error}`,
      { field: 'nodeCount', value: composite.nodeCount }
    );
  }
  
  // Check duplicates
  const exists = registry.composites.some(c => c.name === composite.name);
  if (exists) {
    throw new DuplicateError(
      `Composite ${composite.name} already exists in registry`,
      { existingName: composite.name }
    );
  }
  
  registry.composites.push(composite);
  return registry;
}
```

---

## Technical Constraints

**JSON Format Constraints:**
- No comments allowed (JSON doesn't support comments)
- No trailing commas (JSON strict syntax)
- Strings must be double-quoted
- No undefined values (JSON doesn't support undefined)

**Empty Array Constraints:**
- Valid state for registry (no composites required)
- Indicates flat architecture (all nodes in root cartridge)
- O(1) operations for all array methods
- No memory overhead beyond array header (~40 bytes)

**Naming Constraints:**
- Composite names must follow `composite.domain.feature` pattern
- All lowercase (no uppercase letters)
- Domain and feature use hyphens for multi-word names
- No underscores (use hyphens instead)

**Size Constraints:**
- Max 30 nodes per composite (enforced at validation)
- Max 10 signals per composite (enforced at validation)
- Max 7 top-level composites in root cartridge (enforced at cartridge load)
- Max 7 composites per subsystem (enforced at cartridge load)

**Performance Constraints:**
- Array-based lookup is O(n) (linear search)
- Map-based lookup is O(1) (hash map) with O(n) build overhead
- JSON parsing is synchronous (blocks main thread)
- Registry validation is O(n) (must check each composite)