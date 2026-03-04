# 🔌 {{projectName}} Integration Guide

Welcome to your new Graph-OS integrated application! This application is designed using the **Isomorphic Pattern**, meaning the core execution graph (Cartridge) runs directly in the browser using HTTP fetches rather than Node.js runtime imports.

## 1. Quick Start

Your application is already wrapped in the `<RuntimeProvider>` inside \`src/App.tsx\`.

### To start your development server:
\`\`\`bash
npm run dev
\`\`\`

---

## 2. Using Signals (React Hooks)

Graph-OS operates entirely on reactive event channels called **Signals**. You don't call backend functions directly; you emit signals and listen for state patches.

### A. Subscribing to Data (`useSignal`)
To listen for any data passing over a specific wire (e.g., when the Cartridge outputs results):

\`\`\`tsx
import { useSignal } from './integration/SignalHooks';

function OutputDisplay() {
  // Replace 'DATA.TRANSFORMED' with actual signal types your Cartridge emits
  const data = useSignal('DATA.TRANSFORMED');

  if (!data) return <p>Waiting for data...</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
\`\`\`

### B. Triggering Actions (`useEmitSignal`)
To send data *into* the Graph-OS execution environment (e.g., user clicks a button):

\`\`\`tsx
import { useEmitSignal } from './integration/SignalHooks';

function InputForm() {
  const emit = useEmitSignal();

  const handleSubmit = () => {
    // Matches the signal expected by the root.cartridge.json Input node
    emit('INPUT.SUBMITTED', { value: "Hello World", timestamp: Date.now() });
  };

  return <button onClick={handleSubmit}>Execute Graph</button>;
}
\`\`\`

### C. Signal Payload Structure
⚠️ **WARNING: Strict Payload Schema**

When emitting signals, you must ensure the payload structure strictly matches what the \`signal-registry.json\` expects.

\`\`\`typescript
// Always emit NAMESPACE.ACTION
emitSignal('TASK.CREATE', { title, priority });
emitSignal('HABIT.CHECK_IN', { habitId });

// Never emit bare objects or strings as the root payload
emitSignal({ title, priority }); // ❌ WRONG (No type identified by system)
emitSignal('TASK.CREATE', { title, priority }); // ✅ CORRECT
\`\`\`

---

## 3. Modifying the Architecture (For AI Agents)

Graph-OS architecture is modified via specific MCP tools, **never by writing backend code**. If the user requests a logic or architecture change, use the Graph-OS MCP tools to update the `.cartridge.json` files or registries.

**Key MCP Tools for Architecture Modification:**
- \`apply_topology_patch\`: The primary tool for adding/removing nodes and wiring them together in a cartridge.
- \`create_cartridge\`: Generate a new cartridge.
- \`create_composite\`: Abstract a subgraph into a reusable composite cartridge.
- \`create_signal\`: Register new signal definitions in the \`signal-registry.json\`.
- \`simulate_modification\`: Pre-flight validate your architecture changes before applying them.

**Agent Workflow Example:**
1. *User Request:* "Add validation before processing the data."
2. *AI Action:* Uses \`apply_topology_patch\` (with an \`add-node\` and \`add-wire\` operation) to insert a \`logic.validate\` node into the Graph-OS cartridge.
3. *AI Action:* Uses \`simulate_modification\` to ensure the new topology doesn't introduce circular dependencies.

---

## 4. Advanced: The Isomorphic Loader

Your cartridge is loaded asynchronously in \`src/integration/RuntimeProvider.tsx\`:

\`\`\`tsx
const response = await fetch('/cartridges/root.cartridge.json');
const cartridgeData = await response.json();
const rt = await createRuntime({ cartridge: cartridgeData });
\`\`\`

If you create **Composite Cartridges**, ensure they are also placed in the \`public/\` folder (via build steps or symlinks) so they can be fetched identically!

---

## 5. 🛡️ Error Handling Patterns

### Runtime Initialization Errors
Runtime initialization should always be wrapped in a \`try/catch\` block. \`RuntimeProvider.tsx\` does this out-of-the-box, but if you customize it, preserve this structure:

\`\`\`typescript
async function initRuntime() {
  try {
    // 1. Fetch cartridge
    const response = await fetch('/cartridges/root.cartridge.json');
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: Failed to load cartridge\`);
    }
    const cartridgeData = await response.json();

    // 2. Initialize runtime
    const rt = await createRuntime({ cartridge: cartridgeData });
    await rt.start();
    setRuntime(rt);
    setLoading(false);
  } catch (err) {
    // 3. Handle errors
    console.error('Runtime initialization failed:', err);
    setError(err instanceof Error ? err.message : String(err));
    setLoading(false);
  }
}
\`\`\`

### Common Runtime Errors

| Error | Meaning | Solution |
|--------|-----------|----------|
| \`fs.promises is undefined\` | Using file path in browser | Use fetch() + data object |
| \`Cartridge not found\` | Wrong path or fetch failed | Check URL path in fetch() |
| \`Unknown node type\` | Node type not registered | Register composite or use built-in type |
| \`Signal not found\` | Signal not in registry | Register in signal-registry.json |

---

## 6. 💾 Data Persistence Patterns

Graph-OS does not enforce database coupling. For purely browser-based persistence, use the provided **Local Storage Pattern**. 

A \`StorageManager\` class is available at \`src/integration/StorageManager.ts\`:

\`\`\`typescript
import { StorageManager } from './integration/StorageManager';
import { useEmitSignal } from './integration/SignalHooks';

// Usage
const taskStorage = new StorageManager('tasks');

function TasksView() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    setTasks(taskStorage.load()); // Load on mount
  }, []);

  const handleCreateTask = (task) => {
    // 1. Save locally
    taskStorage.add(task);
    setTasks(taskStorage.load());

    // 2. Emit to Graph-OS
    emitSignal('TASK.CREATE', task); 
  };

  return <button onClick={() => handleCreateTask({ id: '1', title: 'Test' })}>Add</button>;
}
\`\`\`
