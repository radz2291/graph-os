# 🎯 Habit Tracker - Graph-OS Example Application

A full-stack habit tracker application built with **React + Graph-OS** demonstrating the **signal-first architecture** and the **3 core practices**: Custom Nodes, Composites, and UI-to-Backend integration.

---

## 📋 Features

- ✅ **Create habits** with name, description, and frequency (daily/weekly)
- 🔥 **Track streaks** - Automatic streak calculation based on completion history
- ✔️ **Mark habits complete** - One-click completion tracking
- 🗑️ **Delete habits** - Remove habits you no longer want to track
- 💾 **Persistent storage** - All data saved to localStorage via Graph-OS
- ⚡ **Signal-first architecture** - React emits signals → Graph-OS processes → React responds

---

## 🏗️ Architecture

### Signal Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND (Manual Code)                 │
│  ┌─────────────┐  emit   HABIT.CREATE  ┌─────────────────────┐   │
│  │ HabitForm   │ ─────────────────────────────────────────────► │   │
│  └─────────────┘                                            │   │
│         ▲                                                    │   │
│         │ subscribe                                          │   │
│  ┌─────────────┐  HABIT.SAVED/HABIT.INVALID                  │   │
│  │ HabitList   │ ◄─────────────────────────────────────────── │   │
│  │ HabitCard   │                                            │   │
│  └─────────────┘                                            │   │
└─────────────────────────────────────────────────────────────────┘
                           ↕ Signal Flow
┌─────────────────────────────────────────────────────────────────┐
│                  GRAPH-OS CARTRIDGE (MCP Tools)                 │
│                                                                  │
│  React Signals                                                   │
│      ↓                                                           │
│  ┌─────────────────┐                                            │
│  │ habit-validator │ ──HABIT.VALID──► ┌──────────────────┐      │
│  │ (logic.validate)│                  │habit-transformer │      │
│  └─────────────────┘                  │ (logic.transform)│      │
│       │   │                           └──────────────────┘      │
│       │   │                                   │                │
│   HABIT.  │    HABIT.INVALID                    │ HABIT.SAVED   │
│  INVALID │         ↓                           ↓               │
│       │   │    ┌────────┐              ┌─────────────────┐     │
│       │   └──►│ display │◄─────────────│ habit-storage   │     │
│       │        └────────┘              │ (infra.storage) │     │
│       │                                └─────────────────┘     │
│       │                                       │                │
│       │                                   HABIT.SAVED          │
│       │                                       │                │
│       └───────────────────────────────────────┘                │
│                                             ↕                  │
│                                   React receives signal        │
└─────────────────────────────────────────────────────────────────┘
```

### Cartridge Structure

The `root.cartridge.json` contains 7 nodes organized for habit management:

| Node ID | Type | Purpose |
|---------|------|---------|
| `habit-validator` | logic.validate | Validates habit data against JSON schema |
| `habit-transformer` | logic.transform | Adds id, createdAt, and initializes completions |
| `habit-storage` | infra.storage.local | Persists habits to localStorage |
| `load-transformer` | logic.transform | Transforms loaded habits |
| `completion-transformer` | logic.transform | Adds completion record to habit |
| `delete-transformer` | logic.transform | Removes habit from array |
| `display` | control.display | Displays signals for debugging |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Navigate to the project
cd habit-tracker/habit-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 📁 Project Structure

```
habit-tracker/
├── src/                          # MANUAL CODE - React components
│   ├── App.tsx                   # Main application component
│   ├── main.tsx                  # Entry point
│   └── integration/              # Signal bridge integration
│       ├── RuntimeProvider.tsx   # Fetches cartridge via HTTP
│       ├── SignalHooks.ts        # useEmitSignal, useSignal hooks
│       └── CustomNodes.ts        # Custom node implementations
│
├── cartridges/                   # MCP TOOL-MANAGED
│   └── root.cartridge.json       # Main application cartridge
│
├── registries/                   # MCP TOOL-MANAGED
│   └── signal-registry.json      # Registered signal types
│
├── public/                       # Static assets (HTTP accessible)
│   └── cartridges/
│       └── root.cartridge.json   # Copy served to browser
│
├── package.json
├── vite.config.js
├── tsconfig.json
└── graph-os.config.json
```

---

## 🔌 Signal Registry

All signals follow the `NAMESPACE.ACTION` format and are registered in `registries/signal-registry.json`:

| Signal Type | Emitted By | Consumed By | Purpose |
|-------------|------------|-------------|---------|
| `HABIT.CREATE` | React | logic.validate | User creates new habit |
| `HABIT.VALID` | logic.validate | logic.transform | Habit passed validation |
| `HABIT.INVALID` | logic.validate | control.display | Habit failed validation |
| `HABIT.SAVED` | infra.storage.local | React | Habit persisted to storage |
| `HABIT.COMPLETE` | React | logic.transform | User marks habit complete |
| `HABIT.COMPLETED` | infra.storage.local | React | Completion saved |
| `HABIT.LOAD` | React | infra.storage.local | Request to load all habits |
| `HABIT.LOADED` | infra.storage.local | React | Habits loaded from storage |
| `HABIT.DELETE` | React | infra.storage.local | User requests deletion |
| `HABIT.DELETED` | infra.storage.local | React | Habit deleted |

---

## 🎨 UI Components

### HabitForm
- Captures user input (name, description, frequency)
- Emits `HABIT.CREATE` signal to Graph-OS
- Displays validation errors via `HABIT.INVALID` subscription
- Resets form after successful submission

### HabitList
- Subscribes to `HABIT.SAVED`, `HABIT.LOADED`, `HABIT.COMPLETED`, `HABIT.DELETED` signals
- Renders all habits with current streak calculations
- Emits `HABIT.COMPLETE` when user marks habit complete
- Emits `HABIT.DELETE` when user deletes habit

### HabitCard
- Individual habit display with streak indicator
- Shows completion status for today
- Complete button (disabled if already done today)
- Delete button with confirmation

---

## 🔧 How It Works

### Creating a Habit

1. **User Action**: User fills out form and clicks "Add Habit"
2. **React Emits Signal**: `HABIT.CREATE` signal emitted with habit data
3. **Graph-OS Processes**:
   - `habit-validator` validates against JSON schema
   - On success → emits `HABIT.VALID`
   - On failure → emits `HABIT.INVALID`
4. **Transform**: `habit-transformer` adds id, createdAt, initializes completions
5. **Storage**: `habit-storage` saves to localStorage → emits `HABIT.SAVED`
6. **React Responds**: `HabitList` subscribes to `HABIT.SAVED`, updates UI

### Completing a Habit

1. **User Action**: User clicks "Complete" button on a habit
2. **React Emits Signal**: `HABIT.COMPLETE` signal with habitId and date
3. **Graph-OS Processes**:
   - `completion-transformer` loads all habits, adds completion
   - `habit-storage` saves updated array → emits `HABIT.COMPLETED`
4. **React Responds**: `HabitList` receives `HABIT.COMPLETED`, updates UI

---

## 🛠️ Development Practices

### What We Did (Following 3 Core Practices)

1. ✅ **Used MCP Tools for Cartridge Management**
   - `scaffold_project` - Created React + Graph-OS project
   - `create_signal` (via signal registry) - Registered all signal types
   - `apply_topology_patch` - Built cartridge with nodes and wires
   - `validate_cartridge` - Validated architecture before deployment
   - `visualize_cartridge` - Generated flowchart documentation

2. ✅ **Wrote React Code Manually**
   - All UI components (HabitForm, HabitList, HabitCard)
   - State management with React hooks
   - Signal emission with `useEmitSignal()` hook
   - Signal subscription with `useSignal()` hook
   - Streak calculation logic

3. ✅ **Signal-First Architecture**
   - UI NEVER calls backend functions directly
   - ALL communication via signals (async, reactive)
   - Clear separation of concerns: React = UI, Graph-OS = logic
   - Isomorphic pattern: Cartridge fetched via HTTP in browser

### What We Could Add (Advanced Features)

1. **Custom Node** - Domain-specific habit logic:
   ```typescript
   // Example: custom.streak-calculator node
   export class StreakCalculatorNode {
     async process(signal: Signal): Promise<Signal[]> {
       const { habit, frequency } = signal.payload;
       const streak = this.calculateStreak(habit.completions, frequency);
       return [{
         type: 'STREAK.CALCULATED',
         payload: { habitId: habit.id, streak },
         timestamp: new Date(),
         sourceNodeId: signal.sourceNodeId
       }];
     }
   }
   ```

2. **Composite Extraction** - Reusable patterns:
   - Extract "validation + transformation + storage" into composite
   - Reusable across multiple CRUD operations
   - `extract_to_composite` MCP tool

3. **Enhanced Transformations** - Custom logic in transform nodes:
   - `addIdAndMetadata` - Generate UUID, timestamps
   - `addCompletion` - Handle duplicate completions, date validation
   - `removeHabit` - Safe deletion with confirmation

---

## 📊 Streak Calculation

The app automatically calculates streaks based on completion history:

```typescript
function calculateStreak(completions: string[], frequency: 'daily' | 'weekly'): number {
  // 1. Sort completions by date (most recent first)
  // 2. Check if today is completed
  // 3. Count consecutive days backwards from today
  // 4. Break streak on missed day
}
```

**Streak Rules:**
- Daily habits: Count consecutive days with completions
- Weekly habits: Count consecutive weeks with completions
- Streak resets if habit not completed for 1 day (daily) or 1 week (weekly)

---

## 🧪 Testing

### Manual Testing Steps

1. **Create a habit**
   - Fill in name, description, select frequency
   - Click "Add Habit"
   - Verify habit appears in list with 0 streak

2. **Complete a habit**
   - Click "Complete" button
   - Verify button changes to "✓ Done Today"
   - Verify streak updates to 1

3. **Test streak calculation**
   - Complete habit multiple days in a row
   - Verify streak increments each day
   - Skip a day, verify streak resets

4. **Delete a habit**
   - Click delete button on habit
   - Confirm deletion
   - Verify habit removed from list

### Integration Testing

```bash
# Test cartridge validation
# (Already validated - all signals registered, no circular dependencies)

# Test signal flow
# 1. Open browser DevTools → Console
# 2. Interact with app
# 3. Observe signal emissions and receipts
```

---

## 🎯 Learning Outcomes

This example demonstrates:

✅ **Isomorphic Pattern**: Cartridge loaded via HTTP (`fetch('/cartridges/root.cartridge.json')`)

✅ **Signal-First Architecture**: All UI ↔ Backend communication via signals

✅ **Separation of Concerns**: React for UI, Graph-OS for logic, never mixed

✅ **MCP Tool Usage**: Cartridge built entirely with MCP tools (no manual JSON editing)

✅ **Signal Registration**: All signals registered in signal-registry.json

✅ **Standard Node Types**: Using `logic.validate`, `logic.transform`, `infra.storage.local`

✅ **React Hooks**: `useEmitSignal`, `useSignal` for signal integration

---

## 📖 Next Steps

**For this app:**
- Add habit categories/tags
- Add habit reminders
- Export/import habits (JSON)
- Statistics dashboard (completion rates)

**For learning:**
- Explore `task-management-mvp` example for advanced features
- Try creating a custom node for streak calculation
- Extract validation flow into a composite
- Build additional features using signal-first pattern

---

## 🔗 Related Examples

- `task-management-mvp` - More complex CRUD with custom nodes
- `simple-input-display` - Basic signal flow example
- `react-login` - Authentication flow example
- `playground` - Experiment with different node configurations

---

## 📝 License

MIT License - Feel free to use this example as a starting point for your own Graph-OS applications!
