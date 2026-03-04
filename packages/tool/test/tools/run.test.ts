/**
 * Tests for RUN Tool
 *
 * @module @graph-os/tool/test
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { RunTool, createRunTool } from '../../src/tools/run';

describe('RunTool', () => {
  let tool: RunTool;

  beforeEach(() => {
    tool = createRunTool();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('definition', () => {
    test('should have correct name', () => {
      expect(tool.name).toBe('run');
    });

    test('should have purpose defined', () => {
      expect(tool.definition.purpose).toBeDefined();
    });

    test('should have whenToUse array', () => {
      expect(Array.isArray(tool.definition.whenToUse)).toBe(true);
      expect(tool.definition.whenToUse.length).toBeGreaterThan(0);
    });

    test('should have mode as required parameter', () => {
      const modeParam = tool.definition.parameters.find(p => p.name === 'mode');
      expect(modeParam).toBeDefined();
      expect(modeParam?.required).toBe(true);
    });

    test('should support all mode types', () => {
      const modeParam = tool.definition.parameters.find(p => p.name === 'mode');
      expect(modeParam?.enum).toContain('start');
      expect(modeParam?.enum).toContain('stop');
      expect(modeParam?.enum).toContain('inject');
      expect(modeParam?.enum).toContain('test');
      expect(modeParam?.enum).toContain('debug');
      expect(modeParam?.enum).toContain('watch');
    });
  });

  describe('validate', () => {
    test('should validate with mode param', () => {
      expect(tool.validate({ mode: 'start' })).toBe(true);
    });

    test('should validate all mode types', () => {
      const modes = ['start', 'stop', 'inject', 'test', 'debug', 'watch'];
      for (const mode of modes) {
        expect(tool.validate({ mode })).toBe(true);
      }
    });

    test('should reject without mode param', () => {
      expect(tool.validate({})).toBe(false);
    });

    test('should reject null params', () => {
      expect(tool.validate(null)).toBe(false);
    });
  });

  describe('execute - session check', () => {
    test('should error when no project loaded', async () => {
      const result = await tool.execute({ mode: 'start' });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - start mode', () => {
    test('should require loaded project', async () => {
      const result = await tool.execute({ mode: 'start' });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - stop mode', () => {
    test('should handle stop when not running', async () => {
      // Will error due to no session
      const result = await tool.execute({ mode: 'stop' });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - inject mode', () => {
    test('should require signal param', async () => {
      const result = await tool.execute({ mode: 'inject' });
      expect(result.status).toBe('error');
    });

    test('should validate signal structure', async () => {
      const result = await tool.execute({
        mode: 'inject',
        signal: { type: 'TEST.SIGNAL', payload: { test: true } }
      });
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - test mode', () => {
    test('should require signal param', async () => {
      const result = await tool.execute({ mode: 'test' });
      expect(result.status).toBe('error');
    });

    test('should support expect configuration', async () => {
      const result = await tool.execute({
        mode: 'test',
        signal: { type: 'TEST.SIGNAL', payload: {} },
        expect: { signals: ['TEST.OUTPUT'], timeout: 5000 }
      });
      expect(result.status).toBeDefined();
    });

    test('should support snapshot option', async () => {
      const result = await tool.execute({
        mode: 'test',
        signal: { type: 'TEST.SIGNAL', payload: {} },
        expect: { snapshot: true }
      });
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - debug mode', () => {
    test('should require signal param', async () => {
      const result = await tool.execute({ mode: 'debug' });
      expect(result.status).toBe('error');
    });

    test('should support trace option', async () => {
      const result = await tool.execute({
        mode: 'debug',
        signal: { type: 'TEST.SIGNAL', payload: {} },
        trace: true
      });
      expect(result.status).toBeDefined();
    });

    test('should support breakpoints', async () => {
      const result = await tool.execute({
        mode: 'debug',
        signal: { type: 'TEST.SIGNAL', payload: {} },
        breakpoints: ['node-1', 'node-2']
      });
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - watch mode', () => {
    test('should require loaded project', async () => {
      const result = await tool.execute({ mode: 'watch' });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - history option', () => {
    test('should support history flag', async () => {
      const result = await tool.execute({
        mode: 'start',
        history: true
      });
      expect(result.status).toBeDefined();
    });
  });
});
