# Concepts Explained

> A visual, non-technical guide to understanding Graph-OS. No coding experience needed.

---

## The Big Picture

Graph-OS lets you build applications by **drawing diagrams**. Your diagram becomes a working program.

Think of it like this:

```
Traditional Programming:  Write lines of code → Program runs

Graph-OS:                 Draw boxes and arrows → Program runs
```

---

## Core Concept 1: Nodes

### What is a Node?

A **node** is a single unit of work. It's like a box that does one specific thing.

```
┌─────────────────┐
│   Validate      │  ← This is a node
│   Email         │     It checks if something is a valid email
└─────────────────┘
```

### Types of Nodes

Nodes come in different categories:

| Category | What They Do | Examples |
|----------|--------------|----------|
| **Control** | Start or control the flow | "Start here", "Choose path A or B" |
| **Logic** | Process and transform data | "Validate email", "Calculate total" |
| **External** | Talk to outside systems | "Call API", "Send email", "Save to database" |
| **UI** | Show things to users | "Display message", "Show form" |

### Node = Function

If you're familiar with spreadsheets, a node is like a formula cell:

- It receives input
- It does something
- It produces output

### Real-World Analogy

Think of nodes like **workers in a factory**:

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Receiver │────▶│ Processor│────▶│  Packer  │
└──────────┘     └──────────┘     └──────────┘
   (gets)          (works on)       (finishes)
   raw material     material         product
```

---

## Core Concept 2: Wires

### What is a Wire?

A **wire** connects two nodes. It's like an arrow that shows direction.

```
┌──────────┐         ┌──────────┐
│  Node A  │────────▶│  Node B  │
└──────────┘  wire   └──────────┘
```

### What Wires Do

Wires define **the path that data takes** through your application.

- Node A produces something
- The wire carries it to Node B
- Node B receives it and does its work

### Real-World Analogy

Think of wires like **conveyor belts** in a factory:

```
┌──────────┐   conveyor   ┌──────────┐   conveyor   ┌──────────┐
│ Station 1│─────────────▶│ Station 2│─────────────▶│ Station 3│
└──────────┘     belt     └──────────┘     belt     └──────────┘
```

### Direction Matters

Wires have direction. Data flows ONE way:

```
A ──▶ B     ✅ Correct: A sends to B

A ◀── B     ❌ Not how it works (wires don't go backwards)
```

---

## Core Concept 3: Signals

### What is a Signal?

A **signal** is a message that travels through wires. It carries data from node to node.

```
┌──────────┐     📦 signal      ┌──────────┐
│  Node A  │────[USER.LOGIN]───▶│  Node B  │
└──────────┘                    └──────────┘
```

### Signal = Envelope

Think of a signal like an **envelope**:

```
┌─────────────────────────────────┐
│  Signal Type: USER.LOGIN        │  ← What kind of message
│  ─────────────────────────────  │
│  Payload:                       │  ← The actual content
│    { email: "john@example.com" }│
└─────────────────────────────────┘
```

### Signal Types

Every signal has a **type** that describes what it is:

| Signal Type | What It Means |
|-------------|---------------|
| `USER.SIGNED_UP` | A new user registered |
| `ORDER.PLACED` | Someone made a purchase |
| `EMAIL.SENT` | An email was sent |
| `ERROR.VALIDATION` | Something failed validation |

### Pattern Matching

Signals can use patterns. A node can listen for all signals matching a pattern:

- `USER.*` matches `USER.SIGNED_UP`, `USER.LOGIN`, `USER.LOGOUT`, etc.
- `ERROR.*` matches any error signal
- `*` matches everything

### Real-World Analogy

Think of signals like **mail**:

```
┌────────┐                    ┌────────┐
│ Sender │──[envelope]───────▶│Receiver│
└────────┘                    └────────┘

The envelope contains:
- Address (signal type)
- Letter (payload)
```

---

## How It All Works Together

### The Complete Picture

```
                    Signal
                      │
                      ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Input   │────▶│ Process  │────▶│  Output  │
│  Node    │     │  Node    │     │  Node    │
└──────────┘     └──────────┘     └──────────┘
     ▲                                  │
     │                                  │
   Trigger                           Result
```

### Step by Step

1. **Something happens** (user clicks, timer fires, etc.)
2. **Input node** creates a signal
3. **Wire** carries the signal to the next node
4. **Process node** does its work and emits a new signal
5. **Wire** carries it forward
6. **Output node** produces the final result

### Example: User Registration Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Receive    │────▶│   Validate   │────▶│   Create     │────▶│   Send       │
│   Signup     │     │   Data       │     │   Account    │     │   Welcome    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
  USER.SIGNUP          DATA.VALID         ACCOUNT.CREATED      EMAIL.SENT
  { email, name }      { valid: true }    { userId }           { sent: true }
```

**What happens:**
1. User submits signup form
2. `Receive Signup` node emits `USER.SIGNUP` signal with email and name
3. `Validate Data` node checks if email is valid, emits `DATA.VALID`
4. `Create Account` node creates the user, emits `ACCOUNT.CREATED`
5. `Send Welcome` node sends email, emits `EMAIL.SENT`

---

## Cartridges: Organizing Large Projects

### What is a Cartridge?

A **cartridge** is a collection of related nodes and wires. It's like a module or a section of your application.

```
my-project/
├── 📁 cartridges/
│   ├── 📄 auth.cartridge.json      ← Login, signup, logout
│   ├── 📄 orders.cartridge.json    ← Order processing
│   └── 📄 payments.cartridge.json  ← Payment handling
```

### Why Use Cartridges?

1. **Organization**: Keep related things together
2. **Teamwork**: Different teams can work on different cartridges
3. **Focus**: Work on one part without seeing everything
4. **Reuse**: Share cartridges between projects

### Analogy

Think of cartridges like **departments in a company**:

```
Company (Project)
├── HR Department (Auth Cartridge)
├── Sales Department (Orders Cartridge)
└── Finance Department (Payments Cartridge)
```

Each department has its own workers (nodes) and procedures (wires), but they're all part of the same company.

---

## Composites: Reusable Patterns

### What is a Composite?

A **composite** is a reusable sub-graph. It's like a template you can use multiple times.

```
Instead of drawing this every time:

┌──────┐     ┌──────┐     ┌──────┐
│ A    │────▶│ B    │────▶│ C    │
└──────┘     └──────┘     └──────┘

You create a composite called "My Pattern" and just use:

┌─────────────────┐
│   My Pattern    │  ← This expands to A → B → C
└─────────────────┘
```

### Why Use Composites?

1. **Don't Repeat Yourself**: Define once, use many times
2. **Simplicity**: Hide complexity behind a single node
3. **Consistency**: Same pattern works the same way everywhere

### Analogy

Think of composites like **macros** or **shortcuts**:

- Instead of typing the same long email every time, you create a template
- Instead of building the same flow every time, you create a composite

---

## Summary: The Mental Model

| Concept | Simple Explanation | Analogy |
|---------|-------------------|---------|
| **Node** | A box that does one thing | Worker in a factory |
| **Wire** | Arrow connecting boxes | Conveyor belt |
| **Signal** | Message traveling on wires | Envelope with a letter |
| **Cartridge** | Group of related nodes | Department in a company |
| **Composite** | Reusable template | Keyboard shortcut |

---

## Putting It All Together

**The Graph-OS Way:**

1. **Start with the problem**: What needs to happen?
2. **Break it into steps**: Each step becomes a node
3. **Connect the steps**: Draw wires between nodes
4. **Define the messages**: What signals carry the data?
5. **Organize**: Group related nodes into cartridges
6. **Reuse**: Turn common patterns into composites

**The result**: A visual diagram that is also a working application.
