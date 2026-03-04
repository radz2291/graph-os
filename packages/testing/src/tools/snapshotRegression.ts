/**
 * mcp_snapshot_regression - Regression testing tool for cartridges
 */

import * as fs from 'fs';
import type { 
  Signal, 
  SnapshotRegressionInput, 
  SnapshotRegressionOutput,
  SnapshotData,
  SnapshotDiff,
  MCPToolResult,
  MCPToolDefinition
} from '../types';
import { SnapshotManager } from '../framework/SnapshotManager';
import { TestRunner } from '../framework/TestRunner';

export class SnapshotRegressionTool {
  readonly definition: MCPToolDefinition = {
    name: 'mcp_snapshot_regression',
    description: 'Run regression tests using snapshots to detect changes',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to test'
      },
      {
        name: 'baselinePath',
        type: 'string',
        required: true,
        description: 'Path to the baseline snapshot file'
      },
      {
        name: 'inputSignals',
        type: 'array',
        required: true,
        description: 'Input signals to replay'
      },
      {
        name: 'updateBaseline',
        type: 'boolean',
        required: false,
        description: 'Update baseline instead of comparing (default: false)'
      },
      {
        name: 'failOnMissingBaseline',
        type: 'boolean',
        required: false,
        description: 'Whether to fail when baseline is missing (default: true)'
      }
    ],
    returnType: 'SnapshotRegressionOutput'
  };

  private snapshotManager: SnapshotManager;

  constructor() {
    this.snapshotManager = new SnapshotManager();
  }

  async execute(input: SnapshotRegressionInput): Promise<MCPToolResult<SnapshotRegressionOutput>> {
    try {
      // Validate cartridge exists
      if (!fs.existsSync(input.cartridgePath)) {
        return {
          success: false,
          error: `Cartridge not found: ${input.cartridgePath}`
        };
      }

      // Read cartridge data
      const cartridgeData = fs.readFileSync(input.cartridgePath, 'utf-8');
      const cartridge = JSON.parse(cartridgeData);

      // Run test to get current behavior
      const runner = new TestRunner();
      const allSignals: Signal[] = [];
      const nodeStates: Record<string, unknown> = {};

      // Process each input signal
      for (const inputSignal of input.inputSignals) {
        const signal: Signal = {
          type: inputSignal.type,
          payload: inputSignal.payload ?? {},
          timestamp: new Date(),
          sourceNodeId: 'snapshot-runner'
        };

        try {
          const result = await runner.runScenario(
            input.cartridgePath,
            signal,
            []
          );
          allSignals.push(...result.signalsReceived);
        } catch (e) {
          // Continue even if some signals fail
        }
      }

      // Get node states
      for (const node of cartridge.nodes || []) {
        nodeStates[node.id] = {
          type: node.type,
          processed: allSignals.some(s => s.sourceNodeId === node.id)
        };
      }

      // Create current snapshot
      const currentSnapshot = this.snapshotManager.createSnapshot(
        cartridge.name || 'unnamed',
        allSignals,
        nodeStates,
        cartridgeData
      );

      // Check if baseline exists
      const baselineExists = this.snapshotManager.snapshotExists(input.baselinePath);

      // Update baseline mode
      if (input.updateBaseline) {
        this.snapshotManager.saveSnapshot(currentSnapshot, input.baselinePath);
        return {
          success: true,
          data: {
            passed: true,
            baselineExists,
            differences: [],
            currentSnapshot,
            baselineSnapshot: undefined,
            baselinePath: input.baselinePath
          }
        };
      }

      // Missing baseline handling
      if (!baselineExists) {
        if (input.failOnMissingBaseline !== false) {
          return {
            success: false,
            data: {
              passed: false,
              baselineExists: false,
              differences: [{
                type: 'state_changed',
                description: 'Baseline snapshot does not exist',
                path: 'baseline',
                actual: 'missing'
              }],
              currentSnapshot,
              baselinePath: input.baselinePath
            }
          };
        } else {
          this.snapshotManager.saveSnapshot(currentSnapshot, input.baselinePath);
          return {
            success: true,
            data: {
              passed: true,
              baselineExists: false,
              differences: [],
              currentSnapshot,
              baselinePath: input.baselinePath
            }
          };
        }
      }

      // Load baseline and compare
      const baselineSnapshot = this.snapshotManager.loadSnapshot(input.baselinePath);
      if (!baselineSnapshot) {
        return {
          success: false,
          error: 'Failed to load baseline snapshot'
        };
      }

      const differences = this.snapshotManager.compareSnapshots(
        currentSnapshot,
        baselineSnapshot
      );

      return {
        success: differences.length === 0,
        data: {
          passed: differences.length === 0,
          baselineExists: true,
          differences,
          currentSnapshot,
          baselineSnapshot,
          baselinePath: input.baselinePath
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  validateParams(params: unknown): params is SnapshotRegressionInput {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.cartridgePath === 'string' &&
           typeof p.baselinePath === 'string' &&
           Array.isArray(p.inputSignals);
  }
}

export function createSnapshotRegressionTool(): SnapshotRegressionTool {
  return new SnapshotRegressionTool();
}
