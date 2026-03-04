/**
 * Result Assertions - Test utility for asserting tool results
 * 
 * @module test/utils
 */

import { expect } from 'vitest';
import type { MCPToolResult } from '../../src/core/MCPTool';

/**
 * Assert that a tool result is successful
 */
export function assertSuccess<T>(result: MCPToolResult<T>): T {
  expect(result.success).toBe(true);
  expect(result.error).toBeUndefined();
  expect(result.data).toBeDefined();
  return result.data!;
}

/**
 * Assert that a tool result failed
 */
export function assertFailure<T>(result: MCPToolResult<T>): string {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  return result.error!;
}

/**
 * Assert that a tool result has warnings
 */
export function assertHasWarnings<T>(result: MCPToolResult<T>, minCount: number = 1): void {
  expect(result.data?.warnings).toBeDefined();
  expect(result.data!.warnings.length).toBeGreaterThanOrEqual(minCount);
}

/**
 * Assert performance within bounds
 */
export function assertPerformance(
  actualMs: number,
  maxMs: number,
  operation: string
): void {
  expect(actualMs).toBeLessThan(maxMs);
  console.log(`✓ Performance: ${operation} completed in ${actualMs}ms (max: ${maxMs}ms)`);
}

/**
 * Assert cartridge structure
 */
export function assertCartridgeStructure(cartridge: {
  version: string;
  name: string;
  nodes: unknown[];
  wires: unknown[];
}): void {
  expect(cartridge.version).toBeDefined();
  expect(cartridge.name).toBeDefined();
  expect(Array.isArray(cartridge.nodes)).toBe(true);
  expect(Array.isArray(cartridge.wires)).toBe(true);
}

/**
 * Assert node exists in cartridge
 */
export function assertNodeExists(
  cartridge: { nodes: Array<{ id: string }> },
  nodeId: string
): void {
  expect(cartridge.nodes.find(n => n.id === nodeId)).toBeDefined();
}

/**
 * Assert node does not exist in cartridge
 */
export function assertNodeNotExists(
  cartridge: { nodes: Array<{ id: string }> },
  nodeId: string
): void {
  expect(cartridge.nodes.find(n => n.id === nodeId)).toBeUndefined();
}

/**
 * Assert wire exists in cartridge
 */
export function assertWireExists(
  cartridge: { wires: Array<{ from: string; to: string; signalType: string }> },
  from: string,
  to: string,
  signalType: string
): void {
  expect(
    cartridge.wires.find(w => w.from === from && w.to === to && w.signalType === signalType)
  ).toBeDefined();
}

/**
 * Assert wire does not exist in cartridge
 */
export function assertWireNotExists(
  cartridge: { wires: Array<{ from: string; to: string; signalType: string }> },
  from: string,
  to: string
): void {
  expect(
    cartridge.wires.find(w => w.from === from && w.to === to)
  ).toBeUndefined();
}

/**
 * Assert node count
 */
export function assertNodeCount(
  cartridge: { nodes: unknown[] },
  expectedCount: number
): void {
  expect(cartridge.nodes.length).toBe(expectedCount);
}

/**
 * Assert wire count
 */
export function assertWireCount(
  cartridge: { wires: unknown[] },
  expectedCount: number
): void {
  expect(cartridge.wires.length).toBe(expectedCount);
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

/**
 * Run with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  message: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeout]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Create a test file and return its path
 */
export function createTestFile(content: string, extension: string = 'json'): string {
  const fs = require('fs');
  const path = require('path');
  const tempDir = '/tmp/graph-os-test';
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, `test-${Date.now()}.${extension}`);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

/**
 * Clean up test files
 */
export function cleanupTestFiles(): void {
  const fs = require('fs');
  const tempDir = '/tmp/graph-os-test';
  
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
}
