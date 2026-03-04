/**
 * SignalBus - Framework-agnostic signal subscription system
 * 
 * SignalBus provides a pub/sub mechanism for signals that allows
 * external subscribers (like React components) to subscribe to
 * signal emissions without knowing about Graph-OS internals.
 * 
 * @module @graph-os/runtime
 */

import { Signal } from '@graph-os/core';

/**
 * SignalBus manages signal subscriptions and emissions.
 * Framework-agnostic - works with any frontend framework.
 */
export class SignalBus {
  private subscribers: Map<string, Set<(signal: Signal) => void>> = new Map();
  private history: Map<string, Signal[]> = new Map();
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Subscribes to a signal type.
   * 
   * @param signalType - The signal type to subscribe to (e.g., 'AUTH.SUCCESS')
   * @param callback - Function to call when signal is emitted
   * @returns Unsubscribe function
   */
  subscribe(
    signalType: string,
    callback: (signal: Signal) => void
  ): () => void {
    if (!this.subscribers.has(signalType)) {
      this.subscribers.set(signalType, new Set());
    }
    this.subscribers.get(signalType)!.add(callback);
    
    // Send historical signals (for late subscribers)
    const history = this.history.get(signalType) || [];
    for (const signal of history) {
      // Use setTimeout to avoid blocking
      setTimeout(() => callback(signal), 0);
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(signalType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Subscribes to all signals (wildcard).
   * 
   * @param callback - Function to call when any signal is emitted
   * @returns Unsubscribe function
   */
  subscribeAll(callback: (signal: Signal) => void): () => void {
    return this.subscribe('*', callback);
  }

  /**
   * Emits a signal to all subscribers.
   * 
   * @param signal - The signal to emit
   */
  emit(signal: Signal): void {
    // Emit to specific subscribers
    const callbacks = this.subscribers.get(signal.type);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(signal);
        } catch (error) {
          console.error(`Error in signal callback for ${signal.type}:`, error);
        }
      }
    }
    
    // Emit to wildcard subscribers
    const wildcardCallbacks = this.subscribers.get('*');
    if (wildcardCallbacks) {
      for (const callback of wildcardCallbacks) {
        try {
          callback(signal);
        } catch (error) {
          console.error(`Error in wildcard callback:`, error);
        }
      }
    }
    
    // Store in history
    if (!this.history.has(signal.type)) {
      this.history.set(signal.type, []);
    }
    const signalHistory = this.history.get(signal.type)!;
    signalHistory.push(signal);
    
    // Keep history size bounded
    if (signalHistory.length > this.maxHistorySize) {
      signalHistory.shift();
    }
  }

  /**
   * Gets the history of signals for a type.
   * 
   * @param signalType - The signal type to get history for
   * @returns Array of historical signals
   */
  getHistory(signalType: string): Signal[] {
    return this.history.get(signalType) || [];
  }

  /**
   * Clears all subscriptions and history.
   */
  clear(): void {
    this.subscribers.clear();
    this.history.clear();
  }

  /**
   * Clears history for a specific signal type.
   * 
   * @param signalType - The signal type to clear history for
   */
  clearHistory(signalType: string): void {
    this.history.delete(signalType);
  }

  /**
   * Gets the number of subscribers for a signal type.
   * 
   * @param signalType - The signal type to count subscribers for
   * @returns Number of subscribers
   */
  getSubscriberCount(signalType: string): number {
    return this.subscribers.get(signalType)?.size || 0;
  }

  /**
   * Gets all subscribed signal types.
   * 
   * @returns Array of signal types with subscribers
   */
  getSubscribedTypes(): string[] {
    return Array.from(this.subscribers.keys()).filter(type => type !== '*');
  }

  /**
   * Checks if there are any subscribers for a signal type.
   * 
   * @param signalType - The signal type to check
   * @returns True if there are subscribers
   */
  hasSubscribers(signalType: string): boolean {
    const callbacks = this.subscribers.get(signalType);
    return callbacks !== undefined && callbacks.size > 0;
  }
}
