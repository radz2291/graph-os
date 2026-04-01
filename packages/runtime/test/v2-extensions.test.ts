/**
 * Test: v2 Extension System — Phases, Guard, Timeout, Retry, Compensation
 *
 * Tests the full extension pipeline with a v2 order-flow cartridge.
 */

import {
  GraphRuntime,
  createRuntime,
  ExtensionRegistry,
  registerBuiltInExtensions,
  ExtensionLoader,
  MiddlewarePipeline,
} from '../src/index';
import {
  Cartridge,
  createSignal,
  PhaseDefinition,
  WireDefinition,
  GraphExtension,
  HookResult,
} from '@graph-os/core';
import { PhasesExtension } from '../src/extensions/built-in/phases';
import { GuardExtension } from '../src/extensions/built-in/guard';
import { RetryExtension } from '../src/extensions/built-in/retry';
import { TimeoutExtension } from '../src/extensions/built-in/timeout';
import { CompensationExtension } from '../src/extensions/built-in/compensation';

// ============================================================
// v2 Order Flow Cartridge
// ============================================================

const orderFlowCartridge: Cartridge = {
  version: '2.0.0',
  name: 'order-flow',
  description: 'Order processing with payment retry and compensation',
  extensions: [
    'graph-os:phases',
    'graph-os:guard',
    'graph-os:timeout',
    'graph-os:retry',
    'graph-os:compensation',
  ],
  phases: [
    { id: 'receiving' },
    { id: 'validating' },
    { id: 'paying' },
    { id: 'reserving' },
    { id: 'finalizing' },
    { id: 'completed', terminal: true },
    { id: 'compensating' },
    { id: 'failed', terminal: true },
  ],
  initialPhase: 'receiving',
  inputs: [
    { name: 'order', signalType: 'ORDER.CREATED', description: 'New order' },
  ],
  outputs: [
    { name: 'completed', signalType: 'ORDER.COMPLETED', description: 'Order done' },
    { name: 'failed', signalType: 'ORDER.FAILED', description: 'Order failed' },
  ],
  nodes: [
    {
      id: 'order-input',
      type: 'control.input',
      description: 'Receive order',
      config: { outputSignalType: 'ORDER.CREATED' },
    },
    {
      id: 'order-validator',
      type: 'logic.validate',
      description: 'Validate order',
      config: {
        successSignalType: 'ORDER.VALIDATED',
        failureSignalType: 'ORDER.INVALID',
      },
    },
    {
      id: 'payment-api',
      type: 'infra.api.client',
      description: 'Process payment',
      config: {
        url: '/api/payments',
        successSignalType: 'PAYMENT.SUCCESS',
        failureSignalType: 'PAYMENT.FAILED',
      },
    },
    {
      id: 'inventory-checker',
      type: 'infra.api.client',
      description: 'Reserve inventory',
      config: {
        url: '/api/inventory/reserve',
        successSignalType: 'INVENTORY.RESERVED',
        failureSignalType: 'INVENTORY.FAILED',
      },
    },
    {
      id: 'order-finalizer',
      type: 'logic.transform',
      description: 'Finalize order',
      config: { outputSignalType: 'ORDER.COMPLETED' },
    },
    {
      id: 'success-display',
      type: 'control.display',
      description: 'Show success',
      config: { format: 'json' },
    },
  ] as any,
  wires: [
    {
      from: 'order-input',
      to: 'order-validator',
      signalType: 'ORDER.CREATED',
      phase: 'receiving',
      advancesTo: 'validating',
    },
    {
      from: 'order-validator',
      to: 'payment-api',
      signalType: 'ORDER.VALIDATED',
      phase: 'validating',
      advancesTo: 'paying',
    },
    {
      from: 'payment-api',
      to: 'inventory-checker',
      signalType: 'PAYMENT.SUCCESS',
      phase: 'paying',
      advancesTo: 'reserving',
    },
    {
      from: 'inventory-checker',
      to: 'order-finalizer',
      signalType: 'INVENTORY.RESERVED',
      phase: 'reserving',
      advancesTo: 'finalizing',
    },
    {
      from: 'order-finalizer',
      to: 'success-display',
      signalType: 'ORDER.COMPLETED',
      phase: 'finalizing',
      advancesTo: 'completed',
    },
  ],
  compensation: {
    strategy: 'backward',
    steps: [
      {
        phase: 'reserving',
        node: 'inventory-checker',
        signal: 'INVENTORY.RELEASE',
        requires: ['reservationId'],
      },
      {
        phase: 'paying',
        node: 'payment-api',
        signal: 'PAYMENT.REFUND',
        requires: ['transactionId'],
      },
    ],
  },
};

// ============================================================
// Tests
// ============================================================

async function testExtensionRegistry() {
  console.log('\n=== Test: ExtensionRegistry ===');

  const registry = new ExtensionRegistry();
  registerBuiltInExtensions(registry);

  assert(registry.has('graph-os:phases'), 'Should have phases extension');
  assert(registry.has('graph-os:guard'), 'Should have guard extension');
  assert(registry.has('graph-os:retry'), 'Should have retry extension');
  assert(registry.has('graph-os:timeout'), 'Should have timeout extension');
  assert(registry.has('graph-os:compensation'), 'Should have compensation extension');

  const ext = registry.get('graph-os:phases')!;
  assert(ext.id === 'graph-os:phases', 'Extension ID should match');
  assert(ext.apiVersion === '1.0.0', 'API version should be 1.0.0');

  console.log('  ✅ ExtensionRegistry works correctly');
}

async function testExtensionLoaderDependencyOrder() {
  console.log('\n=== Test: ExtensionLoader dependency ordering ===');

  const registry = new ExtensionRegistry();
  registerBuiltInExtensions(registry);

  const loader = new ExtensionLoader(registry);

  // Compensation depends on phases — phases should come first
  const loaded = loader.load(['graph-os:compensation', 'graph-os:guard']);

  assert(loaded.length >= 3, 'Should load compensation + phases (dep) + guard');
  assert(loaded[0].id === 'graph-os:phases', 'Phases should load first (dependency)');
  assert(loaded[loaded.length - 1].id === 'graph-os:compensation' || loaded.find(e => e.id === 'graph-os:compensation'), 'Compensation should be loaded');

  console.log(`  Loaded order: ${loaded.map(e => e.id).join(' → ')}`);
  console.log('  ✅ ExtensionLoader resolves dependencies correctly');
}

async function testExtensionLoaderMissingDependency() {
  console.log('\n=== Test: ExtensionLoader throws on missing extension ===');

  const registry = new ExtensionRegistry();
  // Don't register anything
  const loader = new ExtensionLoader(registry);

  let threw = false;
  try {
    loader.load(['graph-os:phases']);
  } catch (err: any) {
    threw = true;
    assert(err.message.includes('not found'), 'Should say not found');
  }

  assert(threw, 'Should throw for missing extension');
  console.log('  ✅ ExtensionLoader throws on missing extension');
}

async function testMiddlewarePipeline() {
  console.log('\n=== Test: MiddlewarePipeline ===');

  const pipeline = new MiddlewarePipeline();

  // Register phases extension
  pipeline.registerExtension(PhasesExtension);
  pipeline.registerExtension(GuardExtension);

  const extensions = pipeline.getRegisteredExtensions();
  assert(extensions.length === 2, 'Should have 2 extensions registered');

  // Test onRoute with a matching phase
  const mockCtx = {
    signal: createSignal('TEST.SIGNAL', {}, 'node-a'),
    targetNode: {} as any,
    wire: { from: 'node-a', to: 'node-b', signalType: 'TEST.SIGNAL', phase: 'receiving' },
    graph: {
      currentPhase: 'receiving',
      get: () => undefined,
      completedPhases: [],
    } as any,
    logger: noopLogger(),
  };

  const result = await pipeline.executeOnRoute(mockCtx as any);
  assert(result === true, 'Route should proceed when phase matches');

  // Test onRoute with wrong phase
  const wrongPhaseCtx = {
    ...mockCtx,
    graph: {
      currentPhase: 'paying',
      get: () => undefined,
      completedPhases: [],
    } as any,
  };

  const blocked = await pipeline.executeOnRoute(wrongPhaseCtx as any);
  assert(blocked === false, 'Route should be blocked when phase does not match');

  pipeline.clear();
  console.log('  ✅ MiddlewarePipeline executes hooks correctly');
}

async function testPhasesExtensionValidation() {
  console.log('\n=== Test: Phases extension cartridge validation ===');

  const validator = PhasesExtension.validators!.cartridge!;

  // Valid cartridge with phases
  const valid = validator({
    phases: [{ id: 'start' }, { id: 'end', terminal: true }],
    initialPhase: 'start',
  });
  assert(valid.length === 0, 'Should have no errors for valid cartridge');

  // Missing initialPhase
  const missing = validator({
    phases: [{ id: 'start' }, { id: 'end' }],
  });
  assert(missing.some(r => !r.valid), 'Should fail when initialPhase missing');

  // Invalid initialPhase
  const invalid = validator({
    phases: [{ id: 'start' }],
    initialPhase: 'nonexistent',
  });
  assert(invalid.some(r => !r.valid), 'Should fail when initialPhase not in phases');

  console.log('  ✅ Phases extension validates cartridges correctly');
}

async function testGuardExtension() {
  console.log('\n=== Test: Guard extension ===');

  const registry = new ExtensionRegistry();
  registerBuiltInExtensions(registry);

  const pipeline = new MiddlewarePipeline();
  pipeline.registerExtension(GuardExtension);

  // Guard: field "attempts" must be < 3
  const guardPass = {
    signal: createSignal('TEST', {}, 'a'),
    targetNode: {} as any,
    wire: {
      from: 'a',
      to: 'b',
      signalType: 'TEST',
      guard: { field: 'attempts', operator: 'lt', value: 3 },
    },
    graph: {
      currentPhase: 'default',
      get: (key: string) => key === 'attempts' ? 2 : undefined,
      completedPhases: [],
    } as any,
    logger: noopLogger(),
  };

  const pass = await pipeline.executeOnRoute(guardPass as any);
  assert(pass === true, 'Guard should pass when value < 3');

  // Guard: field "attempts" >= 3
  const guardFail = {
    ...guardPass,
    graph: {
      currentPhase: 'default',
      get: (key: string) => key === 'attempts' ? 3 : undefined,
      completedPhases: [],
    } as any,
  };

  const fail = await pipeline.executeOnRoute(guardFail as any);
  assert(fail === false, 'Guard should block when value >= 3');

  console.log('  ✅ Guard extension evaluates conditions correctly');
}

async function testV2CartridgeLoads() {
  console.log('\n=== Test: v2 cartridge loads with extensions ===');

  const runtime = new GraphRuntime();
  await runtime.loadCartridge({ data: orderFlowCartridge });

  // Verify extensions were loaded
  assert(runtime.getCurrentPhase() === 'receiving', 'Should start in "receiving" phase');
  assert(runtime.getCompletedPhases().length === 0, 'No completed phases at start');

  // Verify nodes
  assert(runtime.getStats().nodeCount === 6, `Should have 6 nodes, got ${runtime.getStats().nodeCount}`);
  assert(runtime.getStats().wireCount === 5, `Should have 5 wires, got ${runtime.getStats().wireCount}`);

  await runtime.destroy();
  console.log('  ✅ v2 cartridge loads with extensions and initial phase');
}

async function testV2PhaseTransitions() {
  console.log('\n=== Test: v2 phase transitions ===');

  const runtime = new GraphRuntime();
  await runtime.loadCartridge({ data: orderFlowCartridge });
  await runtime.start();

  // Track signals received
  const received: string[] = [];
  runtime.subscribe('*', (signal) => {
    received.push(signal.type);
  });

  assert(runtime.getCurrentPhase() === 'receiving', 'Should start in receiving');

  // Note: The actual signal routing depends on node implementations
  // Here we verify the phase tracking works
  const ctx = runtime.getGraphContext();
  assert(ctx.currentPhase === 'receiving', 'Context should be in receiving');

  // Manual phase advance
  ctx.advanceTo('validating');
  assert(ctx.currentPhase === 'validating', 'Should advance to validating');
  assert(ctx.completedPhases.includes('receiving'), 'receiving should be completed');

  ctx.advanceTo('paying');
  assert(ctx.currentPhase === 'paying', 'Should be in paying');
  assert(ctx.hasCompleted('receiving'), 'Should have completed receiving');
  assert(ctx.hasCompleted('validating'), 'Should have completed validating');

  await runtime.destroy();
  console.log('  ✅ v2 phase transitions work correctly');
}

async function testGraphContextDataStore() {
  console.log('\n=== Test: GraphContext data store ===');

  const runtime = new GraphRuntime();
  await runtime.loadCartridge({ data: orderFlowCartridge });

  const ctx = runtime.getGraphContext();

  // get/set
  ctx.set('orderId', '12345');
  assert(ctx.get('orderId') === '12345', 'Should get/set values');
  assert(ctx.get('missing', 'default') === 'default', 'Should return default for missing keys');

  // increment
  assert(ctx.increment('counter') === 1, 'First increment should be 1');
  assert(ctx.increment('counter') === 2, 'Second increment should be 2');
  assert(ctx.increment('counter') === 3, 'Third increment should be 3');

  // snapshot
  const snapshot = ctx.getSnapshot();
  assert(snapshot.currentPhase === 'receiving', 'Snapshot should have currentPhase');
  assert((snapshot.data as any).orderId === '12345', 'Snapshot should have data');

  await runtime.destroy();
  console.log('  ✅ GraphContext data store works correctly');
}

async function testRetryExtensionBackoff() {
  console.log('\n=== Test: Retry extension backoff calculation ===');

  const { calculateBackoff } = require('../src/extensions/built-in/retry');

  // None
  assert(calculateBackoff(1000, 'none', 1, 30000) === 0, 'None should return 0');

  // Linear
  assert(calculateBackoff(1000, 'linear', 1, 30000) === 1000, 'Linear attempt 1');
  assert(calculateBackoff(1000, 'linear', 3, 30000) === 3000, 'Linear attempt 3');

  // Exponential
  assert(calculateBackoff(1000, 'exponential', 1, 30000) === 1000, 'Exp attempt 1');
  assert(calculateBackoff(1000, 'exponential', 2, 30000) === 2000, 'Exp attempt 2');
  assert(calculateBackoff(1000, 'exponential', 3, 30000) === 4000, 'Exp attempt 3');
  assert(calculateBackoff(1000, 'exponential', 5, 30000) === 16000, 'Exp attempt 5');

  // Capped at maxDelay
  assert(calculateBackoff(1000, 'exponential', 10, 5000) === 5000, 'Should cap at maxDelay');

  console.log('  ✅ Retry backoff calculation is correct');
}

async function testCompensationExtensionValidation() {
  console.log('\n=== Test: Compensation extension validation ===');

  const validator = CompensationExtension.validators!.cartridge!;

  // Valid compensation
  const valid = validator({
    phases: [{ id: 'paying' }, { id: 'reserving' }],
    nodes: [{ id: 'refund' }, { id: 'release' }],
    compensation: {
      strategy: 'backward',
      steps: [
        { phase: 'reserving', node: 'release', signal: 'RELEASE', requires: [] },
        { phase: 'paying', node: 'refund', signal: 'REFUND', requires: [] },
      ],
    },
  });
  assert(valid.length === 0, `Should have no errors, got: ${JSON.stringify(valid)}`);

  // Invalid strategy
  const invalidStrategy = validator({
    compensation: {
      strategy: 'sideways',
      steps: [],
    },
  });
  assert(invalidStrategy.some(r => !r.valid), 'Should fail for invalid strategy');

  // Unknown phase reference
  const unknownPhase = validator({
    phases: [{ id: 'paying' }],
    nodes: [{ id: 'refund' }],
    compensation: {
      strategy: 'backward',
      steps: [
        { phase: 'nonexistent', node: 'refund', signal: 'REFUND', requires: [] },
      ],
    },
  });
  assert(unknownPhase.some(r => !r.valid), 'Should fail for unknown phase');

  console.log('  ✅ Compensation extension validates correctly');
}

// ============================================================
// Runner
// ============================================================

async function run() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  v2 Extension System Tests           ║');
  console.log('╚══════════════════════════════════════╝');

  try {
    // Unit tests
    await testExtensionRegistry();
    await testExtensionLoaderDependencyOrder();
    await testExtensionLoaderMissingDependency();
    await testMiddlewarePipeline();
    await testPhasesExtensionValidation();
    await testGuardExtension();
    await testRetryExtensionBackoff();
    await testCompensationExtensionValidation();

    // Integration tests
    await testV2CartridgeLoads();
    await testV2PhaseTransitions();
    await testGraphContextDataStore();

    console.log('\n✅ All v2 extension system tests passed!\n');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

// ============================================================
// Helpers
// ============================================================

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function noopLogger() {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

run();
