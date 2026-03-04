/**
 * mcp_test_scenario - Integration testing tool for cartridges
 */

import * as fs from 'fs';
import type { 
  Signal, 
  TestScenarioInput, 
  TestScenarioOutput, 
  MCPToolResult,
  MCPToolDefinition,
  MCPParameterSchema 
} from '../types';
import { TestRunner } from '../framework/TestRunner';

export class TestScenarioTool {
  readonly definition: MCPToolDefinition = {
    name: 'mcp_test_scenario',
    description: 'Run integration tests on cartridges to verify signal flows',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to test'
      },
      {
        name: 'scenario',
        type: 'string',
        required: true,
        description: 'Name of the test scenario'
      },
      {
        name: 'inputSignal',
        type: 'object',
        required: true,
        description: 'Starting input signal'
      },
      {
        name: 'expectedSignals',
        type: 'array',
        required: true,
        description: 'List of expected signal types to be emitted'
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Maximum execution time in ms (default: 5000)'
      },
      {
        name: 'captureAll',
        type: 'boolean',
        required: false,
        description: 'Whether to capture all signals (default: true)'
      }
    ],
    returnType: 'TestScenarioOutput'
  };

  async execute(input: TestScenarioInput): Promise<MCPToolResult<TestScenarioOutput>> {
    const runner = new TestRunner({
      timeout: input.timeout ?? 5000,
      captureAllSignals: input.captureAll ?? true
    });

    try {
      // Validate cartridge exists
      if (!fs.existsSync(input.cartridgePath)) {
        return {
          success: false,
          error: `Cartridge not found: ${input.cartridgePath}`
        };
      }

      // Prepare input signal
      const signal: Signal = {
        type: input.inputSignal.type,
        payload: input.inputSignal.payload ?? {},
        timestamp: input.inputSignal.timestamp 
          ? new Date(input.inputSignal.timestamp) 
          : new Date(),
        sourceNodeId: input.inputSignal.sourceNodeId ?? 'test-runner'
      };

      // Run the scenario
      const result = await runner.runScenario(
        input.cartridgePath,
        signal,
        input.expectedSignals
      );

      const output: TestScenarioOutput = {
        passed: result.passed && result.missingSignals.length === 0,
        signalsReceived: result.signalsReceived,
        missingSignals: result.missingSignals,
        unexpectedSignals: result.unexpectedSignals,
        executionTime: result.executionTime,
        errors: result.errors,
        scenario: input.scenario
      };

      return {
        success: output.passed,
        data: output,
        metadata: {
          signalCount: result.signalsReceived.length,
          executionTime: result.executionTime
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  validateParams(params: unknown): params is TestScenarioInput {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.cartridgePath === 'string' &&
           typeof p.scenario === 'string' &&
           typeof p.inputSignal === 'object' &&
           Array.isArray(p.expectedSignals);
  }
}

export function createTestScenarioTool(): TestScenarioTool {
  return new TestScenarioTool();
}
