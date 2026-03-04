/**
 * Node Interface - Core abstraction for processing units in Graph-OS
 * 
 * Nodes are the processing units in Graph-OS. They receive signals,
 * process them, and emit new signals. Each node has a unique identity,
 * configuration, and lifecycle.
 * 
 * @module @graph-os/core
 */

import { Signal } from '../signal/Signal';

/**
 * Configuration object for a node.
 * Shape depends on the node type.
 */
export interface NodeConfig {
  /** Node-specific configuration options */
  [key: string]: unknown;
}

/**
 * Represents a processing node in the graph.
 * 
 * Nodes are the building blocks of Graph-OS applications. Each node:
 * - Has a unique identifier
 * - Has a type that determines its behavior
 * - Can be configured with type-specific options
 * - Has a lifecycle (initialize, process, destroy)
 * 
 * @example
 * ```typescript
 * class MyNode implements Node {
 *   id = 'my-node-1';
 *   type = 'custom.my-node';
 *   config = { option: 'value' };
 *   
 *   async initialize() {
 *     // Setup logic
 *   }
 *   
 *   async process(signal: Signal) {
 *     // Process and return new signal(s)
 *     return { ...signal, type: 'OUTPUT.SUCCESS' };
 *   }
 *   
 *   async destroy() {
 *     // Cleanup logic
 *   }
 * }
 * ```
 */
/**
 * Context provided to nodes during processing.
 * Allows nodes to emit signals asynchronously and access runtime services.
 */
export interface NodeContext {
  /**
   * Emits a signal back to the runtime.
   * Useful for asynchronous processing or multiple outputs.
   */
  sendSignal(signal: Signal): void;

  /**
   * Logger instance for the node.
   */
  logger: {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  };
}

/**
 * Represents a processing node in the graph.
 */
export interface Node {
  id: string;
  type: string;
  config: NodeConfig;

  /**
   * Initializes the node.
   */
  initialize(context?: NodeContext): Promise<void>;

  /**
   * Processes an incoming signal.
   */
  process(signal: Signal, context?: NodeContext): Promise<Signal | Signal[] | null>;

  /**
   * Cleans up the node.
   */
  destroy(): Promise<void>;
}

/**
 * Factory interface for creating node instances.
 */
export interface NodeFactory {
  createNode(
    nodeType: string,
    config: NodeConfig,
    id: string
  ): Promise<Node>;

  registerNodeType(
    nodeType: string,
    nodeClass: new (id: string, config: NodeConfig) => Node
  ): void;

  hasNodeType(nodeType: string): boolean;
}

/**
 * Base class for nodes with common functionality.
 */
export abstract class BaseNode implements Node {
  abstract type: string;
  protected context?: NodeContext;

  constructor(
    public id: string,
    public config: NodeConfig
  ) { }

  async initialize(context?: NodeContext): Promise<void> {
    this.context = context;
  }

  abstract process(signal: Signal, context?: NodeContext): Promise<Signal | Signal[] | null>;

  async destroy(): Promise<void> {
    // Default: no cleanup needed
  }

  /**
   * Helper to create an output signal.
   */
  protected createOutputSignal(
    type: string,
    payload: unknown,
    metadata?: Record<string, unknown>
  ): Signal {
    return {
      type,
      payload,
      timestamp: new Date(),
      sourceNodeId: this.id,
      metadata,
    };
  }
}
