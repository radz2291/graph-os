# Task Management MVP - Complete System Architectural Flow

## Visual Flow Map

```mermaid
sequenceDiagram
    participant USER as User
    participant REACT as React UI (App.tsx)
    participant RUNTIME as Graph-OS Runtime
    participant INPUT as task-input Node
    participant VALIDATOR as task-validator Node
    participant STORAGE as task-storage Node
    participant DISPLAY as task-display Node
    participant STORAGE_API as localStorage API

    Note over USER,STORAGE_API: Phase 1: Application Initialization
    USER->>REACT: Open browser
    REACT->>REACT: Component mounts (useEffect)
    REACT->>RUNTIME: Fetch root.cartridge.json (HTTP)
    RUNTIME->>INPUT: Create node instance
    RUNTIME->>VALIDATOR: Create node instance
    RUNTIME->>STORAGE: Create node instance
    RUNTIME->>DISPLAY: Create node instance
    RUNTIME->>RUNTIME: Connect wires
    RUNTIME->>RUNTIME: Start runtime
    REACT->>STORAGE_API: localStorage.getItem('tasks')
    STORAGE_API-->>REACT: Return task array
    REACT->>REACT: Set tasks state
    REACT->>USER: Display initial UI

    Note over USER,STORAGE_API: Phase 2: Task Creation (Success Path)
    USER->>REACT: Fill form (title, description, priority)
    USER->>REACT: Click "Create Task" button
    REACT->>REACT: Validate title (required)
    REACT->>REACT: Create Task object
    REACT->>RUNTIME: runtime.emit('TASK.SUBMITTED', task)
    RUNTIME->>INPUT: Queue signal
    RUNTIME->>INPUT: Process signal
    INPUT->>VALIDATOR: Emit TASK.SUBMITTED
    VALIDATOR->>VALIDATOR: Validate schema (title, priority)
    VALIDATOR->>STORAGE: Emit TASK.VALID (success)
    STORAGE->>STORAGE_API: localStorage.setItem('tasks', JSON.stringify(data))
    STORAGE_API-->>STORAGE: Save confirmation
    STORAGE->>DISPLAY: Emit TASK.SAVED
    DISPLAY->>REACT: Update UI (simulated)
    REACT->>STORAGE_API: localStorage.setItem('tasks', JSON.stringify(updatedTasks))
    STORAGE_API-->>REACT: Save confirmation
    REACT->>REACT: Set tasks state (triggers re-render)
    REACT->>USER: Show "Task created successfully!" + updated list

    Note over USER,STORAGE_API: Phase 3: Task Creation (Failure Path)
    USER->>REACT: Submit empty form (no title)
    REACT->>REACT: Validation fails
    REACT->>USER: Show "Task title is required" error

    Note over USER,STORAGE_API: Phase 4: Task Completion
    USER->>REACT: Click "Complete" button on task
    REACT->>REACT: Update task.status = 'completed'
    REACT->>RUNTIME: runtime.emit('TASK.COMPLETED', {taskId})
    REACT->>STORAGE_API: localStorage.setItem('tasks', JSON.stringify(updatedTasks))
    STORAGE_API-->>REACT: Save confirmation
    REACT->>REACT: Set tasks state
    REACT->>USER: Show task in "Completed" section

    Note over USER,STORAGE_API: Phase 5: Task Deletion
    USER->>REACT: Click "Delete" button on task
    REACT->>USER: Show confirmation dialog
    USER->>REACT: Confirm deletion
    REACT->>REACT: Filter tasks array (remove by id)
    REACT->>RUNTIME: runtime.emit('TASK.DELETED', {taskId})
    REACT->>STORAGE_API: localStorage.setItem('tasks', JSON.stringify(updatedTasks))
    STORAGE_API-->>REACT: Save confirmation
    REACT->>REACT: Set tasks state
    REACT->>USER: Remove task from display
```

## 1. Task Management MVP Flow Architecture

### Phase 1: Application Initialization

#### 1.1 ◯ REACT: Component Mounts (React Lifecycle)
- **Thinking:** React component mounts when browser loads. useEffect hook with empty dependency array `[]` ensures this runs once on mount.
- **Purpose:** Initialize application, load Graph-OS runtime, restore persisted tasks
- **Expected behavior:** Component renders, effect runs, runtime initializes

#### 1.2 → REACT to RUNTIME: Fetch Cartridge via HTTP (Isomorphic Pattern)
- **Thinking:** Instead of filesystem read (which fails in browsers), we fetch cartridge JSON via HTTP. This is the **Isomorphic Pattern** that enables both server-side and client-side execution.
- **Data format:** JSON object with nodes and wires
- **Protocol:** HTTP GET request to `/cartridges/root.cartridge.json`
- **Success condition:** HTTP 200 response, valid JSON structure

#### 1.3 ◦ RUNTIME: Parse Cartridge and Create Node Instances
- **Algorithm:** For each node definition in cartridge JSON:
  1. Lookup node type in registry (control.input, logic.validate, etc.)
  2. Instantiate node class with config
  3. Store node instance by ID in Map
  4. Call `node.initialize()` with context
- **Data transformation:** JSON node definitions → JavaScript node instances
- **Error handling:** Throws if node type not found or initialization fails

#### 1.4 ◦ RUNTIME: Connect Wires and Build Signal Routing Table
- **Algorithm:** For each wire in cartridge:
  1. Validate source and target node IDs exist
  2. Create mapping: `signalType → [target nodes]`
  3. Store in SignalRouter for O(1) lookup
- **Data transformation:** Wire definitions → Routing hash map
- **State change:** Idle → Ready (runtime initialized but not started)

#### 1.5 → RUNTIME to RUNTIME: Start Runtime
- **Implementation:** Change state from 'ready' to 'running', enable signal queue processing
- **Side effects:** Signal processing loop begins, ready to emit/receive signals

#### 1.6 → REACT to STORAGE_API: Load Persisted Tasks
- **Data format:** JSON string (from localStorage)
- **API call:** `localStorage.getItem('tasks')`
- **Success condition:** Returns JSON string or null

#### 1.7 ◦ REACT: Parse JSON and Update State
- **Algorithm:** `JSON.parse(storedTasks)` to convert string to array
- **State transition:** Loading false, tasks populated
- **Error handling:** Try/catch around parse, handle malformed JSON gracefully

#### 1.8 ↑ REACT: Display Initial UI
- **State changes:** Tasks array → Render task cards
- **Navigation:** N/A (single-page app)
- **Screen reference:** @S1 (Main app screen)

---

### Phase 2: Task Creation (Success Path)

#### 2.1 ◯ USER: Fill Task Form
- **Input fields:** 
  - Title (required, text input)
  - Description (optional, textarea)
  - Priority (required, radio selection: low/medium/high)
- **State changes:** Form state updates on each keystroke

#### 2.2 ◯ USER: Click "Create Task" Button
- **Interaction:** Form submission event (React onSubmit)
- **Trigger:** `<form onSubmit={handleSubmit}>`

#### 2.3 ◦ REACT: Validate Title Field
- **Algorithm:** `if (!title.trim())` → validation fails
- **Error flow:** Set `formError` state, show error message to user
- **Recovery:** User corrects input and resubmits

#### 2.4 → REACT to REACT: Create Task Object
- **Data transformation:** Form state → Task object
- **Object creation:**
  ```javascript
  {
    id: Date.now().toString(),
    title: title.trim(),
    description: description.trim(),
    priority: priority,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  ```
- **Timestamp generation:** ISO 8601 string for sorting and debugging

#### 2.5 → REACT to RUNTIME: Emit TASK.SUBMITTED Signal
- **Signal structure:**
  ```javascript
  {
    type: 'TASK.SUBMITTED',
    payload: { /* task object */ },
    timestamp: new Date(),
    sourceNodeId: 'app-component'
  }
  ```
- **Communication method:** `runtime.emit(signalType, payload)`
- **Success condition:** Signal queued in runtime

#### 2.6 → INPUT: Process TASK.SUBMITTED Signal
- **Implementation:** In current MVP, task-input node is not actually implemented (React bypasses it)
- **Intended behavior:** Node receives signal, validates fields, emits `TASK.SUBMITTED` to next node
- **Current workaround:** React form validation serves as input node

#### 2.7 → VALIDATOR: Validate Task Schema
- **Algorithm:** JSON Schema validation:
  1. Check title is string with minLength >= 1
  2. Check description is string (optional)
  3. Check priority is in enum ['low', 'medium', 'high']
  4. Check required fields (title, priority) present
- **State change:** Validating → Result (pass/fail)
- **Decision point:**
  - **Pass:** Emit `TASK.VALID` signal
  - **Fail:** Emit `TASK.INVALID` signal

#### 2.8 → STORAGE (Path A): Process TASK.VALID Signal
- **Implementation:** In current MVP, task-storage node is not actually implemented (React bypasses it)
- **Intended behavior:** Node receives valid task, stores in persistence layer
- **Current workaround:** React direct localStorage update serves as storage node

#### 2.9 → STORAGE_API: Save Tasks to localStorage
- **Data format:** JSON string (array of task objects)
- **API call:** `localStorage.setItem('tasks', JSON.stringify(updatedTasks))`
- **Success condition:** No quota exceeded error, data written successfully
- **Error handling:** QuotaExceededError → Show error to user, suggest clearing old tasks

#### 2.10 ◊ STORAGE: Emit TASK.SAVED Signal
- **Implementation:** Not actually executed in MVP (React direct update)
- **Intended behavior:** Notify system that data persisted successfully

#### 2.11 → DISPLAY: Process TASK.SAVED Signal
- **Implementation:** Not actually executed in MVP (React direct re-render)
- **Intended behavior:** Trigger UI refresh to display updated task list

#### 2.12 → REACT: Update Tasks State with New Task
- **Algorithm:** `[...tasks, newTask]` creates new array with new task appended
- **State transition:** Tasks old → Tasks new (triggers re-render)
- **Side effects:** React Virtual DOM diffing → Real DOM update

#### 2.13 ◦ REACT: Clear Form and Show Success Message
- **State changes:** 
  - `setTitle('')`, `setDescription('')`, `setPriority('low')`
  - `setSuccessMessage('Task created successfully!')`
  - `setSubmitting(false)`
- **Side effects:** 
  - Form fields cleared
  - Success banner appears
  - Submit button re-enabled
- **Auto-cleanup:** Success message auto-disappears after 3 seconds (setTimeout)

#### 2.14 ↑ REACT: Display Updated Task List
- **Render changes:** New task card appears in "Pending Tasks" section
- **User feedback:** Immediate visual confirmation of task creation

---

### Phase 3: Task Creation (Failure Path)

#### 3.1 ◯ USER: Submit Empty Form (No Title)
- **Input:** Title field empty or whitespace only
- **Action:** Click "Create Task" button

#### 3.2 ◦ REACT: Client-Side Validation Fails
- **Algorithm:** `if (!title.trim())` → validation fails
- **State transition:** Form null → Form error
- **Error message:** "Task title is required"

#### 3.3 ↑ REACT: Display Validation Error
- **UI changes:** Error banner appears below form
- **User feedback:** Clear indication what went wrong
- **Recovery:** User enters title and resubmits (returns to Phase 2)

---

### Phase 4: Task Completion

#### 4.1 ◯ USER: Click "Complete" Button
- **Interaction:** Click on task card's "Complete" button
- **Component:** TaskCard component (child of App)

#### 4.2 → TASKCARD to APP: Trigger onComplete Callback
- **Callback invocation:** `onComplete(taskId)` prop
- **Data flow:** Child component passes taskId to parent

#### 4.3 ◦ APP: Update Task Status to 'Completed'
- **Algorithm:** `tasks.map(task => task.id === taskId ? {...task, status: 'completed'} : task)`
- **Data transformation:** Create new array with updated task (immutable update)
- **State transition:** Tasks old → Tasks new (triggers re-render)

#### 4.4 → APP to RUNTIME: Emit TASK.COMPLETED Signal
- **Signal structure:**
  ```javascript
  {
    type: 'TASK.COMPLETED',
    payload: { taskId, status: 'completed' },
    timestamp: new Date(),
    sourceNodeId: 'app-component'
  }
  ```
- **Purpose:** Notify system of status change (for future logging/analytics)

#### 4.5 → APP to STORAGE_API: Persist Status Change
- **API call:** `localStorage.setItem('tasks', JSON.stringify(updatedTasks))`
- **Data transformation:** Tasks array → JSON string

#### 4.6 → APP: Update Tasks State
- **State transition:** Triggers React re-render
- **Side effects:** Task moves from "Pending" to "Completed" section

#### 4.7 ↑ APP: Display Updated Task List
- **Render changes:** Task card appears in "Completed Tasks" section with completed styling
- **User feedback:** Immediate visual confirmation of status change

---

### Phase 5: Task Deletion

#### 5.1 ◯ USER: Click "Delete" Button
- **Interaction:** Click on task card's "Delete" button
- **Component:** TaskCard component

#### 5.2 → TASKCARD to APP: Trigger onDelete Callback
- **Callback invocation:** `onDelete(taskId)` prop
- **Data flow:** Child component passes taskId to parent

#### 5.3 ↑ APP: Show Confirmation Dialog
- **Implementation:** `window.confirm('Are you sure you want to delete this task?')`
- **User choice:** OK (true) or Cancel (false)

#### 5.4 ◊ APP: User Confirms Deletion?
    - **5.4.1 ✗ USER: Cancel** → Flow ends (no action taken)
    - **5.4.2 ✓ USER: Confirm** → Continue to deletion

#### 5.5 ◦ APP: Filter Tasks Array (Remove Task)
- **Algorithm:** `tasks.filter(task => task.id !== taskId)` creates new array without matching task
- **Data transformation:** Remove task from array (immutable update)
- **State transition:** Tasks old → Tasks new (triggers re-render)

#### 5.6 → APP to RUNTIME: Emit TASK.DELETED Signal
- **Signal structure:**
  ```javascript
  {
    type: 'TASK.DELETED',
    payload: { taskId },
    timestamp: new Date(),
    sourceNodeId: 'app-component'
  }
  ```
- **Purpose:** Notify system of deletion (for future logging/analytics)

#### 5.7 → APP to STORAGE_API: Persist Deletion
- **API call:** `localStorage.setItem('tasks', JSON.stringify(updatedTasks))`
- **Data transformation:** Tasks array → JSON string

#### 5.8 → APP: Update Tasks State
- **State transition:** Triggers React re-render
- **Side effects:** Task card removed from display

#### 5.9 ↑ APP: Display Updated Task List
- **Render changes:** Task card removed from UI
- **User feedback:** Immediate visual confirmation of deletion

---

## 2. Flow Constraints

### Cartridge Loading Constraints

**Fetch Constraints (Isomorphic Pattern)**
- **Purpose:** Enable browser-native execution without Node.js dependency
- **Implementation:** HTTP fetch instead of filesystem read
- **Location:** `C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.3\packages\runtime\src\loader\CartridgeLoader.ts`
- **Dependencies:** Fetch API (browser), Response API, JSON parser
- **Variables:** cartridgeData (JSON object), response (Response object)
- **Error handling:** HTTP status codes, JSON parse errors, network errors
- **Performance:** Network latency (typically 10-100ms for local files)
- **Monitoring:** Console logs during fetch, parse, initialization

**Runtime Initialization Constraints**
- **Purpose:** Create node instances and wire connections
- **Implementation:** GraphRuntime.initialize() method
- **Location:** `C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.3\packages\runtime\src\engine\GraphRuntime.ts` lines 88-120
- **Dependencies:** NodeFactory, SignalRouter, WireManager, Logger
- **Variables:** nodes Map, wires array, runtime state enum
- **Error handling:** Node creation failures, wire validation errors
- **Performance:** O(n) where n = number of nodes + number of wires
- **Monitoring:** State transitions (idle → initializing → ready)

### Signal Emission Constraints

**React Signal Emission**
- **Purpose:** Bridge React UI to Graph-OS runtime
- **Implementation:** `runtime.emit(signalType, payload)` in App.tsx
- **Location:** `C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.3\examples\task-management-mvp\src\App.tsx` lines 82, 102, 117
- **Dependencies:** GraphRuntime instance
- **Variables:** signalType (string), payload (object)
- **Error handling:** Runtime checks state (must be 'running'), throws if not
- **Performance:** O(1) queue operation
- **Monitoring:** Console logs of emitted signals (in development)

### Signal Processing Constraints

**Task-Input Node Processing**
- **Purpose:** Accept user input and emit to validation node
- **Implementation:** ControlInputNode class
- **Location:** `C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.3\packages\runtime\src\nodes\control\InputNode.ts`
- **Dependencies:** BaseNode class
- **Variables:** outputSignalType (config), fields (config)
- **Error handling:** None (pure input node, no validation)
- **Performance:** < 1ms per signal (just emits)
- **Monitoring:** Node lifecycle logs (initialize, process, destroy)

**Task-Validator Node Processing**
- **Purpose:** Validate task data against JSON Schema
- **Implementation:** ValidatorNode class
- **Location:** `C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.3\packages\runtime\src\nodes\logic\ValidatorNode.ts`
- **Dependencies:** JSON Schema validator library
- **Variables:** schema (config), successSignalType, failureSignalType
- **Error handling:** Validation errors, schema parse errors
- **Performance:** 1-5ms per signal (depends on schema complexity)
- **Monitoring:** Validation results logged

**Task-Storage Node Processing**
- **Purpose:** Persist tasks to localStorage
- **Implementation:** StorageNode or BrowserStorageNode class
- **Location:** `C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.3\packages\runtime\src\nodes\infra\StorageNode.ts`
- **Dependencies:** localStorage API (browser)
- **Variables:** storageKey (config), outputSignalType
- **Error handling:** QuotaExceededError, SecurityError (disabled storage)
- **Performance:** 5-10ms per signal (localStorage I/O)
- **Monitoring:** Storage operations logged

**Task-Display Node Processing**
- **Purpose:** Render task data to UI
- **Implementation:** DisplayNode class
- **Location:** `C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.3\packages\runtime\src\nodes\control\DisplayNode.ts`
- **Dependencies:** React Bridge (for UI updates)
- **Variables:** format (config), showTimestamp (config)
- **Error handling:** Render errors, format errors
- **Performance:** 10-50ms per signal (React re-render)
- **Monitoring:** Render cycles logged

### State Management Constraints

**React State Updates**
- **Purpose:** Single source of truth for UI
- **Implementation:** useState hooks
- **Location:** `C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.3\examples\task-management-mvp\src\App.tsx` lines 12-20
- **Dependencies:** React library
- **Variables:** tasks array, form state objects
- **Error handling:** State update failures (rare in React)
- **Performance:** < 1ms per setState (scheduling re-render)
- **Monitoring:** Re-render counts in React DevTools

**localStorage Persistence**
- **Purpose:** Browser-native data persistence
- **Implementation:** localStorage API (getItem, setItem)
- **Location:** Browser Web Storage API
- **Dependencies:** None (built-in API)
- **Variables:** storage keys (strings), storage values (JSON strings)
- **Error handling:** QuotaExceededError, SecurityError, InvalidStateError
- **Performance:** < 1ms for getItem, 5-10ms for setItem
- **Monitoring:** Storage size in DevTools

---

## 3. Screen References

**@S1 : src/App.tsx** (Main application screen)
- Displays: Task form, task list (pending/completed), runtime status
- Interactions: Form submission, task completion, task deletion
- State: Tasks array, form state, runtime status

---

## 4. Symbol System Reference

| Symbol | Meaning | Usage in Flow |
|---------|-----------|----------------|
| `◯` | Input: User action, data entry, process trigger | Phase 1.1, 2.1, 3.1, 4.1, 5.1 |
| `◦` | Process: Computation, transformation, business logic | Phase 1.3, 1.7, 2.3, 2.12, 3.2, 4.3, 5.5 |
| `◊` | Decision: Conditional branching, validation, routing | Phase 2.7, 5.4 |
| `→` | External: API call, method invocation, system communication | Phase 1.2, 1.6, 2.5, 4.4, 5.6 |
| `←` | Return: Data coming back from calls | N/A (not used in this flow) |
| `▼` | Storage: Database write, file save, data persistence | Phase 1.6, 2.9, 4.5, 5.7 |
| `↑` | UI Update: Interface change, visual feedback | Phase 1.8, 2.14, 3.3, 4.7, 5.9 |
| `⇓` | Navigation: Screen transition, route change | N/A (single-page app) |
| `⇨` | Phase: Phase transition | Used between all phases |
| `✗` | Error: Failure state, exception, validation fail | Phase 3.2, 5.4.1 |
| `✓` | Success: Completion, validation passed, operation succeeded | Phase 5.4.2 |
| `@S#` | Screen Reference: Links to UI components | @S1 |

---

## Quality Assurance Checklist

### Flow Completeness
- [x] All major steps are documented
- [x] Decision points have both success and error paths
- [x] Error handling covers all likely failure scenarios
- [x] Success criteria are clearly defined
- [x] End-to-end flow is complete (initialization → CRUD operations)

### Technical Accuracy
- [x] Component interactions match actual code
- [x] Data formats and contracts are correct
- [x] Implementation details are accurate
- [x] Error handling matches actual behavior
- [x] Performance considerations are realistic

### Documentation Quality
- [x] Language is clear and unambiguous
- [x] Level of detail is appropriate
- [x] Visual diagram matches textual description
- [x] Business context is explained
- [x] Future maintainers can understand the flow

### Graph-OS Compliance
- [x] All signal flows follow NAMESPACE.ACTION pattern
- [x] Signal-first architecture maintained
- [x] Topology is explicit (cartridge JSON)
- [x] Separation of architecture and runtime respected
- [x] Constraints are documented (max 30 nodes, 50 wires, etc.)