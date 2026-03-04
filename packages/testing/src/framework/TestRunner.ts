/**
 * TestRunner - Executes tests against cartridges using the real runtime
 * 
 * Uses the actual GraphRuntime engine for high-fidelity testing.
 * Falls back to simulation only if runtime is unavailable.
 */

import * as fs from 'fs';
import type { Signal, TestRunnerConfig, Cartridge } from '../types';
import { SignalCapture } from './SignalCapture';

// Dynamic imports for runtime (may not be available in all environments)
let GraphRuntime: any = null;
let createRuntime: any = null;
let globalNodeRegistry: any = null;

async function loadRuntime(): Promise<boolean> {
  if (GraphRuntime) return true;

  try {
    // Try to load from built runtime package
    const runtimePath = require.resolve('@graph-os/runtime', { paths: [__dirname] });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const runtime = require(runtimePath);
    GraphRuntime = runtime.GraphRuntime;
    createRuntime = runtime.createRuntime;
    globalNodeRegistry = runtime.globalNodeRegistry;
    return true;
  } catch (e) {
    // Try direct path
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const runtime = require('../../../runtime/dist');
      GraphRuntime = runtime.GraphRuntime;
      createRuntime = runtime.createRuntime;
      globalNodeRegistry = runtime.globalNodeRegistry;
      return true;
    } catch (e2) {
      return false;
    }
  }
}

export class TestRunner {
  private config: TestRunnerConfig;
  private signalCapture: SignalCapture;

  constructor(config?: Partial<TestRunnerConfig>) {
    this.config = {
      timeout: config?.timeout ?? 5000,
      captureAllSignals: config?.captureAllSignals ?? true,
      validateCartridges: config?.validateCartridges ?? true
    };
    this.signalCapture = new SignalCapture();
  }

  /**
   * Run a test scenario against a cartridge using the real runtime
   */
  async runScenario(
    cartridgePath: string,
    inputSignal: Signal,
    expectedSignals: string[]
  ): Promise<{
    passed: boolean;
    signalsReceived: Signal[];
    missingSignals: string[];
    unexpectedSignals: Signal[];
    executionTime: number;
    errors: string[];
    usedRealRuntime: boolean;
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    const signalsReceived: Signal[] = [];
    let usedRealRuntime = false;

    try {
      // Load cartridge
      if (!fs.existsSync(cartridgePath)) {
        throw new Error(`Cartridge not found: ${cartridgePath}`);
      }

      const cartridge: Cartridge = JSON.parse(fs.readFileSync(cartridgePath, 'utf-8'));

      // Start signal capture
      this.signalCapture.start();
      this.signalCapture.clear();

      // Try to use real runtime
      const runtimeAvailable = await loadRuntime();

      if (runtimeAvailable && createRuntime) {
        usedRealRuntime = true;
        await this.runWithRealRuntime(cartridge, inputSignal, signalsReceived, errors);
      } else {
        // Fallback to simulation
        const simulatedSignals = this.simulateSignalFlow(cartridge, inputSignal);
        signalsReceived.push(...simulatedSignals);
      }

      // Stop capture
      this.signalCapture.stop();

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    const executionTime = Date.now() - startTime;

    // Analyze results
    const receivedTypes = signalsReceived.map(s => s.type);
    const missingSignals = expectedSignals.filter(t => !receivedTypes.includes(t));
    const expectedSet = new Set(expectedSignals);
    const unexpectedSignals = signalsReceived.filter(s => !expectedSet.has(s.type));

    return {
      passed: missingSignals.length === 0 && errors.length === 0,
      signalsReceived,
      missingSignals,
      unexpectedSignals,
      executionTime,
      errors,
      usedRealRuntime
    };
  }

  /**
   * Run scenario using the real GraphRuntime engine
   */
  private async runWithRealRuntime(
    cartridge: Cartridge,
    inputSignal: Signal,
    signalsReceived: Signal[],
    errors: string[]
  ): Promise<void> {
    let runtime: any = null;

    try {
      // Create runtime with cartridge
      runtime = await createRuntime({ cartridge });

      // Get SignalBus and subscribe to all signals
      const signalBus = runtime.getSignalBus();
      signalBus.subscribe('*', (signal: Signal) => {
        signalsReceived.push(signal);
        this.signalCapture.capture(signal);
      });

      // Handle errors
      runtime.on('node:error', (event: any) => {
        const data = event.data as { nodeId: string; error: Error };
        errors.push(`Node ${data.nodeId} error: ${data.error.message}`);
      });

      runtime.on('runtime:error', (event: any) => {
        const data = event.data as { error: Error };
        errors.push(`Runtime error: ${data.error.message}`);
      });

      // Start runtime
      await runtime.start();

      // Spoof source node routing
      // The Graph-OS runtime expects signals to originate from real nodes on the cartridge graph.
      // If we blindly inject a signal with 'test-runner' as the source, the router drops it.
      if (inputSignal.sourceNodeId === 'test-runner' || !inputSignal.sourceNodeId) {
        // Find a matching input node
        const inputNodes = (cartridge.nodes || []).filter(n => n.type === 'control.input');

        let targetSpoofNode = inputNodes.find(n =>
          n.config && Array.isArray(n.config.outputSignalType)
            ? n.config.outputSignalType.includes(inputSignal.type)
            : n.config && n.config.outputSignalType === inputSignal.type
        );

        // Fallback to the first input node if no direct signal match is found
        if (!targetSpoofNode && inputNodes.length > 0) {
          targetSpoofNode = inputNodes[0];
        }

        if (targetSpoofNode) {
          inputSignal.sourceNodeId = targetSpoofNode.id;
        }
      }

      // Inject input signal
      await runtime.sendSignal(inputSignal);

      // Wait for signal processing
      await this.waitForIdle(runtime, this.config.timeout);

      // Stop runtime
      await runtime.stop();
    } finally {
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
   * Wait for runtime to become idle
   */
  private async waitForIdle(runtime: any, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const state = runtime.getState();
      if (state !== 'running') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Simulate signal flow for testing (fallback when runtime unavailable)
   */
  private simulateSignalFlow(cartridge: Cartridge, inputSignal: Signal): Signal[] {
    const signals: Signal[] = [inputSignal];

    const nodes = cartridge.nodes || [];
    const wires = cartridge.wires || [];

    // Create a map of nodes
    const nodeMap = new Map<string, any>();
    for (const node of nodes) {
      if (node && node.id) {
        nodeMap.set(node.id, node);
      }
    }

    // Process each wire
    for (const wire of wires) {
      const fromNode = nodeMap.get(wire.from);
      const toNode = nodeMap.get(wire.to);

      if (fromNode && toNode) {
        // Simulate signal transformation
        const newSignal: Signal = {
          type: wire.signalType || inputSignal.type,
          payload: { ...(inputSignal.payload as Record<string, unknown> || {}) },
          timestamp: new Date(),
          sourceNodeId: toNode.id
        };
        signals.push(newSignal);
        this.signalCapture.capture(newSignal);
      }
    }

    return signals;
  }

  /**
   * Test a single node in isolation using the NodeImplementationRegistry
   */
  async testNode(
    nodeType: string,
    config: Record<string, unknown>,
    inputSignal: Signal
  ): Promise<{
    output: Signal | Signal[] | null;
    executionTime: number;
    error?: string;
    usedRegistry: boolean;
  }> {
    const startTime = Date.now();
    let output: Signal | Signal[] | null = null;
    let error: string | undefined;
    let usedRegistry = false;

    try {
      // Must use the registry from runtime
      const registry = this.getNodeRegistry();

      if (!registry) {
        throw new Error('GraphRuntime node registry is completely unavailable.');
      }

      if (!registry.has(nodeType)) {
        throw new Error(`Node type "${nodeType}" not found in the global registry. Fallbacks are disabled.`);
      }

      usedRegistry = true;
      // Use actual node implementation from registry
      const processor = registry.createProcessor(nodeType, config, 'test-node');

      if (processor.error) {
        error = processor.error;
      } else {
        output = await processor.process(inputSignal);
      }

    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const executionTime = Date.now() - startTime;

    return {
      output,
      executionTime,
      error,
      usedRegistry
    };
  }

  /**
   * Get the node registry (lazy loaded)
   */
  private getNodeRegistry(): any {
    if (!globalNodeRegistry) {
      try {
        const runtimePath = require.resolve('@graph-os/runtime', { paths: [__dirname] });
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const runtime = require(runtimePath);
        globalNodeRegistry = runtime.globalNodeRegistry;
      } catch {
        // Registry not available
      }
    }
    return globalNodeRegistry;
  }

  /**
   * Get signal capture instance
   */
  getSignalCapture(): SignalCapture {
    return this.signalCapture;
  }

  /**
   * Get current config
   */
  getConfig(): TestRunnerConfig {
    return { ...this.config };
  }
}
