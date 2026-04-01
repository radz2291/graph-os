/**
 * BaseRuntimeCore - Shared functionality for all runtime implementations
 *
 * v2: Adds GraphContext (execution state) and MiddlewarePipeline (extension hooks).
 * If no extensions are loaded, behaves identically to v1.
 *
 * @module @graph-os/runtime
 */

import {
  Signal,
  Node,
  RuntimeState,
  RuntimeStats,
  RuntimeEventType,
  RuntimeEventHandler,
  RuntimeEvent,
  WireDefinition,
} from '@graph-os/core';
import { SignalBus } from '../signal-bus/SignalBus';
import { Logger } from '../utils/Logger';
import { DLQEntry } from './DLQ';
import { GraphContextImpl } from './GraphContext';
import { MiddlewarePipeline } from '../extensions/pipeline/MiddlewarePipeline';
import type { GraphExtension, HookLogger } from '@graph-os/core';

/**
 * Abstract base class for runtime implementations.
 * Handles common functionality like signal processing, events, and lifecycle.
 */
export abstract class BaseRuntimeCore {
  protected nodes: Map<string, Node> = new Map();
  protected state: RuntimeState = 'idle';
  protected startTime: number = 0;
  protected stats: RuntimeStats = {
    nodeCount: 0,
    wireCount: 0,
    signalsProcessed: 0,
    signalsEmitted: 0,
    errorCount: 0,
    uptime: 0,
  };
  protected eventHandlers: Map<RuntimeEventType, RuntimeEventHandler[]> = new Map();
  protected signalQueue: Signal[] = [];
  protected dlq: DLQEntry[] = [];
  protected isProcessing: boolean = false;
  protected signalBus: SignalBus;
  protected logger: Logger;

  // ===== v2 Extension System =====
  protected graphContext: GraphContextImpl;
  protected pipeline: MiddlewarePipeline;
  protected loadedExtensions: GraphExtension[] = [];
  protected wireDefinitions: WireDefinition[] = [];

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
    this.signalBus = new SignalBus();
    this.graphContext = new GraphContextImpl('default', this.logger);
    this.pipeline = new MiddlewarePipeline(this.logger);

    // Wire the requeue function so extensions can re-queue signals
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

    // Give extensions access to the pipeline for firing phase hooks
    (this.graphContext as any).pipeline = this.pipeline;
  }

  /**
   * Gets the Dead Letter Queue for inspection of failed signals.
   */
  getDeadLetterQueue(): DLQEntry[] {
    return [...this.dlq];
  }

  /**
   * Gets the SignalBus for external subscriptions.
   */
  getSignalBus(): SignalBus {
    return this.signalBus;
  }

  /**
   * Gets the current runtime state.
   */
  getState(): RuntimeState {
    return this.state;
  }

  /**
   * Gets runtime statistics.
   */
  getStats(): RuntimeStats {
    return {
      ...this.stats,
      uptime: this.state === 'running' ? Date.now() - this.startTime : this.stats.uptime,
    };
  }

  /**
   * Gets the graph execution context (v2).
   */
  getGraphContext(): GraphContextImpl {
    return this.graphContext;
  }

  /**
   * Gets the current phase (v2).
   */
  getCurrentPhase(): string {
    return this.graphContext.currentPhase;
  }

  /**
   * Gets completed phases (v2).
   */
  getCompletedPhases(): string[] {
    return [...this.graphContext.completedPhases];
  }

  /**
   * Gets a full snapshot of the graph state (v2).
   */
  getSnapshot(): Record<string, unknown> {
    return this.graphContext.getSnapshot();
  }

  /**
   * Adds an event listener for a specific event type.
   */
  on(eventType: RuntimeEventType, handler: RuntimeEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Removes an event listener.
   */
  off(eventType: RuntimeEventType, handler: RuntimeEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emits a runtime event to all registered handlers.
   */
  protected emitEvent(eventType: RuntimeEventType, data: any): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const event: RuntimeEvent = { type: eventType, timestamp: Date.now(), data };

    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        this.logger.error(`Error in event handler for ${eventType}:`, error);
      }
    }
  }

  /**
   * Creates a scoped logger for extension hooks.
   */
  protected createHookLogger(extensionId: string): HookLogger {
    return {
      debug: (msg: string, ...args: unknown[]) => this.logger.debug(`[${extensionId}] ${msg}`, ...args),
      info: (msg: string, ...args: unknown[]) => this.logger.info(`[${extensionId}] ${msg}`, ...args),
      warn: (msg: string, ...args: unknown[]) => this.logger.warn(`[${extensionId}] ${msg}`, ...args),
      error: (msg: string, ...args: unknown[]) => this.logger.error(`[${extensionId}] ${msg}`, ...args),
    };
  }

  /**
   * Processes signals in the queue sequentially.
   * Subclasses should implement signal routing logic.
   */
  protected async processQueue(): Promise<void> {
    if (this.isProcessing || this.signalQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.signalQueue.length > 0 && this.state === 'running') {
        const signal = this.signalQueue.shift();
        if (signal) {
          await this.processSignal(signal);
        }
      }
    } catch (error) {
      this.logger.error('Error processing signal queue:', error);
      this.stats.errorCount++;
      this.emitEvent('runtime:error', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processes a single signal through the v2 middleware pipeline.
   *
   * Pipeline order:
   * 1. onRoute hooks (guard, phase check, rate-limit, etc.)
   * 2. onBeforeProcess hooks (timeout start, transform)
   * 3. node.process()
   * 4. onAfterProcess hooks (phase advance, timeout clear)
   * 5. onError hooks (retry, compensation) — only if process throws
   */
  protected abstract processSignal(signal: Signal): Promise<void>;

  /**
   * Abstract lifecycle methods that subclasses must implement.
   */
  abstract initialize(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract destroy(): Promise<void>;
}
