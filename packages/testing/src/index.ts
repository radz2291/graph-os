/**
 * @graph-os/testing
 * 
 * Testing framework for Graph-OS cartridges and nodes.
 * Provides MCP tools for integration testing, unit testing, and regression testing.
 */

// Types
export type {
  Signal,
  TestScenarioInput,
  TestScenarioOutput,
  VerifyNodeInput,
  VerifyNodeOutput,
  SnapshotData,
  SnapshotRegressionInput,
  SnapshotRegressionOutput,
  SnapshotDiff,
  MCPToolResult,
  MCPToolDefinition,
  MCPParameterSchema,
  TestRunnerConfig,
  TestResult
} from './types';

// Framework
export { SignalCapture } from './framework/SignalCapture';
export { SnapshotManager } from './framework/SnapshotManager';
export { TestRunner } from './framework/TestRunner';

// MCP Tools
export { TestScenarioTool, createTestScenarioTool } from './tools/testScenario';
export { VerifyNodeTool, createVerifyNodeTool } from './tools/verifyNode';
export { SnapshotRegressionTool, createSnapshotRegressionTool } from './tools/snapshotRegression';

// Import tools for registration
import { createTestScenarioTool } from './tools/testScenario';
import { createVerifyNodeTool } from './tools/verifyNode';
import { createSnapshotRegressionTool } from './tools/snapshotRegression';

// Tool interface type
interface MCPToolLike {
  definition: { name: string };
  execute: (input: unknown) => Promise<unknown>;
}

/**
 * Register all testing tools with an MCP tool registry
 */
export function registerTestingTools(registry: {
  register: (tool: MCPToolLike) => void;
}): void {
  const tools = getTestingTools();
  for (const tool of tools) {
    registry.register(tool as MCPToolLike);
  }
}

/**
 * Get all testing tools as an array
 */
export function getTestingTools(): MCPToolLike[] {
  return [
    createTestScenarioTool() as unknown as MCPToolLike,
    createVerifyNodeTool() as unknown as MCPToolLike,
    createSnapshotRegressionTool() as unknown as MCPToolLike
  ];
}
