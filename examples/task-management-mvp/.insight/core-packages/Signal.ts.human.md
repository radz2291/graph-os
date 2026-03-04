# Signal.ts - Engineer's Subconscious Thinking

## File Overview
This is the **fundamental abstraction for Graph-OS communication**. Signals are the "blood" of the system - they're how nodes talk to each other. Everything in Graph-OS is signal-driven, so this is the most critical foundation.

## Line-by-Line Thinking

### Lines 18-38: Signal Interface Definition
**Thinking:** I'm defining the Signal interface with four key properties. This is the contract that all signals must follow. The `type` is NAMESPACE.ACTION format. The `payload` carries data. The `timestamp` is when signal was created. The `sourceNodeId` is where it came from. Optional `metadata` is for extensibility.

**Why:** Strong typing is essential for Graph-OS because signals flow between loosely-coupled nodes. If the contract is ambiguous, nodes will misinterpret signals and the whole system breaks. TypeScript interfaces provide that compile-time guarantee.

**Design Decision:** `payload: unknown` is intentional - it allows any data structure. Different signals carry different payload types. The payload schema is validated by the receiving node or by signal registry.

### Lines 40-51: SignalEmitter Interface
**Thinking:** This interface is for nodes that produce output signals. They need an `emit()` method for single signals and `emitMultiple()` for batches. This allows nodes to send one or many signals in a single operation.

**Why:** Not all nodes produce output, but those that do need a standard way to do it. By defining this interface, I can type-check that nodes implement the required methods. The `emitMultiple()` method is an optimization for nodes that produce multiple outputs at once (reduces signal routing overhead).

**Use Case Example:** A validation node that checks multiple fields might emit different signals for each field. With `emitMultiple()`, it can emit all of them in one operation.

### Lines 53-62: SignalReceiver Interface
**Thinking:** This interface is for nodes that consume input signals. They implement a `receive()` method that returns a Promise. This makes signal processing asynchronous by default.

**Why:** All nodes must be able to receive signals, even if they're just pass-through nodes. The Promise return is critical because node processing might involve I/O (API calls, database access) that shouldn't block the main thread.

**Error Handling:** The Promise rejection mechanism allows nodes to signal processing errors. If `receive()` throws or rejects, the runtime can catch the error and route it appropriately (to error handling nodes or DLQ).

### Lines 64-77: Type Guard Function
**Thinking:** This `isSignal()` function is a runtime type guard. It checks if an object matches the Signal interface at runtime. This is essential because signals might come from external sources (APIs, other runtimes) that don't guarantee TypeScript types.

**Why:** JavaScript doesn't have runtime types. Even though we compile with TypeScript, at runtime any object could claim to be a Signal. This function provides safety by validating the structure before the runtime tries to process it.

**Validation Logic:**
1. Check if object is not null/undefined
2. Check if type is string
3. Check if payload exists
4. Check if timestamp is Date object
5. Check if sourceNodeId is string

**Performance:** All these checks are O(1) property access, so it's very fast. This function can be called thousands of times per second without significant overhead.

### Lines 79-98: Factory Function
**Thinking:** This `createSignal()` function is a convenience factory. It creates a properly-structured Signal object with defaults set (current timestamp, empty metadata if not provided). This reduces boilerplate when creating signals throughout the codebase.

**Why:** Manually creating Signal objects is error-prone. Developers might forget the timestamp or metadata. By providing a factory function, I ensure all signals are created consistently with required fields populated.

**Default Values:**
- `timestamp: new Date()` - Always use current time
- `metadata?: Record<string, unknown>` - Optional, defaults to undefined

---

## Big Picture Understanding

### Architectural Philosophy

**Signal-First Design:**
- Everything is a signal (user actions, system events, data updates)
- Nodes don't call methods on each other; they emit signals
- This decoupling is the foundation of Graph-OS modularity

**Why This Matters:**
- **Loose Coupling:** Nodes don't know about each other, only signal types
- **Testability:** Can test nodes in isolation by sending signals
- **Observability:** Every signal can be logged and traced
- **Flexibility:** Can add/remove nodes without breaking existing connections

### Interface Design Principles

**1. Minimal Viable Interface**
- Signal has only 4 required properties (plus optional metadata)
- No methods on Signal (it's a data object)
- Emitters and Receivers have 1-2 methods each

**Why:** Complex interfaces are hard to implement and maintain. By keeping it minimal, I reduce cognitive load on developers implementing nodes.

**2. Async by Default**
- `receive()` returns Promise
- No synchronous processing forced

**Why:** JavaScript is single-threaded. Blocking operations freeze the UI. By making signal processing async, I prevent the entire system from freezing during I/O operations.

**3. Runtime Type Safety**
- `isSignal()` type guard validates at runtime
- `createSignal()` factory ensures correct structure

**Why:** TypeScript only provides compile-time safety. Runtime validation catches issues from dynamic data (APIs, user input, storage).

### Signal Lifecycle

**Creation Phase:**
```
1. Node decides to emit signal
2. Node calls createSignal(type, payload, sourceNodeId)
3. Signal object created with timestamp
4. Node calls emit(signal)
5. Runtime queues signal
```

**Routing Phase:**
```
6. Runtime processes signal queue
7. SignalRouter finds matching wires
8. Targets identified by signal type
9. Signal delivered to target nodes
```

**Processing Phase:**
```
10. Target node.receive(signal) called
11. Node processes signal (async)
12. Node emits new signals (optional)
13. New signals queued and cycle repeats
```

### Payload Design Tradeoffs

**Decision: `payload: unknown` vs. Generics**
- I chose `unknown` (not generic `<T>`)

**Why:**
1. Signals flow through many nodes that don't care about payload type
2. Generic types would require boxing/unboxing at every boundary
3. Runtime doesn't enforce payload types (validation happens at node level)
4. Simpler interface (no type parameters)

**Tradeoff:**
- **Pros:** Simpler code, less type complexity, more flexible
- **Cons:** No compile-time payload validation, requires runtime checks

**Alternative Considered:**
```typescript
// Generic approach (rejected)
interface Signal<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
  sourceNodeId: string;
}

// Why rejected: Would require <T> at every signal emission
// Makes interface complex for little benefit
```

### Timestamp Semantics

**Decision: ISO 8601 Date Object**
- Timestamp is `Date` object (not string or number)

**Why:**
1. `Date` objects can be compared and sorted
2. `toISOString()` can serialize for storage/transmission
3. JavaScript Date has built-in timezone handling
4. Natural fit with JavaScript ecosystem

**Usage Pattern:**
```typescript
// Create signal with current time
const signal = createSignal('TASK.CREATED', task, 'node-1');
signal.timestamp === new Date(); // true

// Serialize for storage/transmission
JSON.stringify(signal); // timestamp becomes ISO string

// Deserialize
const restored = JSON.parse(json);
restored.timestamp = new Date(restored.timestamp);
```

### Metadata Extensibility

**Design Choice: Optional Metadata Field**
- `metadata?: Record<string, unknown>` is optional
- No predefined structure
- Can contain any key-value pairs

**Why:**
1. **Future-proofing:** Don't know what metadata will be needed
2. **Open extension:** Allows adding fields without breaking Signal interface
3. **Decoupled:** Core signal logic doesn't depend on metadata

**Use Cases:**
- **Trace ID:** `metadata.traceId = 'abc-123'` (distributed tracing)
- **Correlation ID:** `metadata.correlationId = 'xyz-789'` (log aggregation)
- **User Context:** `metadata.userId = 'user-1', metadata.sessionId = 'session-1'`
- **Retry Info:** `metadata.retryCount = 2, metadata.lastError = '...'`

### Error Handling Philosophy

**No Explicit Error Signal Type**
- Signal interface doesn't define separate ErrorSignal type
- Errors are just signals with error payloads

**Why:**
1. **Simplicity:** One signal type for everything
2. **Consistency:** Errors flow through same routing system
3. **Flexibility:** Any signal can carry error data

**Error Signal Pattern:**
```typescript
// Error signal example
const errorSignal: Signal = {
  type: 'TASK.VALIDATION_FAILED',
  payload: {
    error: 'Title is required',
    code: 'REQUIRED_FIELD_MISSING',
    details: { field: 'title' }
  },
  timestamp: new Date(),
  sourceNodeId: 'task-validator',
  metadata: {
    severity: 'error',
    category: 'validation'
  }
};
```

**Why This Works:**
- Nodes emit error signals like any other signal
- Wires route error signals to error handling nodes
- Error handling nodes process errors and emit recovery signals

### Performance Considerations

**Type Guard Overhead:**
```typescript
function isSignal(obj: unknown): obj is Signal {
  // 6 property access operations
  // 2 type checks (typeof, instanceof)
  // Total: ~100 nanoseconds per call
}
```

**Optimization Strategies:**
1. **Early Return:** If `typeof obj !== 'object'`, return false immediately (fast path)
2. **Type Checks First:** `typeof` is faster than `instanceof` check
3. **Minimal Property Access:** Only check required properties (not optional metadata)

**Performance Impact:**
- Called for every signal entering/leaving runtime
- With 1,000 signals/second: ~100 microseconds overhead (0.01%)
- Negligible compared to I/O operations

### Future Evolution

**Phase 2: Signal Schemas**
```typescript
interface Signal<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
  sourceNodeId: string;
  schema?: JSONSchema; // Runtime payload validation
  metadata?: Record<string, unknown>;
}
```

**Phase 3: Signal Batching**
```typescript
interface SignalBatch {
  signals: Signal[];
  timestamp: Date;
  batchId: string;
}

interface SignalEmitter {
  emit(signal: Signal): void;
  emitBatch(batch: SignalBatch): void; // For high-throughput
}
```

**Phase 4: Signal Causality**
```typescript
interface Signal {
  type: string;
  payload: unknown;
  timestamp: Date;
  sourceNodeId: string;
  causalityId?: string; // Links related signals
  parentSignalId?: string; // For causal chains
  metadata?: Record<string, unknown>;
}
```

### Testing Strategy

**Unit Tests Needed:**
1. `isSignal()` type guard with valid signals
2. `isSignal()` with invalid objects (null, missing fields, wrong types)
3. `createSignal()` factory with all parameters
4. `createSignal()` with minimal parameters
5. `createSignal()` with metadata

**Integration Tests:**
1. Signal creation in one node
2. Signal routing through runtime
3. Signal reception in target node
4. Signal serialization/deserialization

**Edge Cases:**
- Signal with `null` payload
- Signal with `undefined` payload
- Signal with empty metadata object
- Signal with very large payload (10MB+)
- Signal with invalid Date object

### Security Considerations

**Payload Injection:**
- `payload: unknown` doesn't prevent malicious data
- Nodes must validate payload before processing
- Signal registry schemas provide validation rules

**Best Practices:**
1. **Never Execute Payload:** Signals are data, not code
2. **Validate Everything:** Don't trust signal payload
3. **Sanitize Displayed Data:** Escape/render safely when displaying payloads

**Example Attack:**
```typescript
// Malicious signal
const maliciousSignal: Signal = {
  type: 'TASK.SUBMITTED',
  payload: {
    title: '<script>alert("XSS")</script>',
    description: '...code...'
  },
  timestamp: new Date(),
  sourceNodeId: 'attacker'
};

// Safe handling (in display node)
function renderSignal(signal: Signal) {
  const task = signal.payload as Task;
  // React escapes HTML automatically
  return <div>{task.title}</div>; // Safe
}
```

### Known Limitations

**1. No Payload Size Limits**
- Signal interface doesn't enforce max payload size
- Large payloads could cause memory issues or network timeouts

**Mitigation:**
- Document recommended max payload size (e.g., 1MB)
- Add payload size validation in runtime
- Use streaming for large data (future enhancement)

**2. No Priority or Ordering**
- All signals are processed in FIFO order
- No mechanism for urgent vs. normal signals

**Mitigation:**
- Use separate signal types for urgent events (e.g., `SYSTEM.EMERGENCY`)
- Implement priority queue in runtime (future enhancement)

**3. No Time-to-Live (TTL)**
- Signals persist indefinitely until processed
- No expiration mechanism

**Mitigation:**
- Add TTL to metadata
- Implement signal expiration in runtime (future enhancement)

### Lessons Learned

**During Development:**
1. Initially used `payload: any` - fixed to `payload: unknown` for better type safety
2. Forgot `isSignal()` type guard - added runtime validation for external data
3. Made metadata required - changed to optional to reduce boilerplate
4. Used `number` timestamp - changed to `Date` for better timezone handling

**What I'd Do Differently:**
1. Add payload schema validation to Signal interface (future Phase 2)
2. Add signal versioning (for schema evolution)
3. Add signal compression for large payloads (future)
4. Add signal signing for authentication (future)

**Best Practices Applied:**
1. Interface segregation (minimal methods)
2. Runtime type safety (type guards)
3. Async by default (Promise-based)
4. Extensibility via metadata
5. Factory pattern for object creation