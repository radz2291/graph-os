/**
 * @graph-os/mcp-tools
 * 
 * MCP (Model Context Protocol) Tools for Graph-OS
 * 
 * Version 2.0.0 - The Molecular Layer
 * 
 * These tools allow AI to interact with Graph-OS as a "software operator"
 * rather than a text generator. AI uses these tools to:
 * - Create cartridges
 * - Register signals
 * - Validate architecture
 * - Run cartridges
 * - Build and test applications
 * 
 * @module @graph-os/mcp-tools
 * @version 2.0.0
 */

// =============================================================================
// Core Type Exports
// =============================================================================

export type {
  MCPTool,
  MCPToolResult,
  MCPToolDefinition,
  MCPParameterSchema,
} from './core/MCPTool';

export {
  BaseMCPTool,
} from './core/MCPTool';

// =============================================================================
// Core Component Exports
// =============================================================================

// Conflict Detection
export { ConflictDetector } from './core/ConflictDetector';
export type {
  NodeDefinition,
  WireDefinition,
  SignalDefinition,
  CompositeDefinition,
  SignalRegistry,
  CompositeRegistry,
  Cartridge,
  TopologyPatch,
  ConflictType,
  ConflictSeverity,
  Conflict,
  ConflictDetectionResult,
} from './core/ConflictDetector';
export type { PatchOperation as CorePatchOperation } from './core/ConflictDetector';

// Conflict Resolution
export { ConflictResolver } from './core/ConflictResolver';
export type {
  ResolutionStrategy,
  ConflictResolution,
  ConflictResolutionResult,
} from './core/ConflictResolver';

// Graph Merging
export { GraphMerger } from './core/GraphMerger';
export type {
  MergeStrategy,
  MergeOptions,
  MergeResult,
} from './core/GraphMerger';

// Boundary Detection
export { BoundaryDetector } from './core/BoundaryDetector';
export type {
  SignalType,
  SideEffect,
  Boundaries,
  ValidationReport,
  NodeCluster,
} from './core/BoundaryDetector';

// =============================================================================
// Registry Exports
// =============================================================================

export {
  MCPToolRegistry,
  globalToolRegistry,
} from './registry/ToolRegistry';

// =============================================================================
// Architecture Tools - Cartridge Management
// =============================================================================

export { CreateCartridgeTool } from './tools/architecture/createCartridge';
export { ValidateCartridgeTool } from './tools/architecture/validateCartridge';
export { RunCartridgeTool } from './tools/architecture/runCartridge';
export { VisualizeCartridgeTool } from './tools/architecture/visualizeCartridge';

// =============================================================================
// Architecture Tools - Signal Management
// =============================================================================

export { CreateSignalTool } from './tools/architecture/createSignal';
export { ListSignalsTool } from './tools/architecture/listSignals';
export { GetSignalTool } from './tools/architecture/getSignal';
export { RemoveSignalTool } from './tools/architecture/removeSignal';

// =============================================================================
// Architecture Tools - Project Management
// =============================================================================

export { ScaffoldProjectTool } from './tools/architecture/scaffoldProject';
export { BundleProjectTool } from './tools/architecture/bundleProject';
export { ProjectContextTool } from './tools/architecture/projectContext';

// =============================================================================
// Composite Tools
// =============================================================================

export { CreateCompositeTool } from './tools/composite/createComposite';
export { ListCompositesTool } from './tools/composite/listComposites';

// =============================================================================
// Testing Tools (Renamed - No mcp_ prefix)
// =============================================================================

export {
  TestScenarioTool,
  createTestScenarioTool,
  type TestScenarioInput,
  type TestScenarioOutput
} from './tools/testing/testScenario';

export {
  VerifyNodeTool,
  createVerifyNodeTool,
  type VerifyNodeInput,
  type VerifyNodeOutput
} from './tools/testing/verifyNode';

export {
  SnapshotRegressionTool,
  createSnapshotRegressionTool,
  type SnapshotRegressionInput,
  type SnapshotRegressionOutput
} from './tools/testing/snapshotRegression';

// =============================================================================
// Accelerator Tools (Phase 2 - Next-Gen)
// =============================================================================

export {
  ApplyTopologyPatchTool,
  createApplyTopologyPatchTool,
  type ApplyTopologyPatchInput,
  type ApplyTopologyPatchOutput,
  type PatchOperation
} from './tools/accelerator/applyTopologyPatch';

// =============================================================================
// Bridge Tools (Phase 2 - Next-Gen)
// =============================================================================

export {
  GenerateUIBindingTool,
  createGenerateUIBindingTool,
  type GenerateUIBindingInput,
  type GenerateUIBindingOutput,
  type GeneratedFile,
  type ComponentType,
  type Framework
} from './tools/bridge/generateUIBinding';

// =============================================================================
// Safety Tools (Phase 3 - Pre-flight Validation)
// =============================================================================

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
} from './tools/safety/simulateModification';

export {
  LintAndFixTool,
  createLintAndFixTool,
  type LintAndFixRequest,
  type LintAndFixResult,
  type LintIssue,
  type FixApplied,
  type LintCategory,
  type FixCategory,
} from './tools/safety/lintAndFix';

// =============================================================================
// Bridge Tools - Phase 4 (Extensibility)
// =============================================================================

export {
  ScaffoldNodeImplTool,
  createScaffoldNodeImplTool,
  type ScaffoldNodeImplRequest,
  type ScaffoldNodeImplResult,
  type GeneratedNodeFile,
  type NodeCategory,
  type NodeTemplateType,
} from './tools/bridge/scaffoldNodeImpl';

export {
  RefactorSemanticsTool,
  createRefactorSemanticsTool,
  type RefactorSemanticsRequest,
  type RefactorSemanticsResult,
  type RefactorType,
  type RefactorScope,
  type FileChange,
  type Change,
  type RefactorConflict,
  type RefactorSummary,
} from './tools/bridge/refactorSemantics';

// =============================================================================
// Precision Tools - Phase 4 (Query System)
// =============================================================================

export {
  QueryTopologyTool,
  createQueryTopologyTool,
  type TopologyQuery,
  type TopologyQueryResult,
  type SubgraphResult,
  type SignalQueryResult,
  type CompositeQueryResult,
  type PathResult,
  type QueryType,
  type OutputFormat,
  type TraversalMethod,
  type QueryFilter,
} from './tools/precision/queryTopology';

// =============================================================================
// Precision Tools - Phase 5 (Composite Extraction)
// =============================================================================

export {
  ExtractToCompositeTool,
  createExtractToCompositeTool,
  type ExtractCompositeRequest,
  type ExtractCompositeResult,
  type ExtractedComposite,
  type ParentGraphChanges,
  type Boundaries as ExtractionBoundaries,
  type SideEffect as ExtractionSideEffect,
  type SignalType as ExtractionSignalType,
  type NameCollision,
  type CircularDependency,
} from './tools/precision/extractToComposite';

// =============================================================================
// Servers (Phase 2 - Access Layers)
// =============================================================================

export {
  MCPServer,
  createMCPServer,
  HTTPServer,
  createHTTPServer,
  WSServer,
  createWSServer,
  SSEServer,
  createSSEServer,
  type MCPServerConfig,
  type HTTPServerConfig,
  type WSServerConfig,
  type SSEServerConfig,
} from './servers';

// =============================================================================
// Tool Registration
// =============================================================================

import { MCPToolRegistry } from './registry/ToolRegistry';
import { CreateCartridgeTool } from './tools/architecture/createCartridge';
import { CreateSignalTool } from './tools/architecture/createSignal';
import { ListSignalsTool } from './tools/architecture/listSignals';
import { GetSignalTool } from './tools/architecture/getSignal';
import { RemoveSignalTool } from './tools/architecture/removeSignal';
import { ValidateCartridgeTool } from './tools/architecture/validateCartridge';
import { VisualizeCartridgeTool } from './tools/architecture/visualizeCartridge';
import { RunCartridgeTool } from './tools/architecture/runCartridge';
import { ScaffoldProjectTool } from './tools/architecture/scaffoldProject';
import { BundleProjectTool } from './tools/architecture/bundleProject';
import { ProjectContextTool } from './tools/architecture/projectContext';
import { CreateCompositeTool } from './tools/composite/createComposite';
import { ListCompositesTool } from './tools/composite/listComposites';
import { TestScenarioTool } from './tools/testing/testScenario';
import { VerifyNodeTool } from './tools/testing/verifyNode';
import { SnapshotRegressionTool } from './tools/testing/snapshotRegression';
import { ApplyTopologyPatchTool } from './tools/accelerator/applyTopologyPatch';
import { GenerateUIBindingTool } from './tools/bridge/generateUIBinding';
import { ScaffoldNodeImplTool } from './tools/bridge/scaffoldNodeImpl';
import { RefactorSemanticsTool } from './tools/bridge/refactorSemantics';
import { SimulateModificationTool } from './tools/safety/simulateModification';
import { LintAndFixTool } from './tools/safety/lintAndFix';
import { QueryTopologyTool } from './tools/precision/queryTopology';
import { ExtractToCompositeTool } from './tools/precision/extractToComposite';

/**
 * Result of registering tools, including any warnings or errors.
 */
export interface ToolRegistrationResult {
  /** Number of tools successfully registered */
  registeredCount: number;
  /** List of tool names that were registered */
  toolNames: string[];
  /** Warnings encountered during registration */
  warnings: string[];
}

/**
 * Registers all built-in MCP tools with a registry.
 * 
 * This function registers all 23 tools:
 * - 10 architecture tools (cartridge, signal, project management)
 * - 2 composite tools
 * - 3 testing tools (renamed without mcp_ prefix)
 * - 1 accelerator tool (apply_topology_patch)
 * - 3 bridge tools (generate_ui_binding, scaffold_node_impl, refactor_semantics)
 * - 2 safety tools (simulate_modification, lint_and_fix)
 * - 1 precision tool (query_topology)
 * 
 * @param registry - The registry to register tools with
 * @returns Object with registration details including any warnings
 * 
 * @example
 * ```typescript
 * const registry = new MCPToolRegistry();
 * const result = registerBuiltInTools(registry);
 * 
 * if (result.warnings.length > 0) {
 *   console.warn('Registration warnings:', result.warnings);
 * }
 * 
 * console.log(`Registered ${result.registeredCount} tools`);
 * ```
 */
export function registerBuiltInTools(
  registry: MCPToolRegistry
): ToolRegistrationResult {
  const warnings: string[] = [];
  const toolNames: string[] = [];

  // Architecture tools
  const architectureTools = [
    new CreateCartridgeTool(),
    new CreateSignalTool(),
    new ListSignalsTool(),
    new GetSignalTool(),
    new RemoveSignalTool(),
    new ValidateCartridgeTool(),
    new VisualizeCartridgeTool(),
    new RunCartridgeTool(),
    new ScaffoldProjectTool(),
    new BundleProjectTool(),
    new ProjectContextTool(),
  ];

  // Composite tools
  const compositeTools = [
    new CreateCompositeTool(),
    new ListCompositesTool(),
  ];

  // Testing tools (renamed without mcp_ prefix)
  const testingTools = [
    new TestScenarioTool(),
    new VerifyNodeTool(),
    new SnapshotRegressionTool(),
  ];

  // Accelerator tools (next-gen)
  const acceleratorTools = [
    new ApplyTopologyPatchTool(),
  ];

  // Bridge tools (next-gen)
  const bridgeTools = [
    new GenerateUIBindingTool(),
    new ScaffoldNodeImplTool(),
    new RefactorSemanticsTool(),
  ];

  // Precision tools (next-gen)
  const precisionTools = [
    new QueryTopologyTool(),
    new ExtractToCompositeTool(),
  ];

  // Safety tools (next-gen)
  const safetyTools = [
    new SimulateModificationTool(),
    new LintAndFixTool(),
  ];

  // Register all tools
  [...architectureTools, ...compositeTools, ...testingTools, ...acceleratorTools, ...bridgeTools, ...safetyTools, ...precisionTools].forEach(tool => {
    registry.register(tool);
    toolNames.push(tool.definition.name);
  });

  return {
    registeredCount: toolNames.length,
    toolNames,
    warnings,
  };
}

/**
 * Get list of all built-in tool names.
 * 
 * @returns Array of 23 tool names
 * 
 * @example
 * ```typescript
 * const tools = getBuiltInToolNames();
 * console.log('Available tools:', tools.join(', '));
 * ```
 */
export function getBuiltInToolNames(): string[] {
  return [
    // Accelerator Tools (Next-Gen)
    'apply_topology_patch',
    // Bridge Tools (Next-Gen)
    'generate_ui_binding',
    'scaffold_node_impl',
    'refactor_semantics',
    // Safety Tools (Next-Gen)
    'simulate_modification',
    'lint_and_fix',
    // Precision Tools (Next-Gen)
    'query_topology',
    'extract_to_composite',
    // Architecture - Cartridge Management
    'create_cartridge',
    'validate_cartridge',
    'run_cartridge',
    'visualize_cartridge',
    // Architecture - Signal Management
    'create_signal',
    'list_signals',
    'get_signal',
    'remove_signal',
    // Architecture - Project Management
    'scaffold_project',
    'bundle_project',
    'project_context',
    // Composite
    'create_composite',
    'list_composites',
    // Testing (renamed without mcp_ prefix)
    'test_scenario',
    'verify_node',
    'snapshot_regression',
  ];
}

/**
 * Get detailed information about a specific tool.
 * 
 * @param toolName - Name of the tool to get info for
 * @returns Tool information object or null if not found
 * 
 * @example
 * ```typescript
 * const info = getToolInfo('create_cartridge');
 * console.log(info?.description);
 * console.log('Parameters:', info?.parameters.map(p => p.name).join(', '));
 * ```
 */
export function getToolInfo(toolName: string): {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  returnType: string;
  category?: string;
  bestFor?: string[];
  complexity?: string;
} | null {
  const toolInfos: Record<string, {
    name: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    returnType: string;
    category?: string;
    bestFor?: string[];
    complexity?: string;
  }> = {
    // Architecture - Cartridge Management
    create_cartridge: {
      name: 'create_cartridge',
      description: 'Creates a new Graph-OS cartridge file with proper structure. Use this to start building a new application or module.',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Cartridge name in kebab-case (e.g., "auth-flow")' },
        { name: 'description', type: 'string', required: true, description: 'Human-readable description of the cartridge' },
        { name: 'outputPath', type: 'string', required: true, description: 'File path where cartridge will be saved' },
        { name: 'nodes', type: 'array', required: false, description: 'Initial node definitions to include' },
        { name: 'wires', type: 'array', required: false, description: 'Initial wire connections to include' },
      ],
      returnType: 'CreateCartridgeResult',
      category: 'architecture',
      bestFor: ['cartridge initialization', 'project setup'],
      complexity: 'low',
    },
    validate_cartridge: {
      name: 'validate_cartridge',
      description: 'Validates a cartridge against all Graph-OS constraints including size limits, node types, and wire connections.',
      parameters: [
        { name: 'cartridgePath', type: 'string', required: true, description: 'Path to the cartridge file to validate' },
        { name: 'signalRegistryPath', type: 'string', required: false, description: 'Path to signal registry for signal validation' },
        { name: 'compositeRegistryPath', type: 'string', required: false, description: 'Path to composite registry for composite validation' },
      ],
      returnType: 'ValidateCartridgeResult',
      category: 'architecture',
      bestFor: ['validation', 'quality checks'],
      complexity: 'low',
    },
    run_cartridge: {
      name: 'run_cartridge',
      description: 'Loads and executes a cartridge, processing signals through nodes. Use this to test cartridge behavior.',
      parameters: [
        { name: 'cartridgePath', type: 'string', required: true, description: 'Path to the cartridge file to run' },
        { name: 'inputSignal', type: 'object', required: false, description: 'Initial signal to inject into the graph' },
        { name: 'signalRegistryPath', type: 'string', required: false, description: 'Path to signal registry file' },
        { name: 'interactive', type: 'boolean', required: false, description: 'Run in interactive mode (for CLI)' },
      ],
      returnType: 'RunCartridgeResult',
      category: 'architecture',
      bestFor: ['runtime execution', 'testing', 'development'],
      complexity: 'low',
    },
    visualize_cartridge: {
      name: 'visualize_cartridge',
      description: 'Generates a Mermaid.js flowchart diagram representing a Graph-OS cartridge\'s nodes and wires. Use this to visually understand architecture flow.',
      parameters: [
        { name: 'cartridgePath', type: 'string', required: true, description: 'Path to the cartridge file to visualize' },
      ],
      returnType: 'VisualizeCartridgeResult',
      category: 'architecture',
      bestFor: ['visualization', 'documentation', 'understanding'],
      complexity: 'low',
    },
    // Architecture - Signal Management
    create_signal: {
      name: 'create_signal',
      description: 'Registers a new signal type in the signal registry. Signals must follow NAMESPACE.ACTION format.',
      parameters: [
        { name: 'type', type: 'string', required: true, description: 'Signal type in NAMESPACE.ACTION format (e.g., "AUTH.LOGIN_REQUEST")' },
        { name: 'description', type: 'string', required: true, description: 'Human-readable description of the signal' },
        { name: 'registryPath', type: 'string', required: true, description: 'Path to the signal registry file' },
        { name: 'payloadSchema', type: 'object', required: false, description: 'JSON schema describing the signal payload' },
        { name: 'emittedBy', type: 'array', required: false, description: 'Node types that emit this signal' },
        { name: 'consumedBy', type: 'array', required: false, description: 'Node types that consume this signal' },
      ],
      returnType: 'CreateSignalResult',
      category: 'architecture',
      bestFor: ['signal registration', 'type definition'],
      complexity: 'low',
    },
    list_signals: {
      name: 'list_signals',
      description: 'Lists all registered signals from a signal registry.',
      parameters: [
        { name: 'registryPath', type: 'string', required: true, description: 'Path to the signal registry JSON file' },
      ],
      returnType: 'ListSignalsResult',
      category: 'architecture',
      bestFor: ['registry queries', 'inspection'],
      complexity: 'low',
    },
    get_signal: {
      name: 'get_signal',
      description: 'Gets detailed information and schema for a specific signal type.',
      parameters: [
        { name: 'type', type: 'string', required: true, description: 'Signal type to query (e.g., "USER.LOGIN")' },
        { name: 'registryPath', type: 'string', required: true, description: 'Path to the signal registry JSON file' },
      ],
      returnType: 'GetSignalResult',
      category: 'architecture',
      bestFor: ['signal details', 'registry queries'],
      complexity: 'low',
    },
    remove_signal: {
      name: 'remove_signal',
      description: 'Removes a signal type from the signal registry.',
      parameters: [
        { name: 'type', type: 'string', required: true, description: 'Signal type to remove (e.g., "USER.LOGIN")' },
        { name: 'registryPath', type: 'string', required: true, description: 'Path to the signal registry JSON file' },
      ],
      returnType: 'RemoveSignalResult',
      category: 'architecture',
      bestFor: ['signal cleanup', 'registry management'],
      complexity: 'low',
    },
    // Architecture - Project Management
    scaffold_project: {
      name: 'scaffold_project',
      description: 'Creates a new Graph-OS project with React + Vite scaffold configured for the Isomorphic Pattern. The generated project loads cartridges via HTTP fetch instead of Node.js imports.',
      parameters: [
        { name: 'projectName', type: 'string', required: true, description: 'Project name in kebab-case' },
        { name: 'outputPath', type: 'string', required: true, description: 'Directory path for the project' },
        { name: 'description', type: 'string', required: false, description: 'Project description' },
        { name: 'template', type: 'string', required: false, description: 'Starter template: minimal, input-display, or auth-flow' },
        { name: 'includeReactBridge', type: 'boolean', required: false, description: 'Include React bridge setup' },
        { name: 'author', type: 'string', required: false, description: 'Author name' },
      ],
      returnType: 'ScaffoldProjectResult',
      category: 'architecture',
      bestFor: ['project initialization', 'boilerplate generation'],
      complexity: 'low',
    },
    bundle_project: {
      name: 'bundle_project',
      description: 'Validates and bundles a Graph-OS project for production deployment. Runs validation and generates a build manifest with checksums.',
      parameters: [
        { name: 'projectPath', type: 'string', required: true, description: 'Path to project root' },
        { name: 'outputPath', type: 'string', required: false, description: 'Output directory (default: ./dist)' },
        { name: 'cartridgePath', type: 'string', required: false, description: 'Override main cartridge path' },
        { name: 'validate', type: 'boolean', required: false, description: 'Run validation before bundling' },
        { name: 'minify', type: 'boolean', required: false, description: 'Minify JSON outputs' },
        { name: 'sourceMaps', type: 'boolean', required: false, description: 'Generate source maps' },
      ],
      returnType: 'BundleProjectResult',
      category: 'architecture',
      bestFor: ['production builds', 'deployment'],
      complexity: 'low',
    },
    project_context: {
      name: 'project_context',
      description: 'Manages the active project context. Call with arguments to SET context. Call without arguments to GET context.',
      parameters: [
        { name: 'projectPath', type: 'string', required: false, description: 'Absolute path to set as the active context' },
        { name: 'autoDetect', type: 'boolean', required: false, description: 'Automatically detect context by walking up from the current working directory' },
      ],
      returnType: 'ProjectContextResult',
      category: 'architecture',
      bestFor: ['setting working directory', 'resolving relative paths'],
      complexity: 'low',
    },
    // Composite
    create_composite: {
      name: 'create_composite',
      description: 'Creates a composite cartridge that can be referenced by other cartridges. Composables enable reusable signal flow patterns.',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Composite name in kebab-case' },
        { name: 'description', type: 'string', required: true, description: 'Human-readable description' },
        { name: 'outputPath', type: 'string', required: true, description: 'File path for the composite' },
        { name: 'inputs', type: 'array', required: true, description: 'Input signal types the composite accepts' },
        { name: 'outputs', type: 'array', required: true, description: 'Output signal types the composite emits' },
        { name: 'nodes', type: 'array', required: false, description: 'Node definitions' },
        { name: 'wires', type: 'array', required: false, description: 'Wire definitions' },
      ],
      returnType: 'CreateCompositeResult',
      category: 'composite',
      bestFor: ['reusable components', 'modular architecture'],
      complexity: 'medium',
    },
    list_composites: {
      name: 'list_composites',
      description: 'Lists all available composites in a composite registry.',
      parameters: [
        { name: 'registryPath', type: 'string', required: true, description: 'Path to the composite registry file' },
      ],
      returnType: 'ListCompositesResult',
      category: 'composite',
      bestFor: ['discovery', 'registry inspection'],
      complexity: 'low',
    },
    // Testing (renamed without mcp_ prefix)
    test_scenario: {
      name: 'test_scenario',
      description: 'Run integration tests on cartridges to verify signal flows. Tests complete signal paths through the entire cartridge.',
      parameters: [
        { name: 'cartridgePath', type: 'string', required: true, description: 'Path to the cartridge to test' },
        { name: 'scenario', type: 'string', required: true, description: 'Name of the test scenario' },
        { name: 'inputSignal', type: 'object', required: true, description: 'Starting signal to inject' },
        { name: 'expectedSignals', type: 'array', required: true, description: 'Signal types expected during execution' },
        { name: 'timeout', type: 'number', required: false, description: 'Maximum execution time in ms (default: 5000)' },
      ],
      returnType: 'TestScenarioResult',
      category: 'testing',
      bestFor: ['integration testing', 'signal flow verification'],
      complexity: 'medium',
    },
    verify_node: {
      name: 'verify_node',
      description: 'Test individual nodes in isolation with < 5ms execution requirement. Use for rapid iteration during node development.',
      parameters: [
        { name: 'nodeType', type: 'string', required: true, description: 'Type of node to test' },
        { name: 'config', type: 'object', required: true, description: 'Node configuration' },
        { name: 'inputSignal', type: 'object', required: true, description: 'Input signal to process' },
        { name: 'expectedOutput', type: 'object', required: false, description: 'Expected output signal' },
        { name: 'expectError', type: 'boolean', required: false, description: 'Whether the node should throw an error' },
      ],
      returnType: 'VerifyNodeResult',
      category: 'testing',
      bestFor: ['unit testing', 'node development', 'rapid iteration'],
      complexity: 'low',
    },
    snapshot_regression: {
      name: 'snapshot_regression',
      description: 'Run regression tests using snapshots to detect any unintended changes in signal flow. Zero-tolerance comparison.',
      parameters: [
        { name: 'cartridgePath', type: 'string', required: true, description: 'Path to the cartridge to test' },
        { name: 'baselinePath', type: 'string', required: true, description: 'Path to the baseline snapshot file' },
        { name: 'inputSignals', type: 'array', required: true, description: 'Signals to replay for comparison' },
        { name: 'updateBaseline', type: 'boolean', required: false, description: 'Update baseline instead of compare' },
      ],
      returnType: 'SnapshotRegressionResult',
      category: 'testing',
      bestFor: ['regression testing', 'change detection'],
      complexity: 'medium',
    },
    // Safety Tools (Next-Gen)
    simulate_modification: {
      name: 'simulate_modification',
      description: 'Pre-flight validation with execution simulation. Validates modifications before applying them by running in-memory simulations, detecting circular dependencies, type mismatches, and performance bottlenecks.',
      parameters: [
        { name: 'cartridgePath', type: 'string', required: true, description: 'Path to the cartridge file to simulate' },
        { name: 'patch', type: 'object', required: false, description: 'Patch to apply in simulation (nodes, wires, signals)' },
        { name: 'signalRegistryPath', type: 'string', required: false, description: 'Path to signal registry for type validation' },
        { name: 'scenarios', type: 'array', required: false, description: 'Test scenarios to run' },
        { name: 'detectCircularDeps', type: 'boolean', required: false, description: 'Detect circular dependencies (default: true)' },
        { name: 'detectTypeMismatches', type: 'boolean', required: false, description: 'Detect type mismatches (default: true)' },
        { name: 'includeExecutionTrace', type: 'boolean', required: false, description: 'Include execution trace in result' },
        { name: 'includeSignalFlow', type: 'boolean', required: false, description: 'Include signal flow graph in result' },
      ],
      returnType: 'SimulationResult',
      category: 'safety',
      bestFor: ['pre-flight validation', 'safe modifications', 'testing changes', 'performance prediction'],
      complexity: 'high',
    },
    lint_and_fix: {
      name: 'lint_and_fix',
      description: 'Automatic linting and error correction for Graph-OS cartridges. Detects common issues like unregistered signals, duplicate nodes, circular dependencies, and provides auto-fix capabilities with safe, aggressive, or conservative strategies.',
      parameters: [
        { name: 'cartridgePath', type: 'string', required: true, description: 'Path to the cartridge file to lint' },
        { name: 'signalRegistryPath', type: 'string', required: false, description: 'Path to signal registry for validation' },
        { name: 'checkCategories', type: 'array', required: false, description: 'Categories to check: signals, wires, nodes, composites, registry, all' },
        { name: 'autoFix', type: 'boolean', required: false, description: 'Enable auto-fix (default: true)' },
        { name: 'fixCategory', type: 'string', required: false, description: 'Fix strategy: safe, aggressive, or conservative' },
        { name: 'autoRegisterSignals', type: 'boolean', required: false, description: 'Auto-register missing signals' },
        { name: 'deduplicateWires', type: 'boolean', required: false, description: 'Deduplicate wires' },
        { name: 'explainFixes', type: 'boolean', required: false, description: 'Explain fixes in result' },
      ],
      returnType: 'LintAndFixResult',
      category: 'safety',
      bestFor: ['code quality', 'auto-fix', 'validation', 'cleanup', 'maintainability'],
      complexity: 'medium',
    },
  };

  return toolInfos[toolName] || null;
}
