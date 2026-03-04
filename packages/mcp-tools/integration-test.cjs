/**
 * Integration Test for ScaffoldProjectTool and BundleProjectTool
 * 
 * Tests the complete workflow: scaffold -> bundle
 */

const { ScaffoldProjectTool, BundleProjectTool } = require('./dist/index');
const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '.integration-test');

async function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

async function testScaffold() {
  console.log('\n📋 Testing scaffold_project...');
  
  const tool = new ScaffoldProjectTool();
  
  // Test 1: Scaffold minimal project
  console.log('  - Creating minimal project...');
  const result1 = await tool.execute({
    projectName: 'test-minimal',
    outputPath: TEST_DIR,
    template: 'minimal',
  });
  
  if (!result1.success) {
    console.error('  ❌ Failed to scaffold minimal project:', result1.error);
    process.exit(1);
  }
  console.log('  ✅ Minimal project created');
  console.log('     Files:', result1.data.createdFiles.length);
  console.log('     Path:', result1.data.projectPath);
  
  // Test 2: Verify Isomorphic Pattern
  console.log('  - Checking Isomorphic Pattern...');
  const appTsxPath = path.join(result1.data.projectPath, 'src', 'App.tsx');
  const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');
  
  if (!appTsxContent.includes('fetch(')) {
    console.error('  ❌ App.tsx does not use fetch() - Isomorphic Pattern not followed');
    process.exit(1);
  }
  if (appTsxContent.includes('import cartridge from')) {
    console.error('  ❌ App.tsx uses Node.js import - Isomorphic Pattern not followed');
    process.exit(1);
  }
  console.log('  ✅ Isomorphic Pattern verified');
  
  // Test 3: Scaffold auth-flow project
  console.log('  - Creating auth-flow project...');
  const result2 = await tool.execute({
    projectName: 'test-auth-flow',
    outputPath: TEST_DIR,
    template: 'auth-flow',
  });
  
  if (!result2.success) {
    console.error('  ❌ Failed to scaffold auth-flow project:', result2.error);
    process.exit(1);
  }
  
  // Check node count
  const cartridgePath = path.join(result2.data.projectPath, 'cartridges', 'root.cartridge.json');
  const cartridge = JSON.parse(fs.readFileSync(cartridgePath, 'utf-8'));
  if (cartridge.nodes.length !== 6) {
    console.error('  ❌ Auth-flow template should have 6 nodes, got:', cartridge.nodes.length);
    process.exit(1);
  }
  console.log('  ✅ Auth-flow project created (6 nodes)');
  
  return result1.data.projectPath;
}

async function testBundle(projectPath) {
  console.log('\n📦 Testing bundle_project...');
  
  const tool = new BundleProjectTool();
  
  // Test 1: Bundle project
  console.log('  - Bundling project...');
  const result = await tool.execute({
    projectPath: projectPath,
    validate: true,
  });
  
  if (!result.success) {
    console.error('  ❌ Failed to bundle project:', result.error);
    process.exit(1);
  }
  console.log('  ✅ Project bundled successfully');
  console.log('     Output:', result.data.outputDir);
  console.log('     Files:', result.data.outputFiles.length);
  console.log('     Size:', result.data.totalSizeBytes, 'bytes');
  
  // Test 2: Verify manifest
  console.log('  - Checking manifest...');
  const manifest = result.data.manifest;
  if (!manifest.version || !manifest.buildTime) {
    console.error('  ❌ Manifest missing required fields');
    process.exit(1);
  }
  if (!manifest.checksums.cartridge || manifest.checksums.cartridge.length !== 64) {
    console.error('  ❌ Invalid cartridge checksum');
    process.exit(1);
  }
  console.log('  ✅ Manifest verified');
  console.log('     Cartridge:', manifest.cartridge.name);
  console.log('     Nodes:', manifest.cartridge.nodeCount);
  console.log('     Wires:', manifest.cartridge.wireCount);
  
  // Test 3: Verify validation ran
  if (result.data.validation) {
    console.log('  ✅ Validation ran');
    console.log('     Valid:', result.data.validation.valid);
    console.log('     Errors:', result.data.validation.errorCount);
    console.log('     Warnings:', result.data.validation.warningCount);
  }
  
  return result.data.outputDir;
}

async function main() {
  console.log('🚀 CLI to MCP Toolset Migration - Integration Test');
  console.log('='.repeat(50));
  
  try {
    await cleanup();
    const projectPath = await testScaffold();
    await testBundle(projectPath);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All integration tests passed!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  }
}

main();
