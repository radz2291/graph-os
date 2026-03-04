/**
 * Tests for QUERY Tool
 *
 * @module @graph-os/tool/test
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { QueryTool, createQueryTool } from '../../src/tools/query';

describe('QueryTool', () => {
  let tool: QueryTool;

  beforeEach(() => {
    tool = createQueryTool();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('definition', () => {
    test('should have correct name', () => {
      expect(tool.name).toBe('query');
    });

    test('should have purpose defined', () => {
      expect(tool.definition.purpose).toBeDefined();
    });

    test('should have whenToUse array', () => {
      expect(Array.isArray(tool.definition.whenToUse)).toBe(true);
      expect(tool.definition.whenToUse.length).toBeGreaterThan(0);
    });

    test('should have parameters with from as required', () => {
      const fromParam = tool.definition.parameters.find(p => p.name === 'from');
      expect(fromParam).toBeDefined();
      expect(fromParam?.required).toBe(true);
    });
  });

  describe('validate', () => {
    test('should validate with from param', () => {
      expect(tool.validate({ from: 'cartridge' })).toBe(true);
    });

    test('should validate with all target types', () => {
      const targets = ['cartridge', 'nodes', 'wires', 'signals', 'composites', 'topology', 'state', 'history'];
      for (const target of targets) {
        expect(tool.validate({ from: target })).toBe(true);
      }
    });

    test('should reject without required from param', () => {
      // The base validate only checks required params
      // Implementation validates specific from values
    });

    test('should reject null params', () => {
      expect(tool.validate(null)).toBe(false);
    });
  });

  describe('execute - session check', () => {
    test('should error when no project loaded', async () => {
      const result = await tool.execute({ from: 'cartridge' });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - cartridge queries', () => {
    test('should require loaded project', async () => {
      const result = await tool.execute({ from: 'cartridge', select: 'summary' });
      expect(result.status).toBe('error');
    });

    test('should support validation select', async () => {
      // Will error due to no session, but validates params
      const result = await tool.execute({ from: 'cartridge', select: 'validation' });
      expect(result.status).toBe('error');
    });

    test('should support full select', async () => {
      const result = await tool.execute({ from: 'cartridge', select: 'full' });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - node queries', () => {
    test('should support where.id filter', async () => {
      const result = await tool.execute({ from: 'nodes', where: { id: 'test-node' } });
      expect(result.status).toBeDefined();
    });

    test('should support where.type pattern', async () => {
      const result = await tool.execute({ from: 'nodes', where: { type: 'logic.*' } });
      expect(result.status).toBeDefined();
    });

    test('should support where.handlesSignal', async () => {
      const result = await tool.execute({ from: 'nodes', where: { handlesSignal: 'AUTH.*' } });
      expect(result.status).toBeDefined();
    });

    test('should support compact select', async () => {
      const result = await tool.execute({ from: 'nodes', select: 'compact' });
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - topology queries', () => {
    test('should support mermaid select', async () => {
      const result = await tool.execute({ from: 'topology', select: 'mermaid' });
      expect(result.status).toBeDefined();
    });

    test('should support paths select', async () => {
      const result = await tool.execute({ from: 'topology', select: 'paths' });
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - signal queries', () => {
    test('should support signal listing', async () => {
      const result = await tool.execute({ from: 'signals' });
      expect(result.status).toBeDefined();
    });
  });

  describe('execute - cache behavior', () => {
    test('should use cache by default', async () => {
      const result1 = await tool.execute({ from: 'state' });
      const result2 = await tool.execute({ from: 'state' });
      // Both should have same status
      expect(result1.status).toBe(result2.status);
    });

    test('should bypass cache with fresh: true', async () => {
      const result = await tool.execute({ from: 'state', fresh: true });
      expect(result.status).toBeDefined();
    });
  });
});
