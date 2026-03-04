/**
 * snapshot_regression - Regression testing tool for cartridges
 * 
 * Renamed from mcp_snapshot_regression as part of Phase 1 cleanup.
 * Self-contained implementation without external package dependencies.
 * Zero-tolerance comparison for detecting unintended changes.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';

// Input type for this tool
export interface SnapshotRegressionInput {
  cartridgePath: string;
  baselinePath: string;
  inputSignals: Array<{
    type: string;
    payload?: Record<string, unknown>;
  }>;
  updateBaseline?: boolean;
  failOnMissingBaseline?: boolean;
}

// Output type for this tool
export interface SnapshotRegressionOutput {
  passed: boolean;
  baselineExists: boolean;
  differences: Array<{
    type: string;
    description: string;
    path: string;
    actual?: unknown;
    expected?: unknown;
  }>;
  currentSnapshot?: SnapshotData;
  baselineSnapshot?: SnapshotData;
  baselinePath: string;
}

// Snapshot data structure
interface SnapshotData {
  name: string;
  timestamp: string;
  signals: Array<{
    type: string;
    payload: unknown;
    sourceNodeId: string;
  }>;
  nodeStates: Record<string, {
    type: string;
    processed: boolean;
  }>;
  cartridgeHash: string;
}

// Internal types
interface Signal {
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  sourceNodeId: string;
}

interface CartridgeNode {
  id: string;
  type: string;
  config?: Record<string, unknown>;
}

interface CartridgeWire {
  from: string;
  to: string;
  signalType: string;
}

interface Cartridge {
  name?: string;
  nodes: CartridgeNode[];
  wires: CartridgeWire[];
}

/**
 * SnapshotRegressionTool - Regression testing for Graph-OS cartridges
 * 
 * Runs regression tests using snapshots to detect any unintended changes
 * in signal flow. Zero-tolerance comparison.
 */
export class SnapshotRegressionTool {
  readonly definition: MCPToolDefinition = {
    name: 'snapshot_regression',
    description: 'Run regression tests using snapshots to detect any unintended changes in signal flow. Zero-tolerance comparison.',
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
        description: 'Input signals to replay for comparison'
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
    returnType: 'SnapshotRegressionOutput',
    category: 'testing',
    bestFor: ['regression testing', 'change detection', 'snapshot comparison'],
    complexity: 'medium'
  };

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
      const cartridge: Cartridge = JSON.parse(cartridgeData);

      // Validate cartridge structure
      if (!cartridge.nodes || !Array.isArray(cartridge.nodes)) {
        return {
          success: false,
          error: 'Invalid cartridge: missing nodes array'
        };
      }

      // Run signals through cartridge
      const allSignals: Signal[] = [];
      const nodeStates: Record<string, { type: string; processed: boolean }> = {};

      for (const inputSignal of input.inputSignals) {
        const signal: Signal = {
          type: inputSignal.type,
          payload: inputSignal.payload ?? {},
          timestamp: new Date(),
          sourceNodeId: 'snapshot-runner'
        };

        const resultSignals = this.simulateSignalFlow(cartridge, signal);
        allSignals.push(...resultSignals);
      }

      // Record node states
      for (const node of cartridge.nodes) {
        nodeStates[node.id] = {
          type: node.type,
          processed: allSignals.some(s => s.sourceNodeId === node.id)
        };
      }

      // Create current snapshot
      const currentSnapshot: SnapshotData = {
        name: cartridge.name || path.basename(input.cartridgePath, '.json'),
        timestamp: new Date().toISOString(),
        signals: allSignals.map(s => ({
          type: s.type,
          payload: s.payload,
          sourceNodeId: s.sourceNodeId
        })),
        nodeStates,
        cartridgeHash: this.createHash(cartridgeData)
      };

      // Check if baseline exists
      const baselineExists = fs.existsSync(input.baselinePath);

      // Update baseline mode
      if (input.updateBaseline) {
        this.saveSnapshot(currentSnapshot, input.baselinePath);
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
          this.saveSnapshot(currentSnapshot, input.baselinePath);
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
      const baselineSnapshot = this.loadSnapshot(input.baselinePath);
      if (!baselineSnapshot) {
        return {
          success: false,
          error: 'Failed to load baseline snapshot'
        };
      }

      const differences = this.compareSnapshots(currentSnapshot, baselineSnapshot);

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

  /**
   * Simulate signal flow through a cartridge
   */
  private simulateSignalFlow(cartridge: Cartridge, inputSignal: Signal): Signal[] {
    const signals: Signal[] = [inputSignal];

    const nodes = cartridge.nodes || [];
    const wires = cartridge.wires || [];

    // Create a map of nodes
    const nodeMap = new Map<string, CartridgeNode>();
    for (const node of nodes) {
      if (node && node.id) {
        nodeMap.set(node.id, node);
      }
    }

    // Process each wire to simulate signal propagation
    const processedWires = new Set<string>();
    let hasNewSignals = true;
    let iterations = 0;
    const maxIterations = 100;

    while (hasNewSignals && iterations < maxIterations) {
      hasNewSignals = false;
      iterations++;

      for (const wire of wires) {
        const wireKey = `${wire.from}->${wire.to}:${wire.signalType}`;
        if (processedWires.has(wireKey)) continue;

        const fromNode = nodeMap.get(wire.from);
        const toNode = nodeMap.get(wire.to);

        if (fromNode && toNode) {
          const triggeringSignal = signals.find(s =>
            s.sourceNodeId === wire.from ||
            s.type === wire.signalType
          );

          if (triggeringSignal) {
            const newSignal = this.processNode(toNode, triggeringSignal, wire.signalType);
            if (newSignal) {
              signals.push(newSignal);
              hasNewSignals = true;
            }
            processedWires.add(wireKey);
          }
        }
      }
    }

    return signals;
  }

  /**
   * Process a node and generate output signal
   */
  private processNode(node: CartridgeNode, inputSignal: Signal, wireSignalType: string): Signal | null {
    const config = node.config || {};

    switch (node.type) {
      case 'logic.transform': {
        const outputType = (config.outputSignalType as string) || wireSignalType || `${inputSignal.type}.TRANSFORMED`;
        return {
          type: outputType,
          payload: inputSignal.payload,
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }

      case 'logic.validate': {
        const successType = (config.successSignalType as string) || (config.outputSignalType as string) || 'VALIDATION.SUCCESS';
        const failureType = (config.failureSignalType as string) || 'VALIDATION.FAILURE';
        const isValid = this.validatePayload(inputSignal.payload, config);
        return {
          type: isValid ? successType : failureType,
          payload: isValid ? inputSignal.payload : { errors: ['Validation failed'], originalPayload: inputSignal.payload },
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }

      case 'control.input': {
        const outputType = (config.outputSignalType as string) || wireSignalType || 'INPUT.SUBMITTED';
        return {
          type: outputType,
          payload: inputSignal.payload,
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }

      case 'control.display': {
        return null;
      }

      default: {
        return {
          type: (config.outputSignalType as string) || wireSignalType || `${inputSignal.type}.OUTPUT`,
          payload: inputSignal.payload,
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }
    }
  }

  /**
   * Validate payload based on config schema
   */
  private validatePayload(payload: Record<string, unknown>, config: Record<string, unknown>): boolean {
    const schema = config.schema as Record<string, unknown> | undefined;
    if (!schema) return true;

    const required = schema.required as string[] | undefined;
    if (!required || !Array.isArray(required)) return true;

    for (const field of required) {
      if (!(field in payload)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a simple hash of the cartridge data
   */
  private createHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Save snapshot to file
   */
  private saveSnapshot(snapshot: SnapshotData, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  }

  /**
   * Load snapshot from file
   */
  private loadSnapshot(filePath: string): SnapshotData | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as SnapshotData;
    } catch {
      return null;
    }
  }

  /**
   * Deep recursive equality check for payload drift detection
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 == null || obj2 == null) {
      return false;
    }
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
      if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) return false;
    }
    return true;
  }

  /**
   * Compare two snapshots and return differences
   */
  private compareSnapshots(current: SnapshotData, baseline: SnapshotData): Array<{
    type: string;
    description: string;
    path: string;
    actual?: unknown;
    expected?: unknown;
  }> {
    const differences: Array<{
      type: string;
      description: string;
      path: string;
      actual?: unknown;
      expected?: unknown;
    }> = [];

    // Compare cartridge hash
    if (current.cartridgeHash !== baseline.cartridgeHash) {
      differences.push({
        type: 'cartridge_changed',
        description: 'Cartridge structure has changed',
        path: 'cartridge',
        actual: current.cartridgeHash,
        expected: baseline.cartridgeHash
      });
    }

    // Compare signal counts
    if (current.signals.length !== baseline.signals.length) {
      differences.push({
        type: 'signal_count_changed',
        description: `Signal count changed from ${baseline.signals.length} to ${current.signals.length}`,
        path: 'signals.length',
        actual: current.signals.length,
        expected: baseline.signals.length
      });
    }

    // Compare signal types
    const currentTypes = current.signals.map(s => s.type).sort();
    const baselineTypes = baseline.signals.map(s => s.type).sort();

    if (JSON.stringify(currentTypes) !== JSON.stringify(baselineTypes)) {
      differences.push({
        type: 'signal_types_changed',
        description: 'Signal types have changed',
        path: 'signals.types',
        actual: currentTypes,
        expected: baselineTypes
      });
    }

    // Compare payloads structurally
    for (let i = 0; i < Math.min(current.signals.length, baseline.signals.length); i++) {
      if (!this.deepEqual(current.signals[i].payload, baseline.signals[i].payload)) {
        differences.push({
          type: 'payload_changed',
          description: `Signal payload mutated at index ${i} for type ${current.signals[i].type}`,
          path: `signals[${i}].payload`,
          actual: current.signals[i].payload,
          expected: baseline.signals[i].payload
        });
      }
    }

    // Compare node states
    const currentNodes = Object.keys(current.nodeStates).sort();
    const baselineNodes = Object.keys(baseline.nodeStates).sort();

    if (JSON.stringify(currentNodes) !== JSON.stringify(baselineNodes)) {
      differences.push({
        type: 'nodes_changed',
        description: 'Node configuration has changed',
        path: 'nodeStates',
        actual: currentNodes,
        expected: baselineNodes
      });
    }

    return differences;
  }

  validateParams(params: unknown): params is SnapshotRegressionInput {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.cartridgePath === 'string' &&
      typeof p.baselinePath === 'string' &&
      Array.isArray(p.inputSignals);
  }
}

/**
 * Factory function to create a SnapshotRegressionTool instance
 */
export function createSnapshotRegressionTool(): SnapshotRegressionTool {
  return new SnapshotRegressionTool();
}
