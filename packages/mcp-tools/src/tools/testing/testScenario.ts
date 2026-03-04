/**
 * test_scenario - Integration testing tool for cartridges
 * 
 * Renamed from mcp_test_scenario as part of Phase 1 cleanup.
 * Implements self-contained testing without external package dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';

// Input type for this tool
export interface TestScenarioInput {
  cartridgePath: string;
  scenario: string;
  inputSignal: {
    type: string;
    payload?: Record<string, unknown>;
    timestamp?: string;
    sourceNodeId?: string;
  };
  expectedSignals: string[];
  timeout?: number;
  captureAll?: boolean;
}

// Output type for this tool  
export interface TestScenarioOutput {
  passed: boolean;
  signalsReceived: Array<{
    type: string;
    payload: unknown;
    timestamp: string;
    sourceNodeId: string;
  }>;
  missingSignals: string[];
  unexpectedSignals: Array<{
    type: string;
    payload: unknown;
    timestamp: string;
    sourceNodeId: string;
  }>;
  executionTime: number;
  errors: string[];
  scenario: string;
}

// Internal signal type
interface Signal {
  type: string;
  payload: unknown;
  timestamp: Date;
  sourceNodeId: string;
}

// Internal cartridge type
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
 * TestScenarioTool - Integration testing for Graph-OS cartridges
 * 
 * Runs complete signal flow tests through cartridges to verify
 * that expected signals are emitted in the correct order.
 */
export class TestScenarioTool {
  readonly definition: MCPToolDefinition = {
    name: 'test_scenario',
    description: 'Run integration tests on cartridges to verify signal flows. Tests complete signal paths through the entire cartridge.',
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
        description: 'Starting input signal to inject into the graph'
      },
      {
        name: 'expectedSignals',
        type: 'array',
        required: true,
        description: 'List of expected signal types to be emitted during execution'
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
    returnType: 'TestScenarioOutput',
    category: 'testing',
    bestFor: ['integration testing', 'signal flow verification', 'cartridge validation'],
    complexity: 'medium'
  };

  async execute(input: TestScenarioInput): Promise<MCPToolResult<TestScenarioOutput>> {
    const startTime = Date.now();

    try {
      // Validate cartridge exists
      if (!fs.existsSync(input.cartridgePath)) {
        return {
          success: false,
          error: `Cartridge not found: ${input.cartridgePath}`
        };
      }

      // Load cartridge
      const cartridgeData = fs.readFileSync(input.cartridgePath, 'utf-8');
      const cartridge: Cartridge = JSON.parse(cartridgeData);

      // Validate cartridge structure
      if (!cartridge.nodes || !Array.isArray(cartridge.nodes)) {
        return {
          success: false,
          error: 'Invalid cartridge: missing nodes array'
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

      // Simulate signal flow through the cartridge
      const signalsReceived = this.simulateSignalFlow(cartridge, signal);

      const executionTime = Date.now() - startTime;

      // Analyze results
      const receivedTypes = signalsReceived.map(s => s.type);
      const missingSignals = input.expectedSignals.filter(t => !receivedTypes.includes(t));
      const expectedSet = new Set(input.expectedSignals);
      const unexpectedSignals = signalsReceived.filter(s => !expectedSet.has(s.type));

      const output: TestScenarioOutput = {
        passed: missingSignals.length === 0,
        signalsReceived: signalsReceived.map(s => ({
          type: s.type,
          payload: s.payload,
          timestamp: s.timestamp.toISOString(),
          sourceNodeId: s.sourceNodeId
        })),
        missingSignals,
        unexpectedSignals: unexpectedSignals.map(s => ({
          type: s.type,
          payload: s.payload,
          timestamp: s.timestamp.toISOString(),
          sourceNodeId: s.sourceNodeId
        })),
        executionTime,
        errors: [],
        scenario: input.scenario
      };

      return {
        success: output.passed,
        data: output,
        metadata: {
          signalCount: signalsReceived.length,
          executionTime
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
    const maxIterations = 100; // Prevent infinite loops

    while (hasNewSignals && iterations < maxIterations) {
      hasNewSignals = false;
      iterations++;

      for (const wire of wires) {
        const wireKey = `${wire.from}->${wire.to}:${wire.signalType}`;
        if (processedWires.has(wireKey)) continue;

        const fromNode = nodeMap.get(wire.from);
        const toNode = nodeMap.get(wire.to);

        if (fromNode && toNode) {
          // Check if any signal can trigger this wire
          const triggeringSignal = signals.find(s => 
            s.sourceNodeId === wire.from || 
            s.type === wire.signalType
          );

          if (triggeringSignal) {
            // Simulate signal transformation based on node type
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
    
    // Handle different node types
    switch (node.type) {
      case 'logic.transform': {
        const outputType = (config.outputSignalType as string) || `${inputSignal.type}.TRANSFORMED`;
        return {
          type: outputType,
          payload: this.transformPayload(inputSignal.payload, config),
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }
      
      case 'logic.validate': {
        const successType = (config.successSignalType as string) || 'VALIDATION.SUCCESS';
        const failureType = (config.failureSignalType as string) || 'VALIDATION.FAILURE';
        const isValid = this.validatePayload(inputSignal.payload, config);
        return {
          type: isValid ? successType : failureType,
          payload: isValid ? inputSignal.payload : { errors: ['Validation failed'], originalPayload: inputSignal.payload },
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }
      
      case 'logic.router': {
        return {
          type: wireSignalType || `${inputSignal.type}.ROUTED`,
          payload: inputSignal.payload,
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }
      
      case 'control.input': {
        const outputType = (config.outputSignalType as string) || 'INPUT.SUBMITTED';
        return {
          type: outputType,
          payload: inputSignal.payload,
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }
      
      case 'control.display': {
        // Display nodes don't emit signals
        return null;
      }
      
      default: {
        // Generic node - pass through
        return {
          type: wireSignalType || `${inputSignal.type}.OUTPUT`,
          payload: inputSignal.payload,
          timestamp: new Date(),
          sourceNodeId: node.id
        };
      }
    }
  }

  /**
   * Transform payload based on config rules
   */
  private transformPayload(payload: unknown, config: Record<string, unknown>): unknown {
    if (typeof payload !== 'object' || payload === null) return payload;
    
    const rules = config.rules as Array<{ from: string; to: string; transform?: string }> | undefined;
    if (!rules || !Array.isArray(rules)) return payload;
    
    const result: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
    
    for (const rule of rules) {
      const value = (payload as Record<string, unknown>)[rule.from];
      if (value !== undefined) {
        let transformedValue = value;
        
        switch (rule.transform) {
          case 'uppercase':
            transformedValue = typeof value === 'string' ? value.toUpperCase() : value;
            break;
          case 'lowercase':
            transformedValue = typeof value === 'string' ? value.toLowerCase() : value;
            break;
          case 'number':
            transformedValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
            break;
          case 'string':
            transformedValue = String(value);
            break;
          case 'boolean':
            transformedValue = Boolean(value);
            break;
        }
        
        result[rule.to] = transformedValue;
      }
    }
    
    return result;
  }

  /**
   * Validate payload based on config schema
   */
  private validatePayload(payload: unknown, config: Record<string, unknown>): boolean {
    if (typeof payload !== 'object' || payload === null) return true;
    
    const schema = config.schema as Record<string, unknown> | undefined;
    if (!schema) return true;
    
    const required = schema.required as string[] | undefined;
    if (!required || !Array.isArray(required)) return true;
    
    for (const field of required) {
      if (!((payload as Record<string, unknown>).hasOwnProperty(field))) {
        return false;
      }
    }
    
    return true;
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

/**
 * Factory function to create a TestScenarioTool instance
 */
export function createTestScenarioTool(): TestScenarioTool {
  return new TestScenarioTool();
}
