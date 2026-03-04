/**
 * E2E Test: Scenario 6 - Query Topology
 * 
 * Tests universal query system for graph neighborhoods
 * 
 * @module test/e2e
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryTopologyTool } from '../../src/tools/precision/queryTopology';
import { CreateCartridgeTool } from '../../src/tools/architecture/createCartridge';
import { CreateSignalTool } from '../../src/tools/architecture/createSignal';
import { CartridgeBuilder, createLinearFlowCartridge } from '../utils/cartridge-builder';
import { assertSuccess, measureTime, cleanupTestFiles } from '../utils/result-assertions';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = '/tmp/graph-os-e2e/scenario-6';

describe('Scenario 6: Query Topology', () => {
  let queryTool: QueryTopologyTool;
  let createCartridgeTool: CreateCartridgeTool;
  let cartridgePath: string;
  let signalRegistryPath: string;

  beforeEach(() => {
    queryTool = new QueryTopologyTool();
    createCartridgeTool = new CreateCartridgeTool();

    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    cartridgePath = path.join(TEST_DIR, 'query-test.cartridge.json');
    signalRegistryPath = path.join(TEST_DIR, 'signal-registry.json');
  });

  afterEach(() => {
    cleanupTestFiles();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Query Type: subgraph', () => {
    beforeEach(async () => {
      // Create cartridge with linear flow
      const builder = createLinearFlowCartridge('query-test', 10, 'TEST');
      builder.writeTo(cartridgePath);
    });

    it('should return subgraph with depth 2', async () => {
      const result = await queryTool.execute({
        queryType: 'subgraph',
        cartridgePath,
        anchorNodeId: 'node-5',
        depth: 2
      });

      assertSuccess(result);
      expect(result.data.data.nodes).toBeDefined();
      expect(result.data.data.anchorNode).toBe('node-5');
    });

    it('should return more nodes with higher depth', async () => {
      const result2 = await queryTool.execute({
        queryType: 'subgraph',
        cartridgePath,
        anchorNodeId: 'node-5',
        depth: 2
      });

      const result5 = await queryTool.execute({
        queryType: 'subgraph',
        cartridgePath,
        anchorNodeId: 'node-5',
        depth: 5
      });

      const nodes2 = result2.data.data.nodeCount;
      const nodes5 = result5.data.data.nodeCount;

      expect(nodes5).toBeGreaterThanOrEqual(nodes2);
    });

    it('should support BFS traversal', async () => {
      const result = await queryTool.execute({
        queryType: 'subgraph',
        cartridgePath,
        anchorNodeId: 'node-0',
        depth: 3,
        traversalMethod: 'bfs'
      });

      assertSuccess(result);
      expect(result.data.data.nodes.length).toBeGreaterThan(0);
    });

    it('should support DFS traversal', async () => {
      const result = await queryTool.execute({
        queryType: 'subgraph',
        cartridgePath,
        anchorNodeId: 'node-0',
        depth: 3,
        traversalMethod: 'dfs'
      });

      assertSuccess(result);
      expect(result.data.data.nodes.length).toBeGreaterThan(0);
    });

    it('should include incoming connections when enabled', async () => {
      const result = await queryTool.execute({
        queryType: 'subgraph',
        cartridgePath,
        anchorNodeId: 'node-5',
        depth: 2,
        includeIncoming: true,
        includeOutgoing: false
      });

      assertSuccess(result);
      // Should include nodes before node-5
      expect(result.data.data.nodes.some((n: { id: string }) => 
        parseInt(n.id.split('-')[1]) < 5
      )).toBe(true);
    });
  });

  describe('Query Type: node', () => {
    beforeEach(async () => {
      const builder = new CartridgeBuilder({ name: 'node-query-test' })
        .addInputNode('test-input', 'SIGNAL.TEST')
        .addDisplayNode('test-output')
        .connect('test-input', 'test-output', 'SIGNAL.TEST');

      builder.writeTo(cartridgePath);
    });

    it('should return node details', async () => {
      const result = await queryTool.execute({
        queryType: 'node',
        cartridgePath,
        nodeId: 'test-input'
      });

      assertSuccess(result);
      expect(result.data.data.id).toBe('test-input');
      expect(result.data.data.type).toBe('control.input');
    });

    it('should include connection info', async () => {
      const result = await queryTool.execute({
        queryType: 'node',
        cartridgePath,
        nodeId: 'test-input'
      });

      assertSuccess(result);
      expect(result.data.data.connections).toBeDefined();
      expect(result.data.data.connections.outgoing).toBeDefined();
    });

    it('should return error for non-existent node', async () => {
      const result = await queryTool.execute({
        queryType: 'node',
        cartridgePath,
        nodeId: 'non-existent'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Query Type: wires', () => {
    beforeEach(async () => {
      const builder = new CartridgeBuilder({ name: 'wires-query-test' })
        .addInputNode('input-1', 'SIGNAL.A')
        .addInputNode('input-2', 'SIGNAL.B')
        .addDisplayNode('output')
        .connect('input-1', 'output', 'SIGNAL.A')
        .connect('input-2', 'output', 'SIGNAL.B');

      builder.writeTo(cartridgePath);
    });

    it('should return all wires', async () => {
      const result = await queryTool.execute({
        queryType: 'wires',
        cartridgePath
      });

      assertSuccess(result);
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data.data.length).toBe(2);
    });

    it('should filter wires by node', async () => {
      const result = await queryTool.execute({
        queryType: 'wires',
        cartridgePath,
        nodeId: 'input-1'
      });

      assertSuccess(result);
      expect(result.data.data.length).toBe(1);
      expect(result.data.data[0].from).toBe('input-1');
    });
  });

  describe('Query Type: paths', () => {
    beforeEach(async () => {
      // Create branching cartridge
      const builder = new CartridgeBuilder({ name: 'paths-query-test' })
        .addInputNode('start', 'PATH.BEGIN')
        .addTransformerNode('branch-a', 'PATH.A')
        .addTransformerNode('branch-b', 'PATH.B')
        .addDisplayNode('end')
        .connect('start', 'branch-a', 'PATH.BEGIN')
        .connect('start', 'branch-b', 'PATH.BEGIN')
        .connect('branch-a', 'end', 'PATH.A')
        .connect('branch-b', 'end', 'PATH.B');

      builder.writeTo(cartridgePath);
    });

    it('should find all paths between nodes', async () => {
      const result = await queryTool.execute({
        queryType: 'paths',
        cartridgePath,
        fromNodeId: 'start',
        toNodeId: 'end'
      });

      assertSuccess(result);
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should limit number of paths', async () => {
      const result = await queryTool.execute({
        queryType: 'paths',
        cartridgePath,
        fromNodeId: 'start',
        toNodeId: 'end',
        maxPaths: 1
      });

      assertSuccess(result);
      expect(result.data.data.length).toBeLessThanOrEqual(1);
    });

    it('should include signal types in path', async () => {
      const result = await queryTool.execute({
        queryType: 'paths',
        cartridgePath,
        fromNodeId: 'start',
        toNodeId: 'end'
      });

      assertSuccess(result);
      const firstPath = result.data.data[0];
      expect(firstPath.signals).toBeDefined();
      expect(Array.isArray(firstPath.signals)).toBe(true);
    });
  });

  describe('Query Type: signal-registry', () => {
    beforeEach(() => {
      // Create signal registry
      const registry = {
        version: '1.0.0',
        signals: [
          {
            type: 'USER.LOGIN',
            description: 'User login event',
            emittedBy: ['control.input'],
            consumedBy: ['logic.validate']
          },
          {
            type: 'USER.LOGOUT',
            description: 'User logout event',
            emittedBy: ['control.input'],
            consumedBy: ['control.display']
          }
        ]
      };
      fs.writeFileSync(signalRegistryPath, JSON.stringify(registry, null, 2));
    });

    it('should list all signals', async () => {
      const result = await queryTool.execute({
        queryType: 'signal-registry',
        signalRegistryPath
      });

      assertSuccess(result);
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data.data.length).toBe(2);
    });

    it('should filter by namespace', async () => {
      const result = await queryTool.execute({
        queryType: 'signal-registry',
        signalRegistryPath,
        filter: { namespace: 'USER' }
      });

      assertSuccess(result);
      expect(result.data.data.length).toBe(2);
    });

    it('should filter by pattern', async () => {
      const result = await queryTool.execute({
        queryType: 'signal-registry',
        signalRegistryPath,
        filter: { pattern: 'LOGIN' }
      });

      assertSuccess(result);
      expect(result.data.data.length).toBe(1);
      expect(result.data.data[0].type).toBe('USER.LOGIN');
    });
  });

  describe('Performance', () => {
    it('should complete depth 2 query in < 50ms', async () => {
      const builder = createLinearFlowCartridge('perf-test', 100, 'PERF');
      builder.writeTo(cartridgePath);

      const { durationMs } = await measureTime(async () => {
        await queryTool.execute({
          queryType: 'subgraph',
          cartridgePath,
          anchorNodeId: 'node-50',
          depth: 2
        });
      });

      expect(durationMs).toBeLessThan(50);
    });

    it('should complete depth 5 query in < 500ms', async () => {
      const builder = createLinearFlowCartridge('perf-test', 100, 'PERF');
      builder.writeTo(cartridgePath);

      const { durationMs } = await measureTime(async () => {
        await queryTool.execute({
          queryType: 'subgraph',
          cartridgePath,
          anchorNodeId: 'node-50',
          depth: 5
        });
      });

      expect(durationMs).toBeLessThan(500);
    });

    it('should cache repeated queries', async () => {
      const builder = createLinearFlowCartridge('cache-test', 50, 'CACHE');
      builder.writeTo(cartridgePath);

      // First query
      const firstResult = await measureTime(async () => {
        return queryTool.execute({
          queryType: 'subgraph',
          cartridgePath,
          anchorNodeId: 'node-25',
          depth: 3
        });
      });

      // Second query (should be cached)
      const secondResult = await measureTime(async () => {
        return queryTool.execute({
          queryType: 'subgraph',
          cartridgePath,
          anchorNodeId: 'node-25',
          depth: 3
        });
      });

      // Cached query should be faster
      expect(secondResult.durationMs).toBeLessThanOrEqual(firstResult.durationMs);
      expect(secondResult.result.data.metadata?.cached).toBe(true);
    });
  });
});
