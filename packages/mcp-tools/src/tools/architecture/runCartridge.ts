/**
 * Run Cartridge MCP Tool
 * 
 * Loads and executes a cartridge using the real Graph-OS runtime.
 * This provides high-fidelity execution matching the actual application behavior.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult } from '../../core/MCPTool';
import {
  GraphRuntime,
  createRuntime,
  RuntimeCreateOptions,
  registerBuiltInNodes,
  nodeFactory,
  SignalBus,
  Logger,
} from '@graph-os/runtime';
import type { Signal, Cartridge } from '@graph-os/core';

interface RunCartridgeParams {
  /** Path to cartridge file */
  cartridgePath: string;
  /** Initial signal to inject */
  inputSignal?: {
    type: string;
    payload: unknown;
  };
  /** Path to signal registry */
  signalRegistryPath?: string;
  /** Whether to run in interactive mode */
  interactive?: boolean;
  /** Run in debug mode to generate a trace report */
  debug?: boolean;
}

interface RunCartridgeResult {
  /** Whether execution was successful */
  success: boolean;
  /** Cartridge name */
  cartridgeName: string;
  /** Number of nodes initialized */
  nodeCount: number;
  /** Number of wires connected */
  wireCount: number;
  /** Signals processed */
  signalsProcessed: number;
  /** Output signals emitted */
  signalsEmitted: number;
  /** Final state of the graph */
  finalState: 'completed' | 'waiting' | 'error';
  /** Any errors encountered */
  errors: string[];
  /** Signal history */
  signalHistory: Array<{
    type: string;
    sourceNodeId: string;
    timestamp: string;
    payload?: unknown;
  }>;
  /** Node types that were actually used */
  nodeTypesUsed: string[];
  /** Unknown node types encountered */
  unknownNodeTypes: string[];
  /** Execution trace log if debug mode is enabled */
  trace?: string[];
  /** Formatted execution trace report */
  debugLog?: string;
}

/**
 * Tool for running cartridges using the real Graph-OS runtime.
 * 
 * This tool uses the actual GraphRuntime engine, ensuring that cartridges
 * behave identically during development and production execution.
 */
export class RunCartridgeTool extends BaseMCPTool<RunCartridgeParams, RunCartridgeResult> {
  definition: MCPToolDefinition = {
    name: 'run_cartridge',
    description: 'Loads and executes a Graph-OS cartridge using the real runtime engine. Provides high-fidelity execution matching production behavior.',
    parameters: [
      {
        name: 'cartridgePath',
        type: 'string',
        required: true,
        description: 'Path to the cartridge file to run',
      },
      {
        name: 'inputSignal',
        type: 'object',
        required: false,
        description: 'Initial signal to inject into the graph',
      },
      {
        name: 'signalRegistryPath',
        type: 'string',
        required: false,
        description: 'Path to signal registry file (optional, for validation)',
      },
      {
        name: 'interactive',
        type: 'boolean',
        required: false,
        description: 'Run in interactive mode (for CLI)',
      },
      {
        name: 'debug',
        type: 'boolean',
        required: false,
        description: 'Generate a detailed execution trace report',
      },
    ],
    returnType: 'RunCartridgeResult',
    category: 'architecture',
    bestFor: ['runtime execution', 'testing', 'development', 'debugging', 'signal flow'],
    complexity: 'low'
  };

  async execute(params: RunCartridgeParams): Promise<MCPToolResult<RunCartridgeResult>> {
    const errors: string[] = [];
    const trace: string[] = [];
    const signalHistory: Array<{
      type: string;
      sourceNodeId: string;
      timestamp: string;
      payload?: unknown;
    }> = [];
    const unknownNodeTypes: string[] = [];
    const nodeTypesUsed: string[] = [];

    let runtime: GraphRuntime | null = null;

    try {
      const fs = await import('fs');
      const path = await import('path');

      // Load cartridge file
      if (!fs.existsSync(params.cartridgePath)) {
        return this.failure(`Cartridge file not found: ${params.cartridgePath}`);
      }

      const cartridgeContent = fs.readFileSync(params.cartridgePath, 'utf-8');
      const cartridge: Cartridge = JSON.parse(cartridgeContent);

      // Detect node types in cartridge
      const nodeTypes = new Set<string>();
      for (const node of cartridge.nodes || []) {
        nodeTypes.add(node.type);
      }

      // Create runtime with real engine
      const logger = new Logger({ level: 'debug', prefix: 'mcp-run' });

      // Ensure built-ins are registered on the global singleton
      registerBuiltInNodes(nodeFactory);

      // Check for unknown node types
      const registeredTypes = nodeFactory.getRegisteredTypes();
      for (const nodeType of nodeTypes) {
        if (registeredTypes.includes(nodeType)) {
          nodeTypesUsed.push(nodeType);
        } else {
          unknownNodeTypes.push(nodeType);
          errors.push(`Unknown node type: ${nodeType}. Registered types: ${registeredTypes.join(', ')}`);
        }
      }

      // If there are unknown node types, we still try to run but report the issue
      if (unknownNodeTypes.length > 0 && errors.length === unknownNodeTypes.length) {
        // All node types are unknown, cannot proceed
        return this.failure(
          `Cannot run cartridge: All node types are unknown. ` +
          `Unknown: ${unknownNodeTypes.join(', ')}. ` +
          `Available: ${registeredTypes.join(', ')}`
        );
      }

      // Create runtime
      runtime = await createRuntime({
        cartridge: cartridge,
        options: { debug: true },
        logger,
        nodeFactory: nodeFactory
      });

      // Set up signal capture
      const signalBus = runtime.getSignalBus();
      let signalsProcessed = 0;
      let signalsEmitted = 0;

      // Subscribe to all signals for history
      signalBus.subscribe('*', (signal: Signal) => {
        signalHistory.push({
          type: signal.type,
          sourceNodeId: signal.sourceNodeId,
          timestamp: signal.timestamp.toISOString(),
          payload: signal.payload,
        });
        if (params.debug) {
          trace.push(`[SIGNAL] Type: ${signal.type} | Payload: ${JSON.stringify(signal.payload)} | Source: ${signal.sourceNodeId}`);
        }
        signalsEmitted++;
      });

      // Track runtime events
      runtime.on('signal:received', () => {
        signalsProcessed++;
      });

      runtime.on('node:processed', (event) => {
        if (params.debug) {
          const data = event.data as { nodeId: string; signalType: string };
          trace.push(`[EXEC] Node: ${data.nodeId} | Action: Processed signal ${data.signalType}`);
        }
      });

      runtime.on('node:error', (event) => {
        const data = event.data as { nodeId: string; error: Error };
        errors.push(`Node ${data.nodeId} error: ${data.error.message}`);
        if (params.debug) {
          trace.push(`[ERROR] Node: ${data.nodeId} | Message: ${data.error.message}`);
        }
      });

      runtime.on('runtime:error', (event) => {
        const data = event.data as { error: Error };
        errors.push(`Runtime error: ${data.error.message}`);
      });

      // Start runtime
      await runtime.start();

      // Inject initial signal if provided
      const inputSignalData = params.inputSignal;
      if (inputSignalData) {
        const inputNodes = (cartridge.nodes || []).filter(n => n.type === 'control.input');
        if (inputNodes.length > 0) {
          // Find the input node configured to emit this signal type
          const sourceNode = inputNodes.find(n =>
            n.config?.outputSignalType === inputSignalData.type
          ) || inputNodes[0]; // Fallback to first if no match

          const inputSignal: Signal = {
            type: inputSignalData.type,
            payload: inputSignalData.payload,
            timestamp: new Date(),
            sourceNodeId: sourceNode.id,
          };
          await runtime.sendSignal(inputSignal);
        } else {
          // Emit directly if no input node
          await runtime.emit(inputSignalData.type, inputSignalData.payload);
        }
      }

      // Wait for signal processing to complete
      await this.waitForIdle(runtime, 5000);

      // Get final stats
      const stats = runtime.getStats();

      // Stop runtime
      await runtime.stop();

      const traceOutput = params.debug && trace.length > 0
        ? '\n\nExecution Trace:\n' + trace.map((t, i) => `${i + 1}. ${t}`).join('\n')
        : undefined;

      return this.success({
        success: errors.length === 0 || errors.length === unknownNodeTypes.length,
        cartridgeName: cartridge.name || 'unnamed',
        nodeCount: stats.nodeCount,
        wireCount: stats.wireCount,
        signalsProcessed,
        signalsEmitted,
        finalState: errors.length > unknownNodeTypes.length ? 'error' : 'completed',
        errors,
        signalHistory,
        nodeTypesUsed,
        unknownNodeTypes,
        trace: params.debug ? trace : undefined,
        debugLog: traceOutput,
      });

    } catch (error) {
      return this.failure(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clean up
      if (runtime) {
        try {
          await runtime.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Wait for runtime to become idle (no signals being processed).
   */
  private async waitForIdle(runtime: GraphRuntime, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const state = runtime.getState();
      if (state !== 'running') {
        break;
      }
      // Check if signal queue is empty by looking at stats
      const stats = runtime.getStats();
      if (stats.signalsProcessed > 0) {
        // Give a small buffer for signal propagation
        await new Promise(resolve => setTimeout(resolve, 100));
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}
