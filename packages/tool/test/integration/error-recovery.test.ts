/**
 * Integration Tests - Error Recovery
 *
 * Tests error handling and recovery across tools.
 *
 * @module @graph-os/tool/test/integration
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createUseTool } from '../../src/tools/use';
import { createQueryTool } from '../../src/tools/query';
import { createPatchTool } from '../../src/tools/patch';
import { createRunTool } from '../../src/tools/run';
import { globalSessionManager } from '../../src/core/SessionState';
import { formatError, ERROR_MESSAGES } from '../../src/core/ErrorMessages';

describe('Integration: Error Recovery', () => {
  let useTool: ReturnType<typeof createUseTool>;
  let queryTool: ReturnType<typeof createQueryTool>;
  let patchTool: ReturnType<typeof createPatchTool>;
  let runTool: ReturnType<typeof createRunTool>;

  const fixturesPath = '/home/z/my-project/graph-os/packages/tool/test/fixtures/test-project';

  beforeEach(() => {
    useTool = createUseTool();
    queryTool = createQueryTool();
    patchTool = createPatchTool();
    runTool = createRunTool();
    globalSessionManager.reset();
  });

  afterEach(() => {
    globalSessionManager.reset();
  });

  describe('Session Errors', () => {
    test('should error when using tools without project loaded', async () => {
      const queryResult = await queryTool.execute({ from: 'nodes' });
      expect(queryResult.status).toBe('error');
      expect(queryResult.error?.code).toBe('SESSION_NOT_INITIALIZED');

      const patchResult = await patchTool.execute({
        ops: [{ op: 'add', path: '/test', value: {} }],
      });
      expect(patchResult.status).toBe('error');

      const runResult = await runTool.execute({ mode: 'start' });
      expect(runResult.status).toBe('error');
    });

    test('should provide recovery suggestions', async () => {
      const result = await queryTool.execute({ from: 'nodes' });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeDefined();
    });

    test('should recover by loading project', async () => {
      // Error state
      const errorResult = await queryTool.execute({ from: 'nodes' });
      expect(errorResult.status).toBe('error');

      // Recovery: load project
      const loadResult = await useTool.execute({ project: fixturesPath });
      expect(loadResult.status).toBe('ok');

      // Now query should work
      const queryResult = await queryTool.execute({ from: 'nodes' });
      expect(queryResult.status).toBe('ok');
    });
  });

  describe('Patch Errors', () => {
    test('should handle invalid operation type', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await patchTool.execute({
        ops: [{ op: 'invalid' as unknown as 'add', path: '/test', value: {} }],
      });

      expect(result.status).toBe('error');
    });

    test('should handle missing required fields', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await patchTool.execute({
        ops: [{ op: 'add' as unknown as never }], // missing path and value
      });

      expect(result.status).toBe('error');
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

    test('should handle node not found for wire', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await patchTool.execute({
        ops: [
          {
            op: 'add',
            path: '/wires/-',
            value: {
              from: 'non-existent-node',
              to: 'another-non-existent',
              signalType: 'TEST.SIGNAL',
            },
          },
        ],
      });

      expect(result.status).toBe('error');
    });

    test('should require confirm for destructive ops', async () => {
      await useTool.execute({ project: fixturesPath });

      const removeResult = await patchTool.execute({
        ops: [{ op: 'remove', path: '/nodes/0' }],
      });

      expect(removeResult.status).toBe('error');

      const replaceResult = await patchTool.execute({
        ops: [{ op: 'replace', path: '/nodes/0/config', value: {} }],
      });

      expect(replaceResult.status).toBe('error');
    });
  });

  describe('Run Errors', () => {
    test('should handle inject without signal', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await runTool.execute({ mode: 'inject' });
      expect(result.status).toBe('error');
    });

    test('should handle test without signal', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await runTool.execute({ mode: 'test' });
      expect(result.status).toBe('error');
    });

    test('should handle debug without signal', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await runTool.execute({ mode: 'debug' });
      expect(result.status).toBe('error');
    });
  });

  describe('Query Errors', () => {
    test('should handle non-existent node query', async () => {
      await useTool.execute({ project: fixturesPath });

      const result = await queryTool.execute({
        from: 'nodes',
        where: { id: 'non-existent-node-id' },
      });

      // Empty result returns 'empty' status without data property
      expect(result.status).toBe('empty');
      expect(result.summary).toContain('No nodes found');
    });
  });

  describe('Error Message Formatting', () => {
    test('should format error with variables', () => {
      const formatted = formatError('PROJECT_NOT_FOUND', { path: '/some/path' });

      expect(formatted.code).toBe('PROJECT_NOT_FOUND');
      expect(formatted.message).toContain('/some/path');
      expect(formatted.suggestions.length).toBeGreaterThan(0);
    });

    test('should return unknown error for invalid code', () => {
      const formatted = formatError('INVALID_CODE');

      expect(formatted.code).toBe('UNKNOWN_ERROR');
    });

    test('should have all required error message fields', () => {
      for (const [code, definition] of Object.entries(ERROR_MESSAGES)) {
        expect(definition.code).toBe(code);
        expect(definition.message).toBeDefined();
        expect(definition.suggestions).toBeInstanceOf(Array);
        expect(definition.severity).toBeDefined();
      }
    });
  });

  describe('Recovery Workflows', () => {
    test('should recover from project not found', async () => {
      const badResult = await useTool.execute({
        project: '/non/existent/path',
      });

      expect(badResult.status).toBe('error');

      const goodResult = await useTool.execute({
        project: fixturesPath,
      });

      expect(goodResult.status).toBe('ok');
    });

    test('should recover from cartridge not found', async () => {
      await useTool.execute({ project: fixturesPath });

      const badResult = await useTool.execute({
        cartridge: 'non-existent',
      });

      expect(badResult.status).toBe('error');

      const goodResult = await useTool.execute({
        cartridge: 'auth',
      });

      expect(goodResult.status).toBe('ok');
    });
  });
});
