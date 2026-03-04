/**
 * Signal Interface - Core abstraction for inter-node communication
 * 
 * Signals are the fundamental message units in Graph-OS. They flow between
 * nodes through wires, carrying structured data and metadata.
 * 
 * @module @graph-os/core
 */

/**
 * Represents a signal that flows between nodes in the graph.
 * 
 * @example
 * ```typescript
 * const signal: Signal = {
 *   type: 'USER.LOGIN_REQUEST',
 *   payload: { email: 'user@example.com', password: 'secret' },
 *   timestamp: new Date(),
 *   sourceNodeId: 'input-node-1',
 *   metadata: { requestId: 'req-123' }
 * };
 * ```
 */
export interface Signal {
  /** 
   * Signal type in NAMESPACE.ACTION format
   * @example "USER.LOGIN_REQUEST", "AUTH.SUCCESS", "VALIDATION.FAILURE"
   */
  type: string;
  
  /** 
   * Structured data payload
   * The shape depends on the signal type
   */
  payload: unknown;
  
  /** 
   * ISO 8601 timestamp when the signal was created
   */
  timestamp: Date;
  
  /** 
   * ID of the node that emitted this signal
   */
  sourceNodeId: string;
  
  /** 
   * Optional metadata for tracing, debugging, and extensibility
   */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for nodes that can emit signals.
 * Implemented by nodes that produce output signals.
 */
export interface SignalEmitter {
  /**
   * Emits a single signal to connected nodes.
   * @param signal - The signal to emit
   */
  emit(signal: Signal): void;
  
  /**
   * Emits multiple signals at once.
   * Useful for nodes that produce multiple outputs.
   * @param signals - Array of signals to emit
   */
  emitMultiple(signals: Signal[]): void;
}

/**
 * Interface for nodes that can receive signals.
 * Implemented by nodes that process incoming signals.
 */
export interface SignalReceiver {
  /**
   * Handles an incoming signal.
   * @param signal - The signal to process
   */
  receive(signal: Signal): Promise<void>;
}

/**
 * Type guard to check if an object is a valid Signal.
 * @param obj - Object to check
 * @returns True if the object is a valid Signal
 */
export function isSignal(obj: unknown): obj is Signal {
  if (typeof obj !== 'object' || obj === null) return false;
  const signal = obj as Signal;
  return (
    typeof signal.type === 'string' &&
    signal.payload !== undefined &&
    signal.timestamp instanceof Date &&
    typeof signal.sourceNodeId === 'string'
  );
}

/**
 * Creates a new signal with defaults.
 * @param type - Signal type
 * @param payload - Signal payload
 * @param sourceNodeId - Source node ID
 * @param metadata - Optional metadata
 * @returns A new Signal object
 */
export function createSignal(
  type: string,
  payload: unknown,
  sourceNodeId: string,
  metadata?: Record<string, unknown>
): Signal {
  return {
    type,
    payload,
    timestamp: new Date(),
    sourceNodeId,
    metadata,
  };
}
