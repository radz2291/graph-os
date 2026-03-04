/**
 * Scaffold Project MCP Tool
 * 
 * Creates a new Graph-OS project with React + Vite scaffold configured for
 * the Isomorphic Pattern. Projects load cartridges via HTTP fetch instead
 * of Node.js imports, enabling browser-native execution.
 * 
 * @module @graph-os/mcp-tools
 */

import { BaseMCPTool, MCPToolDefinition, MCPToolResult, ValidationError } from '../../core/MCPTool';

/**
 * Parameters for scaffold_project tool.
 */
interface ScaffoldProjectParams {
  /** Project name in kebab-case */
  projectName: string;
  /** Directory path for the project */
  outputPath: string;
  /** Project description */
  description?: string;
  /** Starter template */
  template?: 'minimal' | 'input-display' | 'auth-flow';
  /** Include @graph-os/react-bridge setup */
  includeReactBridge?: boolean;
  /** Author name for package.json */
  author?: string;
}

/**
 * Directory structure summary.
 */
interface DirectoryStructure {
  configFiles: string[];
  sourceFiles: string[];
  cartridgeFiles: string[];
  registryFiles: string[];
}

/**
 * Result of scaffold_project tool execution.
 */
interface ScaffoldProjectResult {
  /** Absolute path to created project */
  projectPath: string;
  /** Project name */
  projectName: string;
  /** List of created files (relative paths) */
  createdFiles: string[];
  /** Directory structure summary */
  structure: DirectoryStructure;
  /** Next steps for the user */
  nextSteps: string[];
  /** Warnings encountered during scaffolding */
  warnings: string[];
}

// Removed hardcoded TEMPLATES and raw interfaces (NodeDefinition, WireDefinition, etc.)
// Projects are now scaffolded via file-system templates loaded at runtime.

/**
 * Tool for scaffolding new Graph-OS projects with React + Vite.
 * 
 * This tool creates a complete project structure following the Isomorphic Pattern,
 * where cartridges are loaded via HTTP fetch instead of Node.js imports.
 */
export class ScaffoldProjectTool extends BaseMCPTool<ScaffoldProjectParams, ScaffoldProjectResult> {
  definition: MCPToolDefinition = {
    name: 'scaffold_project',
    description: `Creates a new Graph-OS project with React + Vite scaffold configured for the Isomorphic Pattern. 
The generated project loads cartridges via HTTP fetch (fetch('/cartridges/...')) instead of Node.js imports, 
enabling browser-native execution without build-time coupling.`,
    parameters: [
      {
        name: 'projectName',
        type: 'string',
        required: true,
        description: 'Project name in kebab-case (e.g., "my-app", "auth-service")',
        pattern: '^[a-z][a-z0-9-]*$',
        min: 3,
      },
      {
        name: 'outputPath',
        type: 'string',
        required: true,
        description: 'Directory path where the project will be created',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Project description for package.json and README',
      },
      {
        name: 'template',
        type: 'string',
        required: false,
        description: 'Starter template folder name (e.g., minimal, auth)',
      },
      {
        name: 'includeReactBridge',
        type: 'boolean',
        required: false,
        description: 'Include @graph-os/react-bridge setup (default: true)',
      },
      {
        name: 'author',
        type: 'string',
        required: false,
        description: 'Author name for package.json',
      },
    ],
    returnType: 'ScaffoldProjectResult',
    category: 'architecture',
    bestFor: ['project initialization', 'boilerplate generation', 'new project setup'],
    complexity: 'low'
  };

  async execute(params: ScaffoldProjectParams): Promise<MCPToolResult<ScaffoldProjectResult>> {
    const fs = await import('fs');
    const path = await import('path');

    const warnings: string[] = [];
    const createdFiles: string[] = [];
    const structure: DirectoryStructure = {
      configFiles: [],
      sourceFiles: [],
      cartridgeFiles: [],
      registryFiles: [],
    };

    try {
      // Validate project name
      const nameValidation = this.validateProjectName(params.projectName);
      if (!nameValidation.valid) {
        return this.failure(nameValidation.error!, nameValidation.suggestions);
      }

      // Resolve and validate output path
      const projectPath = path.resolve(params.outputPath, params.projectName);

      if (fs.existsSync(projectPath)) {
        return this.failure(
          `Directory already exists: ${projectPath}`,
          ['Choose a different project name or output path', 'Remove the existing directory first']
        );
      }

      // Get template configuration
      const templateName = params.template || 'minimal';
      const templatesBaseDir = path.resolve(__dirname, '../../../templates/projects');
      const baseTemplateDir = path.join(templatesBaseDir, '_base');
      const specificTemplateDir = path.join(templatesBaseDir, templateName);

      if (!fs.existsSync(specificTemplateDir)) {
        return this.failure(
          `Invalid template folder: ${templateName}`,
          [`Make sure the template exists in ${templatesBaseDir}`]
        );
      }

      const description = params.description || 'A Graph-OS application';

      // 1. Copy `_base` template
      if (fs.existsSync(baseTemplateDir)) {
        this.copyDirRecursive(baseTemplateDir, projectPath, fs, path, createdFiles, projectPath);
      } else {
        warnings.push(`_base template completely missing from ${baseTemplateDir}! Standard boilerplate may be omitted.`);
      }

      // 2. Copy specific template, overriding base files
      this.copyDirRecursive(specificTemplateDir, projectPath, fs, path, createdFiles, projectPath);

      // 3. Process Monorepo Dependencies / Hydration
      const templateConfigPath = path.join(projectPath, 'template.config.json');
      let templateDependencies: Record<string, string> = {};
      if (fs.existsSync(templateConfigPath)) {
        const rawConfig = fs.readFileSync(templateConfigPath, 'utf8');
        try {
          const parsedConfig = JSON.parse(rawConfig);
          if (parsedConfig.dependencies) {
            templateDependencies = parsedConfig.dependencies;
          }
        } catch (e) {
          warnings.push(`Failed to parse template.config.json: ${e}`);
        }
        // Remove it from the generated output
        fs.unlinkSync(templateConfigPath);
        const index = createdFiles.indexOf('template.config.json');
        if (index > -1) {
          createdFiles.splice(index, 1);
        }
      }

      // Generate package.json manually to merge dependencies
      const isMonorepoWorkspace = __dirname.includes('packages');
      const packagesDir = path.resolve(__dirname, '../../../../');
      const relativePackagesPath = path.relative(projectPath, packagesDir).replace(/\\/g, '/');

      const mergedDependencies: Record<string, string> = {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        ...templateDependencies
      };

      if (params.includeReactBridge !== false) {
        mergedDependencies['@graph-os/react-bridge'] = isMonorepoWorkspace ? `file:${relativePackagesPath}/react-bridge` : '^1.0.0';
      }
      mergedDependencies['@graph-os/runtime'] = isMonorepoWorkspace ? `file:${relativePackagesPath}/runtime` : '^1.0.0';

      const packageJson: Record<string, unknown> = {
        name: params.projectName,
        version: '1.0.0',
        type: 'module',
        description,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: mergedDependencies,
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.2.1',
          typescript: '^5.3.0',
          vite: '^5.1.0',
        },
      };

      if (params.author) {
        packageJson.author = params.author;
      }

      const packageJsonPath = path.join(projectPath, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      if (!createdFiles.includes('package.json')) {
        createdFiles.push('package.json');
      }

      // 4. Hydrate Variables across all generated text files
      const hydrationVariables = {
        projectName: params.projectName,
        description
      };
      this.replaceVariablesInDir(projectPath, hydrationVariables, fs, path);

      // 5. Generate next steps (incorporating enhanced Integration Guide reading)
      const nextSteps = [
        `cd ${params.projectName}`,
        'npm install',
        'npm run dev',
        `🚀 REQUIRED: Read the generated documentation in /NODE_CATALOG.md and /INTEGRATION_GUIDE.md immediately to understand the exact configuration schemas and application architecture.`
      ];

      return this.success({
        projectPath,
        projectName: params.projectName,
        createdFiles,
        structure,
        nextSteps,
        warnings,
      });

    } catch (error) {
      return this.failure(
        `Failed to scaffold project: ${error instanceof Error ? error.message : String(error)}`,
        ['Ensure you have write permissions to the output directory']
      );
    }
  }

  /**
   * Validates the project name format.
   */
  private validateProjectName(name: string): { valid: boolean; error?: string; suggestions?: string[] } {
    if (!name || name.length < 3) {
      return {
        valid: false,
        error: 'Project name must be at least 3 characters',
        suggestions: ['Use a descriptive name like "my-app" or "auth-service"'],
      };
    }

    const pattern = /^[a-z][a-z0-9-]*$/;
    if (!pattern.test(name)) {
      return {
        valid: false,
        error: 'Project name must be in kebab-case (lowercase letters, numbers, and hyphens)',
        suggestions: [
          'Start with a lowercase letter',
          'Use hyphens instead of spaces',
          'Avoid uppercase letters and special characters',
          `Example: "${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}"`,
        ],
      };
    }

    return { valid: true };
  }

  /**
   * Recursively copies a directory to the target destination.
   */
  private copyDirRecursive(
    srcDir: string,
    destDir: string,
    fs: typeof import('fs'),
    path: typeof import('path'),
    createdList: string[],
    basePath: string = destDir
  ): void {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath, fs, path, createdList, basePath);
      } else {
        fs.copyFileSync(srcPath, destPath);

        // Path relative to the final generated project root
        const relativeCreationPath = path.relative(basePath, destPath);
        // Ensure we don't duplicate entries if overriding base files
        if (!createdList.includes(relativeCreationPath)) {
          createdList.push(relativeCreationPath);
        }
      }
    }
  }

  /**
   * Scans text files in a directory and replaces matching mustache variables.
   */
  private replaceVariablesInDir(
    dir: string,
    variables: Record<string, string>,
    fs: typeof import('fs'),
    path: typeof import('path')
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const textExtensions = ['.ts', '.tsx', '.json', '.md', '.html', '.css', '.js'];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.replaceVariablesInDir(fullPath, variables, fs, path);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (textExtensions.includes(ext)) {
          let content = fs.readFileSync(fullPath, 'utf8');
          let modified = false;

          for (const [key, value] of Object.entries(variables)) {
            // Check if {{key}} or {{ key }} exists within the content
            const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            if (placeholder.test(content)) {
              content = content.replace(placeholder, value);
              modified = true;
            }
          }

          if (modified) {
            fs.writeFileSync(fullPath, content, 'utf8');
          }
        }
      }
    }
  }

}
