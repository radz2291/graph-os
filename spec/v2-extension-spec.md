# Graph-OS v2 Extension Interface — Level 1 Spec

> Draft specification for the extension model, phased execution, and middleware pipeline for Graph-OS v5.

---

## 1. The Extension Interface

```typescript
interface GraphExtension {
  /** Unique identifier: "namespace:name" */
  id: string;
  name: string;
  description: string;
  apiVersion: '1.0.0';

  /** Other extensions that must be loaded first */
  depends?: string[];

  /** Schema additions merged into base at validation time */
  wireSchema?: Record<string, any>;
  nodeSchema?: Record<string, any>;
  phaseSchema?: Record<string, any>;
  cartridgeSchema?: Record<string, any>;

  /** Runtime middleware hooks */
  hooks?: {
    onRoute?: (ctx: RouteHookContext) => Promise<HookResult>;
    onBeforeProcess?: (ctx: ProcessHookContext) => Promise<HookResult>;
    onAfterProcess?: (ctx: ProcessHookContext) => Promise<void>;
    onError?: (ctx: ErrorHookContext) => Promise<ErrorResult>;
    onPhaseEnter?: (ctx: PhaseHookContext) => Promise<void>;
    onPhaseExit?: (ctx: PhaseHookContext) => Promise<void>;
    onGraphStart?: (ctx: GraphHookContext) => Promise<void>;
    onGraphDestroy?: (ctx: GraphHookContext) => Promise<void>;
  };

  /** Custom validators */
  validators?: {
    cartridge?: (cartridge: any) => ValidationResult[];
    wire?: (wire: any, cartridge: any) => ValidationResult[];
    node?: (node: any, cartridge: any) => ValidationResult[];
    phase?: (phase: any, cartridge: any) => ValidationResult[];
  };
}
```

## 2. Hook Contexts

```typescript
interface BaseHookContext {
  graph: GraphContext;
  wire?: WireDefinition;
  logger: Logger;
}

interface RouteHookContext extends BaseHookContext {
  signal: Signal;
  targetNode: Node;
}

interface ProcessHookContext extends BaseHookContext {
  signal: Signal;
  node: Node;
  result?: Signal | Signal[] | null;
}

interface ErrorHookContext extends BaseHookContext {
  signal: Signal;
  node: Node;
  error: Error;
}

interface PhaseHookContext extends BaseHookContext {
  fromPhase: string;
  toPhase: string;
  triggerSignal: Signal;
}

interface GraphHookContext extends BaseHookContext {
  cartridge: Cartridge;
}

interface HookResult {
  proceed: boolean;   // false = cancel this route
}

interface ErrorResult {
  handled: boolean;   // true = suppress DLQ
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  path?: string;
  suggestion?: string;
}
```

## 3. GraphContext (Execution State)

```typescript
interface GraphContext {
  currentPhase: string;
  completedPhases: string[];
  data: Map<string, any>;

  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  increment(key: string): number;
  requeue(signal: Signal, delay?: number): void;
  advancePhase(toPhase: string, triggerSignal: Signal): void;
  hasCompleted(phase: string): boolean;
  getSnapshot(): GraphSnapshot;
}
```

## 4. V2 Cartridge Shape

```json
{
  "version": "2.0.0",
  "name": "order-flow",

  "extensions": [
    "graph-os:phases",
    "graph-os:guard",
    "graph-os:retry",
    "graph-os:timeout",
    "graph-os:compensation"
  ],

  "phases": [
    { "id": "receiving" },
    { "id": "validating" },
    { "id": "paying" },
    { "id": "reserving" },
    { "id": "finalizing" },
    { "id": "completed", "terminal": true },
    { "id": "compensating" },
    { "id": "failed", "terminal": true }
  ],
  "initialPhase": "receiving",

  "compensation": {
    "strategy": "backward",
    "steps": [
      { "phase": "reserving", "node": "inventory-releaser", "signal": "INVENTORY.RELEASE", "requires": ["reservationId"] },
      { "phase": "paying", "node": "refund-handler", "signal": "PAYMENT.REFUND", "requires": ["transactionId"] }
    ]
  },

  "nodes": [ "..." ],
  "wires": [ "..." ]
}
```

## 5. V2 Wire Shape (extends v1)

```json
{
  "from": "payment-api",
  "to": "inventory-checker",
  "signalType": "PAYMENT.SUCCESS",
  "phase": "paying",
  "advancesTo": "reserving",
  "timeout": 15000,
  "retry": { "maxAttempts": 3, "backoff": "exponential", "baseDelay": 1000, "maxDelay": 30000 },
  "guard": { "field": "amount", "operator": "gt", "value": 0 }
}
```

Base wire (v1 compatible — no phase, no extensions):
```json
{
  "from": "node-a",
  "to": "node-b",
  "signalType": "SIGNAL.TYPE"
}
```

## 6. Signal Router Change

```typescript
// v1: findTargets(signal: Signal): Node[]
// v2: findTargets(signal: Signal, currentPhase?: string): Node[]
//
// If wire has phase property, only match if currentPhase === wire.phase.
// If wire has no phase property → always active (v1 backward compat).
```

## 7. Middleware Pipeline

Signal processing becomes:

```
1. ExtensionLoader resolves dependencies, loads declared extensions
2. MiddlewarePipeline builds ordered hook chain from loaded extensions
3. For each signal:
   a. Run onRoute hooks → cancel if any returns proceed: false
   b. Run onBeforeProcess hooks
   c. node.process(signal)
   d. If success → run onAfterProcess hooks
   e. If error → run onError hooks → retry/compensate/DLQ
4. If phase advance → run onPhaseExit + onPhaseEnter hooks
```

## 8. Backward Compatibility

- v1 cartridge (no extensions[], no phases[]) works unchanged
- All wires without phase property are always active
- Extensions array absent = no middleware loaded = v1 behavior exactly
- Existing nodes, SignalBus, DLQ, NodeFactory all unchanged

## 9. Build Priority

```
Phase 1 — Foundation:
  [x] GraphContext
  [x] MiddlewarePipeline
  [x] ExtensionLoader + ExtensionRegistry
  [x] graph-os:phases extension
  [x] Modify SignalRouter (phase-aware)
  [x] Modify BaseRuntimeCore (wire together)

Phase 2 — Critical Five:
  [ ] graph-os:guard
  [ ] graph-os:timeout
  [ ] graph-os:retry
  [ ] graph-os:compensation

Phase 3 — Validation + Testing:
  [ ] Extension-aware cartridge validation
  [ ] Test: v1 cartridge still works
  [ ] Test: order-flow v2 cartridge
  [ ] Test: compensation walk-back

Phase 4 — Future Extensions:
  [ ] graph-os:transform
  [ ] graph-os:aggregate
  [ ] graph-os:split
  [ ] graph-os:circuit-breaker
  [ ] graph-os:rate-limit
  [ ] graph-os:idempotency
```
