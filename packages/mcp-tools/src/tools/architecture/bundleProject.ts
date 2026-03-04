/**
 * Bundle Project MCP Tool
 * 
 * Validates and bundles a Graph-OS project for production deployment.
 * Runs the ValidationPipeline, copies cartridges and registries to output
 * directory, and generates a build manifest with checksums for integrity
 * verification.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult, ValidationError } from '../../core/MCPTool';
import { ValidationPipeline } from '@graph-os/validators';
import type { Cartridge } from '@graph-os/core';

/**
 * Parameters for bundle_project tool.
 */
interface BundleProjectParams {
  /** Path to project root */
  projectPath: string;
  /** Output directory for bundle */
  outputPath?: string;
  /** Override main cartridge path */
  cartridgePath?: string;
  /** Run validation before bundling */
  validate?: boolean;
  /** Minify JSON outputs */
  minify?: boolean;
  /** Generate source maps */
  sourceMaps?: boolean;
}

/**
 * Validation error details.
 */
interface ValidationErr {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

/**
 * Build manifest structure.
 */
interface BuildManifest {
  version: string;
  buildTime: string;
  buildDurationMs: number;
  cartridge: {
    name: string;
    version: string;
    nodeCount: number;
    wireCount: number;
    compositeCount: number;
  };
  files: {
    cartridge: string;
    signalRegistry: string;
    compositeRegistry: string;
    staticAssets: string[];
  };
  checksums: {
    cartridge: string;
    signalRegistry: string;
    compositeRegistry: string;
  };
}

/**
 * Result of bundle_project tool execution.
 */
interface BundleProjectResult {
  /** Whether bundling succeeded */
  success: boolean;
  /** Absolute path to output directory */
  outputDir: string;
  /** Build manifest with metadata */
  manifest: BuildManifest;
  /** Validation results (if validate=true) */
  validation?: {
    valid: boolean;
    errorCount: number;
    warningCount: number;
    errors: ValidationErr[];
    warnings: ValidationErr[];
  };
  /** List of output files */
  outputFiles: string[];
  /** Bundle size in bytes */
  totalSizeBytes: number;
}

/**
 * Graph-OS project configuration.
 */
interface GraphOsConfig {
  version: string;
  cartridge: string;
  signalRegistry: string;
  compositeRegistry: string;
  isomorphic?: boolean;
  publicPath?: string;
}

/**
 * Tool for bundling Graph-OS projects for production deployment.
 * 
 * This tool validates the project structure and creates a distributable
 * bundle with all necessary files and a build manifest.
 */
export class BundleProjectTool extends BaseMCPTool<BundleProjectParams, BundleProjectResult> {
  definition: MCPToolDefinition = {
    name: 'bundle_project',
    description: `Validates and bundles a Graph-OS project for production deployment. 
Runs the ValidationPipeline, copies cartridges and registries to output directory, 
and generates a build manifest with checksums for integrity verification.`,
    parameters: [
      {
        name: 'projectPath',
        type: 'string',
        required: true,
        description: 'Path to project root (must contain graph-os.config.json)',
      },
      {
        name: 'outputPath',
        type: 'string',
        required: false,
        description: 'Output directory for bundle (default: ./dist)',
        default: './dist',
      },
      {
        name: 'cartridgePath',
        type: 'string',
        required: false,
        description: 'Override main cartridge path (relative to project root)',
      },
      {
        name: 'validate',
        type: 'boolean',
        required: false,
        description: 'Run validation before bundling (default: true)',
        default: true,
      },
      {
        name: 'minify',
        type: 'boolean',
        required: false,
        description: 'Minify JSON outputs (default: false)',
        default: false,
      },
      {
        name: 'sourceMaps',
        type: 'boolean',
        required: false,
        description: 'Generate source maps (default: true)',
        default: true,
      },
    ],
    returnType: 'BundleProjectResult',
    category: 'architecture',
    bestFor: ['production builds', 'deployment', 'bundling', 'release preparation'],
    complexity: 'low'
  };

  async execute(params: BundleProjectParams): Promise<MCPToolResult<BundleProjectResult>> {
    const fs = await import('fs');
    const path = await import('path');
    const crypto = await import('crypto');

    const startTime = Date.now();
    const outputFiles: string[] = [];
    let totalSizeBytes = 0;

    try {
      // Resolve project path
      const projectPath = path.resolve(params.projectPath);

      // Check project directory exists
      if (!fs.existsSync(projectPath)) {
        return this.failure(
          `Project directory not found: ${projectPath}`,
          ['Ensure the project path is correct', 'Run scaffold_project to create a new project']
        );
      }

      // Load project configuration
      const configPath = path.join(projectPath, 'graph-os.config.json');
      let config: GraphOsConfig;

      if (!fs.existsSync(configPath)) {
        config = {
          version: '1.0.0',
          cartridge: 'cartridges/root.cartridge.json',
          signalRegistry: 'registries/signal-registry.json',
          compositeRegistry: 'registries/composite-registry.json'
        };
      } else {
        try {
          const configContent = fs.readFileSync(configPath, 'utf-8');
          config = JSON.parse(configContent);
        } catch (parseError) {
          return this.failure(
            `Failed to parse graph-os.config.json: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            ['Ensure the configuration file contains valid JSON']
          );
        }
      }

      // Resolve cartridge path
      const cartridgePath = params.cartridgePath
        ? path.join(projectPath, params.cartridgePath)
        : path.join(projectPath, config.cartridge);

      if (!fs.existsSync(cartridgePath)) {
        return this.failure(
          `Cartridge file not found: ${cartridgePath}`,
          ['Ensure the cartridge path in graph-os.config.json is correct']
        );
      }

      // Load cartridge
      let cartridge: Cartridge;
      try {
        const cartridgeContent = fs.readFileSync(cartridgePath, 'utf-8');
        cartridge = JSON.parse(cartridgeContent);
      } catch (parseError) {
        return this.failure(
          `Failed to parse cartridge: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          ['Ensure the cartridge file contains valid JSON']
        );
      }

      // Run validation if requested
      let validationResult: BundleProjectResult['validation'] | undefined;
      if (params.validate !== false) {
        const validation = await this.runValidation(
          cartridge,
          path.join(projectPath, config.signalRegistry),
          path.join(projectPath, config.compositeRegistry),
          fs
        );
        validationResult = validation;

        if (!validation.valid) {
          const errorSuggestions = validation.errors
            .filter(e => e.suggestion)
            .map(e => `[ERROR] ${e.suggestion!}`);

          const warningSuggestions = validation.warnings
            .filter(w => w.suggestion || w.message)
            .map(w => `[WARN] ${w.suggestion || w.message}`);

          return this.failure(
            `Validation failed with ${validation.errorCount} error(s) and ${validation.warningCount} warning(s)`,
            [...errorSuggestions, ...warningSuggestions].filter(Boolean)
          );
        }
      }

      // Prepare output directory
      const outputDir = params.outputPath
        ? path.resolve(params.outputPath)
        : path.join(projectPath, 'dist');

      // Clean and create output structure
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true });
      }
      fs.mkdirSync(outputDir, { recursive: true });
      fs.mkdirSync(path.join(outputDir, 'cartridges'), { recursive: true });
      fs.mkdirSync(path.join(outputDir, 'cartridges', 'composites'), { recursive: true });
      fs.mkdirSync(path.join(outputDir, 'registries'), { recursive: true });

      // Copy main cartridge
      const outputCartridgePath = path.join(outputDir, 'cartridges', 'root.cartridge.json');
      const cartridgeJson = params.minify
        ? JSON.stringify(cartridge)
        : JSON.stringify(cartridge, null, 2);
      fs.writeFileSync(outputCartridgePath, cartridgeJson);
      outputFiles.push('cartridges/root.cartridge.json');
      totalSizeBytes += Buffer.byteLength(cartridgeJson, 'utf-8');

      // Copy composites
      const compositesDir = path.join(path.dirname(cartridgePath), 'composites');
      const staticAssets: string[] = [];
      if (fs.existsSync(compositesDir)) {
        const compositeFiles = fs.readdirSync(compositesDir);
        for (const file of compositeFiles) {
          if (file.endsWith('.cartridge.json')) {
            const srcPath = path.join(compositesDir, file);
            const destPath = path.join(outputDir, 'cartridges', 'composites', file);
            const content = fs.readFileSync(srcPath, 'utf-8');
            fs.writeFileSync(destPath, params.minify ? JSON.stringify(JSON.parse(content)) : content);
            outputFiles.push(`cartridges/composites/${file}`);
            totalSizeBytes += Buffer.byteLength(content, 'utf-8');
            staticAssets.push(`cartridges/composites/${file}`);
          }
        }
      }

      // Copy signal registry
      const signalRegistryPath = path.join(projectPath, config.signalRegistry);
      let signalRegistryChecksum = '';
      if (fs.existsSync(signalRegistryPath)) {
        const signalRegistryContent = fs.readFileSync(signalRegistryPath, 'utf-8');
        const signalRegistry = JSON.parse(signalRegistryContent);
        const outputSignalRegistryPath = path.join(outputDir, 'registries', 'signal-registry.json');
        const outputContent = params.minify
          ? JSON.stringify(signalRegistry)
          : JSON.stringify(signalRegistry, null, 2);
        fs.writeFileSync(outputSignalRegistryPath, outputContent);
        outputFiles.push('registries/signal-registry.json');
        totalSizeBytes += Buffer.byteLength(outputContent, 'utf-8');
        signalRegistryChecksum = this.generateChecksum(outputContent, crypto);
      }

      // Copy composite registry
      const compositeRegistryPath = path.join(projectPath, config.compositeRegistry);
      let compositeRegistryChecksum = '';
      if (fs.existsSync(compositeRegistryPath)) {
        const compositeRegistryContent = fs.readFileSync(compositeRegistryPath, 'utf-8');
        const compositeRegistry = JSON.parse(compositeRegistryContent);
        const outputCompositeRegistryPath = path.join(outputDir, 'registries', 'composite-registry.json');
        const outputContent = params.minify
          ? JSON.stringify(compositeRegistry)
          : JSON.stringify(compositeRegistry, null, 2);
        fs.writeFileSync(outputCompositeRegistryPath, outputContent);
        outputFiles.push('registries/composite-registry.json');
        totalSizeBytes += Buffer.byteLength(outputContent, 'utf-8');
        compositeRegistryChecksum = this.generateChecksum(outputContent, crypto);
      }

      // Generate cartridge checksum
      const cartridgeChecksum = this.generateChecksum(cartridgeJson, crypto);

      // Count composites (if defined in extended cartridge format)
      const cartridgeData = cartridge as Cartridge & { composites?: unknown[] };
      const compositeCount = cartridgeData.composites?.length || 0;

      // Create build manifest
      const manifest: BuildManifest = {
        version: '1.0.0',
        buildTime: new Date().toISOString(),
        buildDurationMs: Date.now() - startTime,
        cartridge: {
          name: cartridge.name,
          version: cartridge.version,
          nodeCount: cartridge.nodes?.length || 0,
          wireCount: cartridge.wires?.length || 0,
          compositeCount,
        },
        files: {
          cartridge: 'cartridges/root.cartridge.json',
          signalRegistry: 'registries/signal-registry.json',
          compositeRegistry: 'registries/composite-registry.json',
          staticAssets,
        },
        checksums: {
          cartridge: cartridgeChecksum,
          signalRegistry: signalRegistryChecksum,
          compositeRegistry: compositeRegistryChecksum,
        },
      };

      // Write manifest
      const manifestPath = path.join(outputDir, 'manifest.json');
      const manifestContent = params.minify
        ? JSON.stringify(manifest)
        : JSON.stringify(manifest, null, 2);
      fs.writeFileSync(manifestPath, manifestContent);
      outputFiles.push('manifest.json');
      totalSizeBytes += Buffer.byteLength(manifestContent, 'utf-8');

      return this.success({
        success: true,
        outputDir,
        manifest,
        validation: validationResult,
        outputFiles,
        totalSizeBytes,
      });

    } catch (error) {
      return this.failure(
        `Bundle failed: ${error instanceof Error ? error.message : String(error)}`,
        ['Check file permissions', 'Ensure all referenced files exist']
      );
    }
  }

  /**
   * Runs the validation pipeline on the cartridge.
   */
  private async runValidation(
    cartridge: Cartridge,
    signalRegistryPath: string,
    compositeRegistryPath: string,
    fs: typeof import('fs')
  ): Promise<NonNullable<BundleProjectResult['validation']>> {
    const pipeline = new ValidationPipeline();

    // Load signal registry if available
    if (fs.existsSync(signalRegistryPath)) {
      try {
        const registryContent = fs.readFileSync(signalRegistryPath, 'utf-8');
        const registry = JSON.parse(registryContent);
        const signals = Array.isArray(registry) ? registry : (registry.signals || []);
        pipeline.loadSignalRegistry(signals);
      } catch (e) {
        console.warn('Could not load signal registry for validation:', e);
      }
    }

    // Load composite registry if available
    if (fs.existsSync(compositeRegistryPath)) {
      try {
        const registryContent = fs.readFileSync(compositeRegistryPath, 'utf-8');
        const registry = JSON.parse(registryContent);
        const composites = Array.isArray(registry) ? registry : (registry.composites || []);
        pipeline.loadCompositeRegistry(composites);
      } catch (e) {
        console.warn('Could not load composite registry for validation:', e);
      }
    }

    // Run validation
    const report = pipeline.validate(cartridge);

    return {
      valid: report.valid,
      errorCount: report.errors.length,
      warningCount: report.warnings.length,
      errors: report.errors.map(e => ({
        code: e.code,
        message: e.message,
        path: e.path,
        suggestion: e.suggestion,
      })),
      warnings: report.warnings.map((w: any) => ({
        code: w.code,
        message: w.message,
        path: w.path,
        suggestion: w.suggestion,
      })),
    };
  }

  /**
   * Generates a SHA-256 checksum for the given content.
   */
  private generateChecksum(content: string, crypto: typeof import('crypto')): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
