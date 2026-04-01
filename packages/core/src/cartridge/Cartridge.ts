/**
 * Cartridge Interface - Core abstraction for graph topology definition
 * 
 * A Cartridge defines the topology of a Graph-OS application:
 * - What nodes exist
 * - How they are wired together
 * - What signals flow between them
 * 
 * Cartridges are JSON files that can be validated, versioned, and shared.
 * 
 * @module @graph-os/core
 */

import { NodeConfig } from '../node/Node';
import {
  PhaseDefinition,
  GuardCondition,
  RetryConfig,
  CompensateConfig,
} from '../extensions/types';

/**
 * Defines a single node within a cartridge.
 */
export interface NodeDefinition {
  /** 
   * Unique identifier for this node within the cartridge
   * Used for wire connections
   */
  id: string;
  
  /** 
   * Node type identifier
   * Format: CATEGORY.SUBTYPE (e.g., "logic.validate")
   */
  type: string;
  
  /** 
   * Human-readable description of this node's purpose
   */
  description: string;
  
  /** 
   * Node-specific configuration
   */
  config: NodeConfig;
}

/**
 * Defines a wire connection between two nodes.
 * Wires determine how signals flow through the graph.
 *
 * v2 additions (all optional, backward compatible):
 * - phase / advancesTo (graph-os:phases)
 * - guard (graph-os:guard)
 * - retry (graph-os:retry)
 * - timeout / timeoutSignal (graph-os:timeout)
 * - compensate (graph-os:compensation)
 */
export interface WireDefinition {
  /**
   * Source node ID (the node that emits the signal)
   */
  from: string;

  /**
   * Target node ID (the node that receives the signal)
   */
  to: string;

  /**
   * Type of signal that flows through this wire
   * Only signals of this type will be routed
   */
  signalType: string;

  // ===== v2 Extension Fields (all optional) =====

  /**
   * Which phase this wire belongs to (graph-os:phases).
   * Only active when graph is in this phase.
   */
  phase?: string;

  /**
   * Phase to transition to after successful processing (graph-os:phases).
   */
  advancesTo?: string;

  /**
   * Guard condition for conditional routing (graph-os:guard).
   */
  guard?: GuardCondition | {
    all?: GuardCondition[];
    any?: GuardCondition[];
  };

  /**
   * Retry configuration for failed processing (graph-os:retry).
   */
  retry?: RetryConfig;

  /**
   * Max milliseconds to wait before timeout (graph-os:timeout).
   */
  timeout?: number;

  /**
   * Signal type to emit on timeout (graph-os:timeout).
   * Default: <signalType>.TIMEOUT
   */
  timeoutSignal?: string;

  /**
   * Per-wire compensation config (graph-os:compensation).
   */
  compensate?: CompensateConfig;
}

/**
 * Defines an input port for a cartridge.
 * Input ports are entry points for external signals.
 */
export interface InputDefinition {
  /** Port name */
  name: string;
  
  /** Signal type this port accepts */
  signalType: string;
  
  /** Human-readable description */
  description: string;
}

/**
 * Defines an output port for a cartridge.
 * Output ports are exit points for signals leaving the cartridge.
 */
export interface OutputDefinition {
  /** Port name */
  name: string;
  
  /** Signal type this port emits */
  signalType: string;
  
  /** Human-readable description */
  description: string;
}

/**
 * A Cartridge is a complete, deployable unit of Graph-OS architecture.
 *
 * v2 additions (all optional, backward compatible):
 * - Phases (execution stages)
 * - Extensions (on-demand behavior)
 * - Compensation (rollback topology)
 *
 * v1 fields:
 * - Metadata (name, version, description)
 * - Node definitions
 * - Wire connections
 * - Input/output ports
 * 
 * @example
 * ```json
 * {
 *   "version": "1.0.0",
 *   "name": "login-flow",
 *   "description": "User login authentication flow",
 *   "inputs": [
 *     { "name": "credentials", "signalType": "USER.CREDENTIALS", "description": "User credentials" }
 *   ],
 *   "outputs": [
 *     { "name": "success", "signalType": "AUTH.SUCCESS", "description": "Login successful" },
 *     { "name": "failure", "signalType": "AUTH.FAILURE", "description": "Login failed" }
 *   ],
 *   "nodes": [
 *     { "id": "validator", "type": "logic.validate", "description": "Validate credentials", "config": {} },
 *     { "id": "api", "type": "infra.api.client", "description": "Call auth API", "config": { "url": "/api/login" } }
 *   ],
 *   "wires": [
 *     { "from": "validator", "to": "api", "signalType": "VALIDATION.SUCCESS" }
 *   ]
 * }
 * ```
 */
export interface Cartridge {
  /** 
   * Cartridge format version
   * Allows for future format changes
   */
  version: string;
  
  /** 
   * Human-readable name for this cartridge
   */
  name: string;
  
  /** 
   * Detailed description of what this cartridge does
   */
  description: string;
  
  /** 
   * Input ports for receiving external signals
   */
  inputs: InputDefinition[];
  
  /** 
   * Output ports for emitting signals externally
   */
  outputs: OutputDefinition[];
  
  /** 
   * Node definitions
   */
  nodes: NodeDefinition[];
  
  /**
   * Wire connections between nodes
   */
  wires: WireDefinition[];

  // ===== v2 Extension Points (all optional, backward compatible) =====

  /**
   * Extensions required by this cartridge.
   * Each entry is an extension ID like "graph-os:phases".
   * Runtime loads only declared extensions.
   */
  extensions?: string[];

  /**
   * Execution phases. If present, wires declare which phase they belong to.
   * Only wires in the current phase are active.
   */
  phases?: PhaseDefinition[];

  /**
   * Initial phase when the graph starts.
   * Only meaningful if phases[] is defined.
   */
  initialPhase?: string;

  /**
   * Compensation (saga) topology.
   * Declared in the cartridge, executed by graph-os:compensation extension.
   */
  compensation?: {
    strategy: 'backward' | 'forward';
    steps: Array<{
      phase: string;
      node: string;
      signal: string;
      requires: string[];
    }>;
  };
}

/**
 * Options for loading a cartridge.
 */
export interface CartridgeLoadOptions {
  /** Path to the cartridge file */
  path?: string;
  
  /** Raw cartridge JSON data */
  data?: Cartridge;
  
  /** Whether to validate the cartridge after loading */
  validate?: boolean;
}

/**
 * Result of cartridge validation.
 */
export interface CartridgeValidationResult {
  /** Whether the cartridge is valid */
  valid: boolean;
  
  /** Validation errors, if any */
  errors: CartridgeValidationError[];
  
  /** Validation warnings, if any */
  warnings: CartridgeValidationWarning[];
}

/**
 * Represents a validation error in a cartridge.
 */
export interface CartridgeValidationError {
  /** Error code for programmatic handling */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Path to the problematic field */
  path?: string;
  
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Represents a validation warning in a cartridge.
 */
export interface CartridgeValidationWarning {
  /** Warning code */
  code: string;
  
  /** Human-readable warning message */
  message: string;
  
  /** Path to the field that triggered the warning */
  path?: string;
}
