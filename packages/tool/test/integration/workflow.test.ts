/**
 * Integration Tests - Full Workflow
 *
 * Basic integration tests for tool interactions.
 *
 * @module @graph-os/tool/test/integration
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createUseTool } from '../../src/tools/use';
import { createQueryTool } from '../../src/tools/query';
import { createPatchTool } from '../../src/tools/patch';
import { globalSessionManager } from '../../src/core/SessionState';

describe('Integration: Full Workflow', () => {
  let useTool: ReturnType<typeof createUseTool>;
  let queryTool: ReturnType<typeof createQueryTool>;
  let patchTool: ReturnType<typeof createPatchTool>;

  // Use the fixture that exists
  const fixturesPath = '/home/z/my-project/graph-os/packages/tool/test/fixtures/test-project';

  beforeEach(() => {
    useTool = createUseTool();
    queryTool = createQueryTool();
    patchTool = createPatchTool();
    globalSessionManager.reset();
  });

  afterEach(() => {
    globalSessionManager.reset();
  });

  describe('Session Flow', () => {
    test('should load project and query state', async () => {
      // Load project
      const loadResult = await useTool.execute({
        project: fixturesPath,
      });

      expect(loadResult.status).toBe('ok');
      expect(loadResult.summary).toContain('test-project');

      // Query state
      const stateResult = await useTool.execute({});
      expect(stateResult.status).toBe('ok');
    });

    test('should error without loaded project', async () => {
      const queryResult = await queryTool.execute({ from: 'nodes' });
      expect(queryResult.status).toBe('error');
    });

    test('should load and maintain session state', async () => {
      await useTool.execute({ project: fixturesPath });

      expect(globalSessionManager.isInitialized()).toBe(true);
    });
  });

  describe('Query Flow', () => {
    test('should query nodes after loading project', async () => {
      await useTool.execute({ project: fixturesPath });

      const nodesResult = await queryTool.execute({ from: 'nodes' });
      expect(nodesResult.status).toBe('ok');
      expect(Array.isArray(nodesResult.data)).toBe(true);
    });

    test('should query topology', async () => {
      await useTool.execute({ project: fixturesPath });

      const topologyResult = await queryTool.execute({
        from: 'topology',
        select: 'mermaid',
      });

      expect(topologyResult.status).toBe('ok');
      expect(topologyResult.visual).toContain('graph LR');
    });

    test('should query cartridge', async () => {
      await useTool.execute({ project: fixturesPath });

      const cartridgeResult = await queryTool.execute({
        from: 'cartridge',
        select: 'summary',
      });

      expect(cartridgeResult.status).toBe('ok');
    });

    test('should query signals', async () => {
      await useTool.execute({ project: fixturesPath });

      const signalsResult = await queryTool.execute({ from: 'signals' });
      expect(signalsResult.status).toBe('ok');
    });
  });

  describe('Patch Flow', () => {
    test('should add node via patch', async () => {
      await useTool.execute({ project: fixturesPath });

      const patchResult = await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'test-node-1', type: 'logic.transform', config: {} },
          },
        ],
      });

      expect(patchResult.status).toBe('ok');

      // Verify node was added
      const nodesResult = await queryTool.execute({ from: 'nodes' });
      const nodes = nodesResult.data as Array<{ id: string }>;
      expect(nodes.some(n => n.id === 'test-node-1')).toBe(true);
    });

    test('should support dry run mode', async () => {
      await useTool.execute({ project: fixturesPath });

      const dryRunResult = await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'dry-run-node', type: 'logic.transform', config: {} },
          },
        ],
        dryRun: true,
      });

      expect(dryRunResult.status).toBe('dry_run');
    });

    test('should require confirm for destructive ops', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await patchTool.execute({
        ops: [{ op: 'remove', path: '/nodes/0' }],
      });

      expect(result.status).toBe('error');
    });
  });

  describe('Cartridge Switching', () => {
    test('should switch between cartridges', async () => {
      await useTool.execute({ project: fixturesPath });

      const switchResult = await useTool.execute({ cartridge: 'auth' });
      expect(switchResult.status).toBe('ok');

      const switchBackResult = await useTool.execute({ cartridge: 'main' });
      expect(switchBackResult.status).toBe('ok');
    });

    test('should error for non-existent cartridge', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await useTool.execute({ cartridge: 'non-existent' });
      expect(result.status).toBe('error');
    });
  });

  describe('Error Recovery', () => {
    test('should recover from session not initialized', async () => {
      // Try query without project
      const errorResult = await queryTool.execute({ from: 'nodes' });
      expect(errorResult.status).toBe('error');

      // Load project and retry
      await useTool.execute({ project: fixturesPath });
      const successResult = await queryTool.execute({ from: 'nodes' });
      expect(successResult.status).toBe('ok');
    });

    test('should handle duplicate node ID', async () => {
      await useTool.execute({ project: fixturesPath });

      // Add a node
      await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'duplicate-test', type: 'logic.transform', config: {} },
          },
        ],
      });

      // Try to add duplicate
      const result = await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'duplicate-test', type: 'logic.transform', config: {} },
          },
        ],
      });

      expect(result.status).toBe('error');
    });
  });
});
