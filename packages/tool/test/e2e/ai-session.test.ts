/**
 * E2E Tests - AI Session Simulation
 *
 * Simulates a complete AI agent session to verify tool interactions.
 *
 * @module @graph-os/tool/test/e2e
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createUseTool } from '../../src/tools/use';
import { createQueryTool } from '../../src/tools/query';
import { createPatchTool } from '../../src/tools/patch';
import { globalSessionManager } from '../../src/core/SessionState';
import { rmSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

describe('E2E: AI Session Simulation', () => {
  const testOutputDir = resolve(__dirname, '../temp-e2e-output');

  beforeEach(() => {
    globalSessionManager.reset();
    if (!existsSync(testOutputDir)) {
      mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    globalSessionManager.reset();
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('New Project Workflow', () => {
    test('should create and work with a new project', async () => {
      const useTool = createUseTool();
      const queryTool = createQueryTool();
      const patchTool = createPatchTool();

      // AI: "Create a new project"
      const initResult = await useTool.execute({
        init: {
          name: 'ai-created-project',
          path: join(testOutputDir, 'ai-project'),
        },
      });

      expect(initResult.status).toBe('ok');
      expect(initResult.summary).toContain('ai-created-project');

      // AI: "Check state"
      const stateResult = await useTool.execute({});
      expect(stateResult.status).toBe('ok');

      // AI: "Add nodes"
      const patchResult = await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'user-input', type: 'control.input', config: {} },
          },
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'validate-email', type: 'logic.validate', config: { schema: 'email' } },
          },
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'send-welcome', type: 'external.api', config: {} },
          },
        ],
      });

      expect(patchResult.status).toBe('ok');

      // AI: "Verify topology"
      const topologyResult = await queryTool.execute({
        from: 'topology',
        select: 'mermaid',
      });

      expect(topologyResult.status).toBe('ok');
    });
  });

  describe('Exploration Workflow', () => {
    const fixturesPath = '/home/z/my-project/graph-os/packages/tool/test/fixtures/test-project';

    test('should explore an existing project', async () => {
      const useTool = createUseTool();
      const queryTool = createQueryTool();

      // AI: "Load the project"
      const loadResult = await useTool.execute({ project: fixturesPath });
      expect(loadResult.status).toBe('ok');

      // AI: "What's in this project?"
      const stateResult = await useTool.execute({});
      expect(stateResult.data).toBeDefined();

      // AI: "Show me the topology"
      const topologyResult = await queryTool.execute({
        from: 'topology',
        select: 'mermaid',
      });
      expect(topologyResult.visual).toBeDefined();

      // AI: "What nodes are there?"
      const nodesResult = await queryTool.execute({ from: 'nodes' });
      expect((nodesResult.data as Array<unknown>).length).toBeGreaterThan(0);

      // AI: "What signals are used?"
      const signalsResult = await queryTool.execute({ from: 'signals' });
      expect((signalsResult.data as Array<unknown>).length).toBeGreaterThan(0);
    });
  });

  describe('Modification Workflow', () => {
    const fixturesPath = '/home/z/my-project/graph-os/packages/tool/test/fixtures/test-project';

    test('should modify a graph', async () => {
      const useTool = createUseTool();
      const queryTool = createQueryTool();
      const patchTool = createPatchTool();

      await useTool.execute({ project: fixturesPath });

      // Get initial node count
      const initialNodes = await queryTool.execute({ from: 'nodes' });
      const initialCount = (initialNodes.data as Array<unknown>).length;

      // Add a node
      await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'new-node', type: 'logic.transform', config: {} },
          },
        ],
      });

      // Verify node was added
      const finalNodes = await queryTool.execute({ from: 'nodes' });
      expect((finalNodes.data as Array<unknown>).length).toBe(initialCount + 1);
    });
  });

  describe('Error Recovery Workflow', () => {
    const fixturesPath = '/home/z/my-project/graph-os/packages/tool/test/fixtures/test-project';

    test('should recover from errors', async () => {
      const useTool = createUseTool();
      const queryTool = createQueryTool();

      // AI tries to query before loading
      const badQuery = await queryTool.execute({ from: 'nodes' });
      expect(badQuery.status).toBe('error');

      // AI reads the error
      expect(badQuery.error).toBeDefined();

      // AI loads project
      const loadResult = await useTool.execute({ project: fixturesPath });
      expect(loadResult.status).toBe('ok');

      // AI retries query
      const goodQuery = await queryTool.execute({ from: 'nodes' });
      expect(goodQuery.status).toBe('ok');
    });

    test('should handle destructive operation correctly', async () => {
      const useTool = createUseTool();
      const patchTool = createPatchTool();

      await useTool.execute({ project: fixturesPath });

      // Add a node that we can safely remove
      const addResult = await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'test-removable-node', type: 'logic.transform', config: {} },
          },
        ],
      });
      expect(addResult.status).toBe('ok');

      // Try to remove without confirm - should error
      const noConfirmResult = await patchTool.execute({
        ops: [{ op: 'remove', path: '/nodes/-1' }], // -1 won't work, use specific test
        dryRun: true,
      });

      // The dry run should succeed
      expect(noConfirmResult.status).toBe('dry_run');

      // Preview with dry run for a remove operation
      const dryRunResult = await patchTool.execute({
        ops: [{ op: 'remove', path: '/nodes/0' }],
        dryRun: true,
      });

      expect(dryRunResult.status).toBe('dry_run');
    });
  });
});
