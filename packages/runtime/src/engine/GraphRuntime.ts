/**
 * GraphRuntimeCore - Low-level runtime engine for Graph-OS
 * 
 * This is the low-level implementation that requires manual setup.
 * For most use cases, use the high-level GraphRuntime from GraphRuntimeBuilder instead.
 * 
 * The GraphRuntimeCore is the heart of Graph-OS execution. It:
 * - Loads cartridges and instantiates nodes
 * - Routes signals between nodes via wires
 * - Manages the signal processing lifecycle
 * - Handles errors and provides observability
 * - Provides SignalBus for framework-agnostic communication
 * 
 * @module @graph-os/runtime
 */

import {
  Cartridge,
  Node,
  NodeFactory,
  NodeContext,
  Signal,
  RuntimeOptions,
  RuntimeStats,
} from '@graph-os/core';
import { SignalRouter } from './SignalRouter';
import { WireManager } from './WireManager';
import { BaseRuntimeCore } from './BaseRuntimeCore';
import { Logger } from '../utils/Logger';
import { GraphError } from '../errors/ErrorHandler';

/**
 * GraphRuntimeCore - Low-level runtime engine.
 * 
 * @example
 * ```typescript
 * // Low-level usage (advanced)
 * const runtime = new GraphRuntimeCore(cartridge, nodeFactory, signalRouter, wireManager, options);
 * await runtime.initialize();
 * await runtime.start();
 * 
 * // For most use cases, prefer the high-level GraphRuntime API instead:
 * // const runtime = await createRuntime({ cartridgePath: '...' });
 * ```
 */
export class GraphRuntimeCore extends BaseRuntimeCore {
  private cartridge: Cartridge;
  private nodeFactory: NodeFactory;
  private signalRouter: SignalRouter;
  private wireManager: WireManager;
  private options: RuntimeOptions;

  constructor(
    cartridge: Cartridge,
    nodeFactory: NodeFactory,
    signalRouter: SignalRouter,
    wireManager: WireManager,
    options: RuntimeOptions = {},
    logger?: Logger
  ) {
    super(logger);

    this.cartridge = cartridge;
    this.nodeFactory = nodeFactory;
    this.signalRouter = signalRouter;
    this.wireManager = wireManager;
    this.options = options;
  }

  /**
   * Initializes the runtime by creating nodes and connecting wires.
   */
  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new GraphError(
        'Runtime already initialized',
        'INVALID_STATE'
      );
    }

    this.logger.info('Initializing runtime...');
    this.state = 'initializing';

    try {
      // Create nodes
      for (const nodeDef of this.cartridge.nodes) {
        this.logger.debug(`Creating node: ${nodeDef.id} (${nodeDef.type})`);
        const node = await this.nodeFactory.createNode(
          nodeDef.type,
          nodeDef.config || {},
          nodeDef.id
        );

        await node.initialize({
          sendSignal: (s: Signal) => this.sendSignal(s),
          logger: {
            debug: (m: string, ...a: any[]) => this.logger.debug(`[Node:${node.id}] ${m}`, ...a),
            info: (m: string, ...a: any[]) => this.logger.info(`[Node:${node.id}] ${m}`, ...a),
            warn: (m: string, ...a: any[]) => this.logger.warn(`[Node:${node.id}] ${m}`, ...a),
            error: (m: string, ...a: any[]) => this.logger.error(`[Node:${node.id}] ${m}`, ...a),
          },
        });
        this.nodes.set(nodeDef.id, node);
        this.emitEvent('node:initialized', { nodeId: nodeDef.id, type: nodeDef.type });
      }

      // Connect wires
      this.signalRouter.connect(this.cartridge.wires, this.nodes);
      this.wireManager.connectWires(this.cartridge.wires, this.nodes);

      // Update stats
      this.stats.nodeCount = this.nodes.size;
      this.stats.wireCount = this.cartridge.wires.length;

      this.state = 'ready';
      this.emitEvent('runtime:ready', {
        nodeCount: this.stats.nodeCount,
        wireCount: this.stats.wireCount,
      });

      this.logger.info('Runtime initialized');
    } catch (error) {
      this.state = 'error';
      this.emitEvent('runtime:error', { error });
      throw error;
    }
  }

  /**
   * Starts the runtime, enabling signal processing.
   */
  async start(): Promise<void> {
    if (this.state !== 'ready') {
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
    this.state = 'stopped';
    this.emitEvent('runtime:stop', {});
  }

  /**
   * Destroys the runtime and cleans up resources.
   */
  async destroy(): Promise<void> {
    if (this.state === 'destroyed') {
      return;
    }

    this.logger.info('Destroying runtime...');
    this.state = 'destroyed';

    // Destroy all nodes
    for (const [nodeId, node] of this.nodes) {
      try {
        if (node.destroy) {
          await node.destroy();
        }
      } catch (error) {
        this.logger.error(`Error destroying node ${nodeId}:`, error);
      }
    }

    // Clear state
    this.nodes.clear();
    this.signalQueue = [];
    this.eventHandlers.clear();

    this.emitEvent('runtime:destroyed', {});
  }

  /**
   * Sends a signal to the runtime.
   * The signal will be queued and processed asynchronously.
   */
  sendSignal(signal: Signal): void {
    if (this.state !== 'running') {
      throw new GraphError(
        'Cannot send signal: runtime is not running',
        'INVALID_STATE'
      );
    }

    this.signalQueue.push(signal);
    this.logger.debug(`Signal queued: ${signal.type} from ${signal.sourceNodeId}`);

    // Trigger queue processing
    this.processQueue();
  }

  /**
   * Processes a single signal by routing it to target nodes.
   */
  protected async processSignal(signal: Signal): Promise<void> {
    try {
      this.logger.debug(`Processing signal: ${signal.type} from ${signal.sourceNodeId}`);

      // Emit to SignalBus for external subscribers
      this.signalBus.emit(signal);

      // Emit internal event
      this.emitEvent('signal:received', { type: signal.type, sourceNodeId: signal.sourceNodeId });

      // Find target nodes via SignalRouter
      const targets = this.signalRouter.findTargets(signal);

      if (targets.length === 0) {
        this.logger.debug(`No targets found for signal: ${signal.type}`);
        return;
      }

      this.logger.debug(`Routing signal ${signal.type} to ${targets.length} target(s)`);

      // Process signal in each target node in parallel
      const results = await Promise.allSettled(
        targets.map(async (target) => {
          try {
            this.logger.debug(`Processing in node: ${target.id}`);

            const context = {
              sendSignal: (s: Signal) => this.sendSignal(s),
              logger: {
                debug: (m: string, ...a: any[]) => this.logger.debug(`[Node:${target.id}] ${m}`, ...a),
                info: (m: string, ...a: any[]) => this.logger.info(`[Node:${target.id}] ${m}`, ...a),
                warn: (m: string, ...a: any[]) => this.logger.warn(`[Node:${target.id}] ${m}`, ...a),
                error: (m: string, ...a: any[]) => this.logger.error(`[Node:${target.id}] ${m}`, ...a),
              },
            };

            const result = await target.process(signal, context);
            this.stats.signalsProcessed++;

            // Emit result signals
            if (result) {
              if (Array.isArray(result)) {
                for (const resultSignal of result) {
                  this.sendSignal(resultSignal);
                  this.stats.signalsEmitted++;
                }
              } else {
                this.sendSignal(result);
                this.stats.signalsEmitted++;
              }
            }

            this.emitEvent('node:processed', { nodeId: target.id, signalType: signal.type });
          } catch (error) {
            this.logger.error(`Error in node ${target.id}:`, error);
            this.stats.errorCount++;

            // Push to DLQ
            this.dlq.push({
              signal,
              targetNodeId: target.id,
              error,
              timestamp: new Date(),
              retryCount: 0
            });

            this.emitEvent('node:error', { nodeId: target.id, error });
            throw error;
          }
        })
      );

      // Log if any node failed
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger.warn(`${failures.length} node(s) failed during signal processing`);
      }
    } catch (error) {
      this.logger.error('Error processing signal:', error);
      this.stats.errorCount++;
      this.emitEvent('runtime:error', { error });
    }
  }

  /**
   * Gets the cartridge loaded in this runtime.
   */
  getCartridge(): Cartridge {
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
}
