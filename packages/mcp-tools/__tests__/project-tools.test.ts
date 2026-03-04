/**
 * Tests for ScaffoldProjectTool and BundleProjectTool
 * 
 * @module @graph-os/mcp-tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScaffoldProjectTool } from '../src/tools/architecture/scaffoldProject';
import { BundleProjectTool } from '../src/tools/architecture/bundleProject';
import * as fs from 'fs';
import * as path from 'path';

// Test directory for generated projects
const TEST_OUTPUT_DIR = path.join(__dirname, '.test-output');

describe('ScaffoldProjectTool', () => {
  let tool: ScaffoldProjectTool;

  beforeEach(() => {
    tool = new ScaffoldProjectTool();
    // Clean up test directory
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  describe('definition', () => {
    it('should have correct tool name', () => {
      expect(tool.definition.name).toBe('scaffold_project');
    });

    it('should have required parameters', () => {
      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain('projectName');
      expect(paramNames).toContain('outputPath');
    });

    it('should have correct category', () => {
      expect(tool.definition.category).toBe('architecture');
    });
  });

  describe('execute', () => {
    it('should scaffold a minimal project', async () => {
      const result = await tool.execute({
        projectName: 'test-app',
        outputPath: TEST_OUTPUT_DIR,
        description: 'Test application',
        template: 'minimal',
      });

      expect(result.success).toBe(true);
      expect(result.data?.projectName).toBe('test-app');
      expect(result.data?.createdFiles.length).toBeGreaterThan(0);
      expect(result.data?.structure.configFiles).toContain('package.json');
      expect(result.data?.structure.cartridgeFiles).toContain('cartridges/root.cartridge.json');
    });

    it('should create all required files', async () => {
      const result = await tool.execute({
        projectName: 'test-app',
        outputPath: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(true);

      // Check critical files exist
      const projectPath = result.data!.projectPath;
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'vite.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'graph-os.config.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'cartridges', 'root.cartridge.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src', 'App.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src', 'main.tsx'))).toBe(true);
    });

    it('should use isomorphic pattern in App.tsx', async () => {
      const result = await tool.execute({
        projectName: 'test-app',
        outputPath: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(true);

      const appTsxPath = path.join(result.data!.projectPath, 'src', 'App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      // Should contain fetch for loading cartridge (Isomorphic Pattern)
      expect(appTsxContent).toContain('fetch(');
      expect(appTsxContent).toContain('/cartridges/');
      expect(appTsxContent).toContain('createRuntime');
      expect(appTsxContent).toContain('SignalProvider');

      // Should NOT contain Node.js style imports of JSON
      expect(appTsxContent).not.toContain('import cartridge from');
    });

    it('should reject invalid project name', async () => {
      const result = await tool.execute({
        projectName: 'InvalidName', // Uppercase not allowed
        outputPath: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('kebab-case');
    });

    it('should reject project name that is too short', async () => {
      const result = await tool.execute({
        projectName: 'ab', // Too short
        outputPath: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('3 characters');
    });

    it('should reject if directory already exists', async () => {
      // Create the project first
      await tool.execute({
        projectName: 'test-app',
        outputPath: TEST_OUTPUT_DIR,
      });

      // Try to create it again
      const result = await tool.execute({
        projectName: 'test-app',
        outputPath: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should scaffold input-display template', async () => {
      const result = await tool.execute({
        projectName: 'test-input-display',
        outputPath: TEST_OUTPUT_DIR,
        template: 'input-display',
      });

      expect(result.success).toBe(true);

      // Check cartridge has 4 nodes for input-display template
      const cartridgePath = path.join(result.data!.projectPath, 'cartridges', 'root.cartridge.json');
      const cartridge = JSON.parse(fs.readFileSync(cartridgePath, 'utf-8'));
      expect(cartridge.nodes.length).toBe(4);
    });

    it('should scaffold auth-flow template', async () => {
      const result = await tool.execute({
        projectName: 'test-auth-flow',
        outputPath: TEST_OUTPUT_DIR,
        template: 'auth-flow',
      });

      expect(result.success).toBe(true);

      // Check cartridge has 6 nodes for auth-flow template
      const cartridgePath = path.join(result.data!.projectPath, 'cartridges', 'root.cartridge.json');
      const cartridge = JSON.parse(fs.readFileSync(cartridgePath, 'utf-8'));
      expect(cartridge.nodes.length).toBe(6);
    });

    it('should generate valid package.json with Vite scripts', async () => {
      const result = await tool.execute({
        projectName: 'test-app',
        outputPath: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(true);

      const packageJsonPath = path.join(result.data!.projectPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.name).toBe('test-app');
      expect(packageJson.scripts.dev).toBe('vite');
      expect(packageJson.scripts.build).toBe('vite build');
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies['@graph-os/runtime']).toBeDefined();
    });

    it('should return next steps', async () => {
      const result = await tool.execute({
        projectName: 'test-app',
        outputPath: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(true);
      expect(result.data?.nextSteps).toContain('cd test-app');
      expect(result.data?.nextSteps).toContain('npm install');
      expect(result.data?.nextSteps).toContain('npm run dev');
    });
  });
});

describe('BundleProjectTool', () => {
  let tool: BundleProjectTool;
  let scaffoldTool: ScaffoldProjectTool;
  let testProjectPath: string;

  beforeEach(async () => {
    tool = new BundleProjectTool();
    scaffoldTool = new ScaffoldProjectTool();

    // Clean up test directory
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });

    // Create a test project for bundling
    const scaffoldResult = await scaffoldTool.execute({
      projectName: 'bundle-test-app',
      outputPath: TEST_OUTPUT_DIR,
    });
    testProjectPath = scaffoldResult.data!.projectPath;
  });

  afterEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  describe('definition', () => {
    it('should have correct tool name', () => {
      expect(tool.definition.name).toBe('bundle_project');
    });

    it('should have required parameters', () => {
      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain('projectPath');
    });

    it('should have correct category', () => {
      expect(tool.definition.category).toBe('architecture');
    });
  });

  describe('execute', () => {
    it('should bundle a valid project', async () => {
      const result = await tool.execute({
        projectPath: testProjectPath,
      });

      expect(result.success).toBe(true);
      expect(result.data?.outputDir).toBeDefined();
      expect(result.data?.manifest).toBeDefined();
    });

    it('should create output files', async () => {
      const result = await tool.execute({
        projectPath: testProjectPath,
      });

      expect(result.success).toBe(true);
      expect(result.data?.outputFiles).toContain('cartridges/root.cartridge.json');
      expect(result.data?.outputFiles).toContain('registries/signal-registry.json');
      expect(result.data?.outputFiles).toContain('manifest.json');
    });

    it('should generate manifest with correct metadata', async () => {
      const result = await tool.execute({
        projectPath: testProjectPath,
      });

      expect(result.success).toBe(true);

      const manifest = result.data!.manifest;
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.buildTime).toBeDefined();
      expect(manifest.cartridge.name).toBe('bundle-test-app');
      expect(manifest.cartridge.nodeCount).toBe(3); // minimal template has 3 nodes
      expect(manifest.checksums.cartridge).toBeDefined();
    });

    it('should generate SHA-256 checksums', async () => {
      const result = await tool.execute({
        projectPath: testProjectPath,
      });

      expect(result.success).toBe(true);

      const checksums = result.data!.manifest.checksums;
      // SHA-256 produces 64 character hex strings
      expect(checksums.cartridge).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should fail for non-existent project', async () => {
      const result = await tool.execute({
        projectPath: '/non/existent/path',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail for missing graph-os.config.json', async () => {
      // Remove config file
      fs.unlinkSync(path.join(testProjectPath, 'graph-os.config.json'));

      const result = await tool.execute({
        projectPath: testProjectPath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('configuration not found');
    });

    it('should validate cartridge when validate=true', async () => {
      const result = await tool.execute({
        projectPath: testProjectPath,
        validate: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.validation).toBeDefined();
      expect(result.data?.validation?.valid).toBe(true);
    });

    it('should skip validation when validate=false', async () => {
      const result = await tool.execute({
        projectPath: testProjectPath,
        validate: false,
      });

      expect(result.success).toBe(true);
      expect(result.data?.validation).toBeUndefined();
    });

    it('should calculate total bundle size', async () => {
      const result = await tool.execute({
        projectPath: testProjectPath,
      });

      expect(result.success).toBe(true);
      expect(result.data?.totalSizeBytes).toBeGreaterThan(0);
    });

    it('should support custom output directory', async () => {
      const customOutput = path.join(TEST_OUTPUT_DIR, 'custom-dist');

      const result = await tool.execute({
        projectPath: testProjectPath,
        outputPath: customOutput,
      });

      expect(result.success).toBe(true);
      expect(result.data?.outputDir).toBe(customOutput);
      expect(fs.existsSync(customOutput)).toBe(true);
    });

    it('should minify JSON when minify=true', async () => {
      const result = await tool.execute({
        projectPath: testProjectPath,
        minify: true,
      });

      expect(result.success).toBe(true);

      // Minified JSON should not have indentation (no newlines after opening braces)
      const cartridgePath = path.join(result.data!.outputDir, 'cartridges', 'root.cartridge.json');
      const content = fs.readFileSync(cartridgePath, 'utf-8');
      expect(content).not.toContain('\n  '); // No indentation
    });
  });
});

describe('Integration: scaffold -> bundle workflow', () => {
  it('should scaffold and bundle a complete project', async () => {
    const scaffoldTool = new ScaffoldProjectTool();
    const bundleTool = new BundleProjectTool();

    // Clean up
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });

    // Scaffold
    const scaffoldResult = await scaffoldTool.execute({
      projectName: 'integration-test-app',
      outputPath: TEST_OUTPUT_DIR,
      template: 'input-display',
      description: 'Integration test application',
    });

    expect(scaffoldResult.success).toBe(true);

    // Bundle
    const bundleResult = await bundleTool.execute({
      projectPath: scaffoldResult.data!.projectPath,
      validate: true,
    });

    expect(bundleResult.success).toBe(true);
    expect(bundleResult.data!.validation?.valid).toBe(true);
    expect(bundleResult.data!.manifest.cartridge.nodeCount).toBe(4); // input-display has 4 nodes

    // Clean up
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
  });
});
