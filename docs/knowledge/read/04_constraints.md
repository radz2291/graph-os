# Graph-OS Constraints

**All Architectural Rules - Reference for All Agents**

---

## 🎯 Purpose

This document contains ALL Graph-OS constraints and limits.

**Key Principle:** These constraints are **non-negotiable**. They must be met before cartridges are considered valid.

---

## 📊 Size Constraints

### **Max Nodes Per Composite**
**Constraint:** `maxNodesPerComposite = 30`

**Definition:** Maximum number of nodes allowed in a single composite cartridge.

**Why:** Prevents god-composites, keeps functionality focused.

**Examples:**
- ✅ **Valid:** Composite with 12 nodes
- ✅ **Valid:** Composite with 30 nodes
- ❌ **Invalid:** Composite with 35 nodes (exceeds 30)

**Violation Error:**
```
❌ Size Validator: Node count 35 exceeds maxNodesPerComposite (30)
Fix: Break composite into 2 smaller composites
```

---

### **Max Wires Per Composite**
**Constraint:** `maxWiresPerComposite = 50`

**Definition:** Maximum number of wires allowed in a single composite cartridge.

**Why:** Prevents overly complex signal flow, keeps topology understandable.

**Examples:**
- ✅ **Valid:** Composite with 15 wires
- ✅ **Valid:** Composite with 50 wires
- ❌ **Invalid:** Composite with 55 wires (exceeds 50)

**Violation Error:**
```
❌ Size Validator: Wire count 55 exceeds maxWiresPerComposite (50)
Fix: Simplify signal flow or break into composites
```

---

### **Max Signals Per Composite**
**Constraint:** `maxSignalsPerComposite = 10`

**Definition:** Maximum number of unique signals allowed in a single composite cartridge.

**Why:** Prevents signal overload, keeps interface focused.

**Examples:**
- ✅ **Valid:** Composite with 5 signals
- ✅ **Valid:** Composite with 10 signals
- ❌ **Invalid:** Composite with 12 signals (exceeds 10)

**Violation Error:**
```
❌ Size Validator: Signal count 12 exceeds maxSignalsPerComposite (10)
Fix: Reduce signals or break into multiple composites
```

---

## 🌳 Hierarchy Constraints

### **Max Hierarchy Depth**
**Constraint:** `maxHierarchyDepth = 3`

**Definition:** Maximum nesting levels allowed in application hierarchy.

**Why:** Prevents complexity explosion, keeps architecture understandable.

**Hierarchy Levels:**

#### **Level 0: Application (Root)**
- **Root cartridge** (`cartridges/root.cartridge.json`)
- Entry point for application

#### **Level 1: Top-Level Composites**
- **Direct children** of root cartridge
- **Max 7 composites** at this level

#### **Level 2: Nested Composites**
- **Referenced from** Level 1 composites

#### **Level 3: Deep Nesting** (MAX DEPTH)
- **Nested within** Level 2 composites
- **Maximum depth** is 3 levels total

**Examples:**
- ✅ **Valid:** Root → Level 1 → Level 2 (Depth: 3)
- ❌ **Invalid:** Root → Level 1 → Level 2 → Level 3 (Depth: 4)

---

### **Max Top-Level Composites**
**Constraint:** `maxTopLevelComposites = 7`

**Definition:** Maximum number of composites allowed in root cartridge.

**Why:** Keeps root manageable, prevents bloat.

---

### **Max Composites Per Subsystem**
**Constraint:** `maxCompositesPerSubsystem = 7`

**Definition:** Maximum number of composites allowed in a logical subsystem.

**Why:** Keeps subsystems focused, prevents bloat.

---

## 🚫 Naming Constraints

### **Signal Naming Convention**
**Constraint:** All signals MUST follow `NAMESPACE.ACTION` pattern.

**Pattern:** `NAMESPACE.ACTION`

**Examples:**
- ✅ `AUTH.LOGIN_REQUEST`
- ✅ `TRADING.ORDER_SUBMIT`

**Invalid:**
- ❌ `login_request` - Wrong case
- ❌ `LOGIN` - Missing namespace

---

### **Forbidden Signal Prefixes**
**Constraint:** Signals MUST NOT use forbidden prefixes.

**Forbidden Prefixes:**
- `TEMP_`
- `TEST_`
- `XXX_`
- `DEBUG_`
- `HACK_`

---

### **Composite Naming Convention**
**Constraint:** All composites MUST follow `composite.domain.feature` pattern.

**Examples:**
- ✅ `composite.auth.login`
- ✅ `composite.trading.order-entry`

**Invalid:**
- ❌ `auth.login` - Missing prefix

---

## 📂 Structural Constraints

### **Cartridge Location**
**Constraint:** All cartridge JSON files MUST be in `cartridges/` directory.

---

### **Runtime Code Location**
**Constraint:** All runtime TypeScript files MUST be in `src/` directory.

---

### **Pure JSON Cartridges**
**Constraint:** Cartridge files MUST contain ONLY JSON (no code references).

---

## 🔗 Registry Constraints

### **Signal Registration**
**Constraint:** All signals MUST be registered in `signal-registry.json`.

---

### **Composite Registration**
**Constraint:** All composites MUST be registered in `composite-registry.json`.

---

## ✅ Constraint Summary

| Constraint | Value | Purpose |
|-----------|-------|----------|
| `maxNodesPerComposite` | 30 | Prevents god-composites |
| `maxWiresPerComposite` | 50 | Prevents complex signal flow |
| `maxSignalsPerComposite` | 10 | Prevents signal overload |
| `maxHierarchyDepth` | 3 | Prevents complexity |
| `maxTopLevelComposites` | 7 | Keeps root manageable |
| `maxCompositesPerSubsystem` | 7 | Keeps subsystems focused |
| Signal Naming | NAMESPACE.ACTION | Consistent naming |
| Composite Naming | composite.domain.feature | Consistent naming |

---

**Next:** Read **workflows.md** for standard collaboration patterns
