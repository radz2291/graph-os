/**
 * Testing Types for Graph-OS
 * 
 * Self-contained types to avoid build-time dependencies
 */

// ============================================
// Core Signal Type (copied to avoid dependency)
// ============================================

export interface Signal {
  type: string;
  payload: unknown;
  timestamp: Date;
  sourceNodeId: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Cartridge Type (minimal for testing)
// ============================================

export interface Cartridge {
  version: string;
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    type: string;
    description?: string;
    config?: Record<string, unknown>;
  }>;
  wires: Array<{
    from: string;
    to: string;
    signalType: string;
  }>;
  inputs?: unknown[];
  outputs?: unknown[];
}

// ============================================
// Test Scenario Types (Integration Testing)
// ============================================

export interface TestScenarioInput {
  /** Path to the cartridge file */
  cartridgePath: string;
  /** Name of the scenario */
  scenario: string;
  /** Starting input signal */
  inputSignal: {
    type: string;
    payload?: Record<string, unknown>;
    timestamp?: string;
    sourceNodeId?: string;
  };
  /** Expected signal types to be emitted */
  expectedSignals: string[];
  /** Maximum execution time in ms (default: 5000) */
  timeout?: number;
  /** Whether to capture all signals (default: true) */
  captureAll?: boolean;
}

export interface TestScenarioOutput {
  /** Whether the test passed */
  passed: boolean;
  /** All signals received during execution */
  signalsReceived: Signal[];
  /** Signal types that were expected but not received */
  missingSignals: string[];
  /** Signals that were received but not expected */
  unexpectedSignals: Signal[];
  /** Execution time in ms */
  executionTime: number;
  /** Error messages if any */
  errors: string[];
  /** Scenario name */
  scenario: string;
}

// ============================================
// Verify Node Types (Unit Testing)
// ============================================

export interface VerifyNodeInput {
  /** Node type to test */
  nodeType: string;
  /** Node configuration */
  config: Record<string, unknown>;
  /** Input signal to process */
  inputSignal: {
    type: string;
    payload?: Record<string, unknown>;
    timestamp?: string;
    sourceNodeId?: string;
  };
  /** Expected output signal(s) */
  expectedOutput?: {
    type: string;
    payload?: Record<string, unknown>;
  } | null;
  /** Whether the node is expected to throw an error */
  expectError?: boolean;
  /** Expected error message pattern */
  expectedErrorPattern?: string;
}

export interface VerifyNodeOutput {
  /** Whether the test passed */
  passed: boolean;
  /** Actual output from the node */
  actualOutput: Signal | Signal[] | null;
  /** Expected output */
  expectedOutput: Signal | Signal[] | null;
  /** Execution time in ms (must be < 5ms) */
  executionTime: number;
  /** Error message if any */
  error?: string;
  /** Whether performance requirement was met */
  performanceMet: boolean;
}

// ============================================
// Snapshot Regression Types
// ============================================

export interface SnapshotData {
  /** Name of the cartridge */
  cartridgeName: string;
  /** Timestamp when snapshot was created */
  timestamp: string;
  /** Version of snapshot format */
  version: string;
  /** Signals captured during execution */
  signals: Signal[];
  /** Final state of nodes */
  nodeStates: Record<string, unknown>;
  /** Configuration hash for change detection */
  configHash: string;
}

export interface SnapshotRegressionInput {
  /** Path to the cartridge file */
  cartridgePath: string;
  /** Path to the baseline snapshot file */
  baselinePath: string;
  /** Input signals to replay */
  inputSignals: Array<{
    type: string;
    payload?: Record<string, unknown>;
  }>;
  /** Update baseline instead of comparing (default: false) */
  updateBaseline?: boolean;
  /** Whether to fail on missing baseline (default: true) */
  failOnMissingBaseline?: boolean;
}

export interface SnapshotDiff {
  /** Type of difference */
  type: 'signal_added' | 'signal_removed' | 'signal_changed' | 'state_changed';
  /** Description of the difference */
  description: string;
  /** Path to the changed field */
  path: string;
  /** Expected value */
  expected?: unknown;
  /** Actual value */
  actual?: unknown;
}

export interface SnapshotRegressionOutput {
  /** Whether the test passed (no differences) */
  passed: boolean;
  /** Whether a baseline exists */
  baselineExists: boolean;
  /** List of differences found */
  differences: SnapshotDiff[];
  /** Current snapshot */
  currentSnapshot: SnapshotData;
  /** Baseline snapshot (if exists) */
  baselineSnapshot?: SnapshotData;
  /** Path where baseline is stored */
  baselinePath: string;
}

// ============================================
// MCP Tool Types
// ============================================

export interface MCPToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: MCPParameterSchema[];
  returnType: string;
}

export interface MCPParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
  enum?: unknown[];
}

// ============================================
// Test Runner Types
// ============================================

export interface TestRunnerConfig {
  timeout: number;
  captureAllSignals: boolean;
  validateCartridges: boolean;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}
