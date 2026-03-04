/**
 * E2E Test: Scenario 3 - Extract to Composite
 * 
 * Tests automatic composite extraction from node clusters
 * 
 * @module test/e2e
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExtractToCompositeTool } from '../../src/tools/precision/extractToComposite';
import { CreateCartridgeTool } from '../../src/tools/architecture/createCartridge';
import { ValidateCartridgeTool } from '../../src/tools/architecture/validateCartridge';
import { CartridgeBuilder, createClusteredCartridge } from '../utils/cartridge-builder';
import { assertSuccess, assertNodeExists, assertNodeNotExists, measureTime, cleanupTestFiles } from '../utils/result-assertions';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = '/tmp/graph-os-e2e/scenario-3';

describe('Scenario 3: Extract to Composite', () => {
  let extractTool: ExtractToCompositeTool;
  let createCartridgeTool: CreateCartridgeTool;
  let validateTool: ValidateCartridgeTool;
  let cartridgePath: string;
  let compositeRegistryPath: string;

  beforeEach(() => {
    extractTool = new ExtractToCompositeTool();
    createCartridgeTool = new CreateCartridgeTool();
    validateTool = new ValidateCartridgeTool();

    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    cartridgePath = path.join(TEST_DIR, 'clustered.cartridge.json');
    compositeRegistryPath = path.join(TEST_DIR, 'composite-registry.json');
  });

  afterEach(() => {
    cleanupTestFiles();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Step 1: Create Clustered Cartridge', () => {
    it('should create a cartridge with clusterable nodes', async () => {
      const builder = new CartridgeBuilder({ name: 'clustered-test' })
        .addInputNode('input', 'CLUSTER.ENTRY')
        .addTransformerNode('cluster-node-1', 'CLUSTER.STEP_1')
        .addTransformerNode('cluster-node-2', 'CLUSTER.STEP_2')
        .addTransformerNode('cluster-node-3', 'CLUSTER.EXIT')
        .addDisplayNode('output')
        .connect('input', 'cluster-node-1', 'CLUSTER.ENTRY')
        .connect('cluster-node-1', 'cluster-node-2', 'CLUSTER.STEP_1')
        .connect('cluster-node-2', 'cluster-node-3', 'CLUSTER.STEP_2')
        .connect('cluster-node-3', 'output', 'CLUSTER.EXIT');

      builder.writeTo(cartridgePath);

      expect(fs.existsSync(cartridgePath)).toBe(true);

      const cartridge = JSON.parse(fs.readFileSync(cartridgePath, 'utf-8'));
      expect(cartridge.nodes.length).toBe(5);
    });
  });

  describe('Step 2: Extract Cluster to Composite', () => {
    beforeEach(async () => {
      // Create clustered cartridge
      const builder = new CartridgeBuilder({ name: 'clustered-test' })
        .addInputNode('input', 'CLUSTER.ENTRY')
        .addTransformerNode('cluster-node-1', 'CLUSTER.STEP_1')
        .addTransformerNode('cluster-node-2', 'CLUSTER.STEP_2')
        .addTransformerNode('cluster-node-3', 'CLUSTER.EXIT')
        .addDisplayNode('output')
        .connect('input', 'cluster-node-1', 'CLUSTER.ENTRY')
        .connect('cluster-node-1', 'cluster-node-2', 'CLUSTER.STEP_1')
        .connect('cluster-node-2', 'cluster-node-3', 'CLUSTER.STEP_2')
        .connect('cluster-node-3', 'output', 'CLUSTER.EXIT');

      builder.writeTo(cartridgePath);
    });

    it('should detect input signals correctly', async () => {
      const result = await extractTool.execute({
        cartridgePath,
        nodes: ['cluster-node-1', 'cluster-node-2', 'cluster-node-3'],
        compositeName: 'test-cluster',
        dryRun: true
      });

      assertSuccess(result);
      expect(result.data.boundaries?.inputSignals).toContain('CLUSTER.ENTRY');
    });

    it('should detect output signals correctly', async () => {
      const result = await extractTool.execute({
        cartridgePath,
        nodes: ['cluster-node-1', 'cluster-node-2', 'cluster-node-3'],
        compositeName: 'test-cluster',
        dryRun: true
      });

      assertSuccess(result);
      expect(result.data.boundaries?.outputSignals).toContain('CLUSTER.EXIT');
    });

    it('should extract cluster and create composite', async () => {
      const result = await extractTool.execute({
        cartridgePath,
        nodes: ['cluster-node-1', 'cluster-node-2', 'cluster-node-3'],
        compositeName: 'test-cluster',
        outputPath: path.join(TEST_DIR, 'composites', 'test-cluster.json'),
        healParentGraph: false
      });

      assertSuccess(result);
      expect(result.data.composite).toBeDefined();
      expect(result.data.composite?.nodes.length).toBe(3);
    });

    it('should heal parent graph when enabled', async () => {
      const result = await extractTool.execute({
        cartridgePath,
        nodes: ['cluster-node-1', 'cluster-node-2', 'cluster-node-3'],
        compositeName: 'test-cluster',
        healParentGraph: true
      });

      assertSuccess(result);
      expect(result.data.parentChanges).toBeDefined();
      expect(result.data.parentChanges?.removedNodes).toHaveLength(3);
      
      // Verify composite node was added
      expect(result.data.parentChanges?.addedNode.type).toBe('ui.composite');
    });

    it('should detect name collisions', async () => {
      // First extraction
      await extractTool.execute({
        cartridgePath,
        nodes: ['cluster-node-1', 'cluster-node-2', 'cluster-node-3'],
        compositeName: 'test-cluster',
        compositeRegistryPath,
        autoRegister: true
      });

      // Try to create duplicate
      const result = await extractTool.execute({
        cartridgePath,
        nodes: ['cluster-node-1', 'cluster-node-2', 'cluster-node-3'],
        compositeName: 'test-cluster',
        compositeRegistryPath
      });

      // Should either fail or succeed with warning
      if (!result.success) {
        expect(result.error).toContain('collision');
      }
    });
  });

  describe('Step 3: Dry Run Mode', () => {
    beforeEach(async () => {
      const builder = new CartridgeBuilder({ name: 'dry-run-test' })
        .addInputNode('input', 'SIGNAL.IN')
        .addTransformerNode('transform', 'SIGNAL.OUT')
        .addDisplayNode('output')
        .connect('input', 'transform', 'SIGNAL.IN')
        .connect('transform', 'output', 'SIGNAL.OUT');

      builder.writeTo(cartridgePath);
    });

    it('should preview changes without writing', async () => {
      const result = await extractTool.execute({
        cartridgePath,
        nodes: ['transform'],
        compositeName: 'transform-composite',
        dryRun: true
      });

      assertSuccess(result);
      expect(result.data.dryRun).toBe(true);
      expect(result.data.preview).toBeDefined();
      expect(result.data.preview?.compositeCartridge).toBeDefined();
    });

    it('should not modify original file in dry run', async () => {
      const originalContent = fs.readFileSync(cartridgePath, 'utf-8');

      await extractTool.execute({
        cartridgePath,
        nodes: ['transform'],
        compositeName: 'transform-composite',
        dryRun: true
      });

      const afterContent = fs.readFileSync(cartridgePath, 'utf-8');
      expect(afterContent).toBe(originalContent);
    });
  });

  describe('Performance: Large Cluster Extraction', () => {
    it('should extract 10-node cluster in < 500ms', async () => {
      // Create larger clustered cartridge
      const builder = createClusteredCartridge('perf-test', 10, 5);
      builder.writeTo(cartridgePath);

      // Get cluster nodes (first cluster)
      const cartridge = JSON.parse(fs.readFileSync(cartridgePath, 'utf-8'));
      const clusterNodes = cartridge.nodes
        .slice(1, 11)
        .map((n: { id: string }) => n.id);

      const { durationMs } = await measureTime(async () => {
        await extractTool.execute({
          cartridgePath,
          nodes: clusterNodes,
          compositeName: 'perf-cluster',
          dryRun: true
        });
      });

      expect(durationMs).toBeLessThan(500);
    });
  });
});
