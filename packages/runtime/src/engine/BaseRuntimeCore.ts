/**
 * BaseRuntimeCore - Shared functionality for all runtime implementations
 * 
 * Provides common signal processing, event handling, and lifecycle management
 * shared between GraphRuntime and GraphRuntimeCore.
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
} from '@graph-os/core';
import { SignalBus } from '../signal-bus/SignalBus';
import { Logger } from '../utils/Logger';
import { DLQEntry } from './DLQ';

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

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
    this.signalBus = new SignalBus();
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
   * Processes a single signal.
   * Subclasses should implement the actual signal routing and node processing.
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
