# signal-registry.json - Programming Language Processing Logic

## File Overview
JSON registry file defining all valid signal types in Task Management MVP application. Contains 8 signal definitions with JSON Schema payloads. Used by runtime for validation, routing, and documentation.

## Line-by-Line Analysis

### Lines 1-5: Root Object and Metadata
**Processing:**
- JSON object with two top-level properties
- Version string: "1.0.0"
- Signals array: Array of signal definitions

**JSON Structure:**
```json
{
  "version": "1.0.0",
  "signals": [...]
}
```

**JavaScript Object Model:**
```javascript
// Parsed into JavaScript object
const registry = {
  version: "1.0.0",
  signals: [
    /* SignalDefinition objects */
  ]
};
```

**Memory Allocation:**
- Version string: ~20 bytes
- Root object header: ~100 bytes
- Array header: ~20 bytes
- Total overhead: ~140 bytes (before signal definitions)

### Lines 6-38: FORM.SUBMITTED Signal Definition
**Processing:**
- Signal definition object with 6 properties
- Nested object: payloadSchema with JSON Schema
- Nested objects: properties with field definitions
- Array: emittedBy (node types), consumedBy (node types)
- String: registeredAt (ISO 8601 timestamp)

**JSON Structure:**
```json
{
  "type": "FORM.SUBMITTED",
  "namespace": "FORM",
  "action": "SUBMITTED",
  "description": "Emitted when form is submitted",
  "payloadSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string" }
    }
  },
  "emittedBy": ["control.input"],
  "consumedBy": ["logic.validate"],
  "registeredAt": "2026-02-24T03:12:25.624Z"
}
```

**JavaScript Object Model:**
```javascript
const formSubmittedSignal = {
  type: "FORM.SUBMITTED",
  namespace: "FORM",
  action: "SUBMITTED",
  description: "Emitted when form is submitted",
  payloadSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string" }
    }
  },
  emittedBy: ["control.input"],
  consumedBy: ["logic.validate"],
  registeredAt: new Date("2026-02-24T03:12:25.624Z")
};
```

**Data Types:**
- `type`: String (constant)
- `namespace`: String (derived from type)
- `action`: String (derived from type)
- `description`: String (documentation)
- `payloadSchema`: Object (JSON Schema)
- `emittedBy`: Array<String> (node type names)
- `consumedBy`: Array<String> (node type names)
- `registeredAt`: Date (timestamp object)

**Memory Allocation:**
- Signal object: ~800 bytes
- Payload schema: ~300 bytes
- Arrays: ~100 bytes (2 node types each)
- Total: ~1.2 KB per signal definition

### Lines 39-70: VALIDATION.SUCCESS Signal Definition
**Processing:**
- Signal definition object with 6 properties
- Payload schema defines validated data structure
- Emitted by: logic.validate node (success path)
- Consumed by: infra.storage.local node

**JSON Schema Validation:**
```javascript
// Pseudo-code for schema validation
function validatePayload(signal, registry) {
  const signalDef = registry.signals.find(s => s.type === signal.type);
  const schema = signalDef.payloadSchema;
  
  // Check type is object
  if (typeof signal.payload !== 'object') {
    return { valid: false, errors: ['Payload must be object'] };
  }
  
  // Check required fields
  for (const field of Object.keys(schema.properties)) {
    if (!(field in signal.payload)) {
      return { valid: false, errors: [`Missing required field: ${field}`] };
    }
  }
  
  // Check field types
  for (const [field, fieldSchema] of Object.entries(schema.properties)) {
    const value = signal.payload[field];
    
    if (typeof value !== fieldSchema.type) {
      return { valid: false, errors: [`Field ${field} must be ${fieldSchema.type}`] };
    }
  }
  
  return { valid: true, errors: [] };
}
```

**Runtime Validation Flow:**
```
Signal Emitted
    ↓
Runtime finds signal definition in registry
    ↓
Runtime retrieves payload schema
    ↓
Schema validator validates payload against schema
    ↓
Validation Result (pass/fail)
    ↓
If fail: Throw ValidationError
If pass: Continue to node processing
```

### Lines 71-103: VALIDATION.ERROR Signal Definition
**Processing:**
- Error signal with array-based payload schema
- Emitted by: logic.validate node (failure path)
- Consumed by: control.display node (UI feedback)

**Error Payload Structure:**
```json
{
  "type": "VALIDATION.ERROR",
  "payload": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**JSON Schema Processing:**
```javascript
// Error payload schema
const errorSchema = {
  type: "object",
  properties: {
    errors: {
      type: "array",
      // No item schema defined - flexible structure
    }
  }
};

// Validation logic
function validateErrorPayload(payload) {
  if (typeof payload !== 'object') return false;
  if (!Array.isArray(payload.errors)) return false;
  return true; // No validation on error items themselves
}
```

**Flexible Schema Design:**
- Errors array has no item schema constraint
- Allows any error structure (field, message, code, etc.)
- Tradeoff: Loose validation vs. strict typing
- Benefit: Backward compatible with new error fields

### Lines 104-137: STORAGE.SAVED Signal Definition
**Processing:**
- Success signal after storage operation
- Payload includes storage key and data
- Emitted by: infra.storage.local node
- Consumed by: control.display node

**Payload Schema:**
```json
{
  "key": "string",  // Storage bucket name
  "data": "object" // Stored data (task array)
}
```

**Memory Model:**
- Key string: ~20 bytes (e.g., "tasks")
- Data object: Varies (depends on stored data size)
- For task storage: ~1-10 KB (10-100 tasks)
- Total payload: ~1-10 KB

### Lines 138-193: TASK.SUBMITTED Signal Definition
**Processing:**
- Task creation signal with 3 fields
- Payload schema includes required/optional fields
- Emitted by: control.input node (React form)
- Consumed by: logic.validate node

**Required Field Validation:**
```javascript
// Required fields check
const requiredFields = ['title', 'priority'];

function validateRequiredFields(payload) {
  const missingFields = requiredFields.filter(field => !(field in payload));
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
  
  return true;
}

// Usage
validateRequiredFields({
  title: "Buy groceries",
  description: "Need milk, eggs, bread",
  priority: "high"
  // Missing 'priority' field would throw error
});
```

**Optional Field Handling:**
```javascript
// Optional fields are not validated for presence
function validateOptionalFields(payload) {
  // 'description' is optional, not validated
  if ('description' in payload) {
    // If present, validate type
    if (typeof payload.description !== 'string') {
      throw new ValidationError('description must be string');
    }
  }
  // If absent, no error (valid)
  return true;
}
```

**Enum Validation:**
```javascript
// Priority enum validation
const validPriorities = ['low', 'medium', 'high'];

function validatePriority(payload) {
  if (!validPriorities.includes(payload.priority)) {
    throw new ValidationError(
      `Invalid priority: ${payload.priority}. Must be one of: ${validPriorities.join(', ')}`
    );
  }
  return true;
}
```

### Lines 194-238: TASK.VALID Signal Definition
**Processing:**
- Validated task signal with same 3 fields
- Payload identical to TASK.SUBMITTED (after validation)
- Emitted by: logic.validate node (success path)
- Consumed by: infra.storage.local node

**Signal Flow:**
```
TASK.SUBMITTED
    ↓ (emitted by control.input)
logic.validate (task-validator node)
    ↓ (validates schema)
Validation Result
    ↓ (if valid)
TASK.VALID
    ↓ (emitted by logic.validate)
infra.storage.local (task-storage node)
    ↓ (persists to localStorage)
TASK.SAVED
    ↓ (emitted by infra.storage.local)
control.display (task-display node)
    ↓ (updates UI)
User sees updated task list
```

**Immutable Payload Guarantee:**
```javascript
// TASK.SUBMITTED payload
const original = { title: "Task", description: "...", priority: "high" };

// TASK.VALID payload (identical)
const validated = { title: "Task", description: "...", priority: "high" };

// Reference equality
original === validated; // false (different objects)

// Value equality (shallow)
JSON.stringify(original) === JSON.stringify(validated); // true

// Guarantee: Validation doesn't modify payload, only validates
```

### Lines 239-284: TASK.SAVED Signal Definition
**Processing:**
- Success signal after task storage
- Payload includes key, data array, timestamp
- Emitted by: infra.storage.local node
- Consumed by: control.display node

**Timestamp Processing:**
```javascript
// ISO 8601 timestamp string
const timestamp = "2024-02-24T12:00:00.000Z";

// Parse to Date object
const date = new Date(timestamp);
// => Date(2024-02-24T12:00:00.000Z)

// Format for display
const displayDate = date.toLocaleDateString();
// => "2/24/2024"

// Format for sorting (sortable)
const sortable = date.getTime();
// => 1708777600000 (milliseconds since epoch)
```

**Data Structure:**
```javascript
// Saved task array structure
const taskArray = [
  {
    id: "1234567890",
    title: "Buy groceries",
    description: "Need milk, eggs, bread",
    priority: "high",
    status: "pending",
    createdAt: "2024-02-24T12:00:00.000Z"
  },
  {
    id: "1234567891",
    title: "Write report",
    description: "Q1 sales analysis",
    priority: "medium",
    status: "pending",
    createdAt: "2024-02-24T13:00:00.000Z"
  }
];

// JSON size calculation
const jsonSize = JSON.stringify(taskArray).length;
// => ~450 bytes for 2 tasks
// => ~225 bytes per task (average)
```

### Lines 285-329: TASK.INVALID Signal Definition
**Processing:**
- Error signal after validation failure
- Payload includes errors array
- Emitted by: logic.validate node
- Consumed by: control.display node

**Error Array Processing:**
```javascript
// Multiple validation errors
const errors = [
  { field: "title", message: "Title is required" },
  { field: "priority", message: "Invalid priority value" }
];

// Render to UI
errors.forEach(error => {
  console.error(`${error.field}: ${error.message}`);
});

// User feedback
<div className="error-messages">
  {errors.map(error => (
    <div key={error.field} className="error">
      {error.message}
    </div>
  ))}
</div>
```

---

## Big Picture: Technical Processing

### JSON Parsing and Validation

**Parsing Process:**
```javascript
// Browser native JSON parser
const registry = JSON.parse(jsonString);

// Result: JavaScript object
{
  version: "1.0.0",
  signals: [ /* SignalDefinition objects */ ]
}

// Validation (optional but recommended)
if (!registry.version || !registry.signals) {
  throw new Error("Invalid registry structure");
}
```

**Memory Allocation:**
```
Registry Object
├── Version string: ~20 bytes
├── Array header: ~20 bytes
└── Signals array: ~9.6 KB (8 signals × 1.2 KB each)

Total: ~9.64 KB (at rest)
```

### Signal Registry Data Structure

**In-Memory Representation:**
```javascript
// Array of signal definitions
const signals = [
  {
    type: "TASK.SUBMITTED",
    namespace: "TASK",
    action: "SUBMITTED",
    payloadSchema: { /* JSON Schema */ },
    emittedBy: ["control.input"],
    consumedBy: ["logic.validate"],
    registeredAt: Date(2026-02-24T03:17:14.931Z)
  },
  /* ... 7 more signals */
];

// Lookup map for O(1) access
const signalMap = new Map();
signals.forEach(signal => {
  signalMap.set(signal.type, signal);
});

// Fast lookup
const taskSubmittedDef = signalMap.get("TASK.SUBMITTED");
// => SignalDefinition object (O(1) lookup)
```

### JSON Schema Validation Engine

**Validation Algorithm:**
```javascript
// Pseudo-code for schema validation
class SchemaValidator {
  constructor(schema) {
    this.schema = schema;
  }
  
  validate(data) {
    const errors = [];
    
    // Type checking
    if (typeof data !== this.schema.type) {
      errors.push({
        field: null,
        message: `Expected type ${this.schema.type}, got ${typeof data}`
      });
    }
    
    // Object validation
    if (this.schema.type === 'object' && typeof data === 'object') {
      // Required fields
      if (this.schema.required) {
        for (const field of this.schema.required) {
          if (!(field in data)) {
            errors.push({
              field,
              message: `Required field ${field} is missing`
            });
          }
        }
      }
      
      // Property validation
      if (this.schema.properties) {
        for (const [field, fieldSchema] of Object.entries(this.schema.properties)) {
          if (field in data) {
            const value = data[field];
            const fieldErrors = new SchemaValidator(fieldSchema)
              .validate(value);
            
            errors.push(...fieldErrors);
          }
        }
      }
    }
    
    // String validation
    if (this.schema.type === 'string' && typeof data === 'string') {
      if (this.schema.minLength && data.length < this.schema.minLength) {
        errors.push({
          field: null,
          message: `String length ${data.length} is less than minimum ${this.schema.minLength}`
        });
      }
    }
    
    // Enum validation
    if (this.schema.enum && this.schema.enum.length > 0) {
      if (!this.schema.enum.includes(data)) {
        errors.push({
          field: null,
          message: `Value ${data} is not in enum [${this.schema.enum.join(', ')}]`
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Usage
const validator = new SchemaValidator({
  type: "object",
  properties: {
    title: { type: "string", minLength: 1 },
    priority: { type: "string", enum: ["low", "medium", "high"] }
  },
  required: ["title", "priority"]
});

const result = validator.validate({
  title: "Buy groceries",
  priority: "high"
  // Missing 'description' field (optional, not required)
});

// Result
console.log(result);
// => { valid: true, errors: [] }
```

### Signal Type Parsing

**NAMESPACE.ACTION Parsing:**
```javascript
// Parse signal type into namespace and action
function parseSignalType(signalType) {
  const parts = signalType.split('.');
  
  if (parts.length !== 2) {
    throw new Error(`Invalid signal type format: ${signalType}`);
  }
  
  const [namespace, action] = parts;
  
  return { namespace, action };
}

// Usage
const parsed = parseSignalType("TASK.SUBMITTED");
console.log(parsed);
// => { namespace: "TASK", action: "SUBMITTED" }

// Validation
function validateSignalTypeFormat(signalType) {
  const parts = signalType.split('.');
  
  if (parts.length !== 2) {
    return { valid: false, error: "Must have exactly one dot" };
  }
  
  const [namespace, action] = parts;
  
  if (namespace !== namespace.toUpperCase()) {
    return { valid: false, error: "Namespace must be UPPER_CASE" };
  }
  
  if (action !== action.toUpperCase()) {
    return { valid: false, error: "Action must be UPPER_CASE" };
  }
  
  return { valid: true, error: null };
}
```

### Performance Characteristics

**Time Complexity:**
- JSON parsing: O(n) where n = JSON string length (~1-10ms for 10KB file)
- Signal lookup by type: O(1) using Map (hash table)
- Schema validation: O(m) where m = number of fields in schema (~1-5ms per signal)
- Array operations: O(k) where k = number of signals (8 signals = O(1) for most operations)

**Space Complexity:**
- Registry object: O(n) where n = number of signals
- Lookup map: O(n) additional overhead
- JSON parsed in memory: O(n) where n = JSON size
- Schema objects: O(m) where m = number of fields per signal

**Actual Performance:**
- Parse JSON: < 10ms (9.64 KB file)
- Build lookup map: < 1ms (8 signals)
- Validate signal payload: 1-5ms (3-4 fields)
- Look up signal definition: < 0.1ms (O(1) map lookup)
- Total validation time: ~5-15ms per signal

### Browser Compatibility

**JSON.parse():**
- Supported in: All browsers (IE8+)
- No polyfill needed
- Native performance: Very fast

**JSON.stringify():**
- Used by: Schema validators for error reporting
- Supported in: All modern browsers (IE9+)
- No polyfill needed for basic usage

**Date.parse():**
- Used by: Timestamp parsing (ISO 8601 format)
- Supported in: All browsers
- No polyfill needed

**Map:**
- Used by: Runtime for O(1) signal lookups
- Supported in: All modern browsers (IE11+)
- Polyfill available for older browsers

### Error Handling Mechanism

**JSON Parse Errors:**
```javascript
// JSON.parse throws on invalid JSON
try {
  const registry = JSON.parse(jsonString);
  return registry;
} catch (error) {
  throw new RegistryParseError(
    "Failed to parse signal registry JSON",
    error.message
  );
}
```

**Schema Validation Errors:**
```javascript
// Schema validator throws on invalid payload
function validateSignalPayload(signal, registry) {
  const signalDef = registry.signals.find(s => s.type === signal.type);
  
  if (!signalDef) {
    throw new UnregisteredSignalError(
      `Signal type ${signal.type} is not registered`
    );
  }
  
  const schema = signalDef.payloadSchema;
  const validator = new SchemaValidator(schema);
  const result = validator.validate(signal.payload);
  
  if (!result.valid) {
    throw new ValidationError(
      `Signal payload validation failed`,
      result.errors
    );
  }
  
  return true;
}
```

**Registration Errors:**
```javascript
// Missing required fields in signal definition
if (!signalDef.type || !signalDef.payloadSchema) {
  throw new InvalidSignalDefinitionError(
    `Signal definition missing required fields: type, payloadSchema`
  );
}

// Duplicate signal type
const existingTypes = new Set(registry.signals.map(s => s.type));
if (existingTypes.has(newSignalDef.type)) {
  throw new DuplicateSignalError(
    `Signal type ${newSignalDef.type} is already registered`
  );
}
```

---

## Technical Constraints

**JSON Format Constraints:**
- No comments allowed (JSON doesn't support comments)
- No trailing commas (JSON strict syntax)
- Strings must be double-quoted
- No undefined values (JSON doesn't support undefined)

**Schema Constraints:**
- No circular references (JSON Schema doesn't support)
- No schema inheritance (all fields must be explicitly defined)
- No cross-field validation (can't validate endDate > startDate)
- Limited to JSON Schema draft 7 features

**Browser Constraints:**
- No native JSON Schema validation (requires external library)
- No native regex support in JSON (strings are plain strings)
- No native date validation in JSON (dates are strings)
- Single-threaded execution (no parallel JSON parsing)

**Performance Constraints:**
- JSON parsing is synchronous (blocks main thread)
- Large JSON files (>100KB) cause noticeable pause
- Schema validation is CPU-intensive (complex schemas)
- No streaming JSON support (must parse entire file at once)