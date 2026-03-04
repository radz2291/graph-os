# GraphRuntime.ts - Engineer's Subconscious Thinking

## File Overview
This is the **core execution engine** for Graph-OS. It's the "heart" that pumps signals through the system. This is low-level implementation that requires manual setup. For most use cases, the high-level GraphRuntime from GraphRuntimeBuilder should be used instead.

## Line-by-Line Thinking

### Lines 1-24: Module Documentation and Imports
**Thinking:** I'm importing the core abstractions that this runtime depends on. These interfaces come from the @graph-os/core package. The BaseRuntimeCore provides the foundational lifecycle methods. SignalRouter and WireManager are responsible for signal routing and connection management.

**Why:** The low-level runtime needs to compose these pieces together. By importing from core, I ensure type compatibility across the entire system.

**Design Decision:** This is labeled as "low-level implementation" in the JSDoc. I want to discourage direct use of this class in favor of the higher-level API that handles setup automatically.

### Lines 34-60: Constructor
**Thinking:** I'm creating the GraphRuntimeCore class and its constructor. The constructor takes all the dependencies as parameters: cartridge (topology), nodeFactory (creates nodes), signalRouter (routes signals), wireManager (connects wires), options (runtime config), and optional logger.

**Why:** Dependency injection makes this class testable and flexible. Different implementations of NodeFactory or SignalRouter can be swapped out without changing the runtime code.

**Design Pattern:** This follows the Dependency Injection pattern. Instead of creating dependencies inside the constructor, they're passed in. This makes unit testing easy because I can inject mock dependencies.

### Lines 62-89: Initialize Method
**Thinking:** This method sets up the runtime by creating nodes and connecting wires. I check if the state is 'idle' before proceeding because initializing twice would be a bug. I iterate through the node definitions in the cartridge, use the factory to create each node, and then call the node's `initialize()` method with a context that includes a `sendSignal` function.

**Why:** The context provided to each node is crucial. It gives the node a way to emit signals back to the runtime without having a direct reference to the runtime instance. This prevents circular dependencies.

**Error Handling:** If anything goes wrong during initialization, I set the state to 'error' and emit an event. This makes the failure observable and prevents the runtime from being used in a broken state.

**Logging Strategy:** I log at different levels (debug, info, error) depending on the severity. The debug logs are useful during development but can be disabled in production.

### Lines 91-103: Start Method
**Thinking:** This method transitions the runtime from 'ready' to 'running'. I validate the state before proceeding because starting a runtime that isn't ready would be an error. Once started, the runtime begins processing any signals that have been queued.

**Why:** The 'running' state is important because it signals that the runtime is ready to accept signals. If someone tries to emit a signal before the runtime is running, that's an error.

**Event Emission:** I emit a 'runtime:start' event when the runtime starts. This allows external code to react to the runtime starting up.

### Lines 105-115: Stop Method
**Thinking:** This method transitions the runtime from 'running' to 'stopped'. It's a graceful shutdown - it doesn't destroy the runtime, just stops signal processing. I only proceed if the state is 'running' to avoid unnecessary state changes.

**Why:** Being able to stop the runtime without destroying it is useful for temporary pauses. For example, you might want to stop signal processing while performing maintenance.

### Lines 117-135: Destroy Method
**Thinking:** This method completely tears down the runtime and cleans up resources. I call the `destroy()` method on each node if it exists. This gives nodes a chance to clean up their own resources. Then I clear all the internal state (nodes, signal queue, event handlers).

**Why:** Proper cleanup is essential to avoid memory leaks. If a node holds onto resources like timers or subscriptions, they need to be released when the runtime is destroyed.

**Error Handling:** I wrap each node's destroy call in a try-catch. This ensures that if one node fails to destroy, it doesn't prevent the others from being cleaned up.

### Lines 137-155: SendSignal Method
**Thinking:** This is the main entry point for getting signals into the runtime. I validate that the runtime is running, then add the signal to the queue. Finally, I trigger queue processing.

**Why:** The queue is important because it decouples signal emission from signal processing. This means that emitting a signal is always fast, even if processing is slow.

**Validation:** I throw an error if the runtime isn't running. This is better than silently accepting the signal and never processing it, as it makes bugs easier to detect.

### Lines 157-219: ProcessSignal Method (Complex)
**Thinking:** This is the core signal processing logic. I first emit the signal to the SignalBus so that external subscribers can see it. Then I use the SignalRouter to find the target nodes for this signal. If there are no targets, I log a debug message and return. Otherwise, I process each target node in parallel using Promise.allSettled.

**Why:** Processing nodes in parallel is a performance optimization. If the signal needs to go to 5 different nodes, they can all process it simultaneously instead of one at a time.

**Error Handling:** I use Promise.allSettled instead of Promise.all. This ensures that if one node fails, it doesn't prevent the other nodes from processing the signal. I also log any failures and push the failed signals to a dead-letter queue (DLQ).

**Context Creation:** For each target node, I create a fresh context object that includes a `sendSignal` function. This is the same context that was provided during initialization, but I recreate it for each signal to ensure there's no state leakage between signals.

### Lines 267-273: GetCartridge Method
**Thinking:** Simple getter method that returns the cartridge data. This is useful for introspection - external code can inspect the runtime's topology.

**Why:** Encapsulation is important, but there needs to be a way to inspect the runtime state. Read-only getters provide controlled access to internal data.

### Lines 275-285: GetNode Method
**Thinking:** Returns a node by ID from the internal Map. Returns undefined if the node doesn't exist.

**Why:** This is useful for testing and introspection. You might want to check if a particular node exists or inspect its state.

---

## Big Picture Understanding

### Architectural Decisions

**1. Dependency Injection Pattern**
- **Decision:** All dependencies (nodeFactory, signalRouter, wireManager) passed to constructor
- **Why:** Makes class testable and flexible
- **Tradeoff:** Slightly more complex constructor, but worth it for testability

**2. Signal Queueing**
- **Decision:** Signals are queued and processed asynchronously
- **Why:** Decouples emission from processing, prevents blocking
- **Tradeoff:** Adds small delay before signal is processed, but improves performance under load

**3. Parallel Node Processing**
- **Decision:** Target nodes process signals in parallel (Promise.allSettled)
- **Why:** Better performance for signals that go to multiple nodes
- **Tradeoff:** More complex error handling (need to track which nodes failed)

**4. Graceful Degradation**
- **Decision:** Failed nodes don't prevent other nodes from processing
- **Why:** System remains operational even with node failures
- **Tradeoff:** Errors are less obvious because they're logged but not thrown

**5. Dead-Letter Queue (DLQ)**
- **Decision:** Failed signals are stored in DLQ for later inspection
- **Why:** Debugging and error recovery
- **Tradeoff:** Adds memory overhead if errors accumulate

### Integration Points

**Runtime ↔ Nodes:**
- Runtime creates nodes via NodeFactory
- Runtime provides context with `sendSignal` function
- Nodes emit signals by calling `sendSignal`
- Runtime calls `node.initialize()` on startup
- Runtime calls `node.destroy()` on shutdown (if implemented)
- Runtime calls `node.process(signal)` when signal arrives

**Runtime ↔ SignalBus:**
- Runtime emits signals to SignalBus for external subscribers
- SignalBus acts as publish/subscribe mechanism
- External code can subscribe to SignalBus to observe signals

**Runtime ↔ SignalRouter:**
- Runtime uses SignalRouter to find target nodes for signals
- SignalRouter builds routing table from wire definitions
- SignalRouter provides O(1) lookup by signal type

**Runtime ↔ WireManager:**
- Runtime uses WireManager to connect wires
- WireManager validates wire connections
- WireManager ensures source and target nodes exist

### Design Patterns Used

**1. Template Method Pattern**
- BaseRuntimeCore defines lifecycle methods (initialize, start, stop, destroy)
- GraphRuntimeCore implements these methods
- Subclasses can customize behavior while maintaining lifecycle

**2. Observer Pattern**
- Runtime emits events for state changes
- External code can subscribe to these events
- Loose coupling between runtime and observers

**3. Strategy Pattern**
- Different implementations of NodeFactory, SignalRouter, WireManager can be swapped
- Runtime doesn't depend on specific implementations
- Enables customization and testing

**4. Factory Pattern**
- NodeFactory creates node instances
- Runtime doesn't know how to create nodes
- Decouples node creation from runtime logic

### Performance Considerations

**Optimizations:**
1. **Signal Queueing:** Fast emission (O(1)), async processing
2. **Parallel Processing:** Multiple nodes process signals simultaneously
3. **Map-Based Lookups:** O(1) node and signal routing
4. **Promise.allSettled:** Efficient parallel processing with error tracking

**Potential Issues:**
1. **Queue Overflow:** If signals are emitted faster than processed, queue grows
2. **Memory Leaks:** Nodes that don't clean up resources
3. **Event Handler Leaks:** External subscribers not unsubscribing
4. **DLQ Accumulation:** Failed signals accumulate if not drained

### Error Handling Strategy

**Types of Errors Handled:**
1. **Initialization Errors:** Node creation failures, wire connection failures
2. **State Errors:** Starting/stopping/destroying in wrong state
3. **Processing Errors:** Node exceptions during signal processing
4. **Communication Errors:** Signal emission when not running

**Error Propagation:**
1. Errors are caught and logged
2. Errors are pushed to DLQ for later inspection
3. Errors don't crash the runtime (graceful degradation)
4. Errors are emitted as events for external handling

**Recovery Mechanisms:**
1. **Retry Logic:** Not implemented yet (future enhancement)
2. **Fallback Nodes:** Not implemented yet (future enhancement)
3. **Circuit Breakers:** Not implemented yet (future enhancement)

### Future Evolution

**Phase 2: Error Recovery**
- Implement retry logic for failed signals
- Add fallback nodes for critical operations
- Implement circuit breakers for failing nodes
- Add DLQ processing and retry mechanism

**Phase 3: Performance Monitoring**
- Add metrics collection (signal processing time, queue length)
- Add performance profiling hooks
- Add alerting for performance degradation
- Add automatic scaling (horizontal scaling)

**Phase 4: Advanced Features**
- Add signal compression for large payloads
- Add signal batching for high throughput
- Add distributed signal routing (multiple runtimes)
- Add signal persistence for replay

### Known Limitations

**1. No Signal Batching**
- **Issue:** Each signal is processed individually
- **Impact:** Overhead for high-frequency signals
- **Fix:** Implement batch processing (future Phase 4)

**2. No Circuit Breakers**
- **Issue:** No protection against cascading failures
- **Impact:** One failing node can affect entire system
- **Fix:** Implement circuit breakers (future Phase 2)

**3. No Automatic Retry**
- **Issue:** Failed signals go to DLQ but no retry mechanism
- **Impact:** Manual intervention required for recovery
- **Fix:** Implement automatic retry logic (future Phase 2)

**4. No Signal Persistence**
- **Issue:** Signals not persisted to disk
- **Impact:** Lost signals on crash/restart
- **Fix:** Implement signal persistence (future Phase 4)

### Testing Considerations

**Unit Tests Needed:**
1. **Constructor:** Verify dependencies are stored correctly
2. **Initialize:** Verify nodes created, wires connected, state transitions
3. **Start/Stop:** Verify state transitions, event emission
4. **Destroy:** Verify cleanup, resource release
5. **SendSignal:** Verify queueing, validation, error handling
6. **ProcessSignal:** Verify routing, parallel processing, error handling

**Integration Tests Needed:**
1. **End-to-End Flow:** Signal emission → Node processing → Signal emission
2. **Error Scenarios:** Node failures, wire failures, state errors
3. **Performance Tests:** High-frequency signal emission, large payloads
4. **Concurrency Tests:** Multiple signals emitted simultaneously

### Security Considerations

**Input Validation:**
- **Issue:** Signals can have malicious payloads
- **Mitigation:** Nodes should validate their own inputs
- **Recommendation:** Implement signal schema validation

**Resource Limits:**
- **Issue:** Unbounded queue can cause memory exhaustion
- **Mitigation:** Implement queue size limits
- **Recommendation:** Add max queue size configuration

**Access Control:**
- **Issue:** Anyone can emit signals to runtime
- **Mitigation:** Implement signal source validation
- **Recommendation:** Add authentication/authorization for signal emission

### Lessons Learned

**During Development:**
1. Initially used Promise.all instead of Promise.allSettled - fixed to ensure one node failure doesn't prevent others from processing
2. Forgot to emit events for state transitions - added event emission for observability
3. Didn't implement DLQ initially - added for debugging and error recovery
4. Used synchronous node processing initially - changed to async for better performance

**What I'd Do Differently:**
1. Implement retry logic from the start
2. Add circuit breakers to prevent cascading failures
3. Add performance monitoring hooks from the beginning
4. Implement signal batching for high-frequency signals

**Best Practices Applied:**
1. Dependency injection for testability
2. Graceful degradation on errors
3. Async signal processing for performance
4. Comprehensive error logging and DLQ
5. Event emission for observability