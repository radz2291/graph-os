/**
 * GraphRuntimeBuilder - High-level API for Graph-OS Runtime
 * 
 * This module provides the high-level GraphRuntime class and factory
 * functions that match the documented API.
 * 
 * @module @graph-os/runtime
 */

import {
  Cartridge,
  Node,
  NodeFactory,
  Signal,
  RuntimeState,
  RuntimeOptions,
  RuntimeStats,
  RuntimeEventType,
  RuntimeEventHandler,
  RuntimeEvent,
} from '@graph-os/core';
import { SignalRouter } from './SignalRouter';
import { WireManager } from './WireManager';
import { BaseRuntimeCore } from './BaseRuntimeCore';
import { CartridgeLoader } from '../loader/CartridgeLoader';
import { NodeFactoryImpl } from '../factory/NodeFactory';
import { registerBuiltInNodes } from '../registration/index';
import { Logger } from '../utils/Logger';
import { GraphError } from '../errors/ErrorHandler';

/**
 * Options for creating a Graph-OS runtime
 */
export interface RuntimeCreateOptions {
  /** Path to the cartridge JSON file */
  cartridgePath?: string;
  
  /** Path to signal registry (optional) */
  signalRegistryPath?: string;
  
  /** Cartridge data (alternative to cartridgePath) */
  cartridge?: Cartridge;
  
  /** Custom node factory (optional) */
  nodeFactory?: NodeFactory;
  
  /** Runtime options */
  options?: RuntimeOptions;
  
  /** Custom logger (optional) */
  logger?: Logger;
}

/**
 * High-level Graph-OS Runtime with simple API.
 * This is the main class developers interact with - matches documentation.
 */
export class GraphRuntime extends BaseRuntimeCore {
  private signalRouter: SignalRouter;
  private wireManager: WireManager;
  private cartridge: Cartridge | null = null;
  private nodeFactory: NodeFactory;
  private isReady: boolean = false;

  constructor(
    nodeFactory?: NodeFactory,
    logger?: Logger,
    signalRegistryPath?: string
  ) {
    super(logger); // Logger is initialized in BaseRuntimeCore
    this.signalRouter = new SignalRouter();
    this.wireManager = new WireManager(this.logger, signalRegistryPath); // ← Pass signalRegistryPath
    
    if (nodeFactory) {
      this.nodeFactory = nodeFactory;
    } else {
      this.nodeFactory = new NodeFactoryImpl();
      registerBuiltInNodes(this.nodeFactory as NodeFactoryImpl);
    }
  }

  /**
   * Initializes the runtime with cartridge data.
   * Implements abstract method from BaseRuntimeCore.
   * 
   * @param cartridgeData - Cartridge data to initialize with
   */
  async initialize(cartridgeData?: { path?: string; data?: Cartridge }): Promise<void> {
    if (cartridgeData) {
      await this.loadCartridge(cartridgeData);
    }
  }

  /**
   * Loads a cartridge from file path or data.
   * This is the main entry point for setting up a runtime.
   * 
   * @param options - Load options
   */
  async loadCartridge(options: {
    /** Path to cartridge JSON file */
    path?: string;
    /** Cartridge data directly */
    data?: Cartridge;
  }): Promise<void> {
    this.logger.info('Loading cartridge...');
    this.state = 'initializing';
    
    try {
      if (options.path) {
        const loader = new CartridgeLoader(this.logger);
        this.cartridge = await loader.loadCartridge(options.path);
      } else if (options.data) {
        this.cartridge = options.data;
      } else {
        throw new GraphError(
          'Either path or data must be provided to loadCartridge',
          'INVALID_OPTIONS'
        );
      }

      // Create and initialize all nodes
      const cartridge = this.cartridge!;
      for (const nodeDef of cartridge.nodes) {
        this.logger.debug(`Creating node: ${nodeDef.id} (${nodeDef.type})`);
        const node = await this.nodeFactory.createNode(
          nodeDef.type,
          nodeDef.config || {},
          nodeDef.id
        );
        
        await node.initialize();
        this.nodes.set(nodeDef.id, node);
        this.emitEvent('node:initialized', { nodeId: nodeDef.id, type: nodeDef.type });
      }

      // Setup wire connections
      this.wireManager.connectWires(cartridge.wires, this.nodes);
      this.signalRouter.connect(cartridge.wires, this.nodes);
      
      this.stats.nodeCount = this.nodes.size;
      this.stats.wireCount = cartridge.wires.length;

      this.logger.info(`Cartridge loaded: ${this.stats.nodeCount} nodes, ${this.stats.wireCount} wires`);
      
      // FIX: Set ready flag after successful load
      this.isReady = true;
      this.state = 'ready';
      
      this.emitEvent('runtime:ready', {
        nodeCount: this.stats.nodeCount,
        wireCount: this.stats.wireCount,
      });
      
    } catch (error) {
      this.state = 'error';
      this.stats.errorCount++;
      this.emitEvent('runtime:error', { error });
      throw error;
    }
  }

  /**
   * Starts the runtime, enabling signal processing.
   */
  async start(): Promise<void> {
    if (!this.isReady) {
      throw new GraphError(
        'Cannot start runtime: runtime not in ready state. Call loadCartridge() first.',
        'INVALID_STATE'
      );
    }

    if (this.state !== 'idle' && this.state !== 'ready') {
      throw new GraphError(
        `Cannot start runtime in state: ${this.state}`,
        'INVALID_STATE'
      );
    }

    this.logger.info('Starting runtime...');
    this.state = 'running';
    this.startTime = Date.now();
    this.emitEvent('runtime:start', {});

    // Start processing any queued signals
    this.processQueue();
  }

  /**
   * Stops the runtime, disabling signal processing.
   */
  async stop(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.logger.info('Stopping runtime...');
    this.state = 'stopping';
    this.emitEvent('runtime:stop', {});
  }

  /**
   * Destroys the runtime and cleans up resources.
   */
  async destroy(): Promise<void> {
    await this.stop();
    
    this.logger.info('Destroying runtime...');
    
    for (const [id, node] of this.nodes) {
      try {
        await node.destroy();
        this.emitEvent('node:destroyed', { nodeId: id });
      } catch (error) {
        this.logger.error(`Failed to destroy node ${id}:`, error);
      }
    }
    
    this.nodes.clear();
    this.signalQueue = [];
    this.signalBus.clear();
    this.wireManager.clear();
    this.logger.info('Runtime destroyed');
  }

  /**
   * Processes a signal by routing it to target nodes.
   * Implements abstract method from BaseRuntimeCore.
   * 
   * @param signal - The signal to process
   */
  protected async processSignal(signal: Signal): Promise<void> {
    this.stats.signalsProcessed++;
    this.emitEvent('signal:received', { signal });
    this.logger.debug(`Processing signal: ${signal.type}`);

    // Emit to SignalBus for external subscribers (React, etc.)
    this.signalBus.emit(signal);

    // Route signal to target nodes
    const targets = this.signalRouter.findTargets(signal);
    
    for (const target of targets) {
      try {
        this.logger.debug(`Routing signal ${signal.type} to node: ${target.id}`);
        
        const result = await target.process(signal);
        
        if (result) {
          const outputSignals = Array.isArray(result) ? result : [result];
          
          for (const outputSignal of outputSignals) {
            this.stats.signalsEmitted++;
            this.emitEvent('signal:emitted', { signal: outputSignal });
            
            // Add output signal to queue for further processing
            this.signalQueue.push(outputSignal);
          }
        }
      } catch (error) {
        this.stats.errorCount++;
        this.emitEvent('node:error', { 
          nodeId: target.id, 
          signal, 
          error 
        });
        this.logger.error(`Node ${target.id} error:`, error);
      }
    }
  }

  /**
   * Sends a signal into the graph for processing.
   * 
   * @param signal - The signal to process
   */
  async sendSignal(signal: Signal): Promise<void> {
    if (this.state !== 'running') {
      throw new GraphError('Runtime not running', 'NOT_RUNNING');
    }

    this.signalQueue.push(signal);
    this.logger.debug(`Signal queued: ${signal.type} from ${signal.sourceNodeId}`);
    
    // Trigger queue processing
    this.processQueue();
  }

  /**
   * Emits a signal (shorthand for sendSignal with auto-generated metadata).
   * 
   * @param type - Signal type
   * @param payload - Signal payload
   */
  async emit(type: string, payload: unknown): Promise<void> {
    await this.sendSignal({
      type,
      payload,
      timestamp: new Date(),
      sourceNodeId: 'external',
    });
  }

  /**
   * Subscribes to signals of a specific type.
   * 
   * @param signalType - Signal type to subscribe to (use '*' for all)
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  subscribe(signalType: string, handler: (signal: Signal) => void): () => void {
    return this.signalBus.subscribe(signalType, handler);
  }

  /**
   * Gets the loaded cartridge.
   */
  getCartridge(): Cartridge | null {
    return this.cartridge;
  }

  /**
   * Gets a node by ID.
   */
  getNode(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Gets all nodes.
   */
  getNodes(): Map<string, Node> {
    return new Map(this.nodes);
  }

  /**
   * Gets wire connections for a node.
   * 
   * @param nodeId - The node ID
   * @returns Object with incoming and outgoing wires
   */
  getNodeWires(nodeId: string): { incoming: any[]; outgoing: any[] } {
    return this.wireManager.getNodeWires(nodeId);
  }

  /**
   * Gets all wire definitions.
   * 
   * @returns Array of wire definitions
   */
  getWires(): any[] {
    return this.wireManager.getWires();
  }
}

/**
 * Creates a new Graph-OS runtime with the specified options.
 * This is the recommended way to create a runtime.
 * 
 * @example
 * ```typescript
 * const runtime = await createRuntime({
 *   cartridgePath: './cartridges/app.cartridge.json',
 *   signalRegistryPath: './registries/signal-registry.json'
 * });
 * 
 * await runtime.start();
 * runtime.emit('USER.LOGIN', { email: 'user@example.com' });
 * ```
 */
export async function createRuntime(
  options: RuntimeCreateOptions
): Promise<GraphRuntime> {
  const runtime = new GraphRuntime(
    options.nodeFactory,
    options.logger,
    options.signalRegistryPath  // ← Pass signalRegistryPath to constructor
  );
  
  if (options.cartridgePath || options.cartridge) {
    await runtime.loadCartridge({
      path: options.cartridgePath,
      data: options.cartridge,
    });
  }
  
  return runtime;
}

/**
 * Creates a runtime and starts it immediately.
 * Convenience function for quick setup.
 * 
 * @example
 * ```typescript
 * const runtime = await createAndStartRuntime({
 *   cartridgePath: './cartridges/app.cartridge.json',
 *   signalRegistryPath: './registries/signal-registry.json'
 * });
 * ```
 */
export async function createAndStartRuntime(
  options: RuntimeCreateOptions
): Promise<GraphRuntime> {
  const runtime = await createRuntime(options);
  await runtime.start();
  return runtime;
}
