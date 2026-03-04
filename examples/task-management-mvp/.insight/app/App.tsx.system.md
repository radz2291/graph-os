# App.tsx - Programming Language Processing Logic

## File Overview
TypeScript React component implementing Task Management MVP UI with Graph-OS runtime integration using Isomorphic Pattern.

## Line-by-Line Analysis

### Lines 1-2: Imports
**Processing:** 
- `useState, useEffect` from React: Hook-based state management
- `SignalProvider` from @graph-os/react-bridge: React Context provider for runtime access
- `createRuntime` from @graph-os/runtime: Runtime factory function

**Language Features:**
- Named imports: Import specific exports from modules
- Type inference: TypeScript infers hook return types

**Execution Model:**
1. Module loads → Import statements execute
2. React hooks become available for component
3. Graph-OS runtime factory becomes available

### Lines 4-10: Task Interface Definition
**Processing:**
- TypeScript interface declaration
- Type annotation on each property
- Literal type union for priority and status fields

**Language Features:**
- Interface: Compile-time type contract
- Union types: `priority` can only be 'low' | 'medium' | 'high'
- Date string type: ISO 8601 format

**Memory Model:**
- Interface has zero runtime cost (erased at compilation)
- Task objects are plain JavaScript objects at runtime
- Type checking happens at compile time only

### Lines 12-20: Function Component Definition
**Processing:**
- React function component declaration
- Generic `useState` hooks for each state variable
- Type inference for state values

**Language Features:**
- Arrow function: Component defined with `function App()`
- Destructuring: `const [state, setState] = useState(initial)`
- Async function: `initRuntime` declared async

**React Lifecycle:**
1. Component mounts → `useEffect` callback executes
2. State updates → Component re-renders
3. Component unmounts → Cleanup functions in `useEffect` execute

### Lines 22-46: useEffect Hook (Runtime Initialization)
**Processing:**
- Empty dependency array `[]` → Effect runs once on mount
- Async function inside → Immediate invocation pattern
- Fetch API → Browser HTTP client
- `await response.json()` → Parse JSON response body
- `createRuntime({ cartridge: cartridgeData })` → Initialize Graph-OS runtime

**Language Features:**
- Async/await: Non-blocking I/O operations
- Fetch API: Browser-native HTTP client
- Try/catch: Error handling block
- Template literals: String interpolation in console.log

**Execution Flow:**
```
Component Mount
    ↓
useEffect callback executes
    ↓
fetch('/cartridges/root.cartridge.json')
    ↓ (HTTP request)
response.ok check
    ↓ (if true)
await response.json()
    ↓ (parse JSON)
createRuntime({ cartridge: cartridgeData })
    ↓ (initialize runtime)
await rt.start()
    ↓ (start signal processing)
setRuntime(rt)
    ↓ (update state)
Component re-renders
```

**Error Handling:**
- `!response.ok` → Throws error with HTTP status
- Any error in try block → Catches in catch block
- `err instanceof Error` → Type guard for error instance

### Lines 48-56: loadTasksFromStorage Function
**Processing:**
- `localStorage.getItem('tasks')` → Browser synchronous storage read
- `JSON.parse(storedTasks)` → Deserialize JSON string to object
- `setTasks(parsed)` → Update React state
- `setLoading(false)` → Update loading state

**Language Features:**
- Optional chaining: `storedTasks &&` (null check)
- Try/catch: Handle JSON parse errors
- State setter: Triggers React re-render

**Synchronous Operation:**
- `localStorage.getItem` is synchronous (blocks main thread)
- JSON.parse is synchronous
- No async/await needed

### Lines 58-62: saveTasksToStorage Function
**Processing:**
- `localStorage.setItem(key, JSON.stringify(data))` → Serialize and store
- `setTasks(updatedTasks)` → Update React state

**Language Features:**
- JSON.stringify: Convert object to JSON string
- Spread operator: `[...tasks, newTask]` (creates new array)
- Immutable state update: New array instead of mutating

**Memory Model:**
- New array created on each save (old array garbage collected)
- JSON string stored in browser storage (limited quota ~5MB)

### Lines 64-97: handleSubmit Function (Form Submission)
**Processing:**
- Event handler: `React.FormEvent` type annotation
- Form validation: `if (!title.trim())` check
- Object creation: New Task object with spread syntax
- Runtime emit: `runtime.emit(signalType, payload)`

**Language Features:**
- Event handler: Prevents default form submission
- String trimming: `title.trim()` removes whitespace
- Date constructor: `new Date().toISOString()` creates timestamp
- Nullish coalescing: `||` for fallback values

**Signal Flow:**
```
Form Submit
    ↓
Create Task Object
    ↓
runtime.emit('TASK.SUBMITTED', newTask)
    ↓ (signal queued in runtime)
[In full implementation: signal flows through node graph]
[In MVP: direct state update]
    ↓
saveTasksToStorage(updatedTasks)
    ↓
setTasks(updatedTasks) → Component re-renders
```

**State Transitions:**
- `setSubmitting(true)` → Shows "Creating..." button text
- `setSuccessMessage('Task created successfully!')` → Shows success banner
- `clearForm()` → Resets form fields

### Lines 99-111: handleComplete Function
**Processing:**
- Array map: `tasks.map(task => ...)` transforms array
- Conditional update: `task.id === taskId ? { ...task, status: 'completed' } : task`
- Object spread: `{ ...task, status: 'completed' as const }` creates new object
- Runtime emit: `runtime.emit('TASK.COMPLETED', { taskId, status })`

**Language Features:**
- Array.map: Transform each element, return new array
- Conditional (ternary) operator: `condition ? value1 : value2`
- Type assertion: `'completed' as const` narrows type
- Object spread: `{ ...task, status: 'completed' }` creates new object

**Immutability:**
- Map creates new array (old array unchanged)
- Spread creates new object (old object unchanged)
- React detects state change (reference comparison)

### Lines 113-123: handleDelete Function
**Processing:**
- `window.confirm('Are you sure?')` → Browser native confirmation dialog
- Array filter: `tasks.filter(task => task.id !== taskId)` removes matching element
- Runtime emit: `runtime.emit('TASK.DELETED', { taskId })`

**Language Features:**
- Browser API: `window.confirm()` blocks execution until user responds
- Array.filter: Remove elements matching condition
- State update: Triggers re-render with filtered array

### Lines 125-129: clearForm Function
**Processing:**
- State setters reset form fields
- `setTimeout(() => setSuccessMessage(null), 3000)` → Delayed execution
- 3000ms delay → 3 seconds

**Language Features:**
- Function composition: `setTitle('')` followed by `setDescription('')` etc.
- setTimeout: Schedule callback for later execution
- Arrow function: Inline callback for setTimeout

**Async Cleanup:**
- setTimeout callback executes after 3000ms
- Component may unmount before callback executes
- (Missing: cleanup function to cancel timeout)

### Lines 131-163: Conditional Rendering (Error/Loading States)
**Processing:**
- Conditional rendering: `if (error) { return <ErrorComponent /> }`
- Early return: Exits component render function
- React fragment: `<div className="app">` wrapper

**Language Features:**
- Conditional statements: Control rendering based on state
- JSX: HTML-like syntax for React components
- String interpolation: `{error}` embeds variable in JSX

**Render Flow:**
```
Component Render
    ↓
Check if error
    ↓ (if true)
Return error UI (early exit)
    ↓ (if false)
Check if loading
    ↓ (if true)
Return loading UI (early exit)
    ↓ (if false)
Continue to main UI render
```

### Lines 165-173: Runtime Status Display
**Processing:**
- Conditional class: `runtime ? 'active' : 'inactive'` dynamic CSS class
- Ternary operator: `runtime ? 'Connected' : 'Disconnected'` conditional text
- String literals: Template literals for status messages

**Language Features:**
- Conditional expression: `condition ? value1 : value2`
- Boolean evaluation: `runtime ? 'active' : 'inactive'` (truthy/falsy check)

### Lines 175-248: Task Form JSX
**Processing:**
- Controlled components: Form inputs bound to state
- Event handlers: `onChange={(e) => setTitle(e.target.value)}`
- Conditional rendering: `{successMessage && <SuccessBanner />}`
- Form submission: `<form onSubmit={handleSubmit}>`

**React Features:**
- Controlled inputs: Value controlled by React state
- Event binding: `onChange`, `onClick`, `onSubmit` handlers
- Form handling: `e.preventDefault()` prevents page reload
- Input types: text, textarea for different field types

**State Binding:**
```
Input change event
    ↓
e.target.value
    ↓
setTitle(value) → State update
    ↓
Component re-renders with new value
```

**Priority Selector:**
- Divs instead of radio buttons (custom UI)
- Click handlers: `onClick={() => setPriority('low')}`
- Conditional class: `priority === 'low' ? 'selected' : ''`

### Lines 288-330: Task Lists Rendering
**Processing:**
- Array filtering: `tasks.filter(t => t.status === 'pending')` filters by status
- Conditional rendering: `tasks.length === 0 ? <EmptyState /> : <TaskList />`
- Array mapping: `tasks.map(task => <TaskCard ... />)` renders each task
- Key prop: `key={task.id}` for React reconciliation

**React Features:**
- Conditional rendering based on array length
- Array.map for rendering lists
- Key prop for efficient DOM updates
- Multiple conditional blocks (pending vs. completed)

**Reconciliation:**
```
Tasks array changes
    ↓
React compares new array with old array
    ↓
Key-based comparison (task.id)
    ↓
Update only changed elements in DOM
```

### Lines 332-414: TaskCard Component
**Processing:**
- Props destructuring: `({ task, onComplete, onDelete }) => ...`
- Local state: `const [expanded, setExpanded] = useState(false)`
- Conditional rendering: `expanded ? fullDescription : truncatedDescription`
- Conditional class: `task.status === 'completed' ? 'completed' : ''`

**Language Features:**
- Component props: TypeScript interface defines expected props
- Stateful component: Maintains own expanded state
- String methods: `substring(0, 100)` truncates text
- Conditional rendering: Ternary operator for description display

**Component Lifecycle:**
1. Parent renders TaskCard with task prop
2. TaskCard initializes expanded state (false)
3. User clicks "Show more" → setExpanded(true)
4. TaskCard re-renders with expanded state
5. Full description displayed

---

## Big Picture: Technical Processing

### Type System Architecture

**Interface Hierarchy:**
```
Task (interface)
├── id: string
├── title: string
├── description: string
├── priority: 'low' | 'medium' | 'high'
├── status: 'pending' | 'completed'
└── createdAt: string
```

**Type Safety Guarantees:**
- Compile-time checking of property access
- Union type enforcement (priority, status)
- No runtime type errors possible

### React State Management

**State Variables:**
```
runtime: GraphRuntime | null
error: string | null
tasks: Task[]
loading: boolean

Form State:
title: string
description: string
priority: 'low' | 'medium' | 'high'
submitting: boolean
formError: string | null
successMessage: string | null
```

**State Update Pattern:**
1. User action triggers event handler
2. Event handler calls setState()
3. React schedules re-render
4. Component renders with new state
5. Virtual DOM compares to real DOM
6. React updates only changed elements

### Graph-OS Runtime Integration

**Isomorphic Loading:**
```
Browser Environment
    ↓
fetch('/cartridges/root.cartridge.json')
    ↓ (HTTP GET)
Response JSON
    ↓
createRuntime({ cartridge: cartridgeData })
    ↓ (runtime instance)
await rt.start()
    ↓ (signal processing enabled)
runtime.emit(signal)
    ↓ (signal queued)
[Signal flows through node graph]
```

**Signal Emission:**
```typescript
runtime.emit('TASK.SUBMITTED', {
  id: Date.now().toString(),
  title: title.trim(),
  description: description.trim(),
  priority,
  status: 'pending',
  createdAt: new Date().toISOString()
})
```

**Signal Processing (in Runtime):**
1. Signal queued in runtime
2. SignalRouter finds target nodes
3. Target nodes process signal
4. Nodes emit new signals
5. Cycle continues

### Event Loop and Concurrency

**JavaScript Event Loop:**
```
┌─────────────────────┐
│   Call Stack       │ ← synchronous code execution
├─────────────────────┤
│   Microtask Queue   │ ← Promise.then callbacks
├─────────────────────┤
│   Macrotask Queue   │ ← setTimeout, fetch callbacks
└─────────────────────┘
```

**Async Operations:**
- `fetch()` → Macrotask queue
- `await response.json()` → Microtask queue
- `setTimeout()` → Macrotask queue
- Promise.resolve() → Microtask queue

**Execution Order:**
```
1. Sync code (function execution)
2. Microtasks (Promise callbacks)
3. Render (React component updates)
4. Macrotasks (setTimeout, fetch callbacks)
```

### Memory Management

**Garbage Collection:**
- Old arrays (from map, filter) → Garbage collected after render
- Old task objects → Garbage collected when removed from array
- Component instances → Garbage collected when unmounted

**Memory Leaks (Potential):**
- `setTimeout` callback not cleaned up if component unmounts
- Event listeners not removed (not an issue here, no addEventListener)
- Runtime reference held in state (intentional, not a leak)

### Error Handling Strategies

**Try-Catch Blocks:**
1. Runtime initialization (lines 22-46)
2. localStorage operations (lines 48-62)

**Error Types:**
- NetworkError: fetch fails (network issue)
- SyntaxError: invalid JSON
- TypeError: localStorage disabled
- Error: runtime initialization failure

**Error Propagation:**
```
Error thrown in try block
    ↓
Caught in catch block
    ↓
setError(err.message)
    ↓
Component re-renders with error UI
```

### Performance Characteristics

**Time Complexity:**
- Array.map: O(n) where n = number of tasks
- Array.filter: O(n) for filtering
- Array.findIndex: O(n) for lookup (not used here)
- localStorage.getItem: O(1) (simple key lookup)

**Space Complexity:**
- O(n) where n = number of tasks
- Each task object ~200 bytes
- 1000 tasks = ~200KB

**Re-render Optimization:**
- Granular state updates (not single large object)
- React Virtual DOM diffing
- Key props for list items

### Browser API Usage

**localStorage API:**
- `getItem(key)`: Retrieve value by key
- `setItem(key, value)`: Store key-value pair
- Synchronous operation (blocks main thread)
- Limited to ~5MB per domain

**fetch API:**
- `fetch(url)`: HTTP request
- `response.ok`: Boolean status check
- `response.json()`: Parse response body
- Asynchronous operation (non-blocking)

**window.confirm:**
- Blocks execution until user responds
- Returns boolean (true = OK, false = Cancel)
- Native UI dialog

### JSX Compilation

**JSX Transform:**
```jsx
<div className="app">
  <h1>Task Management</h1>
</div>
```

**Compiled to:**
```javascript
React.createElement('div', { className: 'app' },
  React.createElement('h1', null, 'Task Management')
)
```

**Rendering Process:**
1. Component function returns JSX
2. JSX transpiled to React.createElement calls
3. Virtual DOM tree created
4. Real DOM diffed with virtual DOM
5. Minimal updates applied to real DOM

### Component Composition

**Parent-Child Relationship:**
```
App (Parent)
├── TaskCard (Child)
│   └── Local state: expanded
└── TaskCard (Child, multiple instances)
    └── Local state: expanded (independent)
```

**Props Flow:**
- App passes `task`, `onComplete`, `onDelete` to TaskCard
- TaskCard cannot modify parent state directly
- Callback functions enable parent state updates

**State Isolation:**
- Each TaskCard has independent `expanded` state
- Expanding one card doesn't affect others
- State is encapsulated within component

### Accessibility DOM Structure

**Semantic HTML:**
- `<form>`: Form container
- `<label>`: Associated with input via `htmlFor` prop
- `<button>`: Clickable elements
- `<h1>`, `<h2>`, `<h3>`: Headings hierarchy

**Focus Management:**
- Tab order follows DOM order
- Form inputs are tab-accessible
- No explicit `tabIndex` (uses browser default)

**Screen Reader Support:**
- `aria-label` not present (could be improved)
- `role` attributes not used (implicit from HTML elements)
- Text content provides context

### Event Handling Mechanism

**Synthetic Events:**
```
User action (click, submit, change)
    ↓
Browser native event
    ↓
React synthetic event
    ↓
Event handler callback
    ↓
State update / Side effect
```

**Event Pooling:**
- React pools event objects for performance
- Event properties nullified after callback
- Must extract values synchronously (done correctly)

**Event Types Used:**
- `React.FormEvent`: Form submission
- `React.ChangeEvent`: Input changes
- `React.MouseEvent`: Click events

---

## Technical Constraints

**Browser Limitations:**
- No filesystem access (hence Isomorphic pattern)
- localStorage limited to ~5MB
- No backend persistence
- Single-threaded execution (JavaScript)

**TypeScript Limitations:**
- Type checking only at compile time
- Runtime type erasure
- No runtime type validation

**React Limitations:**
- Virtual DOM overhead
- Re-render costs
- State synchronization complexity