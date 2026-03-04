/**
 * Graph-OS MCP Tools v2.0.0 - Comprehensive Example
 * 
 * This script demonstrates ALL 23 MCP tools by building a complete
 * ecommerce order processing flow.
 * 
 * Tools demonstrated:
 * 1. create_cartridge - Create cartridge
 * 2. apply_topology_patch - Add nodes/wires
 * 3. create_signal - Register signals
 * 4. list_signals - List signals
 * 5. get_signal - Get signal details
 * 6. validate_cartridge - Validate cartridge
 * 7. simulate_modification - Pre-flight validation
 * 8. lint_and_fix - Auto-fix issues
 * 9. query_topology - Query graph
 * 10. extract_to_composite - Extract composite
 * 11. scaffold_node_impl - Scaffold custom node
 * 12. generate_ui_binding - Generate React components
 * 13. refactor_semantics - Rename signals
 * 14. visualize_cartridge - Generate Mermaid diagram
 * 15. create_composite - Create composite manually
 * 16. list_composites - List composites
 * 17. run_cartridge - Run cartridge
 * 18. test_scenario - Test scenario
 * 19. verify_node - Verify node
 * 20. snapshot_regression - Snapshot testing
 * 21. scaffold_project - Scaffold project
 * 22. bundle_project - Bundle project
 * 23. remove_signal - Remove signal
 */

const {
  // Architecture tools
  CreateCartridgeTool,
  ValidateCartridgeTool,
  RunCartridgeTool,
  VisualizeCartridgeTool,
  CreateSignalTool,
  ListSignalsTool,
  GetSignalTool,
  RemoveSignalTool,
  ScaffoldProjectTool,
  BundleProjectTool,
  
  // Composite tools
  CreateCompositeTool,
  ListCompositesTool,
  
  // Testing tools
  TestScenarioTool,
  VerifyNodeTool,
  SnapshotRegressionTool,
  
  // Next-gen tools
  ApplyTopologyPatchTool,
  GenerateUIBindingTool,
  SimulateModificationTool,
  LintAndFixTool,
  ScaffoldNodeImplTool,
  RefactorSemanticsTool,
  QueryTopologyTool,
  ExtractToCompositeTool,
} = require('../../packages/mcp-tools/dist/index');

const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

const EXAMPLE_DIR = path.join(__dirname, 'ecommerce-flow');
const CARTRIDGES_DIR = path.join(EXAMPLE_DIR, 'cartridges');
const COMPOSITES_DIR = path.join(CARTRIDGES_DIR, 'composites');
const REGISTRIES_DIR = path.join(EXAMPLE_DIR, 'registries');
const NODES_DIR = path.join(EXAMPLE_DIR, 'nodes');
const COMPONENTS_DIR = path.join(EXAMPLE_DIR, 'components');
const REPORTS_DIR = path.join(EXAMPLE_DIR, 'reports');

const CARTRIDGE_PATH = path.join(CARTRIDGES_DIR, 'root.cartridge.json');
const SIGNAL_REGISTRY_PATH = path.join(REGISTRIES_DIR, 'signal-registry.json');
const COMPOSITE_REGISTRY_PATH = path.join(REGISTRIES_DIR, 'composite-registry.json');

// Report tracking
const toolUsageReport = [];

// =============================================================================
// Helper Functions
// =============================================================================

function logTool(toolName, description, result) {
  const entry = {
    tool: toolName,
    description,
    success: result.success,
    timestamp: new Date().toISOString(),
    duration: result.duration || 'N/A'
  };
  toolUsageReport.push(entry);
  
  const status = result.success ? '✅' : '❌';
  console.log(`  ${status} ${toolName}: ${description}`);
  if (!result.success) {
    console.log(`     Error: ${result.error}`);
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function measureTime(fn) {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  result.duration = `${duration}ms`;
  return result;
}

// =============================================================================
// Phase 1: Setup & Initialization
// =============================================================================

async function phase1_setup() {
  console.log('\n📁 Phase 1: Setup & Initialization');
  console.log('─'.repeat(50));
  
  // Create directories
  ensureDir(CARTRIDGES_DIR);
  ensureDir(COMPOSITES_DIR);
  ensureDir(REGISTRIES_DIR);
  ensureDir(NODES_DIR);
  ensureDir(COMPONENTS_DIR);
  ensureDir(REPORTS_DIR);
  
  // Tool 1: create_cartridge
  console.log('\n  Tool 1: create_cartridge');
  const createCartridgeTool = new CreateCartridgeTool();
  const cartridgeResult = await measureTime(() => createCartridgeTool.execute({
    name: 'ecommerce-order-flow',
    description: 'Ecommerce order processing flow with payment, inventory, and notification',
    outputPath: CARTRIDGE_PATH,
    nodes: [],
    wires: []
  }));
  logTool('create_cartridge', 'Create empty cartridge', cartridgeResult);
  
  // Tool 2: create_signal (multiple signals)
  console.log('\n  Tool 2: create_signal (registering signals)');
  const createSignalTool = new CreateSignalTool();
  
  const signals = [
    { type: 'ORDER.CREATED', description: 'New order submitted', emittedBy: ['control.input'], consumedBy: ['logic.validate'] },
    { type: 'ORDER.VALIDATED', description: 'Order validated successfully', emittedBy: ['logic.validate'], consumedBy: ['logic.transform'] },
    { type: 'ORDER.INVALID', description: 'Order validation failed', emittedBy: ['logic.validate'], consumedBy: ['control.display'] },
    { type: 'PAYMENT.REQUESTED', description: 'Payment processing requested', emittedBy: ['logic.transform'], consumedBy: ['infra.api'] },
    { type: 'PAYMENT.SUCCESS', description: 'Payment successful', emittedBy: ['infra.api'], consumedBy: ['logic.transform'] },
    { type: 'PAYMENT.FAILED', description: 'Payment failed', emittedBy: ['infra.api'], consumedBy: ['control.display'] },
    { type: 'INVENTORY.RESERVED', description: 'Inventory reserved', emittedBy: ['infra.storage'], consumedBy: ['logic.transform'] },
    { type: 'INVENTORY.FAILED', description: 'Inventory reservation failed', emittedBy: ['infra.storage'], consumedBy: ['logic.transform'] },
    { type: 'NOTIFICATION.SENT', description: 'Notification sent', emittedBy: ['io.notification'], consumedBy: ['control.display'] },
    { type: 'ORDER.COMPLETED', description: 'Order completed', emittedBy: ['logic.transform'], consumedBy: ['control.display'] },
  ];
  
  for (const signal of signals) {
    const result = await measureTime(() => createSignalTool.execute({
      type: signal.type,
      description: signal.description,
      registryPath: SIGNAL_REGISTRY_PATH,
      emittedBy: signal.emittedBy,
      consumedBy: signal.consumedBy
    }));
  }
  logTool('create_signal', `Register ${signals.length} signals`, { success: true, duration: 'batch' });
  
  // Tool 3: list_signals
  console.log('\n  Tool 3: list_signals');
  const listSignalsTool = new ListSignalsTool();
  const listResult = await measureTime(() => listSignalsTool.execute({
    registryPath: SIGNAL_REGISTRY_PATH
  }));
  logTool('list_signals', 'List all registered signals', listResult);
  
  // Tool 4: get_signal
  console.log('\n  Tool 4: get_signal');
  const getSignalTool = new GetSignalTool();
  const getResult = await measureTime(() => getSignalTool.execute({
    type: 'ORDER.CREATED',
    registryPath: SIGNAL_REGISTRY_PATH
  }));
  logTool('get_signal', 'Get ORDER.CREATED signal details', getResult);
}

// =============================================================================
// Phase 2: Build Order Flow with apply_topology_patch
// =============================================================================

async function phase2_buildFlow() {
  console.log('\n🔧 Phase 2: Build Order Flow');
  console.log('─'.repeat(50));
  
  // Tool 5: apply_topology_patch (add nodes)
  console.log('\n  Tool 5: apply_topology_patch (add nodes)');
  const applyPatchTool = new ApplyTopologyPatchTool();
  
  const nodesPatch = await measureTime(() => applyPatchTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    nodes: [
      { id: 'order-input', type: 'control.input', description: 'Order input', config: { outputSignalType: 'ORDER.CREATED' } },
      { id: 'order-validator', type: 'logic.validate', description: 'Validate order', config: { schema: { type: 'object' }, successSignalType: 'ORDER.VALIDATED', failureSignalType: 'ORDER.INVALID' } },
      { id: 'payment-processor', type: 'logic.transform', description: 'Process payment', config: { outputSignalType: 'PAYMENT.REQUESTED' } },
      { id: 'payment-api', type: 'infra.api', description: 'Payment API client', config: { endpoint: '/api/payments' } },
      { id: 'inventory-checker', type: 'infra.storage', description: 'Check inventory', config: { outputSignalType: 'INVENTORY.RESERVED' } },
      { id: 'order-finalizer', type: 'logic.transform', description: 'Finalize order', config: { outputSignalType: 'ORDER.COMPLETED' } },
      { id: 'notification-sender', type: 'io.notification', description: 'Send notifications', config: { outputSignalType: 'NOTIFICATION.SENT' } },
      { id: 'error-display', type: 'control.display', description: 'Display errors', config: { format: 'json' } },
      { id: 'success-display', type: 'control.display', description: 'Display success', config: { format: 'json' } },
    ],
    validateBeforeApply: true
  }));
  logTool('apply_topology_patch', 'Add 9 nodes to cartridge', nodesPatch);
  
  // Tool 5 (continued): apply_topology_patch (add wires)
  console.log('\n  Tool 5: apply_topology_patch (add wires)');
  const wiresPatch = await measureTime(() => applyPatchTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    wires: [
      { from: 'order-input', to: 'order-validator', signalType: 'ORDER.CREATED' },
      { from: 'order-validator', to: 'payment-processor', signalType: 'ORDER.VALIDATED' },
      { from: 'order-validator', to: 'error-display', signalType: 'ORDER.INVALID' },
      { from: 'payment-processor', to: 'payment-api', signalType: 'PAYMENT.REQUESTED' },
      { from: 'payment-api', to: 'inventory-checker', signalType: 'PAYMENT.SUCCESS' },
      { from: 'payment-api', to: 'error-display', signalType: 'PAYMENT.FAILED' },
      { from: 'inventory-checker', to: 'order-finalizer', signalType: 'INVENTORY.RESERVED' },
      { from: 'inventory-checker', to: 'error-display', signalType: 'INVENTORY.FAILED' },
      { from: 'order-finalizer', to: 'notification-sender', signalType: 'ORDER.COMPLETED' },
      { from: 'notification-sender', to: 'success-display', signalType: 'NOTIFICATION.SENT' },
    ]
  }));
  logTool('apply_topology_patch', 'Add 10 wires to cartridge', wiresPatch);
  
  // Tool 6: validate_cartridge
  console.log('\n  Tool 6: validate_cartridge');
  const validateTool = new ValidateCartridgeTool();
  const validateResult = await measureTime(() => validateTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    signalRegistryPath: SIGNAL_REGISTRY_PATH,
    deepValidation: true
  }));
  logTool('validate_cartridge', 'Validate cartridge structure', validateResult);
}

// =============================================================================
// Phase 3: Safety & Quality Checks
// =============================================================================

async function phase3_safetyChecks() {
  console.log('\n🛡️ Phase 3: Safety & Quality Checks');
  console.log('─'.repeat(50));
  
  // Tool 7: simulate_modification
  console.log('\n  Tool 7: simulate_modification');
  const simulateTool = new SimulateModificationTool();
  const simulateResult = await measureTime(() => simulateTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    detectCircularDeps: true,
    detectTypeMismatches: true,
    includeExecutionTrace: true
  }));
  logTool('simulate_modification', 'Simulate and validate modifications', simulateResult);
  
  // Tool 8: lint_and_fix
  console.log('\n  Tool 8: lint_and_fix');
  const lintTool = new LintAndFixTool();
  const lintResult = await measureTime(() => lintTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    signalRegistryPath: SIGNAL_REGISTRY_PATH,
    autoFix: true,
    explainFixes: true
  }));
  logTool('lint_and_fix', 'Lint and auto-fix issues', lintResult);
}

// =============================================================================
// Phase 4: Query & Analysis
// =============================================================================

async function phase4_queryAndAnalysis() {
  console.log('\n🔍 Phase 4: Query & Analysis');
  console.log('─'.repeat(50));
  
  // Tool 9: query_topology (subgraph)
  console.log('\n  Tool 9: query_topology (subgraph)');
  const queryTool = new QueryTopologyTool();
  
  const subgraphResult = await measureTime(() => queryTool.execute({
    queryType: 'subgraph',
    cartridgePath: CARTRIDGE_PATH,
    anchorNodeId: 'payment-processor',
    depth: 2
  }));
  logTool('query_topology', 'Query subgraph from payment-processor', subgraphResult);
  
  // Tool 9 (continued): query_topology (paths)
  console.log('\n  Tool 9: query_topology (paths)');
  const pathsResult = await measureTime(() => queryTool.execute({
    queryType: 'paths',
    cartridgePath: CARTRIDGE_PATH,
    fromNodeId: 'order-input',
    toNodeId: 'success-display'
  }));
  logTool('query_topology', 'Find paths from input to output', pathsResult);
  
  // Tool 9 (continued): query_topology (signal-registry)
  console.log('\n  Tool 9: query_topology (signal-registry)');
  const signalQueryResult = await measureTime(() => queryTool.execute({
    queryType: 'signal-registry',
    signalRegistryPath: SIGNAL_REGISTRY_PATH,
    filter: { namespace: 'ORDER' }
  }));
  logTool('query_topology', 'Query ORDER namespace signals', signalQueryResult);
  
  // Tool 10: visualize_cartridge
  console.log('\n  Tool 10: visualize_cartridge');
  const visualizeTool = new VisualizeCartridgeTool();
  const visualizeResult = await measureTime(() => visualizeTool.execute({
    cartridgePath: CARTRIDGE_PATH
  }));
  
  if (visualizeResult.success) {
    const mermaidPath = path.join(REPORTS_DIR, 'flow-diagram.md');
    fs.writeFileSync(mermaidPath, visualizeResult.data.markdown);
  }
  logTool('visualize_cartridge', 'Generate Mermaid flow diagram', visualizeResult);
}

// =============================================================================
// Phase 5: Extensibility
// =============================================================================

async function phase5_extensibility() {
  console.log('\n🧩 Phase 5: Extensibility');
  console.log('─'.repeat(50));
  
  // Tool 11: scaffold_node_impl
  console.log('\n  Tool 11: scaffold_node_impl');
  const scaffoldNodeTool = new ScaffoldNodeImplTool();
  const scaffoldResult = await measureTime(() => scaffoldNodeTool.execute({
    nodeType: 'logic.order-router',
    category: 'logic-validator',
    nodeName: 'OrderRouter',
    description: 'Routes orders to appropriate handlers based on type',
    outputPath: NODES_DIR,
    outputSignalType: 'ORDER.ROUTED',
    generateTests: true
  }));
  logTool('scaffold_node_impl', 'Scaffold custom order-router node', scaffoldResult);
  
  // Tool 12: generate_ui_binding
  console.log('\n  Tool 12: generate_ui_binding');
  const generateUITool = new GenerateUIBindingTool();
  const uiResult = await measureTime(() => generateUITool.execute({
    cartridgePath: CARTRIDGE_PATH,
    nodeIds: ['order-input', 'success-display', 'error-display'],
    framework: 'react',
    outputPath: COMPONENTS_DIR,
    generateHooks: true
  }));
  logTool('generate_ui_binding', 'Generate React components', uiResult);
  
  // Tool 13: refactor_semantics
  console.log('\n  Tool 13: refactor_semantics');
  const refactorTool = new RefactorSemanticsTool();
  const refactorResult = await measureTime(() => refactorTool.execute({
    refactorType: 'signal',
    oldName: 'ORDER.CREATED',
    newName: 'ORDER.SUBMITTED',
    scope: 'local',
    cartridgePath: CARTRIDGE_PATH,
    signalRegistryPath: SIGNAL_REGISTRY_PATH,
    dryRun: true
  }));
  logTool('refactor_semantics', 'Preview signal rename (dry run)', refactorResult);
}

// =============================================================================
// Phase 6: Composite Extraction
// =============================================================================

async function phase6_composites() {
  console.log('\n📦 Phase 6: Composites');
  console.log('─'.repeat(50));
  
  // Tool 14: extract_to_composite
  console.log('\n  Tool 14: extract_to_composite');
  const extractTool = new ExtractToCompositeTool();
  const extractResult = await measureTime(() => extractTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    nodes: ['payment-processor', 'payment-api', 'inventory-checker'],
    compositeName: 'payment-inventory-flow',
    outputPath: path.join(COMPOSITES_DIR, 'payment-inventory-flow.json'),
    compositeRegistryPath: COMPOSITE_REGISTRY_PATH,
    autoRegister: true,
    healParentGraph: false,
    dryRun: false
  }));
  logTool('extract_to_composite', 'Extract payment flow to composite', extractResult);
  
  // Tool 15: create_composite
  console.log('\n  Tool 15: create_composite');
  const createCompositeTool = new CreateCompositeTool();
  const compositeResult = await measureTime(() => createCompositeTool.execute({
    name: 'notification-handler',
    description: 'Handles all notification types',
    outputPath: path.join(COMPOSITES_DIR, 'notification-handler.json'),
    inputs: [{ signalType: 'NOTIFICATION.REQUEST', description: 'Notification request' }],
    outputs: [{ signalType: 'NOTIFICATION.SENT', description: 'Notification sent' }],
    nodes: [
      { id: 'notification-formatter', type: 'logic.transform', description: 'Format notification', config: { outputSignalType: 'NOTIFICATION.FORMATTED' } },
      { id: 'notification-sender', type: 'io.notification', description: 'Send notification', config: { outputSignalType: 'NOTIFICATION.SENT' } }
    ],
    wires: [
      { from: 'notification-formatter', to: 'notification-sender', signalType: 'NOTIFICATION.FORMATTED' }
    ]
  }));
  logTool('create_composite', 'Create notification composite manually', compositeResult);
  
  // Tool 16: list_composites
  console.log('\n  Tool 16: list_composites');
  const listCompositesTool = new ListCompositesTool();
  
  // Create composite registry if needed
  if (!fs.existsSync(COMPOSITE_REGISTRY_PATH)) {
    fs.writeFileSync(COMPOSITE_REGISTRY_PATH, JSON.stringify({ version: '1.0.0', composites: [] }, null, 2));
  }
  
  const listCompositesResult = await measureTime(() => listCompositesTool.execute({
    registryPath: COMPOSITE_REGISTRY_PATH
  }));
  logTool('list_composites', 'List all composites', listCompositesResult);
}

// =============================================================================
// Phase 7: Testing
// =============================================================================

async function phase7_testing() {
  console.log('\n🧪 Phase 7: Testing');
  console.log('─'.repeat(50));
  
  // Tool 17: test_scenario
  console.log('\n  Tool 17: test_scenario');
  const testScenarioTool = new TestScenarioTool();
  const testResult = await measureTime(() => testScenarioTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    scenario: 'order-flow-test',
    inputSignal: { type: 'ORDER.CREATED', payload: { orderId: '12345', items: [] } },
    expectedSignals: ['ORDER.VALIDATED', 'PAYMENT.SUCCESS']
  }));
  logTool('test_scenario', 'Run order flow test scenario', testResult);
  
  // Tool 18: verify_node
  console.log('\n  Tool 18: verify_node');
  const verifyNodeTool = new VerifyNodeTool();
  const verifyResult = await measureTime(() => verifyNodeTool.execute({
    nodeType: 'logic.validate',
    config: { successSignalType: 'TEST.SUCCESS', failureSignalType: 'TEST.FAILURE' },
    inputSignal: { type: 'TEST.INPUT', payload: { data: 'test' } },
    expectedOutput: { type: 'TEST.SUCCESS' }
  }));
  logTool('verify_node', 'Verify validator node in isolation', verifyResult);
  
  // Tool 19: snapshot_regression
  console.log('\n  Tool 19: snapshot_regression');
  const snapshotTool = new SnapshotRegressionTool();
  
  // Create baseline
  const baselinePath = path.join(REPORTS_DIR, 'baseline.json');
  fs.writeFileSync(baselinePath, JSON.stringify({ signals: [] }));
  
  const snapshotResult = await measureTime(() => snapshotTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    baselinePath: baselinePath,
    inputSignals: [{ type: 'ORDER.CREATED', payload: {} }],
    updateBaseline: true
  }));
  logTool('snapshot_regression', 'Run snapshot regression test', snapshotResult);
}

// =============================================================================
// Phase 8: Project Operations
// =============================================================================

async function phase8_projectOps() {
  console.log('\n🏗️ Phase 8: Project Operations');
  console.log('─'.repeat(50));
  
  // Tool 20: scaffold_project
  console.log('\n  Tool 20: scaffold_project');
  const scaffoldProjectTool = new ScaffoldProjectTool();
  const projectDir = path.join(EXAMPLE_DIR, 'scaffolded-app');
  
  const scaffoldProjectResult = await measureTime(() => scaffoldProjectTool.execute({
    projectName: 'ecommerce-app',
    outputPath: EXAMPLE_DIR,
    description: 'Ecommerce application scaffold',
    template: 'minimal'
  }));
  logTool('scaffold_project', 'Scaffold new React project', scaffoldProjectResult);
  
  // Tool 21: bundle_project
  console.log('\n  Tool 21: bundle_project');
  const bundleTool = new BundleProjectTool();
  
  if (scaffoldProjectResult.success) {
    const bundleResult = await measureTime(() => bundleTool.execute({
      projectPath: scaffoldProjectResult.data.projectPath,
      validate: true
    }));
    logTool('bundle_project', 'Bundle project for production', bundleResult);
  } else {
    logTool('bundle_project', 'Skipped (project scaffold failed)', { success: false });
  }
}

// =============================================================================
// Phase 9: Runtime & Cleanup
// =============================================================================

async function phase9_runtimeAndCleanup() {
  console.log('\n🚀 Phase 9: Runtime & Cleanup');
  console.log('─'.repeat(50));
  
  // Tool 22: run_cartridge
  console.log('\n  Tool 22: run_cartridge');
  const runTool = new RunCartridgeTool();
  const runResult = await measureTime(() => runTool.execute({
    cartridgePath: CARTRIDGE_PATH,
    inputSignal: { type: 'ORDER.CREATED', payload: { orderId: 'TEST-001' } },
    debug: true
  }));
  logTool('run_cartridge', 'Execute cartridge runtime', runResult);
  
  // Tool 23: remove_signal
  console.log('\n  Tool 23: remove_signal');
  const removeSignalTool = new RemoveSignalTool();
  
  // Add a test signal to remove
  await new CreateSignalTool().execute({
    type: 'TEMP.TEST',
    description: 'Temporary test signal',
    registryPath: SIGNAL_REGISTRY_PATH
  });
  
  const removeResult = await measureTime(() => removeSignalTool.execute({
    type: 'TEMP.TEST',
    registryPath: SIGNAL_REGISTRY_PATH
  }));
  logTool('remove_signal', 'Remove temporary signal', removeResult);
}

// =============================================================================
// Generate Report
// =============================================================================

function generateReport() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TOOL USAGE REPORT');
  console.log('═'.repeat(60));
  
  const report = {
    generated: new Date().toISOString(),
    project: 'ecommerce-flow',
    totalTools: 23,
    toolsUsed: toolUsageReport.length,
    successCount: toolUsageReport.filter(r => r.success).length,
    failureCount: toolUsageReport.filter(r => !r.success).length,
    tools: toolUsageReport
  };
  
  // Summary table
  console.log('\n| # | Tool | Description | Status | Duration |');
  console.log('|---|------|-------------|--------|----------|');
  
  toolUsageReport.forEach((entry, i) => {
    const status = entry.success ? '✅' : '❌';
    console.log(`| ${i + 1} | ${entry.tool} | ${entry.description} | ${status} | ${entry.duration} |`);
  });
  
  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log(`Total Tools Demonstrated: ${report.toolsUsed}/${report.totalTools}`);
  console.log(`Successful: ${report.successCount}`);
  console.log(`Failed: ${report.failureCount}`);
  console.log('─'.repeat(60));
  
  // Write report to file
  const reportPath = path.join(REPORTS_DIR, 'tool-usage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  return report;
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 Graph-OS MCP Tools v2.0.0 - Comprehensive Example');
  console.log('   Building: Ecommerce Order Processing Flow');
  console.log('═'.repeat(60));
  
  const startTime = performance.now();
  
  try {
    await phase1_setup();
    await phase2_buildFlow();
    await phase3_safetyChecks();
    await phase4_queryAndAnalysis();
    await phase5_extensibility();
    await phase6_composites();
    await phase7_testing();
    await phase8_projectOps();
    await phase9_runtimeAndCleanup();
    
    const totalDuration = Math.round(performance.now() - startTime);
    
    const report = generateReport();
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ EXAMPLE COMPLETE');
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log(`   Tools Demonstrated: ${report.toolsUsed}/${report.totalTools}`);
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
