/**
 * GraphRuntimeBuilder - High-level API for Graph-OS Runtime
 *
 * v2: Loads extensions from cartridge.extensions[], wires the middleware
 * pipeline, and routes signals through it. v1 cartridges work unchanged.
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
  WireDefinition,
} from '@graph-os/core';
import { SignalRouter } from './SignalRouter';
import { WireManager } from './WireManager';
import { BaseRuntimeCore } from './BaseRuntimeCore';
import { CartridgeLoader } from '../loader/CartridgeLoader';
import { NodeFactoryImpl } from '../factory/NodeFactory';
import { registerBuiltInNodes } from '../registration/index';
import { Logger } from '../utils/Logger';
import { GraphError } from '../errors/ErrorHandler';
import { GraphContextImpl } from './GraphContext';
import { MiddlewarePipeline } from '../extensions/pipeline/MiddlewarePipeline';
import { ExtensionLoader } from '../extensions/ExtensionLoader';
import { ExtensionRegistry } from '../extensions/ExtensionRegistry';
import { registerBuiltInExtensions } from '../extensions/built-in';

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

  /** Custom extension registry (optional, defaults to global) */
  extensionRegistry?: ExtensionRegistry;
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
    signalRegistryPath?: string,
  ) {
    super(logger);
    this.signalRouter = new SignalRouter(this.logger);
    this.wireManager = new WireManager(this.logger, signalRegistryPath);

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
   */
  async initialize(cartridgeData?: { path?: string; data?: Cartridge }): Promise<void> {
    if (cartridgeData) {
      await this.loadCartridge(cartridgeData);
    }
  }

  /**
   * Loads a cartridge from file path or data.
   * v2: Also loads extensions if cartridge declares them.
   */
  async loadCartridge(options: {
    path?: string;
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
          'INVALID_OPTIONS',
        );
      }

      const cartridge = this.cartridge!;

      // ===== v2: Load extensions =====
      if (cartridge.extensions && cartridge.extensions.length > 0) {
        this.loadExtensions(cartridge);
      }

      // ===== v2: Initialize GraphContext with initial phase =====
      if (cartridge.phases && cartridge.phases.length > 0) {
        const initialPhase = cartridge.initialPhase || cartridge.phases[0].id;
        this.graphContext = new GraphContextImpl(initialPhase, this.logger);
        (this.graphContext as any).pipeline = this.pipeline;
        (this.graphContext as any).cartridge = cartridge;

        // Wire requeue function
        this.graphContext.setRequeueFn((signal: Signal, delay?: number) => {
          if (delay && delay > 0) {
            setTimeout(() => {
              this.signalQueue.push(signal);
              this.processQueue();
            }, delay);
          } else {
            this.signalQueue.push(signal);
            this.processQueue();
          }
        });

        // Wire phase change callback to emit events
        this.graphContext.setOnPhaseChange((from: string, to: string) => {
          this.emitEvent('phase:exit', { phase: from, toPhase: to });
          this.emitEvent('phase:enter', { phase: to, fromPhase: from });
        });
      } else {
        // No phases — store cartridge ref anyway for extensions
        (this.graphContext as any).cartridge = cartridge;

        // Wire requeue function even for v1 mode
        this.graphContext.setRequeueFn((signal: Signal, delay?: number) => {
          if (delay && delay > 0) {
            setTimeout(() => {
              this.signalQueue.push(signal);
              this.processQueue();
            }, delay);
          } else {
            this.signalQueue.push(signal);
            this.processQueue();
          }
        });

        // Wire phase change callback (won't fire for v1, but safe)
        this.graphContext.setOnPhaseChange((from: string, to: string) => {
          this.emitEvent('phase:exit', { phase: from, toPhase: to });
          this.emitEvent('phase:enter', { phase: to, fromPhase: from });
        });
      }

      // Create and initialize all nodes
      for (const nodeDef of cartridge.nodes) {
        this.logger.debug(`Creating node: ${nodeDef.id} (${nodeDef.type})`);
        const node = await this.nodeFactory.createNode(
          nodeDef.type,
          nodeDef.config || {},
          nodeDef.id,
        );

        await node.initialize();
        this.nodes.set(nodeDef.id, node);
        this.emitEvent('node:initialized', { nodeId: nodeDef.id, type: nodeDef.type });
      }

      // Setup wire connections
      this.wireDefinitions = cartridge.wires;
      this.wireManager.connectWires(cartridge.wires, this.nodes);
      this.signalRouter.connect(cartridge.wires, this.nodes);

      this.stats.nodeCount = this.nodes.size;
      this.stats.wireCount = cartridge.wires.length;

      this.logger.info(
        `Cartridge loaded: ${this.stats.nodeCount} nodes, ${this.stats.wireCount} wires` +
        (this.loadedExtensions.length > 0
          ? `, ${this.loadedExtensions.length} extensions`
          : ''),
      );

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
   * Load extensions declared in the cartridge.
   */
  private loadExtensions(cartridge: Cartridge): void {
    // Ensure built-in extensions are registered
    const registry = new ExtensionRegistry(this.logger);
    registerBuiltInExtensions(registry);

    const loader = new ExtensionLoader(registry, this.logger);
    this.loadedExtensions = loader.load(cartridge.extensions!);

    // Register each extension's hooks into the pipeline
    for (const ext of this.loadedExtensions) {
      this.pipeline.registerExtension(ext);
    }

    this.logger.info(
      `Loaded extensions: ${this.loadedExtensions.map(e => e.id).join(', ')}`,
    );
  }

  /**
   * Starts the runtime, enabling signal processing.
   */
  async start(): Promise<void> {
    if (!this.isReady) {
      throw new GraphError(
        'Cannot start runtime: runtime not in ready state. Call loadCartridge() first.',
        'INVALID_STATE',
      );
    }

    if (this.state !== 'idle' && this.state !== 'ready') {
      throw new GraphError(
        `Cannot start runtime in state: ${this.state}`,
        'INVALID_STATE',
      );
    }

    this.logger.info('Starting runtime...');
    this.state = 'running';
    this.startTime = Date.now();
    this.emitEvent('runtime:start', {});

    // v2: Fire onGraphStart hooks
    if (this.loadedExtensions.length > 0 && this.cartridge) {
      await this.pipeline.executeOnGraphStart({
        graph: this.graphContext,
        cartridge: this.cartridge,
        logger: this.createHookLogger('runtime'),
      });
    }

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

    // v2: Fire onGraphDestroy hooks
    if (this.loadedExtensions.length > 0 && this.cartridge) {
      await this.pipeline.executeOnGraphDestroy({
        graph: this.graphContext,
        cartridge: this.cartridge,
        logger: this.createHookLogger('runtime'),
      });
    }

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
    this.pipeline.clear();
    this.logger.info('Runtime destroyed');
  }

  /**
   * Processes a signal through the v2 middleware pipeline.
   *
   * Pipeline order:
   * 1. Find connections (phase-aware)
   * 2. For each connection:
   *    a. onRoute hooks → cancel if any returns proceed=false
   *    b. onBeforeProcess hooks
   *    c. node.process(signal)
   *    d. onAfterProcess hooks
   *    e. Queue output signals
   * 3. On error:
   *    a. onError hooks → retry or DLQ
   */
  protected async processSignal(signal: Signal): Promise<void> {
    this.stats.signalsProcessed++;
    this.emitEvent('signal:received', { signal });
    this.logger.debug(`Processing signal: ${signal.type}`);

    // Emit to SignalBus for external subscribers (React, etc.)
    this.signalBus.emit(signal);

    // v2: Find connections (returns wire + target node)
    const currentPhase = this.graphContext.currentPhase;
    const connections = this.signalRouter.findConnections(signal, currentPhase);

    if (connections.length === 0) {
      this.logger.debug(`No targets for signal ${signal.type} from ${signal.sourceNodeId}`);
      return;
    }

    for (const conn of connections) {
      const wire = conn.wire;
      const targetNode = conn.targetNode;

      const hookCtx = {
        signal,
        targetNode,
        node: targetNode,
        wire,
        graph: this.graphContext,
        logger: this.createHookLogger('pipeline'),
      };

      try {
        // 1. Run onRoute hooks (guard, phase check, rate-limit, etc.)
        if (this.loadedExtensions.length > 0) {
          const routeResult = await this.pipeline.executeOnRoute({
            signal,
            targetNode,
            wire,
            graph: this.graphContext,
            logger: this.createHookLogger('pipeline'),
          });
          if (!routeResult) {
            this.logger.debug(`Signal ${signal.type} to ${targetNode.id} cancelled by onRoute hook`);
            continue;
          }
        }

        // 2. Run onBeforeProcess hooks (timeout start, transform)
        if (this.loadedExtensions.length > 0) {
          await this.pipeline.executeOnBeforeProcess({
            ...hookCtx,
            result: undefined,
          });
        }

        // 3. Execute node
        this.logger.debug(`Routing signal ${signal.type} to node: ${targetNode.id}`);
        const result = await targetNode.process(signal);

        // 4. Run onAfterProcess hooks (phase advance, timeout clear)
        if (this.loadedExtensions.length > 0) {
          await this.pipeline.executeOnAfterProcess({
            ...hookCtx,
            result: result || null,
          });
        }

        // 5. Queue output signals
        if (result) {
          const outputSignals = Array.isArray(result) ? result : [result];
          for (const outputSignal of outputSignals) {
            this.stats.signalsEmitted++;
            this.emitEvent('signal:emitted', { signal: outputSignal });
            this.signalQueue.push(outputSignal);
          }
        }
      } catch (error) {
        this.stats.errorCount++;
        this.emitEvent('node:error', {
          nodeId: targetNode.id,
          signal,
          error,
        });

        // 6. Run onError hooks (retry, compensation)
        if (this.loadedExtensions.length > 0) {
          const handled = await this.pipeline.executeOnError({
            ...hookCtx,
            error: error instanceof Error ? error : new Error(String(error)),
          });

          if (handled) {
            this.logger.info(`Error in node ${targetNode.id} handled by extension`);
            continue;
          }
        }

        // Not handled → DLQ
        this.logger.error(`Node ${targetNode.id} error:`, error);
        this.dlq.push({
          signal,
          targetNodeId: targetNode.id,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
          retryCount: 0,
        });
      }
    }
  }

  /**
   * Sends a signal into the graph for processing.
   */
  async sendSignal(signal: Signal): Promise<void> {
    if (this.state !== 'running') {
      throw new GraphError('Runtime not running', 'NOT_RUNNING');
    }

    this.signalQueue.push(signal);
    this.logger.debug(`Signal queued: ${signal.type} from ${signal.sourceNodeId}`);
    this.processQueue();
  }

  /**
   * Emits a signal (shorthand for sendSignal with auto-generated metadata).
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
   */
  getNodeWires(nodeId: string): { incoming: any[]; outgoing: any[] } {
    return this.wireManager.getNodeWires(nodeId);
  }

  /**
   * Gets all wire definitions.
   */
  getWires(): WireDefinition[] {
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
  options: RuntimeCreateOptions,
): Promise<GraphRuntime> {
  const runtime = new GraphRuntime(
    options.nodeFactory,
    options.logger,
    options.signalRegistryPath,
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
 */
export async function createAndStartRuntime(
  options: RuntimeCreateOptions,
): Promise<GraphRuntime> {
  const runtime = await createRuntime(options);
  await runtime.start();
  return runtime;
}
