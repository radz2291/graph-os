# signal-registry.json - Engineer's Subconscious Thinking

## File Overview
This is the **authoritative source of truth** for all signal types in the task-management-mvp application. It defines the complete schema for every signal that flows between nodes. This is critical for Graph-OS - if a signal isn't in this registry, it doesn't officially exist.

## Line-by-Line Thinking

### Lines 1-5: Registry Metadata
**Thinking:** I'm defining registry metadata with version and signals array. The version is "1.0.0" because this is MVP. The signals array will contain all registered signal definitions.

**Why:** Metadata is essential for registry evolution and backwards compatibility. The signals array is the core structure - a collection of all signal definitions.

### Lines 6-38: FORM.SUBMITTED Signal Definition
**Thinking:** This is a generic form submission signal, not task-specific. It shows a user submitted some form (name, email fields). The payload schema defines that both name and email are strings. This signal is consumed by logic.validate node.

**Why:** I included this as an example/template signal even though the Task MVP doesn't use it directly. It demonstrates the signal registry pattern for other developers.

**Design Decision:** This signal is from the initial registry template and might be for future form features (user settings, profile updates, etc.). For now, it's an example of how to structure signals.

### Lines 39-70: VALIDATION.SUCCESS Signal Definition
**Thinking:** This signal is emitted when validation passes successfully. The payload includes the validated data (name, email). It's consumed by infra.storage.local node, indicating that valid data should be persisted.

**Why:** Separating success from failure signals creates clear branching paths in the graph. Success goes to storage, failure goes to display for user feedback.

**Signal Flow:** logic.validate → infra.storage.local (on success)

### Lines 71-103: VALIDATION.ERROR Signal Definition
**Thinking:** This signal is emitted when validation fails. The payload includes an errors array with details about what went wrong. It's consumed by control.display node, which shows the error to the user.

**Why:** Error signals need different structure than success signals. Instead of validated data, they carry error information. The errors array allows multiple validation errors to be reported at once.

**Error Handling Strategy:** Display node shows error message to user, who can correct input and resubmit.

### Lines 104-137: STORAGE.SAVED Signal Definition
**Thinking:** This signal is emitted after data is successfully saved to storage. Payload includes the storage key and the data that was saved. It's consumed by control.display node to update the UI.

**Why:** Confirmation signals provide user feedback. After a save operation, the user should see that their action completed successfully.

**Timestamp:** The payload includes a timestamp field, which is useful for debugging and auditing when saves occurred.

### Lines 138-193: TASK.SUBMITTED Signal Definition
**Thinking:** This is the actual task submission signal used in the Task Management MVP. It's emitted when a user creates a new task via the form. Payload includes title, description, and priority fields. Consumed by logic.validate node.

**Why:** This signal follows the NAMESPACE.ACTION pattern (TASK.SUBMITTED). It's the entry point for task creation flow in the graph.

**Business Context:** Title is required (not optional). Description is optional (user might not want to add details). Priority is required with limited options (low, medium, high).

### Lines 194-238: TASK.VALID Signal Definition
**Thinking:** This signal is emitted after task validation passes. Payload includes the validated task data (title, description, priority). Consumed by infra.storage.local node, which will persist the task.

**Why:** Validated tasks need to be stored. This signal bridges the validation and storage steps in the task creation flow.

**Signal Flow:** TASK.SUBMITTED → logic.validate → TASK.VALID → infra.storage.local

### Lines 239-284: TASK.SAVED Signal Definition
**Thinking:** This signal is emitted after task is successfully saved to storage. Payload includes storage key, task data array, and timestamp. Consumed by control.display node to update the UI.

**Why:** The storage key ("tasks") indicates which storage bucket was used. The data field contains the full task array (existing tasks + new task). This allows display node to show the updated list.

**Timestamp Importance:** Crucial for debugging - knowing exactly when save occurred helps diagnose timing issues.

### Lines 285-329: TASK.INVALID Signal Definition
**Thinking:** This signal is emitted when task validation fails. Payload includes an errors array with details about what validation failed. Consumed by control.display node to show error message to user.

**Why:** Validation errors need to be communicated clearly to the user. The errors array structure allows multiple validation failures to be reported simultaneously (e.g., missing title AND invalid priority).

**Error Recovery:** User sees error message, corrects input, and resubmits form.

---

## Big Picture Understanding

### Registry as Source of Truth

**Principle:** The signal-registry.json is the authoritative source for all signal definitions.

**Why This Matters:**
1. **Discoverability:** Developers can find all available signals in one place
2. **Validation:** Runtime can verify signal types against registry
3. **Documentation:** Signal schemas are documented centrally
4. **Consistency:** Ensures signal naming follows NAMESPACE.ACTION pattern

**Impact on Architecture:**
- Cartridges reference signals that must be registered here
- Nodes emit signals defined in this registry
- Runtime uses this registry for validation and routing

### Signal Categorization

**Namespaces in This Registry:**
1. **FORM** - Generic form submission signals
2. **VALIDATION** - Validation result signals (success/error)
3. **STORAGE** - Storage operation signals
4. **TASK** - Task-specific signals

**Why Namespaces Matter:**
- **Organization:** Groups related signals together
- **Conflict Prevention:** Different domains can't have naming collisions
- **Semantic Meaning:** Namespace indicates domain of concern (task, auth, trading, etc.)
- **Searchability:** Easy to find all task-related signals

**Naming Convention:** `NAMESPACE.ACTION` (UPPER_SNAKE_CASE)
- ✅ Correct: `TASK.SUBMITTED`, `VALIDATION.SUCCESS`
- ❌ Incorrect: `task_submitted`, `ValidationSuccess`

### Schema Design Philosophy

**JSON Schema Structure:**
```json
{
  "type": "object",
  "properties": {
    "fieldName": {
      "type": "string",
      "constraints": {...}
    }
  },
  "required": ["field1", "field2"]
}
```

**Why JSON Schema:**
1. **Declarative:** Schema defines structure, not validation logic
2. **Standard:** JSON Schema is a recognized standard (not custom)
3. **Validatable:** Schema can be validated itself
4. **Portable:** Can be used across different languages/validators

**Schema Validation Rules:**
1. **Type Checking:** Enforces correct data types (string, number, boolean)
2. **Required Fields:** Ensures mandatory data is present
3. **Constraints:** minLength, maxLength, enum values, numeric ranges
4. **Nested Structures:** Supports complex objects and arrays

### Signal Lifecycle

**Creation Phase:**
1. Node decides to emit signal
2. Signal structure defined in registry
3. Node creates signal object with payload matching schema
4. Runtime validates payload against registry schema

**Emission Phase:**
1. Signal emitted to runtime queue
2. Runtime routes signal to target nodes
3. Target nodes receive and process signal

**Validation Phase:**
1. Runtime checks if signal type is in registry
2. Runtime validates payload against schema
3. Validation errors thrown if payload doesn't match schema

### Integration with Cartridges

**Reference Pattern:**
```json
// In cartridge JSON
{
  "from": "task-validator",
  "to": "task-storage",
  "signalType": "TASK.VALID"  // Must exist in registry
}
```

**Registration Pattern:**
```json
// In signal-registry.json
{
  "type": "TASK.VALID",
  "namespace": "TASK",
  "action": "VALID",
  "emittedBy": ["logic.validate"],
  "consumedBy": ["infra.storage.local"]
}
```

**Why This Works:**
1. Cartridges define signal flows between nodes
2. Registry defines signal contracts (structure, schema)
3. Runtime validates cartridges against registry
4. Ensures signal contracts are honored

### Backward Compatibility Strategy

**Versioning:**
```json
{
  "version": "1.0.0",
  "signals": [...]
}
```

**Evolution Rules:**
1. **Never remove signals** - Only deprecate with clear warnings
2. **Never change signal type** - NAMESPACE.ACTION is permanent
3. **Never make required fields optional** - Breaks existing consumers
4. **Only add new optional fields** - Safe for existing consumers
5. **Only add new signals** - Doesn't affect existing flows

**Why This Matters:**
- Prevents breaking existing cartridges
- Allows gradual migration to new schemas
- Enables multiple versions to coexist temporarily

### Signal Documentation Strategy

**Fields in Registry Entry:**
1. **type** - Signal type (NAMESPACE.ACTION)
2. **namespace** - Signal namespace (first part of type)
3. **action** - Signal action (second part of type)
4. **description** - Human-readable explanation
5. **payloadSchema** - JSON Schema for payload validation
6. **emittedBy** - List of node types that emit this signal
7. **consumedBy** - List of node types that receive this signal
8. **registeredAt** - Timestamp when signal was registered

**Why Each Field Matters:**
- **type/namespace/action:** Enables automatic parsing and validation
- **description:** Provides context for developers
- **payloadSchema:** Enforces contract, enables validation
- **emittedBy/consumedBy:** Documents flow, enables traceability
- **registeredAt:** Auditing, debugging, evolution tracking

### Testing Considerations

**Schema Validation Tests:**
1. Valid payload should pass validation
2. Invalid payload should fail with clear errors
3. Missing required fields should fail
4. Wrong type should fail
5. Enum violations should fail

**Integration Tests:**
1. Signal emitted by node → Runtime validates → Signal routed
2. Invalid signal type → Runtime error
3. Invalid payload → Runtime validation error
4. Signal not in registry → Runtime error

### Future Evolution

**Phase 1.5: Complete Signal Coverage**
- Add TASK.COMPLETED signal definition
- Add TASK.DELETED signal definition
- Add TASK.LISTED signal definition
- Add TASK.UPDATED signal definition

**Phase 2: Enhanced Schemas**
- Add more detailed validation rules
- Add format patterns (email regex, UUID validation)
- Add custom validators (cross-field validation)
- Add i18n support (error messages in multiple languages)

**Phase 3: Signal Metadata**
- Add priority field (urgent/normal/low priority)
- Add retry policy field (retry/ignore)
- Add TTL field (time-to-live for signals)
- Add routing hints field (which nodes should receive)

### Known Limitations

**1. No Schema Inheritance**
- **Issue:** Can't define base schema and extend it
- **Impact:** Repeating common fields across signals
- **Fix:** Implement schema references/imports (future)

**2. No Cross-Field Validation**
- **Issue:** Can't validate that endDate > startDate
- **Impact:** Complex validation rules require custom code
- **Fix:** Add custom validation hooks (future)

**3. No Conditional Schemas**
- **Issue:** Can't define "if field A = X, then field B = Y"
- **Impact:** Complex validation rules require custom code
- **Fix:** Add conditional schema support (future)

**4. No Versioning per Signal**
- **Issue:** Can't have multiple versions of same signal
- **Impact:** Can't evolve signals without breaking existing consumers
- **Fix:** Add version field to signal definition (future)

### Lessons Learned

**During Development:**
1. Initially forgot TASK.COMPLETED signal - added after React implementation needed it
2. Incomplete signal coverage - some signals used in code but not in registry
3. Missing enum validation - allowed any priority value, should restrict to low/medium/high
4. No error schemas - defined success payloads but not error payloads clearly

**What I'd Do Differently:**
1. Design complete signal set upfront (task CRUD operations)
2. Include error schemas for every failure scenario
3. Add signal documentation examples (show valid/invalid payloads)
4. Implement schema validation tests for every signal
5. Add signal deprecation policy (how to handle breaking changes)

**Best Practices Applied:**
1. NAMESPACE.ACTION naming convention
2. JSON Schema for payload validation
3. Central registry for all signal definitions
4. Metadata for discoverability (emittedBy, consumedBy)
5. Backward compatibility considerations
6. Complete documentation (description, schema)