# Scenario 2: Build a User Registration Flow

## Goal
Create a new project and build a graph that handles user registration.

## Time Estimate
20-30 minutes

## Difficulty
Intermediate

---

## Background

You need to build a user registration flow with these steps:
1. Receive signup data (email, password, name)
2. Validate the email format
3. Check if user already exists
4. Create the user account
5. Send welcome email
6. Return success/failure response

---

## Steps

### Step 1: Create a New Project

Create a new project called "registration-demo":

**Options:**
- Use GENERATE tool with project parameter
- OR use USE tool with init parameter

**Location:** `/tmp/registration-demo` or similar temporary location

**Expected:** New project folder created with default structure.

### Step 2: Load the New Project

Make sure your new project is loaded and active.

### Step 3: Plan Your Nodes

Before creating nodes, think about what you need:

| Node ID | Type | Purpose |
|---------|------|---------|
| signup-input | control.input | Receive signup data |
| validate-email | logic.validator | Check email format |
| check-existing | external.database | Check if user exists |
| create-user | external.database | Create new user |
| send-welcome | external.api | Send welcome email |
| success-response | control.output | Return success |
| error-response | control.output | Return error |

### Step 4: Create Nodes

Create each node using the PATCH tool with add operations.

**Tips:**
- You can create multiple nodes in one PATCH call
- Use dryRun first if unsure

**Example node structure:**
```json
{
  "id": "signup-input",
  "type": "control.input",
  "config": {
    "description": "Receives user signup data"
  }
}
```

### Step 5: Create Wires

Connect the nodes with wires to create the flow:

```
signup-input ──[USER.SIGNUP]──▶ validate-email
validate-email ──[EMAIL.VALID]──▶ check-existing
check-existing ──[USER.NOT_EXISTS]──▶ create-user
create-user ──[USER.CREATED]──▶ send-welcome
send-welcome ──[EMAIL.SENT]──▶ success-response
```

Also create error paths:
```
validate-email ──[EMAIL.INVALID]──▶ error-response
check-existing ──[USER.EXISTS]──▶ error-response
```

### Step 6: Verify Your Graph

Query the topology to see your creation:

```
query({ from: "topology", select: "mermaid" })
```

**Expected:** A diagram showing your registration flow.

### Step 7: Test with Signal Injection

Simulate a user signup by injecting a test signal:

```json
{
  "mode": "inject",
  "signal": {
    "type": "USER.SIGNUP",
    "payload": {
      "email": "test@example.com",
      "password": "securepassword",
      "name": "Test User"
    }
  }
}
```

**Note:** Since this is a test environment, the external nodes won't actually connect to databases. The test validates that signals flow through correctly.

### Step 8: Debug if Needed

If something doesn't work, use debug mode:

```json
{
  "mode": "debug",
  "signal": { ... },
  "trace": true
}
```

---

## Success Criteria

- [ ] Created new project successfully
- [ ] Created all required nodes
- [ ] Connected nodes with wires
- [ ] Verified topology looks correct
- [ ] Tested with signal injection
- [ ] Graph has both success and error paths

---

## Bonus Challenges

If you have extra time:

1. **Use a built-in pattern:** Try generating an auth-flow pattern instead of building from scratch
2. **Add a validation node:** Add password strength validation
3. **Create a composite:** Turn part of your flow into a reusable composite

---

## Reflection Questions

After completing this scenario:

1. Was it clear how to create nodes and wires?
2. Did the PATCH operations make sense?
3. Was dryRun helpful?
4. Could you understand errors if they occurred?
5. How could the creation workflow be improved?
