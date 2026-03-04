# root.cartridge.json - Programming Language Processing Logic

## File Overview
JSON cartridge file defining graph topology for Task Management MVP. Contains metadata, node definitions, and wire connections processed by Graph-OS runtime.

## Line-by-Line Analysis

### Lines 1-5: Cartridge Metadata
**Processing:**
- JSON object with four top-level properties
- Version string: "1.0.0"
- Name string: "task-management-mvp"
- Description string: Human-readable purpose
- Empty arrays: inputs, outputs (no external signals)

**JSON Structure:**
```json
{
  "version": "1.0.0",
  "name": "task-management-mvp",
  "description": "Root cartridge for task-management-mvp - Task Management MVP using Graph-OS v4",
  "inputs": [],
  "outputs": []
}
```

**Validation Rules:**
- version must be string (semver format)
- name must be string (non-empty)
- description must be string (non-empty)
- inputs must be array of InputDefinition
- outputs must be array of OutputDefinition

### Lines 6-7: Empty Input/Output Arrays
**Processing:**
- Empty arrays: [] (zero elements)
- Type inference: InputDefinition[], OutputDefinition[]
- No external signal interfaces

**Memory Model:**
- Empty arrays occupy minimal memory (array header only)
- No elements to iterate or allocate
- Type checking passes at compile time

**Runtime Loading:**
1. JSON parser reads empty arrays
2. Graph-OS runtime validates structure
3. No external signal handlers registered
4. Cartridge marked as self-contained

### Lines 8-15: task-input Node Definition
**Processing:**
- Object with 5 properties (id, type, description, config)
- Nested object: config object with 2 properties
- Nested array: fields array with 3 string elements

**JSON Structure:**
```json
{
  "id": "task-input",
  "type": "control.input",
  "description": "Task input handler for creating new tasks",
  "config": {
    "outputSignalType": "TASK.SUBMITTED",
    "fields": ["title", "description", "priority"]
  }
}
```

**Validation Rules:**
- id must be unique string within cartridge
- type must be registered node type
- description must be string
- config must match NodeConfig schema
- outputSignalType must be registered signal
- fields must be array of strings

**Runtime Processing:**
1. Load node definition from JSON
2. Lookup node type "control.input" in registry
3. Create node instance with config
4. Register node under id "task-input"
5. Ready to receive/process signals

### Lines 16-33: task-validator Node Definition
**Processing:**
- Object with 5 properties
- Deeply nested object: config.schema (JSON Schema)
- Nested objects: schema.properties (3 property definitions)
- Nested arrays: schema.required (2 required fields)

**JSON Structure:**
```json
{
  "id": "task-validator",
  "type": "logic.validate",
  "description": "Validate task input",
  "config": {
    "schema": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "minLength": 1
        },
        "description": {
          "type": "string"
        },
        "priority": {
          "type": "string",
          "enum": ["low", "medium", "high"]
        }
      },
      "required": ["title", "priority"]
    },
    "successSignalType": "TASK.VALID",
    "failureSignalType": "TASK.INVALID"
  }
}
```

**JSON Schema Validation:**
```javascript
// Pseudo-code for schema validation
function validate(schema, data) {
  // Check type
  if (typeof data !== schema.type) return false;
  
  // Check required fields
  for (const field of schema.required) {
    if (!(field in data)) return false;
  }
  
  // Check properties
  for (const [name, propSchema] of Object.entries(schema.properties)) {
    const value = data[name];
    
    // Check string type
    if (propSchema.type === 'string' && typeof value !== 'string') return false;
    
    // Check minLength
    if (propSchema.minLength && value.length < propSchema.minLength) return false;
    
    // Check enum
    if (propSchema.enum && !propSchema.enum.includes(value)) return false;
  }
  
  return true;
}
```

**Memory Model:**
- Schema object: ~200 bytes (static)
- Node instance: ~500 bytes (including validation logic)
- Config object: ~300 bytes

### Lines 34-40: task-storage Node Definition
**Processing:**
- Object with 5 properties
- Config with 4 properties (key, signal types)
- String values for storage key and signal names

**JSON Structure:**
```json
{
  "id": "task-storage",
  "type": "infra.storage.local",
  "description": "Store tasks in local storage",
  "config": {
    "key": "tasks",
    "outputSignalType": "TASK.SAVED",
    "deleteSignalType": "TASK.DELETED",
    "listSignalType": "TASK.LISTED"
  }
}
```

**Runtime Processing:**
1. Parse config properties
2. Initialize storage with key "tasks"
3. Register 3 output signal types
4. Node ready to process storage operations

### Lines 41-45: task-display Node Definition
**Processing:**
- Object with 5 properties
- Config with 2 properties (format, showTimestamp)
- String and boolean config values

**JSON Structure:**
```json
{
  "id": "task-display",
  "type": "control.display",
  "description": "Display task results and lists",
  "config": {
    "format": "json",
    "showTimestamp": true
  }
}
```

### Lines 46-51: Wire 1 (Input to Validator)
**Processing:**
- Object with 3 properties (from, to, signalType)
- String values for node IDs and signal type
- Defines directed edge in graph

**JSON Structure:**
```json
{
  "from": "task-input",
  "to": "task-validator",
  "signalType": "TASK.SUBMITTED"
}
```

**Graph Data Structure:**
```javascript
// Adjacency list representation
const graph = {
  "task-input": {
    outgoing: [
      { to: "task-validator", signal: "TASK.SUBMITTED" }
    ]
  },
  "task-validator": {
    incoming: [
      { from: "task-input", signal: "TASK.SUBMITTED" }
    ],
    outgoing: [
      { to: "task-storage", signal: "TASK.VALID" },
      { to: "task-display", signal: "TASK.INVALID" }
    ]
  }
  // ... other nodes
};
```

**Signal Routing:**
1. Signal emitted from "task-input"
2. Runtime queries SignalRouter
3. Router looks up "TASK.SUBMITTED" signal
4. Router finds wire 1 matches signal type
5. Router routes to target node "task-validator"
6. Node processes signal

### Lines 52-63: Wires 2-4 (Validator/Storage/Display)
**Processing:**
- Wire 2: Validator → Storage (success path)
- Wire 3: Storage → Display (save confirmation)
- Wire 4: Validator → Display (error path)

**Graph Traversal Example:**
```javascript
// Task creation workflow
const workflow = [
  { step: 1, node: "task-input", action: "emit", signal: "TASK.SUBMITTED" },
  { step: 2, node: "task-validator", action: "validate", result: "pass" },
  { step: 3, wire: 2, signal: "TASK.VALID", target: "task-storage" },
  { step: 4, node: "task-storage", action: "save", signal: "TASK.SAVED" },
  { step: 5, wire: 3, signal: "TASK.SAVED", target: "task-display" },
  { step: 6, node: "task-display", action: "render" }
];
```

**Conditional Branching:**
```javascript
// Validation outcome routing
const validationPassed = validateTask(submittedTask);

if (validationPassed) {
  // Follow Wire 2
  emitSignal("TASK.VALID", task, "task-storage");
} else {
  // Follow Wire 4
  emitSignal("TASK.INVALID", errors, "task-display");
}
```

---

## Big Picture: Technical Processing

### JSON Parsing and Validation

**Parsing Process:**
```javascript
// Browser native JSON parser
const cartridge = JSON.parse(jsonString);

// Result: JavaScript object
{
  version: "1.0.0",
  name: "task-management-mvp",
  nodes: [...],
  wires: [...]
}
```

**Schema Validation (at Runtime):**
```javascript
// Graph-OS cartridge validation
function validateCartridge(cartridge) {
  // Check required properties
  if (!cartridge.version || !cartridge.nodes || !cartridge.wires) {
    return { valid: false, errors: ["Missing required properties"] };
  }
  
  // Validate nodes
  for (const node of cartridge.nodes) {
    if (!node.id || !node.type) {
      return { valid: false, errors: [`Node missing id or type`] };
    }
  }
  
  // Validate wires
  for (const wire of cartridge.wires) {
    if (!wire.from || !wire.to || !wire.signalType) {
      return { valid: false, errors: [`Wire missing required properties`] };
    }
  }
  
  // Check node ID uniqueness
  const nodeIds = cartridge.nodes.map(n => n.id);
  const uniqueIds = new Set(nodeIds);
  if (nodeIds.length !== uniqueIds.size) {
    return { valid: false, errors: ["Duplicate node IDs"] };
  }
  
  return { valid: true, errors: [] };
}
```

### Graph Construction

**Node Instantiation:**
```javascript
// Pseudo-code for node factory
async function createNodes(cartridge) {
  const nodes = new Map();
  
  for (const nodeDef of cartridge.nodes) {
    // Lookup node implementation
    const NodeClass = nodeRegistry.get(nodeDef.type);
    
    // Create instance
    const node = new NodeClass(nodeDef.config);
    
    // Store in map
    nodes.set(nodeDef.id, node);
    
    // Initialize node
    await node.initialize({
      sendSignal: (signal) => runtime.emit(signal),
      logger: createLogger(nodeDef.id)
    });
  }
  
  return nodes;
}
```

**Wire Connection:**
```javascript
// Pseudo-code for wire connection
function connectWires(cartridge, nodes) {
  const wireMap = new Map(); // signalType -> targets
  
  for (const wire of cartridge.wires) {
    // Get source and target nodes
    const source = nodes.get(wire.from);
    const target = nodes.get(wire.to);
    
    // Validate nodes exist
    if (!source || !target) {
      throw new Error(`Wire references non-existent node: ${wire.from} → ${wire.to}`);
    }
    
    // Create wire mapping
    if (!wireMap.has(wire.signalType)) {
      wireMap.set(wire.signalType, []);
    }
    
    wireMap.get(wire.signalType).push(target);
  }
  
  return wireMap;
}
```

### Signal Routing Engine

**Signal Router Data Structure:**
```javascript
class SignalRouter {
  constructor(wires) {
    // Build routing table
    this.routes = new Map(); // signalType -> Node[]
    
    for (const wire of wires) {
      if (!this.routes.has(wire.signalType)) {
        this.routes.set(wire.signalType, []);
      }
      
      const targetNode = nodes.get(wire.to);
      this.routes.get(wire.signalType).push(targetNode);
    }
  }
  
  findTargets(signal) {
    // O(1) lookup by signal type
    return this.routes.get(signal.type) || [];
  }
}
```

**Signal Propagation:**
```javascript
// Signal flow through graph
async function propagateSignal(signal) {
  // Find target nodes
  const targets = router.findTargets(signal);
  
  if (targets.length === 0) {
    // No targets for this signal
    console.log(`No targets for signal: ${signal.type}`);
    return;
  }
  
  // Process in parallel
  const results = await Promise.allSettled(
    targets.map(node => node.process(signal))
  );
  
  // Check for failures
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`${failures.length} nodes failed`);
  }
}
```

### Node Execution Model

**Synchronous vs. Asynchronous:**
```javascript
// Synchronous node (e.g., validation)
class ValidatorNode {
  async process(signal) {
    // CPU-bound operation (fast)
    const isValid = validate(signal.payload, this.schema);
    
    // Synchronous return
    return isValid 
      ? { type: "TASK.VALID", payload: signal.payload }
      : { type: "TASK.INVALID", payload: { errors } };
  }
}

// Asynchronous node (e.g., storage)
class StorageNode {
  async process(signal) {
    // I/O-bound operation (slow)
    const data = await storage.getItem(this.config.key);
    
    // Asynchronous return (after I/O)
    return { type: "TASK.SAVED", payload: data };
  }
}
```

**Execution Order:**
```
Signal emitted
    ↓
Router finds targets (3 nodes)
    ↓
Process Node 1 (async)
Process Node 2 (async)
Process Node 3 (async)
    ↓
Wait for all nodes to complete (Promise.allSettled)
    ↓
Collect output signals
    ↓
Emit output signals
    ↓
Repeat for next signal
```

### Memory Allocation

**Object Graph:**
```
Cartridge Object (JSON)
├── Metadata (~200 bytes)
├── Nodes Array (~800 bytes)
│   ├── task-input Object (~150 bytes)
│   ├── task-validator Object (~300 bytes)
│   ├── task-storage Object (~150 bytes)
│   └── task-display Object (~100 bytes)
└── Wires Array (~300 bytes)
    └── 4 Wire Objects (~75 bytes each)

Total: ~1,300 bytes (at rest)
```

**Runtime State:**
```
Runtime Instance
├── Cartridge Data (~1.3 KB)
├── Node Instances (~2 KB)
│   ├── Input Node (~500 bytes)
│   ├── Validator Node (~600 bytes)
│   ├── Storage Node (~500 bytes)
│   └── Display Node (~400 bytes)
├── Signal Router (~500 bytes)
├── Signal Queue (dynamic)
└── Event Handlers (dynamic)
```

### Performance Characteristics

**Time Complexity:**
- Signal routing: O(1) (hash map lookup)
- Node processing: O(n) where n = number of target nodes
- Graph traversal: O(v + e) where v = nodes, e = edges (wires)
- Node instantiation: O(n) where n = number of nodes

**Space Complexity:**
- Cartridge storage: O(n + m) where n = nodes, m = wires
- Node instances: O(n) where n = number of nodes
- Signal routing table: O(m) where m = number of wires

**Actual Performance (Estimated):**
- Parse JSON: < 1ms (small file)
- Validate cartridge: < 5ms (4 nodes, 4 wires)
- Create node instances: < 10ms (simple nodes)
- Build routing table: < 1ms (4 wires)
- Initialize runtime: < 20ms (total)

### Error Handling Mechanism

**Validation Errors:**
```javascript
try {
  const cartridge = JSON.parse(jsonString);
  const validation = validateCartridge(cartridge);
  
  if (!validation.valid) {
    throw new CartridgeError(
      "Invalid cartridge structure",
      validation.errors
    );
  }
  
  return createRuntime(cartridge);
} catch (error) {
  // Handle JSON parse errors
  // Handle validation errors
  // Handle initialization errors
}
```

**Wire Connection Errors:**
```javascript
// Check if referenced nodes exist
for (const wire of cartridge.wires) {
  if (!cartridge.nodes.find(n => n.id === wire.from)) {
    throw new WireError(
      `Wire references non-existent source node: ${wire.from}`
    );
  }
  
  if (!cartridge.nodes.find(n => n.id === wire.to)) {
    throw new WireError(
      `Wire references non-existent target node: ${wire.to}`
    );
  }
}
```

### Signal Type System

**Type Checking:**
```javascript
// Signal structure validation
function isSignal(obj) {
  return (
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    'payload' in obj &&
    obj.timestamp instanceof Date &&
    typeof obj.sourceNodeId === 'string'
  );
}
```

**Signal Registry:**
```javascript
// Signal registration from signal-registry.json
const signalRegistry = {
  "TASK.SUBMITTED": {
    namespace: "TASK",
    action: "SUBMITTED",
    payloadSchema: { /* JSON Schema */ }
  },
  "TASK.VALID": {
    namespace: "TASK",
    action: "VALID",
    payloadSchema: { /* JSON Schema */ }
  }
  // ... other signals
};
```

**Signal Validation:**
```javascript
// Validate signal against registered schema
function validateSignal(signal, registry) {
  const signalDef = registry[signal.type];
  
  if (!signalDef) {
    return { valid: false, error: "Signal not registered" };
  }
  
  // Validate payload schema
  const payloadValid = validateSchema(
    signalDef.payloadSchema,
    signal.payload
  );
  
  return payloadValid
    ? { valid: true }
    : { valid: false, error: payloadValid.errors };
}
```

### Cartridge Constraints Enforcement

**Size Constraints:**
```javascript
// Check cartridge size constraints
function enforceConstraints(cartridge) {
  // Max 30 nodes per composite
  if (cartridge.nodes.length > 30) {
    throw new ValidationError(
      `Node count ${cartridge.nodes.length} exceeds max 30`
    );
  }
  
  // Max 50 wires per composite
  if (cartridge.wires.length > 50) {
    throw new ValidationError(
      `Wire count ${cartridge.wires.length} exceeds max 50`
    );
  }
  
  // Max 10 signals per composite
  const signalTypes = new Set(
    cartridge.wires.map(w => w.signalType)
  );
  if (signalTypes.size > 10) {
    throw new ValidationError(
      `Signal count ${signalTypes.size} exceeds max 10`
    );
  }
  
  return true;
}
```

**Naming Constraints:**
```javascript
// Validate signal naming convention
function validateSignalNaming(cartridge) {
  const signalTypes = new Set(
    cartridge.wires.map(w => w.signalType)
  );
  
  for (const signalType of signalTypes) {
    // Must follow NAMESPACE.ACTION pattern
    const parts = signalType.split('.');
    if (parts.length !== 2) {
      throw new ValidationError(
        `Signal must follow NAMESPACE.ACTION pattern: ${signalType}`
      );
    }
    
    const [namespace, action] = parts;
    
    // Must be UPPER_SNAKE_CASE
    if (namespace !== namespace.toUpperCase() || 
        action !== action.toUpperCase()) {
      throw new ValidationError(
        `Signal must be UPPER_SNAKE_CASE: ${signalType}`
      );
    }
  }
  
  return true;
}
```

### Browser Compatibility

**JSON Parsing:**
- `JSON.parse()`: Supported in all browsers (IE8+)
- No polyfill needed

**JSON Schema Validation:**
- Not native in browsers
- Requires external library (e.g., Ajv, tv4)
- Graph-OS runtime includes schema validator

**Object.create():**
- Used for node instances
- Supported in all browsers (IE9+)

**Promise.allSettled():**
- Used for parallel node processing
- Supported in all modern browsers (ES2020)
- Polyfill available for older browsers

---

## Technical Constraints

**JSON Limitations:**
- No comments in JSON
- No trailing commas
- Strings must be double-quoted
- No support for undefined values
- No support for NaN/Infinity

**Browser Limitations:**
- No direct filesystem access
- Limited storage (localStorage ~5MB)
- Single-threaded execution
- No native JSON Schema validation

**Graph-OS Limitations:**
- Signal routing is unidirectional
- No cyclic signal flows (prevents loops)
- Nodes are stateless (by convention)
- No dynamic node creation at runtime