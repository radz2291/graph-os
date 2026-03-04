/**
 * Integration Tests - Caching
 *
 * Tests cache behavior across tools.
 *
 * @module @graph-os/tool/test/integration
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createUseTool } from '../../src/tools/use';
import { createQueryTool } from '../../src/tools/query';
import { createPatchTool } from '../../src/tools/patch';
import { globalSessionManager } from '../../src/core/SessionState';
import { globalCacheManager, CACHE_TAGS } from '../../src/core/CacheManager';

describe('Integration: Caching', () => {
  let useTool: ReturnType<typeof createUseTool>;
  let queryTool: ReturnType<typeof createQueryTool>;
  let patchTool: ReturnType<typeof createPatchTool>;

  const fixturesPath = '/home/z/my-project/graph-os/packages/tool/test/fixtures/test-project';

  beforeEach(() => {
    useTool = createUseTool();
    queryTool = createQueryTool();
    patchTool = createPatchTool();
    globalSessionManager.reset();
    globalCacheManager.clear();
  });

  afterEach(() => {
    globalSessionManager.reset();
    globalCacheManager.clear();
  });

  describe('Query Caching', () => {
    test('should cache query results', async () => {
      await useTool.execute({ project: fixturesPath });

      // First query
      const result1 = await queryTool.execute({ from: 'nodes' });
      expect(result1.status).toBe('ok');

      // Second query should hit cache
      const result2 = await queryTool.execute({ from: 'nodes' });
      expect(result2.status).toBe('ok');

      // Results should be the same
      expect(result1.data).toEqual(result2.data);
    });

    test('should bypass cache with fresh: true', async () => {
      await useTool.execute({ project: fixturesPath });

      // First query
      await queryTool.execute({ from: 'nodes' });

      // Query with fresh: true
      const freshResult = await queryTool.execute({
        from: 'nodes',
        fresh: true,
      });

      expect(freshResult.status).toBe('ok');
    });

    test('should cache different query types separately', async () => {
      await useTool.execute({ project: fixturesPath });

      const nodesResult = await queryTool.execute({ from: 'nodes' });
      const wiresResult = await queryTool.execute({ from: 'wires' });

      expect(nodesResult.status).toBe('ok');
      expect(wiresResult.status).toBe('ok');
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate cache on patch operations', async () => {
      await useTool.execute({ project: fixturesPath });

      // Query nodes (cached)
      const beforeNodes = await queryTool.execute({ from: 'nodes' });
      const beforeCount = (beforeNodes.data as Array<unknown>).length;

      // Patch: add a node
      await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/nodes/-',
            value: { id: 'cache-test-node', type: 'logic.transform', config: {} },
          },
        ],
      });

      // Query again - should reflect changes
      const afterNodes = await queryTool.execute({ from: 'nodes' });
      const afterCount = (afterNodes.data as Array<unknown>).length;

      expect(afterCount).toBe(beforeCount + 1);
    });

    test('should invalidate specific cache tags', () => {
      globalCacheManager.set('test-key-1', 'data1', 60000, [CACHE_TAGS.NODES]);
      globalCacheManager.set('test-key-2', 'data2', 60000, [CACHE_TAGS.WIRES]);

      globalCacheManager.invalidate([CACHE_TAGS.NODES]);

      expect(globalCacheManager.get('test-key-1')).toBeNull();
      expect(globalCacheManager.get('test-key-2')).toBe('data2');
    });

    test('should clear all cache on project load', async () => {
      await useTool.execute({ project: fixturesPath });

      // Populate cache
      await queryTool.execute({ from: 'nodes' });

      // Load project again
      await useTool.execute({ project: fixturesPath });

      // No errors should occur
    });
  });

  describe('Cache Manager', () => {
    test('should set and get cached values', () => {
      const key = 'test-key';
      const data = { foo: 'bar' };

      globalCacheManager.set(key, data, 60000, ['test']);
      const cached = globalCacheManager.get<typeof data>(key);

      expect(cached).toEqual(data);
    });

    test('should expire cached values', async () => {
      const key = 'expiring-key';
      const data = { value: 123 };

      // Set with very short TTL
      globalCacheManager.set(key, data, 10, ['test']);

      // Should exist immediately
      expect(globalCacheManager.get(key)).toEqual(data);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should be expired
      expect(globalCacheManager.get(key)).toBeNull();
    });

    test('should clear all cache', () => {
      globalCacheManager.set('key1', 'data1', 60000, ['tag1']);
      globalCacheManager.set('key2', 'data2', 60000, ['tag2']);

      globalCacheManager.clear();

      expect(globalCacheManager.get('key1')).toBeNull();
      expect(globalCacheManager.get('key2')).toBeNull();
    });
  });
});
