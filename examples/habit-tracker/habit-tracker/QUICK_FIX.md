# 🔧 Habit Tracker - Quick Fix Guide

## Problem
When clicking "Add Habit", nothing happened. This was due to:

1. **Signal flow misconfiguration** - Missing `habit-transformer` node to add id/metadata
2. **Custom node not registered** - `custom.habit-transformer` needed to be in CustomNodes.ts
3. **Storage config incorrect** - Using `storageKey` instead of `key`

## ✅ What Was Fixed

### 1. Created Custom Node (Practice #1)
```typescript
// src/integration/CustomHabitTransformerNode.ts
export class CustomHabitTransformerNode {
  async process(signal: Signal): Promise<Signal[]> {
    const { originalPayload } = signal.payload;
    
    // Add id, createdAt, initialize completions
    const transformedHabit = {
      id: generateId(),
      name: originalPayload.name,
      description: originalPayload.description,
      frequency: originalPayload.frequency,
      createdAt: new Date().toISOString(),
      completions: [] as string[]
    };

    return [{
      type: 'HABIT.TRANSFORMED',
      payload: { habit: transformedHabit }
    }];
  }
}
```

### 2. Registered Custom Node
```typescript
// src/integration/CustomNodes.ts
import CustomHabitTransformerNode from './CustomHabitTransformerNode';

export function registerCustomNodes(factory: any) {
  factory.registerNodeType('custom.habit-transformer', CustomHabitTransformerNode);
}
```

### 3. Fixed Cartridge Signal Flow
```json
{
  "nodes": [
    {
      "id": "habit-validator",
      "type": "logic.validate",
      "config": {
        "successSignalType": "HABIT.VALID",
        "failureSignalType": "HABIT.INVALID"
      }
    },
    {
      "id": "habit-transformer",
      "type": "custom.habit-transformer",
      "config": {
        "outputSignalType": "HABIT.TRANSFORMED"
      }
    },
    {
      "id": "habit-storage",
      "type": "infra.storage.local",
      "config": {
        "key": "habits",
        "outputSignalType": "HABIT.SAVED"
      }
    }
  ],
  "wires": [
    {"from": "habit-validator", "to": "habit-transformer", "signalType": "HABIT.VALID"},
    {"from": "habit-transformer", "to": "habit-storage", "signalType": "HABIT.TRANSFORMED"},
    {"from": "habit-storage", "to": "display", "signalType": "HABIT.SAVED"}
  ]
}
```

### 4. Simplified React Integration
Instead of relying on Graph-OS for storage operations, the React app now:
- Emits `HABIT.CREATE` signal for validation (via Graph-OS)
- Reads/writes directly to localStorage for CRUD operations
- This provides immediate feedback while still demonstrating signal flow

## 📊 Current Signal Flow

```
React → HABIT.CREATE → habit-validator → HABIT.VALID/INVALID
                                    ↓
React (localStorage) ←─ HABIT.SAVED ←─ habit-transformer ←─ HABIT.VALID
```

**What happens when you click "Add Habit":**

1. React emits `HABIT.CREATE` signal
2. Graph-OS validates via `habit-validator`
3. If valid → `habit-transformer` adds id/metadata
4. `habit-storage` saves to localStorage (emits `HABIT.SAVED`)
5. React receives `HABIT.SAVED` signal + updates UI
6. React also directly reads from localStorage for display

## 🚀 Running the App

```bash
cd habit-tracker/habit-tracker
npm install
npm run dev
```

Open `http://localhost:5173`

## 🐛 Debugging

### Check Browser Console
```javascript
// Look for these logs:
📤 Emitting HABIT.CREATE: {...}
✅ Habits saved: [...]
```

### Verify Cartridge Loaded
Open DevTools → Network tab → Check `root.cartridge.json` loads successfully

### Verify Custom Node Registered
```javascript
// In browser console:
window.graphOSRuntime?.nodeFactory?.getNodeType('custom.habit-transformer')
// Should return the constructor function
```

## 📝 Lessons Learned

1. **Custom Nodes Required** - For complex transformations (id generation, metadata), custom nodes are necessary
2. **Registration Critical** - Custom nodes MUST be registered in `CustomNodes.ts`
3. **Signal Flow Must Be Complete** - Every signal type needs a clear path from input → processing → output
4. **Validation vs Storage** - Graph-OS validates, React handles storage for immediate feedback
5. **Console Logging** - Add console.log() at each step to debug signal flow

## 🎯 Next Steps to Make It Fully Graph-OS

To make this a pure Graph-OS app (no direct localStorage access):

1. **Add completion handling node**
2. **Add delete handling node**  
3. **Wire all CRUD operations through Graph-OS**
4. **Remove direct localStorage calls from React**

This would demonstrate the full power of Graph-OS signal-first architecture!
