/**
 * E2E Tests - MCP Protocol
 *
 * Tests the MCP server protocol implementation.
 *
 * @module @graph-os/tool/test/e2e
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { MCPServer, createMCPServer } from '../../src/servers/MCPServer';
import { globalSessionManager } from '../../src/core/SessionState';

describe('E2E: MCP Protocol', () => {
  let mcpServer: MCPServer;

  beforeEach(() => {
    mcpServer = createMCPServer({
      name: 'test-mcp-server',
      version: '2.0.0',
    });
    globalSessionManager.reset();
  });

  afterEach(() => {
    globalSessionManager.reset();
  });

  describe('Protocol Handshake', () => {
    test('should handle initialize request', async () => {
      const response = await mcpServer.handleRequest({
        method: 'initialize',
      });

      expect(response.result).toBeDefined();
      expect(response.result).toHaveProperty('protocolVersion');
      expect(response.result).toHaveProperty('capabilities');
      expect(response.result).toHaveProperty('serverInfo');
    });

    test('should return server capabilities', async () => {
      const response = await mcpServer.handleRequest({
        method: 'initialize',
      });

      const result = response.result as { capabilities: Record<string, unknown> };
      expect(result.capabilities).toHaveProperty('tools');
    });

    test('should return server info', async () => {
      const response = await mcpServer.handleRequest({
        method: 'initialize',
      });

      const result = response.result as { serverInfo: { name: string; version: string } };
      expect(result.serverInfo.name).toBe('test-mcp-server');
      expect(result.serverInfo.version).toBe('2.0.0');
    });
  });

  describe('Tools List', () => {
    test('should handle tools/list request', async () => {
      const response = await mcpServer.handleRequest({
        method: 'tools/list',
      });

      expect(response.result).toBeDefined();
      const result = response.result as { tools: Array<{ name: string }> };
      expect(result.tools).toBeInstanceOf(Array);
      expect(result.tools.length).toBe(5);
    });

    test('should return all 5 tools', async () => {
      const response = await mcpServer.handleRequest({
        method: 'tools/list',
      });

      const result = response.result as { tools: Array<{ name: string }> };
      const toolNames = result.tools.map(t => t.name);

      expect(toolNames).toContain('use');
      expect(toolNames).toContain('query');
      expect(toolNames).toContain('patch');
      expect(toolNames).toContain('run');
      expect(toolNames).toContain('generate');
    });

    test('should include input schema for each tool', async () => {
      const response = await mcpServer.handleRequest({
        method: 'tools/list',
      });

      const result = response.result as { tools: Array<{ name: string; inputSchema: unknown }> };

      for (const tool of result.tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
      }
    });

    test('should mark required parameters', async () => {
      const response = await mcpServer.handleRequest({
        method: 'tools/list',
      });

      const result = response.result as { tools: Array<{ name: string; inputSchema: { required: string[] } }> };

      // query tool should have 'from' as required
      const queryTool = result.tools.find(t => t.name === 'query');
      expect(queryTool?.inputSchema.required).toContain('from');

      // patch tool should have 'ops' as required
      const patchTool = result.tools.find(t => t.name === 'patch');
      expect(patchTool?.inputSchema.required).toContain('ops');

      // run tool should have 'mode' as required
      const runTool = result.tools.find(t => t.name === 'run');
      expect(runTool?.inputSchema.required).toContain('mode');
    });
  });

  describe('Tools Call', () => {
    test('should handle tools/call for use tool', async () => {
      const result = await mcpServer.callTool({
        name: 'use',
        arguments: {},
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe('text');
    });

    test('should handle tools/call for query tool without session', async () => {
      const result = await mcpServer.callTool({
        name: 'query',
        arguments: { from: 'nodes' },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('SESSION_NOT_INITIALIZED');
    });

    test('should handle unknown tool', async () => {
      const result = await mcpServer.callTool({
        name: 'unknown-tool',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('TOOL_NOT_FOUND');
    });

    test('should handle invalid parameters', async () => {
      const result = await mcpServer.callTool({
        name: 'query',
        arguments: {}, // missing 'from' parameter
      });

      // Should either error or provide error response
      expect(result.isError).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should return error for unknown method', async () => {
      const response = await mcpServer.handleRequest({
        method: 'unknown/method',
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601);
    });

    test('should return error for invalid tools/call params', async () => {
      const response = await mcpServer.handleRequest({
        method: 'tools/call',
        params: {}, // missing name and arguments
      });

      // Should handle gracefully
      expect(response).toBeDefined();
    });

    test('should include error details in tool result', async () => {
      const result = await mcpServer.callTool({
        name: 'query',
        arguments: { from: 'nodes' },
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.status).toBe('error');
      expect(content.error).toBeDefined();
      expect(content.error.code).toBeDefined();
      expect(content.error.message).toBeDefined();
    });
  });

  describe('Response Format', () => {
    test('should return proper MCP response structure', async () => {
      const result = await mcpServer.callTool({
        name: 'use',
        arguments: {},
      });

      // MCP response structure
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');

      // Content array
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);

      // Content item
      const contentItem = result.content[0];
      expect(contentItem).toHaveProperty('type', 'text');
      expect(contentItem).toHaveProperty('text');
    });

    test('should return valid JSON in text content', async () => {
      const result = await mcpServer.callTool({
        name: 'use',
        arguments: {},
      });

      const text = result.content[0].text;
      expect(() => JSON.parse(text)).not.toThrow();

      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('status');
    });
  });

  describe('Session Persistence', () => {
    test('should maintain session across multiple calls', async () => {
      // First call: get state (not initialized)
      const result1 = await mcpServer.callTool({
        name: 'use',
        arguments: {},
      });

      const content1 = JSON.parse(result1.content[0].text);
      expect(content1.status).toBe('ok');

      // Second call: should maintain session
      const result2 = await mcpServer.callTool({
        name: 'use',
        arguments: {},
      });

      const content2 = JSON.parse(result2.content[0].text);
      expect(content2.status).toBe('ok');
    });
  });

  describe('Notifications', () => {
    test('should handle notifications/initialized silently', async () => {
      const response = await mcpServer.handleRequest({
        method: 'notifications/initialized',
      });

      expect(response.result).toEqual({});
    });
  });
});
