# Graph-OS Definitions

**Common Terminology for All Graph-OS Development**

---

## 🔄 Signal Flow Terminology

### **Emit**
**Definition:** Node creates and sends a signal.
**Agent Usage:**
- Architect Agent: "Wire from node A emits to node B"
- Implementor Agent: "Node emits AUTH.SUCCESS signal"
**Example:**
```
Node A (emits) → AUTH.SUCCESS → Node B (receives)
```

### **Receive**
**Definition:** Node accepts and processes a signal.
**Agent Usage:**
- Architect Agent: "Node B receives from node A"
- Implementor Agent: "Node receives AUTH.SUCCESS signal"
**Example:**
```
Node A emits AUTH.SUCCESS → Node B receives AUTH.SUCCESS
```

### **Consume**
**Definition:** Node processes a received signal.
**Agent Usage:**
- Implementor Agent: "Node consumes AUTH.SUCCESS payload"
**Example:**
```
Node B receives AUTH.SUCCESS → Node B processes (consumes) signal
```

### **Propagate**
**Definition:** Signal flows through multiple nodes in sequence.
**Agent Usage:**
- Architect Agent: "Signal propagates through validation chain"
- Inspector Agent: "Signal propagates correctly without loops"
**Example:**
```
Node A emits → Node B → Node C → Node D (signal propagates)
```

---

## 🏗️ Cartridge Terminology

### **Pure JSON**
**Definition:** Cartridge contains ONLY JSON (nodes, wires, signals), no code references.
**Agent Usage:**
- Architect Agent: "Create pure JSON cartridge"
- Inspector Agent: "Cartridge must be pure JSON (no code refs)"
**Example:**
```json
// CORRECT: Pure JSON
{
  "nodes": [{"type": "logic.validate"}],
  "wires": [{"signalType": "AUTH.SUCCESS"}]
}

// INCORRECT: Has code reference
{
  "nodes": [{"task": "src/nodes/Validator.ts"}]  // ❌ No code refs
}
```

### **Topology**
**Definition:** Structure of nodes, wires, and signals in a cartridge.
**Agent Usage:**
- Architect Agent: "Design topology for login composite"
- Incubator Agent: "Explore topology patterns for auth"
**Example:**
```
Topology = (Nodes: 12) + (Wires: 15) + (Signals: 8)
```

### **Atomic**
**Definition:** Smallest, indivisible unit in Graph-OS (a node).
**Agent Usage:**
- Architect Agent: "Use atomic nodes, not sub-composites"
- Implementor Agent: "Implement atomic node type"
**Example:**
```
Atomic = logic.validate (one node)
Not Atomic = composite.auth.login (group of nodes)
```

---

## 🧩 Composite Terminology

### **Encapsulation**
**Definition:** Composite hides internal implementation, exposes only inputs/outputs.
**Agent Usage:**
- Architect Agent: "Composite encapsulates login flow"
**Example:**
```
Encapsulation:
- External nodes see: INPUTS, OUTPUTS
- External nodes don't see: Internal wires, internal nodes
```

### **Boundary**
**Definition:** Interface between composite and external world (inputs/outputs).
**Agent Usage:**
- Architect Agent: "Define composite boundary clearly"
**Example:**
```
Composite Boundary:
  INPUTS: AUTH.LOGIN_REQUEST
  OUTPUTS: AUTH.SUCCESS
  INTERNAL: [Hidden from external]
```

### **Granularity**
**Definition:** Level of detail (how small/large a composite is).
**Agent Usage:**
- Architect Agent: "Adjust granularity (break into smaller composites)"
**Example:**
```
Too Coarse: 35 nodes in one composite (exceeds 30)
Just Right: 12 nodes in one composite (fits 5-30 range)
```

---

## ⚡ Signal Terminology

### **Payload**
**Definition:** Data carried by signal (structured JSON object).
**Agent Usage:**
- Architect Agent: "Define signal payload structure"
**Example:**
```json
{
  "type": "AUTH.LOGIN_REQUEST",
  "payload": {
    "email": "user@example.com",
    "password": "***"
  }
}
```

### **Schema**
**Definition:** Structure definition for signal payload (types, required fields).
**Agent Usage:**
- Architect Agent: "Create schema for AUTH.LOGIN_REQUEST"
**Example:**
```json
{
  "schema": {
    "type": "object",
    "properties": {
      "email": {"type": "string", "required": true},
      "password": {"type": "string", "required": true}
    }
  }
}
```

### **Namespace**
**Definition:** Logical grouping of signals by domain (first part of signal name).
**Agent Usage:**
- Architect Agent: "Group signals under AUTH namespace"
**Example:**
```
Namespaces:
- AUTH (login, success, failure)
- TRADING (order_submit, order_filled)
- SYSTEM (start, ready, stop)
```

---

## 🔲 Node Terminology

### **Node Type**
**Definition:** Category or classification of node (e.g., logic.validate, infra.api.client).
**Agent Usage:**
- Architect Agent: "Use correct node type for this function"
**Example:**
```
Node Types:
- logic.validate (validation logic)
- infra.api.client (API integration)
- control.input (user input)
```

### **Node Configuration**
**Definition:** Properties or settings that customize node behavior.
**Agent Usage:**
- Architect Agent: "Configure node with required properties"
**Example:**
```json
{
  "id": "api-client",
  "type": "infra.api.client",
  "config": {
    "endpoint": "/api/auth",
    "timeout": 5000
  }
}
```

### **Node ID**
**Definition:** Unique identifier for node within a composite (used in wires).
**Agent Usage:**
- Architect Agent: "Ensure all node IDs are unique"
**Example:**
```
Node IDs:
- "login-form"
- "credential-validator"
- "auth-api-client"
```

---

## 🔄 Wire Terminology

### **Source Node**
**Definition:** Node that emits signal (start of wire).
**Agent Usage:**
- Architect Agent: "Define source node for this wire"
**Example:**
```
Wire: source-node → AUTH.SUCCESS → target-node
Source: source-node (emits signal)
```

### **Target Node**
**Definition:** Node that receives signal (end of wire).
**Agent Usage:**
- Architect Agent: "Define target node for this wire"
**Example:**
```
Wire: source-node → AUTH.SUCCESS → target-node
Target: target-node (receives signal)
```

### **Orphaned Node**
**Definition:** Node not connected by any wires (no inputs or outputs).
**Agent Usage:**
- Inspector Agent: "Validate all nodes are connected"
**Example:**
```
Orphaned Node:
{
  "id": "unused-node",
  "type": "logic.process"
}
```

---

## ✅ Terminology Consistency

### **Wrong Terminology (Avoid)**
```
❌ "Node calls method on another node" (wrong - use "emits signal")
❌ "Cartridge is a directory" (wrong - it's a file)
❌ "Composite is a package" (wrong - it's a group of nodes)
❌ "Signal is an HTTP request" (wrong - it's event flow)
❌ "Runtime code is architecture" (wrong - they're separate)
```

### **Correct Terminology (Use)**
```
✅ "Node emits signal to another node" (correct)
✅ "Cartridge is a JSON file" (correct)
✅ "Composite is a group of 5-30 nodes" (correct)
✅ "Signal is an event or data flow" (correct)
✅ "Runtime code is TypeScript files" (correct)
```

---

**Next:** Read **agent-roles.md** for agent boundaries
