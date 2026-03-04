# 🔌 test-auth-app Integration Guide

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

---

## 3. Modifying the Architecture

If you want to change how the logic works, **do not write backend code**. 
Use the Graph-OS Agent to update your \`cartridges/root.cartridge.json\`.

**Agent Command Example:**
> "Update the root cartridge to add a logic.validate node between the input and transform layer, ensuring 'value' is not empty."

---

## 4. Advanced: The Isomorphic Loader

Your cartridge is loaded asynchronously in \`src/integration/RuntimeProvider.tsx\`:

\`\`\`tsx
const response = await fetch('/cartridges/root.cartridge.json');
const cartridgeData = await response.json();
const rt = await createRuntime({ cartridge: cartridgeData });
\`\`\`

If you create **Composite Cartridges**, ensure they are also placed in the \`public/\` folder (via build steps or symlinks) so they can be fetched identically!
