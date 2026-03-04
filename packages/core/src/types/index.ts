/**
 * Common type definitions for Graph-OS
 * 
 * @module @graph-os/core
 */

/**
 * Represents the state of a runtime or node.
 */
export type RuntimeState = 'idle' | 'initializing' | 'ready' | 'running' | 'stopping' | 'stopped' | 'destroyed' | 'error';

/**
 * Log level for runtime logging.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Result of a signal processing operation.
 */
export interface ProcessResult {
  /** Whether processing was successful */
  success: boolean;
  
  /** Output signals, if any */
  signals?: Signal[];
  
  /** Error message, if failed */
  error?: string;
}

import { Signal } from '../signal/Signal';

/**
 * Statistics about the runtime.
 */
export interface RuntimeStats {
  /** Number of nodes in the graph */
  nodeCount: number;
  
  /** Number of wires in the graph */
  wireCount: number;
  
  /** Number of signals processed */
  signalsProcessed: number;
  
  /** Number of signals emitted */
  signalsEmitted: number;
  
  /** Number of errors encountered */
  errorCount: number;
  
  /** Runtime uptime in milliseconds */
  uptime: number;
}

/**
 * Options for configuring the runtime.
 */
export interface RuntimeOptions {
  /** Enable debug logging */
  debug?: boolean;
  
  /** Log level */
  logLevel?: LogLevel;
  
  /** Maximum signal queue size */
  maxQueueSize?: number;
  
  /** Signal processing timeout in milliseconds */
  processingTimeout?: number;
}

/**
 * Event types for runtime events.
 */
export type RuntimeEventType = 
  | 'runtime:start'
  | 'runtime:stop'
  | 'runtime:error'
  | 'runtime:ready'
  | 'runtime:destroyed'
  | 'signal:received'
  | 'signal:emitted'
  | 'signal:error'
  | 'node:initialized'
  | 'node:destroyed'
  | 'node:error'
  | 'node:processed';

/**
 * Event emitted by the runtime.
 */
export interface RuntimeEvent {
  /** Event type */
  type: RuntimeEventType;
  
  /** Event timestamp */
  timestamp: Date | number;
  
  /** Event data */
  data?: unknown;
  
  /** Error, if applicable */
  error?: Error;
}

/**
 * Handler function for runtime events.
 */
export type RuntimeEventHandler = (event: RuntimeEvent) => void;
