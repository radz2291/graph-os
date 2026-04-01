/**
 * GraphContext — Runtime execution state for a single graph instance
 *
 * Tracks the current phase, completed phases, and arbitrary data.
 * Extensions read/write to this via get/set/increment.
 *
 * @module @graph-os/runtime
 */

import { Signal } from '@graph-os/core';
import { Logger } from '../utils/Logger';

export class GraphContextImpl {
  currentPhase: string;
  completedPhases: string[] = [];
  private data: Map<string, unknown> = new Map();
  private logger: Logger;
  private requeueFn?: (signal: Signal, delay?: number) => void;
  private onPhaseChange?: (from: string, to: string) => void;

  constructor(initialPhase: string, logger?: Logger) {
    this.currentPhase = initialPhase;
    this.logger = logger || new Logger();
  }

  /** Set the requeue callback (wired by runtime) */
  setRequeueFn(fn: (signal: Signal, delay?: number) => void): void {
    this.requeueFn = fn;
  }

  /** Set the phase change callback (wired by runtime for event emission) */
  setOnPhaseChange(fn: (from: string, to: string) => void): void {
    this.onPhaseChange = fn;
  }

  get<T = unknown>(key: string, defaultValue?: T): T {
    if (this.data.has(key)) {
      return this.data.get(key) as T;
    }
    return defaultValue as T;
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  increment(key: string): number {
    const current = (this.data.get(key) as number) || 0;
    const next = current + 1;
    this.data.set(key, next);
    return next;
  }

  hasCompleted(phaseId: string): boolean {
    return this.completedPhases.includes(phaseId);
  }

  requeue(signal: Signal, delay?: number): void {
    if (!this.requeueFn) {
      this.logger.warn('GraphContext.requeue called but no requeueFn registered');
      return;
    }
    this.requeueFn(signal, delay);
  }

  advanceTo(phaseId: string): void {
    if (this.currentPhase === phaseId) return;

    const fromPhase = this.currentPhase;
    this.completedPhases.push(fromPhase);
    this.currentPhase = phaseId;
    this.logger.info(`Phase: ${fromPhase} → ${phaseId}`);

    // Notify runtime so it can emit events for the UI
    if (this.onPhaseChange) {
      this.onPhaseChange(fromPhase, phaseId);
    }
  }

  /** Get a snapshot of the full context state (for persistence) */
  getSnapshot(): Record<string, unknown> {
    return {
      currentPhase: this.currentPhase,
      completedPhases: [...this.completedPhases],
      data: Object.fromEntries(this.data.entries()),
    };
  }

  /** Restore from a snapshot */
  restoreSnapshot(snapshot: Record<string, unknown>): void {
    this.currentPhase = snapshot.currentPhase as string;
    this.completedPhases = snapshot.completedPhases as string[];
    const data = snapshot.data as Record<string, unknown>;
    if (data) {
      this.data.clear();
      for (const [k, v] of Object.entries(data)) {
        this.data.set(k, v);
      }
    }
  }

  /** Clear all state */
  clear(): void {
    this.data.clear();
    this.completedPhases = [];
  }
}
