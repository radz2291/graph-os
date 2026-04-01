/**
 * Test: v1 backward compatibility
 *
 * A v1 cartridge (no extensions, no phases) should load and run
 * exactly as before.
 */

import {
  GraphRuntime,
  createRuntime,
  ExtensionRegistry,
  registerBuiltInExtensions,
} from '../src/index';
import { Cartridge, createSignal } from '@graph-os/core';

// ============================================================
// Minimal v1 Cartridge
// ============================================================

const v1Cartridge: Cartridge = {
  version: '1.0.0',
  name: 'simple-flow',
  description: 'A simple v1 flow with no extensions',
  inputs: [],
  outputs: [],
  nodes: [
    {
      id: 'input-node',
      type: 'control.input',
      description: 'Entry point',
      config: { outputSignalType: 'DATA.IN' },
    },
    {
      id: 'display-node',
      type: 'control.display',
      description: 'Display result',
      config: { format: 'json' },
    },
  ],
  wires: [
    { from: 'input-node', to: 'display-node', signalType: 'DATA.IN' },
  ],
};

// ============================================================
// Tests
// ============================================================

async function testV1LoadAndRun() {
  console.log('\n=== Test: v1 cartridge loads and runs ===');

  const runtime = new GraphRuntime();
  await runtime.loadCartridge({ data: v1Cartridge });
  await runtime.start();

  // Verify state
  assert(runtime.getState() === 'running', 'Runtime should be running');
  assert(runtime.getCartridge() !== null, 'Cartridge should be loaded');
  assert(runtime.getStats().nodeCount === 2, 'Should have 2 nodes');
  assert(runtime.getStats().wireCount === 1, 'Should have 1 wire');

  // Send a signal
  const received: any[] = [];
  runtime.subscribe('DATA.IN', (signal) => received.push(signal));

  await runtime.emit('DATA.IN', { value: 42 });

  // Give the async pipeline time to process
  await delay(50);

  // The signal should have been processed
  assert(runtime.getStats().signalsProcessed >= 1, 'Should have processed at least 1 signal');

  await runtime.destroy();
  console.log('  ✅ v1 cartridge loads and runs correctly');
}

async function testV1NoExtensions() {
  console.log('\n=== Test: v1 cartridge has no extensions loaded ===');

  const runtime = new GraphRuntime();
  await runtime.loadCartridge({ data: v1Cartridge });

  // GraphContext should be in default state (no phases)
  assert(runtime.getCurrentPhase() === 'default', 'Default phase should be "default"');
  assert(runtime.getCompletedPhases().length === 0, 'No completed phases');

  await runtime.destroy();
  console.log('  ✅ v1 cartridge has no extensions loaded');
}

async function testV1AllWiresAlwaysActive() {
  console.log('\n=== Test: v1 wires are always active (no phase filter) ===');

  // In v1 mode, all wires should be active regardless of "phase"
  // since there are no phases declared
  const runtime = new GraphRuntime();
  await runtime.loadCartridge({ data: v1Cartridge });
  await runtime.start();

  // Emit signal — it should route even though graphContext.currentPhase is "default"
  await runtime.emit('DATA.IN', { test: 'always-active' });
  await delay(50);

  assert(runtime.getStats().signalsProcessed >= 1, 'Signal should be processed');

  await runtime.destroy();
  console.log('  ✅ v1 wires are always active');
}

// ============================================================
// Runner
// ============================================================

async function run() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  v1 Backward Compatibility Tests     ║');
  console.log('╚══════════════════════════════════════╝');

  try {
    await testV1LoadAndRun();
    await testV1NoExtensions();
    await testV1AllWiresAlwaysActive();
    console.log('\n✅ All v1 backward compatibility tests passed!\n');
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

run();
