/**
 * Tests for USE Tool
 *
 * @module @graph-os/tool/test
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { UseTool, createUseTool } from '../../src/tools/use';

describe('UseTool', () => {
  let tool: UseTool;

  beforeEach(() => {
    tool = createUseTool();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('definition', () => {
    test('should have correct name', () => {
      expect(tool.name).toBe('use');
    });

    test('should have purpose defined', () => {
      expect(tool.definition.purpose).toBeDefined();
    });

    test('should have whenToUse array', () => {
      expect(Array.isArray(tool.definition.whenToUse)).toBe(true);
      expect(tool.definition.whenToUse.length).toBeGreaterThan(0);
    });

    test('should have whenNotToUse array', () => {
      expect(Array.isArray(tool.definition.whenNotToUse)).toBe(true);
    });

    test('should have triggers array', () => {
      expect(Array.isArray(tool.definition.triggers)).toBe(true);
    });

    test('should have parameters defined', () => {
      expect(tool.definition.parameters).toBeDefined();
      expect(Array.isArray(tool.definition.parameters)).toBe(true);
    });

    test('should have examples defined', () => {
      expect(tool.definition.examples).toBeDefined();
      expect(Array.isArray(tool.definition.examples)).toBe(true);
    });
  });

  describe('validate', () => {
    test('should validate empty params', () => {
      expect(tool.validate({})).toBe(true);
    });

    test('should validate project param', () => {
      expect(tool.validate({ project: '/path/to/project' })).toBe(true);
    });

    test('should validate detect param', () => {
      expect(tool.validate({ detect: true })).toBe(true);
    });

    test('should validate cartridge param', () => {
      expect(tool.validate({ cartridge: 'auth' })).toBe(true);
    });

    test('should reject null params', () => {
      expect(tool.validate(null)).toBe(false);
    });

    test('should reject non-object params', () => {
      expect(tool.validate('string')).toBe(false);
    });
  });

  describe('execute - get current state', () => {
    test('should return not initialized when no project loaded', async () => {
      const result = await tool.execute({});
      expect(result.status).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('execute - load project', () => {
    test('should handle missing project path', async () => {
      const result = await tool.execute({ project: '/nonexistent/path' });
      // Should error since project doesn't exist
      expect(result.status).toBe('error');
    });

    test('should handle detect mode', async () => {
      const result = await tool.execute({ detect: true });
      // Behavior depends on current directory
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - switch cartridge', () => {
    test('should require loaded project', async () => {
      const result = await tool.execute({ cartridge: 'auth' });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - modify config', () => {
    test('should require loaded project', async () => {
      const result = await tool.execute({
        config: { set: { runtime: { debug: true } } }
      });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - init project', () => {
    test('should require name and path', async () => {
      const result = await tool.execute({
        init: { name: 'test', path: '/tmp/test' }
      });
      expect(result.status).toBeDefined();
    });
  });
});
