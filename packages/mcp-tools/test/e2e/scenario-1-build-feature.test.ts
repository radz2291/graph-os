/**
 * E2E Test: Scenario 1 - Build Complete Feature
 * 
 * Tests building a complete feature with apply_topology_patch
 * 
 * @module test/e2e
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ApplyTopologyPatchTool } from '../../src/tools/accelerator/applyTopologyPatch';
import { CreateCartridgeTool } from '../../src/tools/architecture/createCartridge';
import { ValidateCartridgeTool } from '../../src/tools/architecture/validateCartridge';
import { SimulateModificationTool } from '../../src/tools/safety/simulateModification';
import { CartridgeBuilder } from '../utils/cartridge-builder';
import { PatchBuilder } from '../utils/patch-builder';
import { assertSuccess, measureTime, cleanupTestFiles } from '../utils/result-assertions';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = '/tmp/graph-os-e2e/scenario-1';

describe('Scenario 1: Build Complete Feature', () => {
  let applyPatchTool: ApplyTopologyPatchTool;
  let createCartridgeTool: CreateCartridgeTool;
  let validateTool: ValidateCartridgeTool;
  let simulateTool: SimulateModificationTool;
  let cartridgePath: string;

  beforeEach(() => {
    applyPatchTool = new ApplyTopologyPatchTool();
    createCartridgeTool = new CreateCartridgeTool();
    validateTool = new ValidateCartridgeTool();
    simulateTool = new SimulateModificationTool();

    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    cartridgePath = path.join(TEST_DIR, 'feature-test.cartridge.json');
  });

  afterEach(() => {
    cleanupTestFiles();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Step 1: Create Empty Cartridge', () => {
    it('should create an empty cartridge', async () => {
      const result = await createCartridgeTool.execute({
        name: 'feature-test',
        description: 'Test cartridge for feature building',
        outputPath: cartridgePath
      });

      assertSuccess(result);
      expect(result.data.path).toBe(cartridgePath);
      expect(fs.existsSync(cartridgePath)).toBe(true);
    });
  });

  describe('Step 2: Add Nodes with apply_topology_patch', () => {
    beforeEach(async () => {
      await createCartridgeTool.execute({
        name: 'feature-test',
        description: 'Test cartridge',
        outputPath: cartridgePath
      });
    });

    it('should add 5 nodes in one operation', async () => {
      const patch = new PatchBuilder()
        .addInputNode('input', 'USER.INPUT')
        .addTransformerNode('transform-1', 'DATA.TRANSFORMED')
        .addTransformerNode('transform-2', 'DATA.PROCESSED')
        .addValidatorNode('validator', 'DATA.VALID', 'DATA.INVALID')
        .addDisplayNode('output')
        .build();

      const result = await applyPatchTool.execute({
        cartridgePath,
        nodes: patch.nodes,
        validateBeforeApply: true
      });

      assertSuccess(result);
      expect(result.data.stats.nodesAdded).toBe(5);
    });
  });

  describe('Step 3: Add Wires', () => {
    beforeEach(async () => {
      await createCartridgeTool.execute({
        name: 'feature-test',
        description: 'Test cartridge',
        outputPath: cartridgePath
      });

      // Add nodes first
      await applyPatchTool.execute({
        cartridgePath,
        nodes: new PatchBuilder()
          .addInputNode('input', 'USER.INPUT')
          .addTransformerNode('transform-1', 'DATA.TRANSFORMED')
          .addTransformerNode('transform-2', 'DATA.PROCESSED')
          .addValidatorNode('validator', 'DATA.VALID', 'DATA.INVALID')
          .addDisplayNode('output')
          .build().nodes
      });
    });

    it('should add wires connecting all nodes', async () => {
      const result = await applyPatchTool.execute({
        cartridgePath,
        wires: [
          { from: 'input', to: 'transform-1', signalType: 'USER.INPUT' },
          { from: 'transform-1', to: 'transform-2', signalType: 'DATA.TRANSFORMED' },
          { from: 'transform-2', to: 'validator', signalType: 'DATA.PROCESSED' },
          { from: 'validator', to: 'output', signalType: 'DATA.VALID' }
        ]
      });

      assertSuccess(result);
      expect(result.data.stats.wiresAdded).toBe(4);
    });
  });

  describe('Step 4: Validate with simulate_modification', () => {
    beforeEach(async () => {
      // Create and build complete cartridge
      await createCartridgeTool.execute({
        name: 'feature-test',
        description: 'Test cartridge',
        outputPath: cartridgePath
      });

      await applyPatchTool.execute({
        cartridgePath,
        nodes: new PatchBuilder()
          .addInputNode('input', 'USER.INPUT')
          .addTransformerNode('transform-1', 'DATA.TRANSFORMED')
          .addTransformerNode('transform-2', 'DATA.PROCESSED')
          .addValidatorNode('validator', 'DATA.VALID', 'DATA.INVALID')
          .addDisplayNode('output')
          .build().nodes,
        wires: [
          { from: 'input', to: 'transform-1', signalType: 'USER.INPUT' },
          { from: 'transform-1', to: 'transform-2', signalType: 'DATA.TRANSFORMED' },
          { from: 'transform-2', to: 'validator', signalType: 'DATA.PROCESSED' },
          { from: 'validator', to: 'output', signalType: 'DATA.VALID' }
        ]
      });
    });

    it('should validate cartridge structure with simulation', async () => {
      const result = await simulateTool.execute({
        cartridgePath,
        detectCircularDeps: true,
        detectTypeMismatches: true
      });

      assertSuccess(result);
      expect(result.data.errors).toHaveLength(0);
    });
  });

  describe('Performance: Complete Feature Build', () => {
    it('should complete full workflow in < 200ms', async () => {
      const { durationMs } = await measureTime(async () => {
        // Step 1: Create cartridge
        await createCartridgeTool.execute({
          name: 'perf-test',
          description: 'Performance test',
          outputPath: cartridgePath
        });

        // Step 2: Add nodes and wires in one operation
        await applyPatchTool.execute({
          cartridgePath,
          nodes: new PatchBuilder()
            .addInputNode('input', 'USER.INPUT')
            .addTransformerNode('transform', 'DATA.TRANSFORMED')
            .addDisplayNode('output')
            .build().nodes,
          wires: [
            { from: 'input', to: 'transform', signalType: 'USER.INPUT' },
            { from: 'transform', to: 'output', signalType: 'DATA.TRANSFORMED' }
          ]
        });
      });

      expect(durationMs).toBeLessThan(200);
    });
  });
});
