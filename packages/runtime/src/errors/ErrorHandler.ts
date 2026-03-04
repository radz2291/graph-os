/**
 * Error handling utilities for Graph-OS runtime
 * 
 * @module @graph-os/runtime
 */

/**
 * Base error class for Graph-OS errors.
 */
export class GraphError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GraphError';
  }

  /**
   * Creates a JSON representation of the error.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Error thrown by nodes during processing.
 */
export class NodeError extends GraphError {
  constructor(
    message: string,
    public nodeId: string,
    public nodeType: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'NODE_ERROR', { nodeId, nodeType, ...details });
    this.name = 'NodeError';
  }
}

/**
 * Error thrown during signal processing.
 */
export class SignalError extends GraphError {
  constructor(
    message: string,
    public signalType: string,
    public sourceNodeId: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SIGNAL_ERROR', { signalType, sourceNodeId, ...details });
    this.name = 'SignalError';
  }
}

/**
 * Error thrown during validation.
 */
export class ValidationError extends GraphError {
  constructor(
    message: string,
    public errors: Array<{ code: string; message: string; path?: string }>
  ) {
    super(message, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown during cartridge loading.
 */
export class CartridgeError extends GraphError {
  constructor(
    message: string,
    public cartridgePath: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'CARTRIDGE_ERROR', { cartridgePath, ...details });
    this.name = 'CartridgeError';
  }
}

/**
 * Error thrown when a node type is not found.
 */
export class NodeTypeNotFoundError extends GraphError {
  constructor(nodeType: string, availableTypes: string[]) {
    super(
      `Node type not found: ${nodeType}`,
      'NODE_TYPE_NOT_FOUND',
      { nodeType, availableTypes }
    );
    this.name = 'NodeTypeNotFoundError';
  }
}

/**
 * Error thrown during wire connection.
 */
export class WireError extends GraphError {
  constructor(
    message: string,
    public fromNodeId: string,
    public toNodeId: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'WIRE_ERROR', { fromNodeId, toNodeId, ...details });
    this.name = 'WireError';
  }
}

/**
 * Handles errors in a consistent way.
 */
export class ErrorHandler {
  /**
   * Converts an unknown error to a GraphError.
   */
  static toGraphError(error: unknown): GraphError {
    if (error instanceof GraphError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new GraphError(error.message, 'UNKNOWN_ERROR', {
        originalError: error.name,
        stack: error.stack,
      });
    }
    
    return new GraphError(String(error), 'UNKNOWN_ERROR');
  }

  /**
   * Formats an error for display.
   */
  static formatError(error: unknown): string {
    const graphError = ErrorHandler.toGraphError(error);
    
    let message = `[${graphError.code}] ${graphError.message}`;
    
    if (graphError.details) {
      message += `\nDetails: ${JSON.stringify(graphError.details, null, 2)}`;
    }
    
    return message;
  }
}
