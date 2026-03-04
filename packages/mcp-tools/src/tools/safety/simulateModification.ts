/**
 * simulate_modification - Pre-flight validation with execution simulation
 *
 * This tool provides a safety net before applying modifications by:
 * - Loading cartridge into ephemeral memory (no disk writes)
 * - Detecting circular dependencies and type mismatches
 * - Simulating execution scenarios
 * - Generating execution traces and signal flow graphs
 * - Capturing performance metrics
 *
 * @module @graph-os/mcp-tools/safety
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition, MCPParameterSchema } from '../../core/MCPTool';
import { ConflictDetector } from '../../core/ConflictDetector';
import type { Cartridge, TopologyPatch, SignalRegistry } from '../../core/ConflictDetector';
import type { PatchOperation } from '../accelerator/applyTopologyPatch';

// =============================================================================
// Types
// =============================================================================

export interface SimulationScenario {
  name: string;
  inputSignal: {
    type: string;
    payload: unknown;
  };
  expectedSignals?: string[];
  maxExecutionTime?: number;
}

export interface SimulationRequest {
  /** Path to the cartridge file to simulate */
  cartridgePath: string;
  /** Patch to apply in simulation */
  patch?: TopologyPatch;
  /** Path to signal registry */
  signalRegistryPath?: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Maximum signal depth to simulate */
  simulationDepth?: number;
  /** Maximum signals to process */
  maxSignals?: number;
  /** Scenarios to run */
  scenarios?: SimulationScenario[];
  /** Include execution trace in result */
  includeExecutionTrace?: boolean;
  /** Include signal flow graph in result */
  includeSignalFlow?: boolean;
  /** Include performance metrics in result */
  includePerformanceMetrics?: boolean;
  /** Validate constraints before simulation */
  validateConstraints?: boolean;
  /** Detect circular dependencies */
  detectCircularDeps?: boolean;
  /** Detect type mismatches */
  detectTypeMismatches?: boolean;
}

export interface SimulationError {
  type: string;
  message: string;
  location?: {
    nodeId?: string;
    wireIndex?: number;
    signalType?: string;
  };
  severity: 'error' | 'warning' | 'info';
}

export interface SimulationWarning {
  type: string;
  message: string;
  suggestion?: string;
}

export interface ExecutionTraceEntry {
  timestamp: number;
  nodeId: string;
  nodeType: string;
  inputSignal: string;
  outputSignals: Array<{ type: string; payload: unknown }>;
  executionTimeMs: number;
}

export interface SignalFlowNode {
  id: string;
  type: string;
  label: string;
}

export interface SignalFlowEdge {
  from: string;
  to: string;
  signalType: string;
  label: string;
}

export interface SignalFlowGraph {
  nodes: SignalFlowNode[];
  edges: SignalFlowEdge[];
}

export interface PerformanceMetrics {
  totalTimeMs: number;
  nodeExecutionTimeMs: number;
  signalProcessingTimeMs: number;
  memoryUsageMB: number;
  signalCount: number;
  nodeCount: number;
  wireCount: number;
  averageExecutionTimePerNode: number;
}

export interface ScenarioResult {
  name: string;
  passed: boolean;
  inputSignal: string;
  emittedSignals: string[];
  expectedSignalsFound: string[];
  expectedSignalsMissing: string[];
  unexpectedSignals: string[];
  executionTrace?: ExecutionTraceEntry[];
  errors: SimulationError[];
}

export interface SimulationResult {
  success: boolean;
  passed: boolean;
  canProceed: boolean;
  errors: SimulationError[];
  warnings: SimulationWarning[];
  scenarios?: ScenarioResult[];
  performanceMetrics?: PerformanceMetrics;
  executionTrace?: ExecutionTraceEntry[];
  signalFlow?: SignalFlowGraph;
  circularDependencies?: string[][];
  typeMismatches?: Array<{
    from: string;
    to: string;
    expectedType: string;
    actualType: string;
  }>;
  summary: string;
}

// =============================================================================
// SimulationSandbox Class
// =============================================================================

/**
 * SimulationSandbox - Ephemeral runtime for simulation
 *
 * Provides an isolated in-memory environment for simulating
 * cartridge modifications without affecting disk state.
 */
class SimulationSandbox {
  private cartridge: Cartridge;
  private signalRegistry: SignalRegistry | null = null;
  private signals: Array<{ type: string; payload: unknown; source: string }> = [];
  private executionTrace: ExecutionTraceEntry[] = [];
  private startTime: number = 0;

  constructor(cartridge: Cartridge, signalRegistry?: SignalRegistry) {
    this.cartridge = JSON.parse(JSON.stringify(cartridge)); // Deep clone
    if (signalRegistry) {
      this.signalRegistry = JSON.parse(JSON.stringify(signalRegistry));
    }
  }

  /**
   * Apply patch to the sandboxed cartridge
   */
  applyPatch(patch: TopologyPatch): void {
    // Add nodes
    for (const node of patch.nodes || []) {
      const existingIndex = this.cartridge.nodes.findIndex(n => n.id === node.id);
      if (existingIndex >= 0) {
        this.cartridge.nodes[existingIndex] = node;
      } else {
        this.cartridge.nodes.push(node);
      }
    }

    // Add wires
    for (const wire of patch.wires || []) {
      const exists = this.cartridge.wires.some(
        w => w.from === wire.from && w.to === wire.to && w.signalType === wire.signalType
      );
      if (!exists) {
        this.cartridge.wires.push(wire);
      }
    }
  }

  /**
   * Inject a signal into the simulation
   */
  injectSignal(type: string, payload: unknown, source: string = 'external'): void {
    this.signals.push({ type, payload, source });
  }

  /**
   * Run simulation with current signals
   */
  async runSimulation(maxDepth: number = 10, maxSignals: number = 100): Promise<void> {
    this.startTime = performance.now();
    let depth = 0;
    let processedSignals = 0;

    while (this.signals.length > 0 && depth < maxDepth && processedSignals < maxSignals) {
      const signal = this.signals.shift()!;
      processedSignals++;

      // Find nodes that consume this signal
      const consumingNodes = this.cartridge.wires
        .filter(w => w.signalType === signal.type)
        .map(w => w.to);

      for (const nodeId of consumingNodes) {
        const node = this.cartridge.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const nodeStartTime = performance.now();

        // Simulate node execution
        const outputSignals = this.simulateNodeExecution(node, signal);

        const nodeEndTime = performance.now();

        // Record execution trace
        this.executionTrace.push({
          timestamp: nodeEndTime - this.startTime,
          nodeId: node.id,
          nodeType: node.type,
          inputSignal: signal.type,
          outputSignals,
          executionTimeMs: nodeEndTime - nodeStartTime,
        });

        // Emit output signals
        for (const outputSignal of outputSignals) {
          this.signals.push({
            type: outputSignal.type,
            payload: outputSignal.payload,
            source: node.id,
          });
        }
      }

      depth++;
    }
  }

  /**
   * Simulate node execution
   */
  private simulateNodeExecution(
    node: { id: string; type: string; config?: Record<string, unknown> },
    inputSignal: { type: string; payload: unknown }
  ): Array<{ type: string; payload: unknown }> {
    const outputs: Array<{ type: string; payload: unknown }> = [];

    // Find output wires for this node
    const outputWires = this.cartridge.wires.filter(w => w.from === node.id);

    // Simulate based on node type
    switch (node.type) {
      case 'logic.transform':
        outputs.push({
          type: outputWires[0]?.signalType || 'OUTPUT.TRANSFORMED',
          payload: inputSignal.payload,
        });
        break;

      case 'logic.validate':
        const isValid = this.simulateValidation(node.config, inputSignal.payload);
        outputs.push({
          type: isValid
            ? outputWires.find(w => w.signalType.includes('SUCCESS'))?.signalType || 'VALIDATE.SUCCESS'
            : outputWires.find(w => w.signalType.includes('FAILURE'))?.signalType || 'VALIDATE.FAILURE',
          payload: isValid ? inputSignal.payload : { errors: ['Validation failed'] },
        });
        break;

      case 'control.input':
        // Input nodes just pass through
        outputs.push({
          type: outputWires[0]?.signalType || 'INPUT.CHANGED',
          payload: inputSignal.payload,
        });
        break;

      case 'control.display':
        // Display nodes consume but don't emit
        break;

      default:
        // Generic passthrough
        for (const wire of outputWires) {
          outputs.push({
            type: wire.signalType,
            payload: inputSignal.payload,
          });
        }
    }

    return outputs;
  }

  /**
   * Simulate validation logic
   */
  private simulateValidation(config: Record<string, unknown> | undefined, value: unknown): boolean {
    if (!config || !config.rules) return true;

    const rules = config.rules as Array<{ type: string; params?: unknown }>;

    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (value === null || value === undefined || value === '') return false;
          break;
        case 'email':
          if (typeof value === 'string' && !value.includes('@')) return false;
          break;
        case 'minLength':
          const minLen = (rule.params as number) || 0;
          if (typeof value === 'string' && value.length < minLen) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Get all emitted signals
   */
  getEmittedSignals(): string[] {
    return this.executionTrace.flatMap(t => t.outputSignals.map(s => s.type));
  }

  /**
   * Get execution trace
   */
  getExecutionTrace(): ExecutionTraceEntry[] {
    return this.executionTrace;
  }

  /**
   * Get modified cartridge
   */
  getCartridge(): Cartridge {
    return this.cartridge;
  }
}

// =============================================================================
// SimulateModificationTool Class
// =============================================================================

/**
 * SimulateModificationTool - Pre-flight validation with execution simulation
 *
 * @example
 * ```typescript
 * const tool = new SimulateModificationTool();
 * const result = await tool.execute({
 *   cartridgePath: './cartridges/app.cartridge.json',
 *   patch: { nodes: [{ id: 'new-node', type: 'logic.transform' }] },
 *   scenarios: [{ name: 'test-login', inputSignal: { type: 'AUTH.LOGIN', payload: { email: 'test@test.com' } } }]
 * });
 * ```
 */
export class SimulateModificationTool {
  readonly definition: MCPToolDefinition = {
    name: 'simulate_modification',
    description: 'Pre-flight validation with execution simulation. Validates modifications before applying them by running in-memory simulations, detecting circular dependencies, type mismatches, and performance bottlenecks.',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to simulate'
      },
      {
        name: 'patch',
        type: 'object',
        required: false,
        description: 'Patch to apply in simulation (nodes, wires, signals)'
      },
      {
        name: 'signalRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to signal registry for type validation'
      },
      {
        name: 'timeoutMs',
        type: 'number',
        required: false,
        description: 'Timeout in milliseconds (default: 5000)'
      },
      {
        name: 'simulationDepth',
        type: 'number',
        required: false,
        description: 'Maximum signal propagation depth (default: 10)'
      },
      {
        name: 'scenarios',
        type: 'array',
        required: false,
        description: 'Test scenarios to run'
      },
      {
        name: 'includeExecutionTrace',
        type: 'boolean',
        required: false,
        description: 'Include execution trace in result (default: true)'
      },
      {
        name: 'includeSignalFlow',
        type: 'boolean',
        required: false,
        description: 'Include signal flow graph in result (default: true)'
      },
      {
        name: 'detectCircularDeps',
        type: 'boolean',
        required: false,
        description: 'Detect circular dependencies (default: true)'
      },
      {
        name: 'detectTypeMismatches',
        type: 'boolean',
        required: false,
        description: 'Detect type mismatches (default: true)'
      }
    ],
    returnType: 'SimulationResult',
    category: 'safety',
    bestFor: ['pre-flight validation', 'safe modifications', 'testing changes', 'performance prediction'],
    complexity: 'high'
  };

  private conflictDetector = new ConflictDetector();

  async execute(input: SimulationRequest): Promise<MCPToolResult<SimulationResult>> {
    const errors: SimulationError[] = [];
    const warnings: SimulationWarning[] = [];
    let circularDependencies: string[][] | undefined;
    let typeMismatches: SimulationResult['typeMismatches'];
    let scenarios: ScenarioResult[] | undefined;
    let performanceMetrics: PerformanceMetrics | undefined;
    let executionTrace: ExecutionTraceEntry[] | undefined;
    let signalFlow: SignalFlowGraph | undefined;

    const startTime = performance.now();

    try {
      // Validate cartridge exists
      if (!fs.existsSync(input.cartridgePath)) {
        return {
          success: false,
          error: `Cartridge not found: ${input.cartridgePath}`,
          data: {
            success: false,
            passed: false,
            canProceed: false,
            errors: [{ type: 'FILE_NOT_FOUND', message: `Cartridge not found: ${input.cartridgePath}`, severity: 'error' }],
            warnings: [],
            summary: 'Simulation failed: cartridge file not found'
          }
        };
      }

      // Load cartridge
      const cartridgeData = fs.readFileSync(input.cartridgePath, 'utf-8');
      const cartridge: Cartridge = JSON.parse(cartridgeData);

      // Load signal registry if provided
      let signalRegistry: SignalRegistry | undefined;
      if (input.signalRegistryPath && fs.existsSync(input.signalRegistryPath)) {
        signalRegistry = JSON.parse(fs.readFileSync(input.signalRegistryPath, 'utf-8'));
      }

      // Create sandbox
      const sandbox = new SimulationSandbox(cartridge, signalRegistry);

      // Apply patch if provided
      if (input.patch) {
        sandbox.applyPatch(input.patch);
      }

      const modifiedCartridge = sandbox.getCartridge();

      // Detect circular dependencies
      if (input.detectCircularDeps !== false) {
        const circularResult = this.detectCircularDependencies(modifiedCartridge);
        if (circularResult.length > 0) {
          circularDependencies = circularResult;
          errors.push({
            type: 'CIRCULAR_DEPENDENCY',
            message: `Found ${circularResult.length} circular dependency cycle(s)`,
            severity: 'warning',
          });
          warnings.push({
            type: 'CIRCULAR_DEPENDENCY',
            message: 'Circular dependencies may cause infinite loops',
            suggestion: 'Consider removing or breaking the cycle',
          });
        }
      }

      // Detect type mismatches
      if (input.detectTypeMismatches !== false && signalRegistry) {
        const mismatchResult = this.detectTypeMismatches(modifiedCartridge, signalRegistry);
        if (mismatchResult.length > 0) {
          typeMismatches = mismatchResult;
          for (const mismatch of mismatchResult) {
            warnings.push({
              type: 'TYPE_MISMATCH',
              message: `Type mismatch between ${mismatch.from} and ${mismatch.to}: expected ${mismatch.expectedType}, got ${mismatch.actualType}`,
              suggestion: 'Update signal type or wire configuration',
            });
          }
        }
      }

      // Validate constraints
      if (input.validateConstraints !== false) {
        const validationResult = this.validateConstraints(modifiedCartridge);
        for (const issue of validationResult.errors) {
          errors.push(issue);
        }
        for (const issue of validationResult.warnings) {
          warnings.push(issue);
        }
      }

      // Run scenarios
      if (input.scenarios && input.scenarios.length > 0) {
        scenarios = [];

        for (const scenario of input.scenarios) {
          const scenarioSandbox = new SimulationSandbox(cartridge, signalRegistry);

          if (input.patch) {
            scenarioSandbox.applyPatch(input.patch);
          }

          // Inject input signal
          scenarioSandbox.injectSignal(
            scenario.inputSignal.type,
            scenario.inputSignal.payload
          );

          // Run simulation
          const timeout = input.timeoutMs || 5000;
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Simulation timeout')), timeout);
          });

          try {
            await Promise.race([
              scenarioSandbox.runSimulation(input.simulationDepth || 10, input.maxSignals || 100),
              timeoutPromise,
            ]);
          } catch (e) {
            if (e instanceof Error && e.message === 'Simulation timeout') {
              errors.push({
                type: 'TIMEOUT',
                message: `Scenario "${scenario.name}" timed out after ${timeout}ms`,
                severity: 'warning',
              });
            }
          }

          const emittedSignals = scenarioSandbox.getEmittedSignals();

          // Check expected signals
          const expectedSignalsFound: string[] = [];
          const expectedSignalsMissing: string[] = [];
          const unexpectedSignals: string[] = [];

          if (scenario.expectedSignals) {
            for (const expected of scenario.expectedSignals) {
              if (emittedSignals.includes(expected)) {
                expectedSignalsFound.push(expected);
              } else {
                expectedSignalsMissing.push(expected);
              }
            }
          }

          const scenarioErrors: SimulationError[] = [];
          if (expectedSignalsMissing.length > 0) {
            scenarioErrors.push({
              type: 'EXPECTED_SIGNAL_NOT_FOUND',
              message: `Missing expected signals: ${expectedSignalsMissing.join(', ')}`,
              severity: 'error',
            });
          }

          scenarios.push({
            name: scenario.name,
            passed: expectedSignalsMissing.length === 0 && scenarioErrors.length === 0,
            inputSignal: scenario.inputSignal.type,
            emittedSignals,
            expectedSignalsFound,
            expectedSignalsMissing,
            unexpectedSignals,
            executionTrace: input.includeExecutionTrace !== false
              ? scenarioSandbox.getExecutionTrace()
              : undefined,
            errors: scenarioErrors,
          });
        }
      }

      // Build signal flow graph
      if (input.includeSignalFlow !== false) {
        signalFlow = this.buildSignalFlowGraph(modifiedCartridge);
      }

      // Capture performance metrics
      if (input.includePerformanceMetrics !== false) {
        const endTime = performance.now();
        performanceMetrics = {
          totalTimeMs: endTime - startTime,
          nodeExecutionTimeMs: executionTrace?.reduce((sum, t) => sum + t.executionTimeMs, 0) || 0,
          signalProcessingTimeMs: (endTime - startTime) - (executionTrace?.reduce((sum, t) => sum + t.executionTimeMs, 0) || 0),
          memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
          signalCount: executionTrace?.length || 0,
          nodeCount: modifiedCartridge.nodes.length,
          wireCount: modifiedCartridge.wires.length,
          averageExecutionTimePerNode: executionTrace?.length
            ? executionTrace.reduce((sum, t) => sum + t.executionTimeMs, 0) / executionTrace.length
            : 0,
        };
      }

      // Build summary
      const hasErrors = errors.some(e => e.severity === 'error');
      const hasWarnings = warnings.length > 0;
      const allScenariosPassed = scenarios?.every(s => s.passed) ?? true;

      const summary = this.buildSummary(
        !hasErrors && allScenariosPassed,
        errors,
        warnings,
        scenarios
      );

      return {
        success: true,
        data: {
          success: true,
          passed: !hasErrors && allScenariosPassed,
          canProceed: !hasErrors,
          errors,
          warnings,
          scenarios,
          performanceMetrics,
          executionTrace: input.includeExecutionTrace !== false ? executionTrace : undefined,
          signalFlow,
          circularDependencies,
          typeMismatches,
          summary,
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          success: false,
          passed: false,
          canProceed: false,
          errors: [{
            type: 'EXECUTION_ERROR',
            message: error instanceof Error ? error.message : String(error),
            severity: 'error',
          }],
          warnings,
          summary: `Simulation failed: ${error instanceof Error ? error.message : String(error)}`,
        }
      };
    }
  }

  /**
   * Detect circular dependencies in the graph
   */
  private detectCircularDependencies(cartridge: Cartridge): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const node of cartridge.nodes) {
      adjacency.set(node.id, []);
    }
    for (const wire of cartridge.wires) {
      const targets = adjacency.get(wire.from) || [];
      targets.push(wire.to);
      adjacency.set(wire.from, targets);
    }

    // DFS to find cycles
    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const node of cartridge.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  /**
   * Detect type mismatches in wires
   */
  private detectTypeMismatches(
    cartridge: Cartridge,
    signalRegistry: SignalRegistry
  ): Array<{ from: string; to: string; expectedType: string; actualType: string }> {
    const mismatches: Array<{ from: string; to: string; expectedType: string; actualType: string }> = [];

    for (const wire of cartridge.wires) {
      const signalDef = signalRegistry.signals?.find(s => s.type === wire.signalType);
      if (signalDef) {
        const fromNode = cartridge.nodes.find(n => n.id === wire.from);
        const toNode = cartridge.nodes.find(n => n.id === wire.to);

        if (fromNode && toNode) {
          // Check if the signal is supposed to be emitted by the from node
          if (signalDef.emittedBy && !signalDef.emittedBy.includes(fromNode.type)) {
            mismatches.push({
              from: wire.from,
              to: wire.to,
              expectedType: signalDef.emittedBy.join(' | '),
              actualType: fromNode.type,
            });
          }
          // Check if the signal is supposed to be consumed by the to node
          if (signalDef.consumedBy && !signalDef.consumedBy.includes(toNode.type)) {
            mismatches.push({
              from: wire.from,
              to: wire.to,
              expectedType: signalDef.consumedBy.join(' | '),
              actualType: toNode.type,
            });
          }
        }
      }
    }

    return mismatches;
  }

  /**
   * Validate constraints on the cartridge
   */
  private validateConstraints(cartridge: Cartridge): {
    errors: SimulationError[];
    warnings: SimulationWarning[];
  } {
    const errors: SimulationError[] = [];
    const warnings: SimulationWarning[] = [];

    // Check for orphaned nodes (no wires connected)
    const connectedNodes = new Set<string>();
    for (const wire of cartridge.wires) {
      connectedNodes.add(wire.from);
      connectedNodes.add(wire.to);
    }

    for (const node of cartridge.nodes) {
      if (!connectedNodes.has(node.id)) {
        warnings.push({
          type: 'ORPHANED_NODE',
          message: `Node "${node.id}" has no connections`,
          suggestion: 'Consider connecting this node or removing it',
        });
      }
    }

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of cartridge.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push({
          type: 'DUPLICATE_NODE_ID',
          message: `Duplicate node ID: ${node.id}`,
          severity: 'error',
        });
      }
      nodeIds.add(node.id);
    }

    // Check for wires referencing non-existent nodes
    for (let i = 0; i < cartridge.wires.length; i++) {
      const wire = cartridge.wires[i];
      const fromExists = cartridge.nodes.some(n => n.id === wire.from);
      const toExists = cartridge.nodes.some(n => n.id === wire.to);

      if (!fromExists) {
        errors.push({
          type: 'WIRE_SOURCE_NOT_FOUND',
          message: `Wire ${i}: source node "${wire.from}" not found`,
          location: { wireIndex: i },
          severity: 'error',
        });
      }
      if (!toExists) {
        errors.push({
          type: 'WIRE_TARGET_NOT_FOUND',
          message: `Wire ${i}: target node "${wire.to}" not found`,
          location: { wireIndex: i },
          severity: 'error',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Build signal flow graph
   */
  private buildSignalFlowGraph(cartridge: Cartridge): SignalFlowGraph {
    const nodes: SignalFlowNode[] = cartridge.nodes.map(n => ({
      id: n.id,
      type: n.type,
      label: `${n.id} (${n.type})`,
    }));

    const edges: SignalFlowEdge[] = cartridge.wires.map(w => ({
      from: w.from,
      to: w.to,
      signalType: w.signalType,
      label: w.signalType,
    }));

    return { nodes, edges };
  }

  /**
   * Build summary string
   */
  private buildSummary(
    passed: boolean,
    errors: SimulationError[],
    warnings: SimulationWarning[],
    scenarios?: ScenarioResult[]
  ): string {
    const parts: string[] = [];

    if (passed) {
      parts.push('Simulation passed');
    } else {
      parts.push('Simulation failed');
    }

    const errorCount = errors.filter(e => e.severity === 'error').length;
    if (errorCount > 0) {
      parts.push(`${errorCount} error(s)`);
    }

    if (warnings.length > 0) {
      parts.push(`${warnings.length} warning(s)`);
    }

    if (scenarios) {
      const passedScenarios = scenarios.filter(s => s.passed).length;
      parts.push(`${passedScenarios}/${scenarios.length} scenarios passed`);
    }

    return parts.join('. ') + '.';
  }

  validateParams(params: unknown): params is SimulationRequest {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.cartridgePath === 'string';
  }
}

/**
 * Factory function to create a SimulateModificationTool instance
 */
export function createSimulateModificationTool(): SimulateModificationTool {
  return new SimulateModificationTool();
}
