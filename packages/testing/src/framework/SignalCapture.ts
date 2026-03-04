/**
 * SignalCapture - Captures signals during test execution
 */

import type { Signal } from '../types';

export class SignalCapture {
  private signals: Signal[] = [];
  private capturing: boolean = false;

  /**
   * Start capturing signals
   */
  start(): void {
    this.capturing = true;
    this.signals = [];
  }

  /**
   * Stop capturing signals
   */
  stop(): void {
    this.capturing = false;
  }

  /**
   * Capture a signal (called by signal bus)
   */
  capture(signal: Signal): void {
    if (this.capturing) {
      this.signals.push({
        ...signal,
        timestamp: signal.timestamp instanceof Date 
          ? signal.timestamp 
          : new Date(signal.timestamp)
      });
    }
  }

  /**
   * Get all captured signals
   */
  getSignals(): Signal[] {
    return [...this.signals];
  }

  /**
   * Clear captured signals
   */
  clear(): void {
    this.signals = [];
  }

  /**
   * Check if signal type was captured
   */
  hasSignalType(type: string): boolean {
    return this.signals.some(s => s.type === type);
  }

  /**
   * Get signals of a specific type
   */
  getSignalsByType(type: string): Signal[] {
    return this.signals.filter(s => s.type === type);
  }

  /**
   * Get count of captured signals
   */
  getCount(): number {
    return this.signals.length;
  }

  /**
   * Check if currently capturing
   */
  isCapturing(): boolean {
    return this.capturing;
  }
}
