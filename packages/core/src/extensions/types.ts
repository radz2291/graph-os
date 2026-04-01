/**
 * Graph-OS Extension System Types
 *
 * Defines the contract for extensions, middleware hooks,
 * and the execution context they operate on.
 *
 * @module @graph-os/core
 */

import { Signal } from '../signal/Signal';
import { Node } from '../node/Node';
import { WireDefinition } from '../cartridge/Cartridge';

// ============================================================
// Phase Definition
// ============================================================

/**
 * A phase is a named execution stage of a graph.
 * Wires declare which phase they belong to — only wires
 * in the current phase are active.
 */
export interface PhaseDefinition {
  /** Unique phase identifier */
  id: string;

  /** Human-readable description */
  description?: string;

  /** If true, graph stops here (terminal state) */
  terminal?: boolean;

  /** If true, skip this phase if no wires fire */
  autoAdvance?: boolean;

  /** Max time (ms) allowed in this phase before timeout */
  timeout?: number;

  /** Phase to transition to on timeout */
  timeoutTarget?: string;
}

// ============================================================
// Extension Declaration (in cartridge)
// ============================================================

/**
 * Declares which extensions a cartridge requires.
 * Appears in the cartridge JSON as `extensions: ["graph-os:phases", ...]`
 */
export type ExtensionDeclaration = string;

// ============================================================
// Guard Conditions
// ============================================================

export type GuardOperator =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'exists'
  | 'notExists'
  | 'in'
  | 'notIn'
  | 'matches';

export interface GuardCondition {
  /** Context data field to check */
  field: string;
  /** Comparison operator */
  operator: GuardOperator;
  /** Value to compare against */
  value?: unknown;
  /** Array of values for 'in' / 'notIn' */
  values?: unknown[];
  /** Regex pattern for 'matches' */
  pattern?: string;
}

// ============================================================
// Wire Extension Configs (used by built-in extensions)
// ============================================================

export interface RetryConfig {
  maxAttempts: number;
  backoff: 'none' | 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
}

export interface DelayConfig {
  base: number;
  multiplier?: number;
  max?: number;
}

export interface CompensateConfig {
  node: string;
  signalType: string;
  requires?: string[];
}

export interface AggregateConfig {
  waitFor: number;
  groupBy?: string;
  timeout?: number;
  mode: 'all' | 'any';
}

export interface TransformMapping {
  from: string;
  to: string;
  default?: unknown;
}

// ============================================================
// Compensation (cartridge-level)
// ============================================================

export interface CompensationStep {
  phase: string;
  node: string;
  signal: string;
  requires: string[];
}

export interface CompensationConfig {
  strategy: 'backward' | 'forward';
  steps: CompensationStep[];
}

// ============================================================
// Graph Context (runtime execution state)
// ============================================================

/**
 * GraphContext tracks the runtime state of a single graph execution.
 *
 * It maintains:
 * - Current phase and completed phases
 * - Arbitrary data store for extensions to read/write
 * - Signal requeuing capability
 */
export interface GraphContext {
  /** Current phase ID */
  currentPhase: string;

  /** Phases that have been completed, in order */
  completedPhases: string[];

  /** Get a typed value from the data store */
  get<T = unknown>(key: string, defaultValue?: T): T;

  /** Set a value in the data store */
  set(key: string, value: unknown): void;

  /** Increment a counter, return new value */
  increment(key: string): number;

  /** Check if a phase has been completed */
  hasCompleted(phaseId: string): boolean;

  /** Re-queue a signal for processing (used by retry) */
  requeue(signal: Signal, delay?: number): void;

  /** Advance to a new phase */
  advanceTo(phaseId: string): void;
}

// ============================================================
// Middleware Hook Contexts
// ============================================================

/**
 * Base context for all hooks.
 */
export interface BaseHookContext {
  /** The graph execution context */
  graph: GraphContext;
  /** The wire that triggered this hook (if applicable) */
  wire: WireDefinition;
  /** Logger scoped to this extension */
  logger: HookLogger;
}

export interface HookLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Context for signal routing hooks.
 */
export interface RouteHookContext extends BaseHookContext {
  signal: Signal;
  targetNode: Node;
}

/**
 * Context for node processing hooks.
 */
export interface ProcessHookContext extends BaseHookContext {
  signal: Signal;
  node: Node;
  result?: Signal | Signal[] | null;
}

/**
 * Context for error hooks.
 */
export interface ErrorHookContext extends BaseHookContext {
  signal: Signal;
  node: Node;
  error: Error;
}

/**
 * Context for phase transition hooks.
 */
export interface PhaseHookContext extends BaseHookContext {
  fromPhase: string;
  toPhase: string;
  triggerSignal?: Signal;
}

/**
 * Context for graph lifecycle hooks.
 */
export interface GraphHookContext {
  graph: GraphContext;
  cartridge: unknown;
  logger: HookLogger;
}

// ============================================================
// Hook Results
// ============================================================

export interface HookResult {
  /** false = cancel this operation */
  proceed: boolean;
}

export interface ErrorResult {
  /** true = error handled, don't send to DLQ */
  handled: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  path?: string;
  suggestion?: string;
}

// ============================================================
// Extension Interface
// ============================================================

/**
 * A GraphExtension adds behavior to the runtime.
 *
 * It declares:
 * - what schema properties it adds to wires/nodes/phases/cartridge
 * - what middleware hooks it provides
 * - what validators it provides
 * - what other extensions it depends on
 *
 * Extensions are loaded on-demand based on the cartridge's
 * `extensions` array.
 */
export interface GraphExtension {
  /** Unique identifier: "namespace:name" */
  id: string;

  /** Human-readable name */
  name: string;

  /** What this extension does */
  description: string;

  /** Extension API version */
  apiVersion: string;

  /** Other extensions that must be loaded first */
  depends?: string[];

  /**
   * Schema additions — merged into base schema at validation time.
   * These are JSON Schema fragments.
   */
  wireSchema?: Record<string, unknown>;
  nodeSchema?: Record<string, unknown>;
  phaseSchema?: Record<string, unknown>;
  cartridgeSchema?: Record<string, unknown>;

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

  /** Custom cartridge validators */
  validators?: {
    cartridge?: (cartridge: unknown) => ValidationResult[];
    wire?: (wire: unknown, cartridge: unknown) => ValidationResult[];
    node?: (node: unknown, cartridge: unknown) => ValidationResult[];
    phase?: (phase: unknown, cartridge: unknown) => ValidationResult[];
  };
}
