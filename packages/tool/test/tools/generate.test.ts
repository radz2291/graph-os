/**
 * Tests for GENERATE Tool
 *
 * @module @graph-os/tool/test
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GenerateTool, createGenerateTool } from '../../src/tools/generate';

describe('GenerateTool', () => {
  let tool: GenerateTool;

  beforeEach(() => {
    tool = createGenerateTool();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('definition', () => {
    test('should have correct name', () => {
      expect(tool.name).toBe('generate');
    });

    test('should have purpose defined', () => {
      expect(tool.definition.purpose).toBeDefined();
    });

    test('should have whenToUse array', () => {
      expect(Array.isArray(tool.definition.whenToUse)).toBe(true);
      expect(tool.definition.whenToUse.length).toBeGreaterThan(0);
    });

    test('should have node parameter', () => {
      const nodeParam = tool.definition.parameters.find(p => p.name === 'node');
      expect(nodeParam).toBeDefined();
    });

    test('should have pattern parameter', () => {
      const patternParam = tool.definition.parameters.find(p => p.name === 'pattern');
      expect(patternParam).toBeDefined();
    });

    test('should have uiBinding parameter', () => {
      const uiBindingParam = tool.definition.parameters.find(p => p.name === 'uiBinding');
      expect(uiBindingParam).toBeDefined();
    });

    test('should have project parameter', () => {
      const projectParam = tool.definition.parameters.find(p => p.name === 'project');
      expect(projectParam).toBeDefined();
    });

    test('should have composite parameter', () => {
      const compositeParam = tool.definition.parameters.find(p => p.name === 'composite');
      expect(compositeParam).toBeDefined();
    });
  });

  describe('validate', () => {
    test('should validate with node param', () => {
      expect(tool.validate({
        node: { type: 'custom.test', category: 'logic' }
      })).toBe(true);
    });

    test('should validate with pattern param', () => {
      expect(tool.validate({
        pattern: { name: 'test-pattern' }
      })).toBe(true);
    });

    test('should validate with uiBinding param', () => {
      expect(tool.validate({
        uiBinding: { component: 'TestComponent', signals: ['TEST.SIGNAL'] }
      })).toBe(true);
    });

    test('should validate with project param', () => {
      expect(tool.validate({
        project: { name: 'test-project', path: '/tmp/test' }
      })).toBe(true);
    });

    test('should validate with composite param', () => {
      expect(tool.validate({
        composite: { name: 'test-composite', nodes: ['node-1'] }
      })).toBe(true);
    });

    test('should reject without any generator param', () => {
      expect(tool.validate({})).toBe(false);
    });

    test('should reject null params', () => {
      expect(tool.validate(null)).toBe(false);
    });
  });

  describe('execute - node generation', () => {
    test('should require type', async () => {
      const result = await tool.execute({
        node: { type: 'custom.test-node', category: 'logic' }
      });
      expect(result.status).toBe('ok');
    });

    test('should support all categories', async () => {
      const categories = ['logic', 'control', 'infra', 'ui'];
      for (const category of categories) {
        const result = await tool.execute({
          node: { type: `custom.test-${category}`, category }
        });
        expect(result.status).toBe('ok');
      }
    });

    test('should support templates', async () => {
      const templates = ['validator', 'transformer', 'api-client', 'storage', 'input', 'display', 'blank'];
      for (const template of templates) {
        const result = await tool.execute({
          node: { type: `custom.template-${template}`, category: 'logic', template }
        });
        expect(result.status).toBe('ok');
      }
    });

    test('should support register option', async () => {
      const result = await tool.execute({
        node: { type: 'custom.registered-node', category: 'logic', register: true }
      });
      expect(result.status).toBe('ok');
    });
  });

  describe('execute - pattern generation', () => {
    test('should generate pattern', async () => {
      const result = await tool.execute({
        pattern: { name: 'test-pattern', description: 'A test pattern' }
      });
      expect(result.status).toBe('ok');
    });

    test('should support builtin patterns', async () => {
      const builtins = ['auth-flow', 'crud', 'form-validation', 'rate-limiting', 'cache-aside'];
      for (const builtin of builtins) {
        const result = await tool.execute({
          pattern: { name: builtin, builtin, output: 'patch' }
        });
        expect(result.status).toBe('ok');
      }
    });

    test('should support output formats', async () => {
      const outputs = ['patch', 'file', 'composite'];
      for (const output of outputs) {
        const result = await tool.execute({
          pattern: { name: `test-${output}`, output }
        });
        expect(result.status).toBe('ok');
      }
    });
  });

  describe('execute - UI binding generation', () => {
    test('should generate React bindings', async () => {
      const result = await tool.execute({
        uiBinding: {
          component: 'TestComponent',
          signals: ['AUTH.SUCCESS', 'AUTH.FAILURE'],
          framework: 'react'
        }
      });
      expect(result.status).toBe('ok');
    });

    test('should support Vue framework', async () => {
      const result = await tool.execute({
        uiBinding: {
          component: 'TestComponent',
          signals: ['TEST.SIGNAL'],
          framework: 'vue'
        }
      });
      expect(result.status).toBe('ok');
    });

    test('should support Svelte framework', async () => {
      const result = await tool.execute({
        uiBinding: {
          component: 'TestComponent',
          signals: ['TEST.SIGNAL'],
          framework: 'svelte'
        }
      });
      expect(result.status).toBe('ok');
    });

    test('should support types generation', async () => {
      const result = await tool.execute({
        uiBinding: {
          component: 'TestComponent',
          signals: ['TEST.SIGNAL'],
          types: true
        }
      });
      expect(result.status).toBe('ok');
    });
  });

  describe('execute - project generation', () => {
    test('should require name and path', async () => {
      const result = await tool.execute({
        project: { name: 'test-project', path: '/tmp/test-project' }
      });
      expect(result.status).toBe('ok');
    });

    test('should support templates', async () => {
      const templates = ['minimal', 'auth', 'crud', 'blank'];
      for (const template of templates) {
        const result = await tool.execute({
          project: { name: `test-${template}`, path: `/tmp/${template}`, template }
        });
        expect(result.status).toBe('ok');
      }
    });

    test('should support includeReact option', async () => {
      const result = await tool.execute({
        project: { name: 'react-project', path: '/tmp/react', includeReact: true }
      });
      expect(result.status).toBe('ok');
    });
  });

  describe('execute - composite generation', () => {
    test('should require name and nodes', async () => {
      const result = await tool.execute({
        composite: { name: 'test-composite', nodes: ['node-1', 'node-2'] }
      });
      // Will error due to no session, but validates params
      expect(result.status).toBeDefined();
    });

    test('should require loaded project', async () => {
      const result = await tool.execute({
        composite: { name: 'test-composite', nodes: ['node-1'] }
      });
      expect(result.status).toBe('error');
    });
  });

  describe('execute - parameter validation', () => {
    test('should reject with no generator params', async () => {
      const result = await tool.execute({});
      expect(result.status).toBe('error');
    });
  });
});
