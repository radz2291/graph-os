# Graph-OS Core Concepts

**Fundamental Definitions for All Graph-OS Development**

---

## 🎯 What is Graph-OS?

### Definition
Graph-OS is a **node-based, signal-driven architecture platform** for building modular, maintainable applications.

### Key Characteristics
- **Topology-First:** Application structure defined by nodes and wires (not code organization)
- **Signal-Driven:** All communication occurs via signals (not method calls)
- **Composable:** Applications built from reusable composites
- **Explicit:** All structure defined in JSON cartridges (not implicit)
- **Validated:** All architecture checked against constraints

### Analogy
Think of Graph-OS as:
- **Nodes** = Processing units (like factories)
- **Wires** = Conveyor belts connecting factories
- **Signals** = Raw materials and products flowing on belts
- **Composites** = Factory floor containing multiple machines
- **Application** = Industrial park with multiple factory floors

---

## 📦 What is a Cartridge?

### Definition
A **cartridge** is a **JSON file** that defines topology (nodes, wires, signals).

### Characteristics
- **Pure JSON** - No code, no TypeScript, no runtime logic
- **Explicit Topology** - All nodes, wires, signals declared clearly
- **File-Based** - Physical .cartridge.json file (not concept, not folder)
- **Validatable** - Can be checked against constraints without running
- **Immutable in Runtime** - Cartridge doesn't change during execution

### Cartridge Structure
```json
{
  "version": "1.0.0",
  "name": "feature-name",
  "description": "What this cartridge does",
  "inputs": ["INPUT_SIGNAL_1", "INPUT_SIGNAL_2"],
  "outputs": ["OUTPUT_SIGNAL_1", "OUTPUT_SIGNAL_2"],
  "nodes": [
    {
      "id": "node-id",
      "type": "node.type",
      "description": "What this node does",
      "config": { "property": "value" }
    }
  ],
  "wires": [
    {
      "from": "node-id-1",
      "to": "node-id-2",
      "signalType": "SIGNAL_NAME"
    }
  ]
}
```

### Types of Cartridges
1. **Root Cartridge** (`cartridges/root.cartridge.json`)
   - Application-level cartridge
   - Connects top-level composites
   - Entry point for application

2. **Composite Cartridge** (`cartridges/composites/[domain]/[name].cartridge.json`)
   - Feature-level cartridge
   - Contains atomic nodes
   - Reusable across applications

### What Cartridges Are NOT
- ❌ Not a directory or folder
- ❌ Not a TypeScript file or class
- ❌ Not a code module or package
- ❌ Not an implementation (that's runtime)
- ❌ Not a container for other files

---

## 🧩 What is a Composite?

### Definition
A **composite** is a **cartridge that groups 5-30 atomic nodes** into a cohesive unit.

### Characteristics
- **Encapsulates Functionality** - One feature or capability
- **Defines Boundaries** - Inputs and outputs are explicit
- **Reusable** - Can be used in multiple applications
- **Named Conventionally** - `composite.domain.feature` pattern
- **Constrained** - 5-30 nodes, max 10 signals

### Composite vs. Atomic Node
| Aspect | Atomic Node | Composite |
|---------|---------------|------------|
| **Granularity** | Smallest unit | Groups 5-30 nodes |
| **Reusable** | Yes (node type) | Yes (topology) |
| **Implementation** | Provided by runtime | Built from atomic nodes |
| **Cartridge File** | No (uses existing type) | Yes (.cartridge.json) |
| **Complexity** | Low (single logic) | Medium (feature-level) |

### Composite Examples
- **composite.auth.login** - Handles user login flow (12 nodes)
- **composite.trading.order-entry** - Handles order submission (18 nodes)
- **composite.ui.shell** - Application layout and navigation (8 nodes)

---

## ⚡ What is a Signal?

### Definition
A **signal** is an **event or data flow** that carries information between nodes.

### Characteristics
- **Named Conventionally** - `NAMESPACE.ACTION` pattern
- **Payload-Based** - Carries structured data
- **Registered** - MUST be defined in signal-registry.json
- **Typed** - Has schema for payload structure
- **Unidirectional** - Flows from one node to another

### Signal Structure
```json
{
  "type": "NAMESPACE.ACTION",
  "payload": {
    "property": "value",
    "data": "value"
  },
  "timestamp": "2024-01-20T12:00:00.000Z",
  "sourceNodeId": "node-id"
}
```

### Signal Naming Convention
**Pattern:** `NAMESPACE.ACTION`

**Examples:**
- `AUTH.LOGIN_REQUEST` - Namespace: auth, Action: LOGIN_REQUEST
- `TRADING.ORDER_SUBMIT` - Namespace: trading, Action: ORDER_SUBMIT
- `SYSTEM.START` - Namespace: system, Action: START

**Invalid Names:**
- `login_request` - Wrong case (should be UPPER_SNAKE_CASE)
- `AUTHLOGIN` - Missing underscore (should be AUTH.LOGIN)

---

## 🔲 What is a Node?

### Definition
A **node** is a **signal processor** that receives input signals and emits output signals.

### Characteristics
- **Typed** - Has a type (e.g., logic.validate, infra.api.client)
- **Configured** - Has configuration properties
- **Stateless** - Typically doesn't maintain state (can be stateful)
- **Reactive** - Reacts to incoming signals by processing them
- **Emittive** - Emits output signals after processing

### Node Types (Categories)

#### **1. Control Nodes** (`control.*`)
Handle user input, display output, or application flow
- `control.button` - Button that emits signal on click
- `control.input` - Text input field
- `control.display` - Display data to user

#### **2. Logic Nodes** (`logic.*`)
Process, transform, validate, or route signals
- `logic.validate` - Validates signal payload against schema
- `logic.transform` - Transforms signal data
- `logic.router` - Routes signals based on conditions

#### **3. Infrastructure Nodes** (`infra.*`)
Provide services like storage, API, file system
- `infra.storage.local` - Local file storage
- `infra.api.client` - HTTP API client

#### **4. UI Nodes** (`ui.*`)
Frontend components (handled by UI Agent)
- `ui.component` - React/Vue component reference

#### **5. Composite Nodes** (`composite.*`)
References to other cartridges
- `composite.auth.login` - Reference to login cartridge

---

## 🔄 What is a Wire?

### Definition
A **wire** is a **connection** between two nodes that defines signal flow.

### Characteristics
- **Connects Nodes** - Links output of one node to input of another
- **Defines Signal Type** - Specifies which signal flows on wire
- **Unidirectional** - Signal flows one way (from → to)
- **Named** - Uses registered signal names

### Wire Structure
```json
{
  "from": "node-id-1",
  "to": "node-id-2",
  "signalType": "SIGNAL_NAME"
}
```

### Wire Constraints
- **Source Exists** - "from" node ID must exist in nodes array
- **Target Exists** - "to" node ID must exist in nodes array
- **Signal Registered** - "signalType" must be in signal-registry.json

---

## 🌳 What is Hierarchy?

### Definition
**Hierarchy** is the **nesting structure** of composites within other composites.

### Hierarchy Levels

#### **Level 0: Application**
- **Root cartridge** (`cartridges/root.cartridge.json`)
- Entry point for application

#### **Level 1: Top-Level Composites**
- **Direct children** of root cartridge
- **Max 7 composites** at this level
- Subsystems: auth, trading, ui, agent, etc.

#### **Level 2: Nested Composites**
- **Referenced from** Level 1 composites
- Feature-level breakdown
- **Max 7 composites per Level 1 composite**

#### **Level 3: Deep Nesting** (MAX DEPTH)
- **Nested within** Level 2 composites
- **Maximum depth** is 3 levels total
- **Rarely needed** - most features stop at Level 2

### Hierarchy Constraints
- **Max Depth:** 3 levels total (Root → Level 1 → Level 2)
- **Max Top-Level Composites:** 7 in root cartridge
- **Max Composites per Subsystem:** 7 in registry

---

## ✅ Concept Summary

| Concept | Definition | Key Characteristic |
|---------|-------------|--------------------|
| **Graph-OS** | Node-based, signal-driven platform | Topology-First |
| **Cartridge** | JSON file defining topology | Pure JSON, explicit |
| **Composite** | Group of 5-30 nodes | Encapsulates feature |
| **Signal** | Event/data flow between nodes | NAMESPACE.ACTION |
| **Node** | Signal processor | Reactive, emittive |
| **Wire** | Connection between nodes | Unidirectional |

---

**Next:** Read **definitions.md** for common terminology
