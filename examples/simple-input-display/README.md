# Simple Input Display - Graph-OS Frontend Integration Test

## Overview

This is a simple "hello world" style application that demonstrates Graph-OS frontend integration with React. Users can input any text, submit it, and see it appear on screen.

## Features

- ✅ Input field for user text
- ✅ Submit button to process input
- ✅ Display list showing all submitted items
- ✅ Graph-OS React Bridge integration
- ✅ Signal emission to backend
- ✅ Local state management for UI

## Project Structure

```
simple-input-display/
├── cartridges/                    # Graph-OS backend configuration
│   └── simple-input-display.cartridge.json
├── registries/                    # Signal definitions
│   └── signal-registry.json
├── src/                          # React application
│   ├── App.jsx                   # Main app component
│   ├── main.jsx                  # React entry point
│   ├── index.css                 # Styling
│   └── components/
│       ├── InputForm.jsx         # Input form component
│       └── DisplayList.jsx       # Display list component
├── public/
│   └── index.html                # HTML template
├── data/                         # Storage directory
├── package.json                  # Dependencies
└── vite.config.js                # Build configuration
```

## Graph-OS Architecture

### Backend Nodes
1. **input-node** (`control.input`) - Entry point for input signals
2. **storage-node** (`infra.storage.local`) - Stores user inputs
3. **display-node** (`control.display`) - Outputs display signals

### Signal Flow
```
InputForm (React) 
    → emit('INPUT.SUBMIT')
    → input-node
    → storage-node
    → display-node
    → DisplayList (React)
```

### Signals Used
- `INPUT.SUBMIT` - User submits input
- `STORAGE.WRITE` - Write to storage
- `STORAGE.SUCCESS` - Storage operation succeeded
- `UI.DISPLAY_UPDATE` - Update display in UI

## React Bridge Integration

### Components
- **SignalProvider** - Wraps app to provide Graph-OS runtime context
- **useEmitSignal** - Hook to emit signals to backend
- **useSignal** - Hook to subscribe to signals from backend

### Implementation
```jsx
import { SignalProvider } from '@graph-os/react-bridge';
import { useEmitSignal } from '@graph-os/react-bridge';

// In App.jsx
<SignalProvider
  cartridgePath="./cartridges/simple-input-display.cartridge.json"
  signalRegistryPath="./registries/signal-registry.json"
>
  <App />
</SignalProvider>

// In InputForm.jsx
const emit = useEmitSignal();
const handleSubmit = () => {
  emit('INPUT.SUBMIT', { userInput: input });
};
```

## How to Run

### Prerequisites
- Node.js 18+ installed
- Graph-OS monorepo available locally

### Installation

1. Navigate to the example directory:
```bash
cd C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.2\examples\simple-input-display
```

2. Install dependencies:
```bash
npm install
```

Note: This installs `@graph-os/react-bridge` from the local packages folder.

### Development Mode

Start the development server:
```bash
npm run dev
```

The app will open in your browser at `http://localhost:3000` (or next available port).

### Using the App

1. Type any text in the input field
2. Click the "Submit" button
3. Your input will appear in the list below

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Testing Graph-OS Integration

### Backend Validation

Validate the cartridge architecture:
```bash
cd C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.2
node -e "
const { ValidateCartridgeTool } = require('./packages/mcp-tools/dist/index.js');
const v = new ValidateCartridgeTool();
v.execute({
  cartridgePath: 'C:\\Users\\RZ1\\Documents\\Development\\260220-Graph-OS-Studio-4th.2\\examples\\simple-input-display\\cartridges\\simple-input-display.cartridge.json',
  signalRegistryPath: 'C:\\Users\\RZ1\\Documents\\Development\\260220-Graph-OS-Studio-4th.2\\examples\\simple-input-display\\registries\\signal-registry.json'
}).then(r => {
  console.log('Valid:', r.data.valid);
  console.log('Errors:', r.data.errorCount);
  r.data.errors.forEach(e => console.log(' -', e.message));
});
"
```

### Runtime Testing

Run the cartridge with test input:
```bash
cd C:\Users\RZ1\Documents\Development\260220-Graph-OS-Studio-4th.2
node -e "
const { RunCartridgeTool } = require('./packages/mcp-tools/dist/index.js');
const r = new RunCartridgeTool();
r.execute({
  cartridgePath: 'C:\\Users\\RZ1\\Documents\\Development\\260220-Graph-OS-Studio-4th.2\\examples\\simple-input-display\\cartridges\\simple-input-display.cartridge.json',
  inputSignal: { type: 'INPUT.SUBMIT', payload: { userInput: 'Test input' } },
  signalRegistryPath: 'C:\\Users\\RZ1\\Documents\\Development\\260220-Graph-OS-Studio-4th.2\\examples\\simple-input-display\\registries\\signal-registry.json'
}).then(r => {
  console.log('Success:', r.success);
  console.log('Signal History:', r.data?.signalHistory);
});
"
```

## Known Issues & Discoveries

### Issue 1: React Bridge Package Name
- **Problem**: Initially tried to install `@graph-os/react-bridge` from npm registry
- **Error**: `404 Not Found - @graph-os/react-bridge is not in this registry`
- **Solution**: Changed to local path: `"@graph-os/react-bridge": "file:../../packages/react-bridge"`

### Issue 2: GraphOSProvider Export
- **Problem**: App failed to start with error: `No matching export for import "GraphOSProvider"`
- **Error**: React Bridge exports `SignalProvider`, not `GraphOSProvider`
- **Solution**: Updated imports from `GraphOSProvider` to `SignalProvider`

### Issue 3: Hook Usage
- **Problem**: Initial code tried to use `useSignal()` for emitting
- **Error**: `useSignal` is for subscribing, not emitting
- **Solution**: Changed to `useEmitSignal()` hook for emitting signals

### Issue 4: Graph Depth Limit
- **Problem**: Initial architecture had 6 nodes deep, exceeding the 5-node limit
- **Error**: `Graph depth is 6, maximum is 5`
- **Solution**: Simplified architecture to 3 nodes for minimal backend (removed adapter and UI nodes)

### Issue 5: Node Type Format
- **Problem**: Used dash separator in node type names
- **Error**: `Invalid node type format: logic.domain-adapter`
- **Solution**: Changed to underscore separator: `logic.domain_adapter` (then removed node entirely)

## Success Criteria Status

- ✅ Complete React frontend created (App.jsx, components/, HTML, CSS, build config)
- ✅ React app runs in browser (npm run dev works on port 3001)
- ✅ Users can interact with rendered UI (input field works, submit button works)
- ✅ React Bridge integrated (SignalProvider, useEmitSignal)
- ✅ Backend validates successfully (cartridge is valid)
- ✅ Simple input-to-display workflow implemented

## Notes

- Backend is minimal (3 nodes) to focus on frontend integration testing
- Storage node is present but not fully wired in this simple version
- Focus is on React-Graph-OS communication, not complex backend logic
- App uses local state for immediate UI feedback while also emitting signals to backend

## Next Steps for Full Integration

1. Complete backend wiring for storage operations
2. Implement signal subscription in DisplayList component
3. Test full end-to-end signal flow (React → Backend → React)
4. Implement storage read operation to load persisted data
5. Add error handling for failed storage operations
