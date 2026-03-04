# Common Patterns

> Recipes for common scenarios. Copy and adapt for your needs.

---

## Pattern 1: User Authentication Flow

### What It Does
Handles user login: receive credentials → validate → create session → respond.

### The Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Receive    │────▶│   Validate   │────▶│   Create     │────▶│   Response   │
│   Login      │     │   Creds      │     │   Session    │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
      │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼
 AUTH.LOGIN            VALID.OK or         SESSION.CREATED       AUTH.SUCCESS
 {email, password}     VALID.FAILED        {token, expiry}       {token}
```

### How to Build It

**Step 1: Create the nodes**
```json
PATCH with: {
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "receive-login", "type": "control.input", "config": {} } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "validate-creds", "type": "logic.validator", "config": { "schema": "credentials" } } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "create-session", "type": "external.database", "config": { "operation": "create" } } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "login-response", "type": "control.output", "config": {} } }
  ]
}
```

**Step 2: Connect them**
```json
PATCH with: {
  "ops": [
    { "op": "add", "path": "/wires/-", "value": { "from": "receive-login", "to": "validate-creds", "signalType": "AUTH.LOGIN" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "validate-creds", "to": "create-session", "signalType": "VALID.OK" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "create-session", "to": "login-response", "signalType": "SESSION.CREATED" } }
  ]
}
```

**Quick Alternative: Use Built-in Pattern**
```json
GENERATE with: {
  "pattern": { "builtin": "auth-flow", "output": "patch" }
}
```

---

## Pattern 2: Form Validation

### What It Does
Validates form data, collects errors, and either proceeds or rejects.

### The Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Receive    │────▶│   Validate   │────▶│   Check      │
│   Form       │     │   Each Field │     │   Result     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                    │
                            │            ┌───────┴───────┐
                            │            ▼               ▼
                            │     ┌──────────┐    ┌──────────┐
                            │     │  Success │    │  Errors  │
                            │     └──────────┘    └──────────┘
                            │
                            ▼
                      FIELD.VALID or
                      FIELD.INVALID {field, error}
```

### How to Build It

**Quick way:**
```json
GENERATE with: {
  "pattern": { "builtin": "form-validation", "output": "patch" }
}
```

**Custom fields example:**
```json
PATCH with: {
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "form-input", "type": "control.input", "config": {} } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "validate-email", "type": "logic.validator", "config": { "field": "email", "rules": ["required", "email"] } } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "validate-password", "type": "logic.validator", "config": { "field": "password", "rules": ["required", "minLength:8"] } } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "collect-errors", "type": "logic.transform", "config": { "operation": "collect" } } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "success-output", "type": "control.output", "config": {} } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "error-output", "type": "control.output", "config": {} } }
  ]
}
```

---

## Pattern 3: CRUD Operations

### What It Does
Create, Read, Update, Delete for any data type.

### The Flow

```
                    ┌──────────────┐
                    │   Router     │
                    │   (Decide)   │
                    └──────┬───────┘
           ┌───────────────┼───────────────┬───────────────┐
           ▼               ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Create  │    │   Read   │    │  Update  │    │  Delete  │
    └──────────┘    └──────────┘    └──────────┘    └──────────┘
           │               │               │               │
           └───────────────┴───────────────┴───────────────┘
                                   │
                                   ▼
                           ┌──────────────┐
                           │   Database   │
                           └──────────────┘
```

### How to Build It

**Quick way:**
```json
GENERATE with: {
  "pattern": { "builtin": "crud", "output": "patch" }
}
```

This creates a complete CRUD setup with:
- Router node that decides which operation to perform
- Individual nodes for each CRUD operation
- Database connection node
- Response handling

---

## Pattern 4: Rate Limiting

### What It Does
Protects your system from too many requests.

### The Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Receive    │────▶│    Check     │────▶│   Allow or   │
│   Request    │     │    Rate      │     │   Reject     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     ▼             ▼
              ┌──────────┐  ┌──────────┐
              │  Allow   │  │  Reject  │
              │  (next)  │  │ (429)    │
              └──────────┘  └──────────┘
```

### How to Build It

**Quick way:**
```json
GENERATE with: {
  "pattern": { "builtin": "rate-limiting", "output": "patch" }
}
```

**Configuration options:**
```json
{
  "windowMs": 60000,      // Time window: 1 minute
  "maxRequests": 100,     // Max 100 requests per window
  "keyBy": "ip"           // Limit by IP address
}
```

---

## Pattern 5: Cache-Aside

### What It Does
Check cache first, fall back to database, update cache.

### The Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Request    │────▶│  Check       │────▶│   Return     │
│              │     │  Cache       │     │   Cached     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            │ (miss)
                            ▼
                     ┌──────────────┐
                     │   Database   │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Update     │
                     │   Cache      │
                     └──────────────┘
```

### How to Build It

**Quick way:**
```json
GENERATE with: {
  "pattern": { "builtin": "cache-aside", "output": "patch" }
}
```

---

## Pattern 6: Error Handling

### What It Does
Catches errors, logs them, and responds appropriately.

### The Flow

```
                    ┌──────────────┐
                    │   Any Node   │
                    └──────┬───────┘
                           │
            ┌──────────────┴──────────────┐
            │ (success)         (error)   │
            ▼                             ▼
     ┌──────────┐                  ┌──────────┐
     │ Continue │                  │   Error  │
     │          │                  │  Handler │
     └──────────┘                  └──────────┘
                                          │
                                   ┌──────┴──────┐
                                   ▼             ▼
                            ┌──────────┐  ┌──────────┐
                            │   Log    │  │ Notify   │
                            └──────────┘  └──────────┘
```

### How to Build It

**Add error handling wire:**
```json
PATCH with: {
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "error-handler", "type": "logic.transform", "config": { "operation": "error" } } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "log-error", "type": "external.logger", "config": { "level": "error" } } },
    { "op": "add", "path": "/wires/-", "value": { "from": "any-node", "to": "error-handler", "signalType": "ERROR.*" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "error-handler", "to": "log-error", "signalType": "ERROR.LOGGED" } }
  ]
}
```

---

## Pattern 7: Parallel Processing

### What It Does
Splits work to multiple nodes, processes in parallel, collects results.

### The Flow

```
                    ┌──────────────┐
                    │   Splitter   │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Worker 1 │    │ Worker 2 │    │ Worker 3 │
    └──────────┘    └──────────┘    └──────────┘
           │               │               │
           └───────────────┴───────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Aggregator  │
                    └──────────────┘
```

### How to Build It

**Create parallel workers:**
```json
PATCH with: {
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "splitter", "type": "control.splitter", "config": { "strategy": "round-robin" } } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "worker-1", "type": "logic.transform", "config": {} } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "worker-2", "type": "logic.transform", "config": {} } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "worker-3", "type": "logic.transform", "config": {} } },
    { "op": "add", "path": "/nodes/-", "value": { "id": "aggregator", "type": "control.aggregator", "config": { "waitFor": 3 } } },
    { "op": "add", "path": "/wires/-", "value": { "from": "splitter", "to": "worker-1", "signalType": "WORK.ITEM" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "splitter", "to": "worker-2", "signalType": "WORK.ITEM" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "splitter", "to": "worker-3", "signalType": "WORK.ITEM" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "worker-1", "to": "aggregator", "signalType": "WORK.DONE" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "worker-2", "to": "aggregator", "signalType": "WORK.DONE" } },
    { "op": "add", "path": "/wires/-", "value": { "from": "worker-3", "to": "aggregator", "signalType": "WORK.DONE" } }
  ]
}
```

---

## Pattern 8: Retry with Backoff

### What It Does
Retries failed operations with increasing delays.

### The Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Attempt    │────▶│   Check      │────▶│   Success    │
│   Operation  │     │   Result     │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       ▲                    │
       │                    │ (fail)
       │                    ▼
       │             ┌──────────────┐
       │             │   Wait &     │
       └─────────────│   Retry      │
                     └──────────────┘
```

### How to Build It

**Configure retry logic:**
```json
PATCH with: {
  "ops": [
    { "op": "add", "path": "/nodes/-", "value": { "id": "retry-node", "type": "logic.transform", "config": { "retry": true, "maxRetries": 3, "backoffMs": [100, 500, 2000] } } }
  ]
}
```

---

## Quick Reference: Built-in Patterns

| Pattern | Use Case | Generate Command |
|---------|----------|------------------|
| `auth-flow` | Login/signup | `GENERATE { pattern: { builtin: "auth-flow" } }` |
| `crud` | Data operations | `GENERATE { pattern: { builtin: "crud" } }` |
| `form-validation` | Form handling | `GENERATE { pattern: { builtin: "form-validation" } }` |
| `rate-limiting` | API protection | `GENERATE { pattern: { builtin: "rate-limiting" } }` |
| `cache-aside` | Caching | `GENERATE { pattern: { builtin: "cache-aside" } }` |

---

## Tips for Using Patterns

1. **Start with built-in patterns** - They're tested and ready to use
2. **Customize after generating** - Add your specific config
3. **Combine patterns** - Auth flow + rate limiting = protected auth
4. **Create your own composites** - Turn repeated setups into reusable templates
5. **Use dry-run first** - Preview before applying
