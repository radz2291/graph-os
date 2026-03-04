/**
 * mcp_verify_node - Unit testing tool for individual nodes
 */

import type { 
  Signal, 
  VerifyNodeInput, 
  VerifyNodeOutput,
  MCPToolResult,
  MCPToolDefinition
} from '../types';
import { TestRunner } from '../framework/TestRunner';

export class VerifyNodeTool {
  readonly definition: MCPToolDefinition = {
    name: 'mcp_verify_node',
    description: 'Test individual nodes in isolation with < 5ms execution',
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
        description: 'Node configuration'
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
    returnType: 'VerifyNodeOutput'
  };

  async execute(input: VerifyNodeInput): Promise<MCPToolResult<VerifyNodeOutput>> {
    const startTime = Date.now();
    let actualOutput: Signal | Signal[] | null = null;
    let error: string | undefined;

    try {
      // Create runner
      const runner = new TestRunner();

      // Prepare input signal
      const signal: Signal = {
        type: input.inputSignal.type,
        payload: input.inputSignal.payload ?? {},
        timestamp: input.inputSignal.timestamp 
          ? new Date(input.inputSignal.timestamp) 
          : new Date(),
        sourceNodeId: input.inputSignal.sourceNodeId ?? 'verify-node-tool'
      };

      // Test the node
      const result = await runner.testNode(
        input.nodeType,
        input.config,
        signal
      );

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

    // Convert expectedOutput to Signal format if needed
    let normalizedExpectedOutput: Signal | Signal[] | null = null;
    if (input.expectedOutput) {
      normalizedExpectedOutput = {
        type: input.expectedOutput.type,
        payload: input.expectedOutput.payload ?? {},
        timestamp: new Date(),
        sourceNodeId: 'expected'
      };
    }

    const output: VerifyNodeOutput = {
      passed,
      actualOutput,
      expectedOutput: normalizedExpectedOutput,
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

  private compareOutputs(
    actual: Signal | Signal[] | null,
    expected: { type: string; payload?: Record<string, unknown> } | null | undefined
  ): boolean {
    if (expected === undefined || expected === null) return true;
    if (actual === null) return expected === null;

    const actualSignal = Array.isArray(actual) ? actual[0] : actual;
    if (!actualSignal) return false;

    if (actualSignal.type !== expected.type) return false;

    if (expected.payload) {
      if (JSON.stringify(actualSignal.payload) !== JSON.stringify(expected.payload)) {
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

export function createVerifyNodeTool(): VerifyNodeTool {
  return new VerifyNodeTool();
}
