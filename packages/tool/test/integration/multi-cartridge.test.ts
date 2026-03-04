/**
 * Integration Tests - Multi-Cartridge
 *
 * Tests cartridge switching and multi-cartridge workflows.
 *
 * @module @graph-os/tool/test/integration
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createUseTool } from '../../src/tools/use';
import { createQueryTool } from '../../src/tools/query';
import { globalSessionManager } from '../../src/core/SessionState';

describe('Integration: Multi-Cartridge', () => {
  let useTool: ReturnType<typeof createUseTool>;
  let queryTool: ReturnType<typeof createQueryTool>;

  const fixturesPath = '/home/z/my-project/graph-os/packages/tool/test/fixtures/test-project';

  beforeEach(() => {
    useTool = createUseTool();
    queryTool = createQueryTool();
    globalSessionManager.reset();
  });

  afterEach(() => {
    globalSessionManager.reset();
  });

  describe('Cartridge Switching', () => {
    test('should switch between cartridges', async () => {
      // Load project
      const loadResult = await useTool.execute({ project: fixturesPath });
      expect(loadResult.status).toBe('ok');

      // Switch to auth cartridge
      const switchResult = await useTool.execute({ cartridge: 'auth' });
      expect(switchResult.status).toBe('ok');

      // Switch back to main
      const switchBackResult = await useTool.execute({ cartridge: 'main' });
      expect(switchBackResult.status).toBe('ok');
    });

    test('should error when switching to non-existent cartridge', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await useTool.execute({ cartridge: 'non-existent' });
      expect(result.status).toBe('error');
    });

    test('should query different nodes per cartridge', async () => {
      await useTool.execute({ project: fixturesPath });

      // Get main cartridge nodes
      const mainNodes = await queryTool.execute({ from: 'nodes' });
      expect(mainNodes.status).toBe('ok');

      // Switch to auth
      await useTool.execute({ cartridge: 'auth' });

      // Get auth cartridge nodes
      const authNodes = await queryTool.execute({ from: 'nodes' });
      expect(authNodes.status).toBe('ok');
    });

    test('should query different topologies per cartridge', async () => {
      await useTool.execute({ project: fixturesPath });

      // Get main topology
      const mainTopology = await queryTool.execute({
        from: 'topology',
        select: 'mermaid',
      });

      // Switch to auth
      await useTool.execute({ cartridge: 'auth' });

      // Get auth topology
      const authTopology = await queryTool.execute({
        from: 'topology',
        select: 'mermaid',
      });

      // Topologies should be different
      expect(mainTopology.visual).toBeDefined();
      expect(authTopology.visual).toBeDefined();
    });
  });

  describe('Cartridge Validation', () => {
    test('should validate cartridge on load', async () => {
      const loadResult = await useTool.execute({ project: fixturesPath });
      expect(loadResult.status).toBe('ok');
    });

    test('should query cartridge summary', async () => {
      await useTool.execute({ project: fixturesPath });

      const summaryResult = await queryTool.execute({
        from: 'cartridge',
        select: 'summary',
      });

      expect(summaryResult.status).toBe('ok');
    });

    test('should query full cartridge content', async () => {
      await useTool.execute({ project: fixturesPath });

      const fullResult = await queryTool.execute({
        from: 'cartridge',
        select: 'full',
      });

      expect(fullResult.status).toBe('ok');
      // Full cartridge data is returned in 'raw' property
      expect(fullResult.raw).toBeDefined();
    });

    test('should query validation status', async () => {
      await useTool.execute({ project: fixturesPath });

      const validationResult = await queryTool.execute({
        from: 'cartridge',
        select: 'validation',
      });

      expect(validationResult.status).toBe('ok');
    });
  });

  describe('Signal Registry', () => {
    test('should load signal registry', async () => {
      await useTool.execute({ project: fixturesPath });

      const signalsResult = await queryTool.execute({
        from: 'signals',
      });

      expect(signalsResult.status).toBe('ok');
      const signals = signalsResult.data as Array<{ type: string }>;
      expect(signals.length).toBeGreaterThan(0);
    });
  });
});
