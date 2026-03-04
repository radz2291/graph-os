/**
 * verify_node - Unit testing tool for individual nodes
 * 
 * Renamed from mcp_verify_node as part of Phase 1 cleanup.
 * Self-contained implementation without external package dependencies.
 * Must complete in < 5ms to meet performance requirements.
 */

import type { MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';
import { globalNodeRegistry } from '@graph-os/runtime';

// Input type for this tool
export interface VerifyNodeInput {
  nodeType: string;
  config: Record<string, unknown>;
  inputSignal: {
    type: string;
    payload?: Record<string, unknown>;
    timestamp?: string;
    sourceNodeId?: string;
  };
  expectedOutput?: {
    type: string;
    payload?: Record<string, unknown>;
  };
  expectError?: boolean;
  expectedErrorPattern?: string;
}

// Output type for this tool
export interface VerifyNodeOutput {
  passed: boolean;
  actualOutput: unknown;
  expectedOutput: unknown;
  executionTime: number;
  error?: string;
  performanceMet: boolean;
}

// Internal signal type
interface Signal {
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  sourceNodeId: string;
}

/**
 * VerifyNodeTool - Unit testing for Graph-OS nodes
 * 
 * Tests individual nodes in isolation with a < 5ms execution requirement.
 * Use for rapid iteration during node development.
 */
export class VerifyNodeTool {
  readonly definition: MCPToolDefinition = {
    name: 'verify_node',
    description: 'Test individual nodes in isolation with < 5ms execution requirement. Use for rapid iteration during node development.',
    parameters: [
      {
        name: 'nodeType',
        type: 'string',
        required: true,
        description: 'Node type to test (e.g., logic.validate, logic.transform)'
      },
      {
        name: 'config',
        type: 'object',
        required: true,
        description: 'Node configuration object'
      },
      {
        name: 'inputSignal',
        type: 'object',
        required: true,
        description: 'Input signal to process'
      },
      {
        name: 'expectedOutput',
        type: 'object',
        required: false,
        description: 'Expected output signal(s)'
      },
      {
        name: 'expectError',
        type: 'boolean',
        required: false,
        description: 'Whether the node is expected to throw an error'
      },
      {
        name: 'expectedErrorPattern',
        type: 'string',
        required: false,
        description: 'Pattern to match in error message (if expectError is true)'
      }
    ],
    returnType: 'VerifyNodeOutput',
    category: 'testing',
    bestFor: ['unit testing', 'node development', 'rapid iteration'],
    complexity: 'low'
  };

  async execute(input: VerifyNodeInput): Promise<MCPToolResult<VerifyNodeOutput>> {
    const startTime = Date.now();
    let actualOutput: unknown = null;
    let error: string | undefined;

    try {
      // Prepare input signal
      const signal: Signal = {
        type: input.inputSignal.type,
        payload: input.inputSignal.payload ?? {},
        timestamp: input.inputSignal.timestamp
          ? new Date(input.inputSignal.timestamp)
          : new Date(),
        sourceNodeId: input.inputSignal.sourceNodeId ?? 'verify-node-tool'
      };

      // Process the node (Wait for the promise since registry delegates are async)
      const result = await this.processNode(input.nodeType, input.config, signal);
      actualOutput = result.output;
      error = result.error;

    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const executionTime = Date.now() - startTime;
    const performanceMet = executionTime < 5; // Must be < 5ms

    // Determine if test passed
    let passed = false;

    if (input.expectError) {
      if (error) {
        if (input.expectedErrorPattern) {
          passed = error.includes(input.expectedErrorPattern);
          if (!passed) {
            error = `Error "${error}" does not match pattern "${input.expectedErrorPattern}"`;
          }
        } else {
          passed = true;
        }
      } else {
        error = 'Expected an error but none was thrown';
        passed = false;
      }
    } else {
      if (!error) {
        passed = this.compareOutputs(actualOutput, input.expectedOutput);
        if (!passed && input.expectedOutput !== undefined) {
          error = 'Output does not match expected output';
        } else if (!passed) {
          passed = true;
        }
      }
    }

    const output: VerifyNodeOutput = {
      passed,
      actualOutput,
      expectedOutput: input.expectedOutput ?? null,
      executionTime,
      error,
      performanceMet
    };

    return {
      success: passed,
      data: output,
      metadata: {
        executionTime,
        performanceMet
      }
    };
  }

  /**
   * Process a node and return output
   */
  private async processNode(
    nodeType: string,
    config: Record<string, unknown>,
    inputSignal: Signal
  ): Promise<{ output: Signal | null; error?: string }> {
    try {
      if (!globalNodeRegistry.has(nodeType)) {
        throw new Error(`Node type "${nodeType}" not found in the global registry. Fallbacks are disabled.`);
      }

      const processor = globalNodeRegistry.createProcessor(nodeType, config, 'test-node');

      if (processor.error) {
        throw new Error(processor.error);
      }

      const output = await processor.process(inputSignal) as any as Signal;
      return { output };
    } catch (e) {
      return {
        output: null,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }

  private compareOutputs(
    actual: unknown,
    expected: unknown
  ): boolean {
    if (expected === undefined || expected === null) return true;
    if (actual === null) return expected === null;

    const actualObj = actual as { type?: string; payload?: unknown };
    const expectedObj = expected as { type?: string; payload?: unknown };

    if (!actualObj || typeof actualObj !== 'object') return false;
    if (actualObj.type !== expectedObj.type) return false;

    if (expectedObj.payload !== undefined) {
      if (!this.isSubset(expectedObj.payload, actualObj.payload)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Recursively checks if the expected object is a subset of the actual object.
   * This allows the actual object to have additional properties (e.g., injected metadata)
   * while still passing the test.
   */
  private isSubset(expected: unknown, actual: unknown): boolean {
    if (expected === actual) return true;

    if (typeof expected !== 'object' || expected === null) {
      return expected === actual;
    }

    if (typeof actual !== 'object' || actual === null) {
      return false; // Expected is an object, actual is not
    }

    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;
      if (expected.length > actual.length) return false;

      // For arrays, we could check subset by item (order-independent) or exact index.
      // Usually, exact index matching is preferred for signal payloads:
      for (let i = 0; i < expected.length; i++) {
        if (!this.isSubset(expected[i], actual[i])) {
          return false;
        }
      }
      return true;
    }

    // Compare objects
    const expectedKeys = Object.keys(expected as Record<string, unknown>);
    for (const key of expectedKeys) {
      const expectedValue = (expected as Record<string, unknown>)[key];
      const actualValue = (actual as Record<string, unknown>)[key];

      if (!this.isSubset(expectedValue, actualValue)) {
        return false;
      }
    }

    return true;
  }

  validateParams(params: unknown): params is VerifyNodeInput {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.nodeType === 'string' &&
      typeof p.config === 'object' &&
      typeof p.inputSignal === 'object';
  }
}

/**
 * Factory function to create a VerifyNodeTool instance
 */
export function createVerifyNodeTool(): VerifyNodeTool {
  return new VerifyNodeTool();
}
