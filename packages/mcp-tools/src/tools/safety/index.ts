/**
 * Safety Tools - Pre-flight validation and auto-healing
 *
 * @module @graph-os/mcp-tools/safety
 */

export {
  SimulateModificationTool,
  createSimulateModificationTool,
  type SimulationRequest,
  type SimulationResult,
  type SimulationScenario,
  type SimulationError,
  type SimulationWarning,
  type ExecutionTraceEntry,
  type SignalFlowGraph,
  type PerformanceMetrics,
  type ScenarioResult,
} from './simulateModification';

export {
  LintAndFixTool,
  createLintAndFixTool,
  type LintAndFixRequest,
  type LintAndFixResult,
  type LintIssue,
  type FixApplied,
  type LintCategory,
  type FixCategory,
} from './lintAndFix';
