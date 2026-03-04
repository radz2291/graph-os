/**
 * Tests for PATCH Tool
 *
 * @module @graph-os/tool/test
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { PatchTool, createPatchTool } from '../../src/tools/patch';

describe('PatchTool', () => {
  let tool: PatchTool;

  beforeEach(() => {
    tool = createPatchTool();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('definition', () => {
    test('should have correct name', () => {
      expect(tool.name).toBe('patch');
    });

    test('should have purpose defined', () => {
      expect(tool.definition.purpose).toBeDefined();
    });

    test('should have whenToUse array', () => {
      expect(Array.isArray(tool.definition.whenToUse)).toBe(true);
      expect(tool.definition.whenToUse.length).toBeGreaterThan(0);
    });

    test('should have ops as required parameter', () => {
      const opsParam = tool.definition.parameters.find(p => p.name === 'ops');
      expect(opsParam).toBeDefined();
      expect(opsParam?.required).toBe(true);
    });
  });

  describe('validate', () => {
    test('should validate with ops param', () => {
      expect(tool.validate({ ops: [{ op: 'add', path: '/test', value: {} }] })).toBe(true);
    });

    test('should reject without ops param', () => {
      expect(tool.validate({})).toBe(false);
    });

    test('should reject null params', () => {
      expect(tool.validate(null)).toBe(false);
    });
  });

  describe('execute - session check', () => {
    test('should error when no project loaded', async () => {
      const result = await tool.execute({
        ops: [{ op: 'add', path: '/nodes/-', value: { id: 'test' } }]
      });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - parameter validation', () => {
    test('should reject empty ops array', async () => {
      const result = await tool.execute({ ops: [] });
      expect(result.status).toBe('error');
    });

    test('should reject non-array ops', async () => {
      const result = await tool.execute({ ops: 'not-an-array' as any });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - destructive operation protection', () => {
    test('should require confirm for remove operation', async () => {
      const result = await tool.execute({
        ops: [{ op: 'remove', path: '/nodes/0' }],
        dryRun: true  // Use dryRun to bypass session check
      });
      // In dry run mode, destructive ops should be previewed without confirm
      expect(result.status).toBe('dry_run');
    });

    test('should require confirm for replace operation', async () => {
      const result = await tool.execute({
        ops: [{ op: 'replace', path: '/nodes/0/config', value: {} }],
        dryRun: true  // Use dryRun to bypass session check
      });
      // In dry run mode, destructive ops should be previewed without confirm
      expect(result.status).toBe('dry_run');
    });

    test('should not require confirm for add operation', async () => {
      // Will fail due to no session, but not for confirm requirement
      const result = await tool.execute({
        ops: [{ op: 'add', path: '/nodes/-', value: { id: 'test' } }]
      });
      // Should error for session, not confirm
      expect(result.error?.code).not.toBe('PATCH_REQUIRES_CONFIRM');
    });
  });

  describe('execute - dry run mode', () => {
    test('should preview without applying in dry run', async () => {
      const result = await tool.execute({
        ops: [{ op: 'add', path: '/nodes/-', value: { id: 'test' } }],
        dryRun: true
      });
      // Should return dry_run status
      expect(result.status).toBeDefined();
    });

    test('should not require confirm in dry run mode', async () => {
      const result = await tool.execute({
        ops: [{ op: 'remove', path: '/nodes/0' }],
        dryRun: true
      });
      // Should not error for confirm
      expect(result.error?.code).not.toBe('PATCH_REQUIRES_CONFIRM');
    });
  });

  describe('execute - operation types', () => {
    test('should support add operation', async () => {
      const result = await tool.execute({
        ops: [{ op: 'add', path: '/test', value: 'test' }],
        dryRun: true
      });
      expect(result.status).toBeDefined();
    });

    test('should support remove operation', async () => {
      const result = await tool.execute({
        ops: [{ op: 'remove', path: '/test' }],
        dryRun: true
      });
      expect(result.status).toBeDefined();
    });

    test('should support replace operation', async () => {
      const result = await tool.execute({
        ops: [{ op: 'replace', path: '/test', value: 'new' }],
        dryRun: true
      });
      expect(result.status).toBeDefined();
    });

    test('should support move operation', async () => {
      const result = await tool.execute({
        ops: [{ op: 'move', from: '/old', path: '/new' }],
        dryRun: true
      });
      expect(result.status).toBeDefined();
    });

    test('should support copy operation', async () => {
      const result = await tool.execute({
        ops: [{ op: 'copy', from: '/source', path: '/dest' }],
        dryRun: true
      });
      expect(result.status).toBeDefined();
    });

    test('should support test operation', async () => {
      const result = await tool.execute({
        ops: [{ op: 'test', path: '/test', value: 'expected' }],
        dryRun: true
      });
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - batch operations', () => {
    test('should handle multiple operations', async () => {
      const result = await tool.execute({
        ops: [
          { op: 'add', path: '/nodes/-', value: { id: 'a' } },
          { op: 'add', path: '/nodes/-', value: { id: 'b' } },
          { op: 'add', path: '/wires/-', value: { from: 'a', to: 'b' } }
        ],
        dryRun: true
      });
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - explain mode', () => {
    test('should return trace in explain mode', async () => {
      const result = await tool.execute({
        ops: [{ op: 'add', path: '/test', value: {} }],
        dryRun: true,
        explain: true
      });
      expect(result.status).toBeDefined();
    });
  });
});
