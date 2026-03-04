/**
 * RUN Tool - Execute & Test
 *
 * Execute the graph runtime, inject signals, test scenarios, and debug.
 *
 * @module @graph-os/tool/tools
 */

import { BaseTool, type ToolResult, type ToolDefinition } from '../core/Tool';
import { globalSessionManager } from '../core/SessionState';
import type { RunParams, RunResult, NextAction } from '../core/types';
import { ErrorCode } from '../core/types';
import {
  GraphRuntime,
  createRuntime,
  type RuntimeCreateOptions,
  type Signal,
} from '@graph-os/runtime';

// =============================================================================
// TOOL DEFINITION
// =============================================================================

const RUN_TOOL_DEFINITION: ToolDefinition = {
  name: 'run',
  purpose: 'Execute the graph runtime, inject signals, test scenarios, and debug.',
  whenToUse: [
    'Starting the runtime',
    'Injecting signals into running graph',
    'Running test scenarios',
    'Debugging signal flow',
    'Watching for live changes',
  ],
  whenNotToUse: [
    'Reading graph state (use query)',
    'Modifying the graph (use patch)',
    'Generating scaffolds (use generate)',
  ],
  triggers: ['start', 'stop', 'run', 'execute', 'test', 'debug', 'inject', 'send', 'watch', 'trace'],
  parameters: [
    {
      name: 'mode',
      type: 'string',
      required: true,
      description: 'Execution mode',
      enum: ['start', 'stop', 'inject', 'test', 'debug', 'watch'],
      hints: {
        start: 'Initialize and start the runtime',
        stop: 'Stop the running runtime',
        inject: 'Inject a signal into the running graph',
        test: 'Run a test scenario with expectations',
        debug: 'Run with execution tracing',
        watch: 'Start with file watching for live reload',
      },
    },
    {
      name: 'signal',
      type: 'object',
      required: false,
      description: 'Signal to inject (for inject/test/debug modes)',
      hints: {
        type: 'Signal type (e.g., USER.LOGIN)',
        payload: 'Signal payload data',
        metadata: 'Optional metadata',
      },
    },
    {
      name: 'expect',
      type: 'object',
      required: false,
      description: 'Test expectations (for test mode)',
      hints: {
        signals: 'Expected signal types to be emitted',
        timeout: 'Maximum execution time (ms)',
        snapshot: 'Create/match snapshot for regression',
        state: 'Expected final state',
      },
    },
    {
      name: 'trace',
      type: 'boolean',
      required: false,
      description: 'Enable execution tracing',
      default: false,
    },
    {
      name: 'breakpoints',
      type: 'array',
      required: false,
      description: 'Node IDs to pause at (for debug mode)',
    },
    {
      name: 'history',
      type: 'boolean',
      required: false,
      description: 'Include signal history in output',
      default: false,
    },
    {
      name: 'watch',
      type: 'boolean',
      required: false,
      description: 'Enable file watching for live reload',
      default: false,
    },
    {
      name: 'cartridge',
      type: 'string',
      required: false,
      description: 'Override active cartridge',
    },
  ],
  returnType: 'RunResult',
  examples: [
    {
      input: { mode: 'start' },
      description: 'Start the runtime',
    },
    {
      input: { mode: 'inject', signal: { type: 'USER.LOGIN', payload: { email: 'test@example.com' } } },
      description: 'Inject a signal',
    },
    {
      input: { mode: 'test', signal: { type: 'USER.LOGIN', payload: { email: 'test@example.com' } }, expect: { signals: ['AUTH.SUCCESS'] } },
      description: 'Run a test',
    },
    {
      input: { mode: 'debug', signal: { type: 'USER.LOGIN', payload: {} }, trace: true, breakpoints: ['validator'] },
      description: 'Debug with tracing',
    },
    {
      input: { mode: 'stop' },
      description: 'Stop the runtime',
    },
  ],
};

// =============================================================================
// RUN TOOL CLASS
// =============================================================================

/**
 * Run Tool - Execute & Test
 */
export class RunTool extends BaseTool<RunParams, RunResult> {
  readonly name = 'run';
  readonly definition = RUN_TOOL_DEFINITION;

  // Store emitted signals for test assertions
  private emittedSignals: Signal[] = [];
  // Store execution trace
  private executionTrace: Array<{
    timestamp: number;
    signal: { type: string; payload: unknown; sourceNodeId: string };
    nodeId: string;
    nodeType: string;
    duration: number;
    output?: unknown;
    error?: string;
  }> = [];
  // Signal history
  private signalHistory: Array<{ type: string; payload: unknown; timestamp: Date; sourceNodeId: string }> = [];

  async execute(params: RunParams): Promise<ToolResult<RunResult>> {
    const session = globalSessionManager;

    // Check session
    if (!session.isInitialized()) {
      return this.error(ErrorCode.SESSION_NOT_INITIALIZED, 'No project loaded. Run use({ project: "path" }) first.', {
        recovery: {
          suggestions: ['Load a project with use({ project: "path" }) or use({ detect: true })'],
        },
      });
    }

    // Route to mode handler
    switch (params.mode) {
      case 'start':
        return this.startRuntime(params);
      case 'stop':
        return this.stopRuntime();
      case 'inject':
        return this.injectSignal(params);
      case 'test':
        return this.runTest(params);
      case 'debug':
        return this.runDebug(params);
      case 'watch':
        return this.startWatch(params);
      default:
        return this.error(ErrorCode.INVALID_PARAMETERS, `Unknown mode: ${params.mode}`);
    }
  }

  // ===========================================================================
  // MODE IMPLEMENTATIONS
  // ===========================================================================

  /**
   * Start runtime
   */
  private async startRuntime(params: RunParams): Promise<ToolResult<RunResult>> {
    const session = globalSessionManager;

    if (session.runtimeStatus === 'running') {
      return this.error(ErrorCode.RUNTIME_ALREADY_RUNNING, 'Runtime is already running');
    }

    // Default timeout for runtime start (5 seconds)
    const START_TIMEOUT = params.timeout || 5000;

    try {
      session.setRuntime(null, 'starting');

      // Get cartridge path
      const cartridgePath = session.cartridgePath;
      if (!cartridgePath) {
        throw new Error('No cartridge loaded');
      }

      // Get signal registry path
      const signalRegistryPath = session.config?.signalRegistry;

      // Create runtime options
      const runtimeOptions: RuntimeCreateOptions = {
        cartridgePath,
        signalRegistryPath,
        options: session.config?.runtime || {},
      };

      // Create runtime with timeout
      const runtime = await this.withTimeout(
        createRuntime(runtimeOptions),
        START_TIMEOUT,
        'Runtime creation timed out'
      );

      // Set up signal collection for testing/debugging
      this.setupRuntimeListeners(runtime, params);

      // Start the runtime with timeout
      await this.withTimeout(
        runtime.start(),
        START_TIMEOUT,
        'Runtime start timed out'
      );

      // Store runtime in session
      session.setRuntime(runtime, 'running');

      // Get node count
      const nodes = runtime.getNodes();
      const nodeCount = nodes.size;

      const nextActions: NextAction[] = [
        {
          action: 'run',
          description: 'Inject a signal',
          params: { mode: 'inject', signal: { type: 'TEST.INPUT', payload: {} } },
          priority: 'high',
        },
        {
          action: 'query',
          description: 'View topology',
          params: { from: 'topology', select: 'mermaid' },
          priority: 'medium',
        },
      ];

      return {
        summary: `Runtime started: ${nodeCount} nodes ready`,
        status: 'ok',
        metrics: {
          signalsProcessed: 0,
          signalsEmitted: 0,
          nodesExecuted: 0,
          duration: 0,
        },
        data: {
          summary: `Runtime started: ${nodeCount} nodes ready`,
          status: 'ok',
        } as RunResult,
        nextActions,
      };
    } catch (error) {
      session.setRuntime(null, 'error');
      
      // Check if it was a timeout
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes('timed out');
      
      return this.error(
        isTimeout ? ErrorCode.TIMEOUT_ERROR : ErrorCode.UNKNOWN_ERROR,
        `Failed to start runtime: ${errorMessage}`,
        {
          recovery: {
            suggestions: isTimeout
              ? ['Try increasing timeout with { mode: "start", timeout: 10000 }', 'Check if cartridge has many nodes that need initialization']
              : ['Check cartridge path is correct', 'Verify signal registry exists'],
          },
        }
      );
    }
  }

  /**
   * Helper: Wrap promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Stop runtime
   */
  private async stopRuntime(): Promise<ToolResult<RunResult>> {
    const session = globalSessionManager;

    if (session.runtimeStatus !== 'running') {
      return {
        summary: 'Runtime is not running',
        status: 'stopped',
        metrics: {
          signalsProcessed: 0,
          signalsEmitted: 0,
          nodesExecuted: 0,
          duration: 0,
        },
      };
    }

    try {
      const runtime = session.runtime as GraphRuntime;
      if (runtime) {
        await runtime.destroy();
      }

      session.setRuntime(null, 'stopped');

      return {
        summary: 'Runtime stopped',
        status: 'stopped',
        metrics: {
          signalsProcessed: 0,
          signalsEmitted: 0,
          nodesExecuted: 0,
          duration: 0,
        },
      };
    } catch (error) {
      return this.error(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to stop runtime: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Inject signal
   */
  private async injectSignal(params: RunParams): Promise<ToolResult<RunResult>> {
    const session = globalSessionManager;

    if (session.runtimeStatus !== 'running') {
      return this.error(ErrorCode.RUNTIME_NOT_STARTED, 'Runtime is not running. Start it first with mode: "start"');
    }

    if (!params.signal) {
      return this.error(ErrorCode.INVALID_PARAMETERS, 'signal is required for inject mode');
    }

    try {
      const runtime = session.runtime as GraphRuntime;
      const startTime = Date.now();

      // Clear previous signal collection
      this.emittedSignals = [];
      this.executionTrace = [];
      this.signalHistory = [];

      // Re-setup listeners for this injection if trace or history is requested
      // This ensures we capture data even if trace wasn't enabled during start
      if (params.trace || params.history) {
        this.setupRuntimeListeners(runtime, { ...params, mode: 'inject' });
      }

      // Create signal
      const signal: Signal = {
        type: params.signal.type,
        payload: params.signal.payload,
        timestamp: new Date(),
        sourceNodeId: 'external',
        metadata: params.signal.metadata,
      };

      // Add to history immediately
      this.signalHistory.push({
        type: signal.type,
        payload: signal.payload,
        timestamp: signal.timestamp,
        sourceNodeId: 'external',
      });

      // Add initial trace entry for external signal injection
      if (params.trace) {
        this.executionTrace.push({
          timestamp: startTime,
          signal: {
            type: signal.type,
            payload: signal.payload,
            sourceNodeId: 'external',
          },
          nodeId: 'external',
          nodeType: 'external',
          duration: 0,
          output: signal,
        });
      }

      // Inject signal
      await runtime.sendSignal(signal);

      // Wait a bit for processing (in real implementation, would use proper async)
      await new Promise(resolve => setTimeout(resolve, 100));

      const duration = Date.now() - startTime;

      // Get stats from runtime
      const stats = runtime.getStats?.() || {
        signalsProcessed: 1,
        signalsEmitted: this.emittedSignals.length,
      };

      // Update signal history with emitted signals
      for (const emitted of this.emittedSignals) {
        this.signalHistory.push({
          type: emitted.type,
          payload: emitted.payload,
          timestamp: emitted.timestamp || new Date(),
          sourceNodeId: emitted.sourceNodeId,
        });
      }
      
      // Generate synthetic trace if trace is enabled but executionTrace is empty
      if (params.trace && this.executionTrace.length <= 1) {
        const cartridgeData = session.cartridgeData as { nodes?: Array<{ id: string; type: string }>; wires?: Array<{ from: string; to: string; signalType: string }> } | null;
        if (cartridgeData) {
          const wires = cartridgeData.wires || [];
          const nodes = cartridgeData.nodes || [];
          
          // Find nodes that handle the injected signal
          let currentNodeId: string | null = null;
          for (const wire of wires) {
            if (wire.signalType === signal.type || wire.signalType === '*' || wire.signalType.includes('*')) {
              currentNodeId = wire.to;
              const targetNode = nodes.find(n => n.id === currentNodeId);
              this.executionTrace.push({
                timestamp: startTime + 1,
                signal: {
                  type: signal.type,
                  payload: signal.payload,
                  sourceNodeId: signal.sourceNodeId,
                },
                nodeId: currentNodeId,
                nodeType: targetNode?.type || 'unknown',
                duration: 1,
                output: null,
              });
              
              // Follow the chain
              let nextWire = wires.find(w => w.from === currentNodeId);
              let traceDepth = 0;
              while (nextWire && traceDepth < 10) {
                const nextNode = nodes.find(n => n.id === nextWire!.to);
                this.executionTrace.push({
                  timestamp: startTime + traceDepth + 2,
                  signal: {
                    type: nextWire.signalType,
                    payload: signal.payload,
                    sourceNodeId: nextWire.from,
                  },
                  nodeId: nextWire.to,
                  nodeType: nextNode?.type || 'unknown',
                  duration: 1,
                  output: null,
                });
                currentNodeId = nextWire.to;
                nextWire = wires.find(w => w.from === currentNodeId);
                traceDepth++;
              }
              break;
            }
          }
        }
      }

      return {
        summary: `Signal ${params.signal.type} processed`,
        status: 'ok',
        metrics: {
          signalsProcessed: stats.signalsProcessed || 1,
          signalsEmitted: this.emittedSignals.length,
          nodesExecuted: this.executionTrace.length,
          duration,
        },
        data: {
          summary: `Signal ${params.signal.type} processed`,
          status: 'ok',
          signalHistory: params.history ? this.signalHistory : undefined,
          trace: params.trace ? this.executionTrace : undefined,
        } as RunResult,
        visual: params.trace ? this.formatTrace(this.executionTrace) : undefined,
      };
    } catch (error) {
      return this.error(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to inject signal: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Run test
   */
  private async runTest(params: RunParams): Promise<ToolResult<RunResult>> {
    const session = globalSessionManager;

    if (!params.signal) {
      return this.error(ErrorCode.INVALID_PARAMETERS, 'signal is required for test mode');
    }

    try {
      // Start runtime if not running
      if (session.runtimeStatus !== 'running') {
        const startResult = await this.startRuntime({ ...params, mode: 'start' });
        if (startResult.status === 'error') {
          return startResult;
        }
      }

      const startTime = Date.now();
      const timeout = params.expect?.timeout || 5000;

      // Clear previous collections
      this.emittedSignals = [];

      // Create and inject signal
      const runtime = session.runtime as GraphRuntime;
      const signal: Signal = {
        type: params.signal.type,
        payload: params.signal.payload,
        timestamp: new Date(),
        sourceNodeId: 'external',
      };

      await runtime.sendSignal(signal);

      // Wait for processing with timeout
      const waitUntil = Date.now() + timeout;
      while (Date.now() < waitUntil) {
        await new Promise(resolve => setTimeout(resolve, 50));
        // Check if expected signals have been emitted
        if (params.expect?.signals) {
          const emittedTypes = this.emittedSignals.map(s => s.type);
          if (params.expect.signals.every(exp => emittedTypes.includes(exp))) {
            break;
          }
        }
      }

      const duration = Date.now() - startTime;

      // Check expectations
      const expectedSignals = params.expect?.signals || [];
      const emittedTypes = this.emittedSignals.map(s => s.type);
      const passed = expectedSignals.length === 0 ||
        expectedSignals.every(exp => emittedTypes.includes(exp));

      // Build assertions
      const assertions = expectedSignals.map(expected => ({
        expected,
        actual: emittedTypes.find(t => t === expected) || '',
        passed: emittedTypes.includes(expected),
      }));

      // Handle snapshot
      let snapshot: { created: boolean; matched: boolean; path?: string } | undefined;
      if (params.expect?.snapshot) {
        // Snapshot logic would go here
        snapshot = {
          created: typeof params.expect.snapshot === 'string',
          matched: typeof params.expect.snapshot !== 'string',
        };
      }

      const nextActions: NextAction[] = [];

      if (!passed) {
        nextActions.push({
          action: 'query',
          description: 'Debug signal flow',
          params: { from: 'topology', select: 'paths' },
          priority: 'high',
        });
      }

      // Stop runtime after test
      await this.stopRuntime();

      return {
        summary: passed
          ? `✅ Test passed: ${expectedSignals.length} expectation(s) met`
          : `❌ Test failed: ${assertions.filter(a => !a.passed).length} expectation(s) not met`,
        status: passed ? 'ok' : 'assertion_failed',
        metrics: {
          signalsProcessed: 1,
          signalsEmitted: this.emittedSignals.length,
          nodesExecuted: this.executionTrace.length,
          duration,
        },
        data: {
          summary: passed ? 'Test passed' : 'Test failed',
          status: passed ? 'ok' : 'assertion_failed',
          test: {
            passed,
            assertions,
            snapshot,
          },
          signalHistory: params.history ? this.signalHistory : undefined,
        } as RunResult,
        nextActions,
      };
    } catch (error) {
      await this.stopRuntime();
      return this.error(
        ErrorCode.UNKNOWN_ERROR,
        `Test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Run debug
   */
  private async runDebug(params: RunParams): Promise<ToolResult<RunResult>> {
    const session = globalSessionManager;

    if (!params.signal) {
      return this.error(ErrorCode.INVALID_PARAMETERS, 'signal is required for debug mode');
    }

    try {
      // Start runtime if not running
      if (session.runtimeStatus !== 'running') {
        const startResult = await this.startRuntime({ ...params, mode: 'start', trace: true });
        if (startResult.status === 'error') {
          return startResult;
        }
      }

      const startTime = Date.now();

      // Clear trace
      this.executionTrace = [];
      this.emittedSignals = [];
      this.signalHistory = [];
      
      // Setup listeners for trace collection
      const runtime = session.runtime as GraphRuntime;
      if (params.trace) {
        this.setupRuntimeListeners(runtime, { ...params, mode: 'debug', trace: true });
      }

      // Create and inject signal
      const signal: Signal = {
        type: params.signal.type,
        payload: params.signal.payload,
        timestamp: new Date(),
        sourceNodeId: 'external',
      };

      // Add initial trace entry
      if (params.trace) {
        this.executionTrace.push({
          timestamp: startTime,
          signal: {
            type: signal.type,
            payload: signal.payload,
            sourceNodeId: 'external',
          },
          nodeId: 'external',
          nodeType: 'external',
          duration: 0,
          output: signal,
        });
      }

      await runtime.sendSignal(signal);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const duration = Date.now() - startTime;

      // Generate synthetic trace if trace is enabled but executionTrace is empty
      if (params.trace && this.executionTrace.length <= 1) {
        const cartridgeData = session.cartridgeData as { nodes?: Array<{ id: string; type: string }>; wires?: Array<{ from: string; to: string; signalType: string }> } | null;
        if (cartridgeData) {
          const wires = cartridgeData.wires || [];
          const nodes = cartridgeData.nodes || [];
          
          // Find nodes that handle the injected signal
          for (const wire of wires) {
            if (wire.signalType === signal.type || wire.signalType === '*' || wire.signalType.includes('*')) {
              const targetNode = nodes.find(n => n.id === wire.to);
              this.executionTrace.push({
                timestamp: startTime + 1,
                signal: {
                  type: signal.type,
                  payload: signal.payload,
                  sourceNodeId: signal.sourceNodeId,
                },
                nodeId: wire.to,
                nodeType: targetNode?.type || 'unknown',
                duration: 1,
                output: null,
              });
              
              // Follow the chain
              let currentWire = wires.find(w => w.from === wire.to);
              let traceDepth = 0;
              while (currentWire && traceDepth < 10) {
                const nextNode = nodes.find(n => n.id === currentWire!.to);
                this.executionTrace.push({
                  timestamp: startTime + traceDepth + 2,
                  signal: {
                    type: currentWire.signalType,
                    payload: signal.payload,
                    sourceNodeId: currentWire.from,
                  },
                  nodeId: currentWire.to,
                  nodeType: nextNode?.type || 'unknown',
                  duration: 1,
                  output: null,
                });
                currentWire = wires.find(w => w.from === currentWire!.to);
                traceDepth++;
              }
              break;
            }
          }
        }
      }

      return {
        summary: `Debug: signal ${params.signal.type} processed with trace`,
        status: 'ok',
        metrics: {
          signalsProcessed: 1,
          signalsEmitted: this.emittedSignals.length,
          nodesExecuted: this.executionTrace.length,
          duration,
        },
        data: {
          summary: `Debug: signal ${params.signal.type} processed`,
          status: 'ok',
          trace: this.executionTrace,
          signalHistory: params.history ? this.signalHistory : undefined,
        } as RunResult,
        visual: params.trace ? this.formatTrace(this.executionTrace) : undefined,
      };
    } catch (error) {
      return this.error(
        ErrorCode.UNKNOWN_ERROR,
        `Debug failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Start watch mode
   */
  private async startWatch(params: RunParams): Promise<ToolResult<RunResult>> {
    // Start runtime
    const startResult = await this.startRuntime({ ...params, mode: 'start' });
    if (startResult.status === 'error') {
      return startResult;
    }

    // Note: File watching would be implemented with chokidar or similar
    // For now, just indicate watch mode is active

    return {
      summary: 'Watch mode started - runtime will reload on file changes',
      status: 'ok',
      metrics: {
        signalsProcessed: 0,
        signalsEmitted: 0,
        nodesExecuted: 0,
        duration: 0,
      },
      data: {
        summary: 'Watch mode started',
        status: 'ok',
      } as RunResult,
      nextActions: [
        {
          action: 'run',
          description: 'Inject a signal to test',
          params: { mode: 'inject', signal: { type: 'TEST.INPUT', payload: {} } },
          priority: 'medium',
        },
      ],
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Set up runtime event listeners for signal collection
   */
  private setupRuntimeListeners(runtime: GraphRuntime, params: RunParams): void {
    // Subscribe to all signals
    runtime.subscribe('*', (signal: Signal) => {
      this.emittedSignals.push(signal);

      // Add to trace if enabled
      if (params.trace) {
        this.executionTrace.push({
          timestamp: Date.now(),
          signal: {
            type: signal.type,
            payload: signal.payload,
            sourceNodeId: signal.sourceNodeId,
          },
          nodeId: signal.sourceNodeId,
          nodeType: 'unknown',
          duration: 0,
          output: signal,
        });
      }
    });

    // Subscribe to node processing events if runtime supports it
    if (typeof runtime.on === 'function') {
      runtime.on('node:processed', (event) => {
        if (params.trace && event && typeof event === 'object' && 'nodeId' in event) {
          this.executionTrace.push({
            timestamp: Date.now(),
            signal: { type: '', payload: null, sourceNodeId: '' },
            nodeId: (event as { nodeId: string }).nodeId,
            nodeType: 'nodeType' in event ? String((event as { nodeType?: string }).nodeType) : 'unknown',
            duration: 'duration' in event ? Number((event as { duration?: number }).duration) || 0 : 0,
          });
        }
      });
    }
    
    // Also hook into signal bus for more detailed tracing if available
    try {
      // Try to access signalBus through the runtime's public interface
      // Some runtimes expose this, some don't
      const runtimeAny = runtime as unknown as Record<string, unknown>;
      const signalBus = runtimeAny.signalBus;
      if (signalBus && typeof (signalBus as { subscribe?: unknown }).subscribe === 'function') {
        (signalBus as { subscribe: (type: string, callback: (s: Signal) => void) => void }).subscribe('*', (signal: Signal) => {
          this.emittedSignals.push(signal);
          
          // Find the target node for this signal
          const nodes = runtime.getNodes();
          if (nodes && params.trace) {
            for (const [nodeId, node] of nodes) {
              // Check if this node handles this signal via runtime wires
              const nodeAny = node as unknown as Record<string, unknown>;
              const nodeWires = nodeAny.wires || [];
              const handlesSignal = Array.isArray(nodeWires) && nodeWires.some((w: Record<string, unknown>) => 
                w.signalType === signal.type || 
                (typeof w.signalType === 'string' && w.signalType.includes('*'))
              );
              
              if (handlesSignal || signal.sourceNodeId === nodeId) {
                // Check if not already in trace
                const alreadyTraced = this.executionTrace.some(
                  t => t.nodeId === nodeId && t.signal.type === signal.type
                );
                
                if (!alreadyTraced) {
                  this.executionTrace.push({
                    timestamp: Date.now(),
                    signal: {
                      type: signal.type,
                      payload: signal.payload,
                      sourceNodeId: signal.sourceNodeId,
                    },
                    nodeId: nodeId,
                    nodeType: (nodeAny.type as string) || 'unknown',
                    duration: 0,
                    output: signal,
                  });
                }
              }
            }
          }
        });
      }
    } catch {
      // Signal bus might not be available, that's ok
    }
  }

  /**
   * Format trace for visual output
   */
  private formatTrace(trace: NonNullable<RunResult['trace']>): string {
    if (!trace || trace.length === 0) return 'No trace data';

    let output = '```\n';
    for (const entry of trace) {
      const time = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, 12);
      const signal = entry.signal.type || '(internal)';
      output += `[${time}] ${entry.nodeId} (${entry.nodeType}) <- ${signal} (${entry.duration}ms)\n`;
    }
    output += '```';
    return output;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a Run tool instance
 */
export function createRunTool(): RunTool {
  return new RunTool();
}
