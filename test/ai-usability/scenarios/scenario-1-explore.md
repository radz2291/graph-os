# Scenario 1: Explore Existing Project

## Goal
Load an existing Graph-OS project and thoroughly explore its contents.

## Time Estimate
10-15 minutes

## Difficulty
Beginner

---

## Steps

### Step 1: Load the Project
Load the test fixture project using the USE tool:

```
Project path: /home/z/my-project/graph-os/packages/tool/test/fixtures/test-project
```

**Expected:** Project loads successfully, session is initialized.

### Step 2: Check Current State
Use the USE tool with empty parameters to see your current session state.

**Expected:** Response shows which project and cartridge are active.

### Step 3: Explore the Cartridge
Query the cartridge to understand what's in the current project:

- Get the cartridge summary
- Get the full cartridge data
- Get the validation status

**Expected:** You understand the structure of the current cartridge.

### Step 4: Explore Nodes
Query all nodes in the current cartridge.

**Questions to answer:**
- How many nodes are there?
- What types are they?
- What categories do they belong to?

### Step 5: Explore Wires
Query all wires to understand connections.

**Questions to answer:**
- How are nodes connected?
- What signals flow between them?

### Step 6: Explore Signals
Query the signal registry.

**Questions to answer:**
- What signal types are defined?
- What do they represent?

### Step 7: View Topology
Query the topology with mermaid format to get a visual diagram.

**Expected:** You receive a text-based diagram showing the graph structure.

### Step 8: Switch Cartridges
The project has multiple cartridges. Switch to the "auth" cartridge:

- Use the USE tool to switch
- Query the auth cartridge's nodes
- Compare to the previous cartridge

**Expected:** You see different nodes in different cartridges.

### Step 9: Switch Back
Switch back to the main/root cartridge.

---

## Success Criteria

- [ ] Project loaded successfully
- [ ] Queried nodes, wires, signals
- [ ] Viewed topology as diagram
- [ ] Switched between cartridges
- [ ] Understood the project structure

---

## Reflection Questions

After completing this scenario:

1. Was it obvious how to load a project?
2. Could you find all the query options?
3. Did the mermaid diagram help you understand the graph?
4. Was cartridge switching intuitive?
5. What would make exploration easier?
