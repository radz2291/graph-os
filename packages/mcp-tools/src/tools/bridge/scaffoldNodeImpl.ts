/**
 * scaffold_node_impl - Node type scaffolding and registration
 *
 * This tool generates working node implementations from templates,
 * enabling developers to quickly create new custom node types.
 * 
 * v2.0.1 - Templates decoupled to external files for easy customization.
 *
 * @module @graph-os/mcp-tools/bridge
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPToolResult, MCPToolDefinition } from '../../core/MCPTool';
import * as ts from 'typescript';
import { globalNodeRegistry, nodeFactory } from '@graph-os/runtime';

// =============================================================================
// Types
// =============================================================================

export type NodeCategory = 'logic' | 'control' | 'infra' | 'ui';

export type NodeTemplateType =
  | 'logic-validator'
  | 'logic-transformer'
  | 'logic-domain-adapter'
  | 'control-input'
  | 'control-display'
  | 'infra-api-client'
  | 'infra-storage-local'
  | 'ui-component';

export interface ScaffoldNodeImplRequest {
  /** Node type in CATEGORY.SUBTYPE format (e.g., 'logic.email-validator') */
  nodeType: string;
  /** Output directory for generated files */
  outputPath: string;
  /** Template type to use for scaffolding */
  templateType?: NodeTemplateType;
  /** Include TypeScript config interface */
  includeConfigInterface?: boolean;
  /** Include JSDoc comments */
  includeJSDoc?: boolean;
  /** Description of the node */
  description?: string;
  /** Author name */
  author?: string;
}

export interface GeneratedNodeFile {
  filename: string;
  content: string;
  description: string;
}

export interface ScaffoldNodeImplResult {
  success: boolean;
  nodeType: string;
  category: NodeCategory;
  files: GeneratedNodeFile[];
  templateUsed: string;
  templateSource: 'filesystem' | 'fallback';
  registrationCode: string;
  usageExample: string;
  nextSteps: string[];
}

// =============================================================================
// Template Loading
// =============================================================================

/**
 * Get the templates directory path
 */
function getTemplatesDir(): string {
  // Try multiple possible locations for templates
  const possiblePaths = [
    // Development: templates relative to source
    path.resolve(__dirname, '../../../templates/nodes'),
    // Production: templates relative to dist
    path.resolve(__dirname, '../../templates/nodes'),
    // Monorepo: from package root
    path.resolve(__dirname, '../../../../templates/nodes'),
  ];

  for (const templatePath of possiblePaths) {
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }
  }

  // Fallback to first path (will be created if needed)
  return possiblePaths[0];
}

/**
 * Load a template from the filesystem
 */
function loadTemplate(templateType: NodeTemplateType): string | null {
  const templatesDir = getTemplatesDir();
  const templatePath = path.join(templatesDir, `${templateType}.ts`);

  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf-8');
  }

  return null;
}

/**
 * Fallback templates (used when external templates are not available)
 * These are minimal templates to ensure the tool always works
 */
const FALLBACK_TEMPLATES: Record<NodeTemplateType, string> = {
  'logic-validator': `/**
 * {{nodeType}} - Validation node
 * {{description}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  rules?: Array<{ type: string; params?: unknown; message?: string }>;
}

export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  constructor(private config: {{pascalCase}}Config = {}) {}

  async process(signal: Signal): Promise<Signal[]> {
    const value = signal.payload;
    const errors: string[] = [];
    
    // TODO: Add validation logic
    
    return [{
      type: errors.length === 0 ? '{{upperCase}}.SUCCESS' : '{{upperCase}}.FAILURE',
      payload: errors.length === 0 ? { value } : { errors },
      timestamp: new Date(),
      sourceNodeId: signal.sourceNodeId,
    }];
  }
}

export default {{pascalCase}}Node;
`,

  'logic-transformer': `/**
 * {{nodeType}} - Transformation node
 * {{description}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  mappings?: Record<string, string>;
}

export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  constructor(private config: {{pascalCase}}Config = {}) {}

  async process(signal: Signal): Promise<Signal[]> {
    let result = signal.payload;
    
    // TODO: Add transformation logic
    
    return [{
      type: '{{upperCase}}.OUTPUT',
      payload: result,
      timestamp: new Date(),
      sourceNodeId: signal.sourceNodeId,
    }];
  }
}

export default {{pascalCase}}Node;
`,

  'logic-domain-adapter': `/**
 * {{nodeType}} - Domain adapter node
 * {{description}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  outputSchema?: Record<string, string>;
  defaults?: Record<string, unknown>;
}

export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  constructor(private config: {{pascalCase}}Config = {}) {}

  async process(signal: Signal): Promise<Signal[]> {
    let data = signal.payload;
    
    // TODO: Add adaptation logic
    
    return [{
      type: '{{upperCase}}.ADAPTED',
      payload: data,
      timestamp: new Date(),
      sourceNodeId: signal.sourceNodeId,
    }];
  }
}

export default {{pascalCase}}Node;
`,

  'control-input': `/**
 * {{nodeType}} - Input control node
 * {{description}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  inputType?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
}

export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  constructor(private config: {{pascalCase}}Config = {}) {}

  async process(signal: Signal): Promise<Signal[]> {
    return [{
      type: '{{upperCase}}.CHANGE',
      payload: { value: signal.payload },
      timestamp: new Date(),
      sourceNodeId: signal.sourceNodeId,
    }];
  }
}

export default {{pascalCase}}Node;
`,

  'control-display': `/**
 * {{nodeType}} - Display control node
 * {{description}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  format?: 'text' | 'json' | 'table';
}

export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  constructor(private config: {{pascalCase}}Config = {}) {}

  async process(signal: Signal): Promise<Signal[]> {
    // Display nodes consume but don't emit
    console.log(signal.payload);
    return [];
  }
}

export default {{pascalCase}}Node;
`,

  'infra-api-client': `/**
 * {{nodeType}} - API client node
 * {{description}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  constructor(private config: {{pascalCase}}Config = {}) {}

  async process(signal: Signal): Promise<Signal[]> {
    try {
      // TODO: Add API call logic
      return [{
        type: '{{upperCase}}.SUCCESS',
        payload: { data: signal.payload },
        timestamp: new Date(),
        sourceNodeId: signal.sourceNodeId,
      }];
    } catch (error) {
      return [{
        type: '{{upperCase}}.ERROR',
        payload: { error: String(error) },
        timestamp: new Date(),
        sourceNodeId: signal.sourceNodeId,
      }];
    }
  }
}

export default {{pascalCase}}Node;
`,

  'infra-storage-local': `/**
 * {{nodeType}} - Local storage node
 * {{description}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  keyPrefix?: string;
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';
}

export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  constructor(private config: {{pascalCase}}Config = {}) {}

  async process(signal: Signal): Promise<Signal[]> {
    const { action, key, value } = signal.payload as any;
    
    // TODO: Add storage logic
    
    return [{
      type: '{{upperCase}}.COMPLETED',
      payload: { action, key },
      timestamp: new Date(),
      sourceNodeId: signal.sourceNodeId,
    }];
  }
}

export default {{pascalCase}}Node;
`,

  'ui-component': `/**
 * {{nodeType}} - UI component node
 * {{description}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  componentType?: 'button' | 'form' | 'card' | 'modal';
  props?: Record<string, unknown>;
}

export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  private state: Record<string, unknown> = {};
  
  constructor(private config: {{pascalCase}}Config = {}) {
    if (config.props) this.state = { ...config.props };
  }

  async process(signal: Signal): Promise<Signal[]> {
    this.state = { ...this.state, ...(signal.payload as any) };
    return [];
  }
  
  getState() { return { ...this.state }; }
}

export default {{pascalCase}}Node;
`,
};

// =============================================================================
// Template Processing
// =============================================================================

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_.]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Extract category from node type
 */
function extractCategory(nodeType: string): NodeCategory {
  const [category] = nodeType.split('.');
  if (['logic', 'control', 'infra', 'ui'].includes(category)) {
    return category as NodeCategory;
  }
  return 'logic';
}

/**
 * Infer template type from node type
 */
function inferTemplateType(nodeType: string): NodeTemplateType {
  const [category, subtype] = nodeType.split('.');

  if (category === 'logic') {
    if (subtype?.includes('valid')) return 'logic-validator';
    if (subtype?.includes('transform')) return 'logic-transformer';
    if (subtype?.includes('adapter')) return 'logic-domain-adapter';
    return 'logic-transformer';
  }
  if (category === 'control') {
    if (subtype?.includes('input')) return 'control-input';
    if (subtype?.includes('display')) return 'control-display';
    return 'control-input';
  }
  if (category === 'infra') {
    if (subtype?.includes('api') || subtype?.includes('client')) return 'infra-api-client';
    if (subtype?.includes('storage')) return 'infra-storage-local';
    return 'infra-api-client';
  }
  if (category === 'ui') {
    return 'ui-component';
  }

  return 'logic-transformer';
}

/**
 * Process template with variable substitution
 */
function processTemplate(
  template: string,
  nodeType: string,
  category: NodeCategory,
  options: { description?: string; author?: string }
): string {
  const pascalCase = toPascalCase(nodeType);
  const upperCase = nodeType.replace(/\./g, '_').toUpperCase();

  let result = template;

  // Simple variable replacement
  result = result.replace(/\{\{nodeType\}\}/g, nodeType);
  result = result.replace(/\{\{pascalCase\}\}/g, pascalCase);
  result = result.replace(/\{\{upperCase\}\}/g, upperCase);
  result = result.replace(/\{\{category\}\}/g, category);

  // Description
  if (options.description) {
    result = result.replace(/\{\{description\}\}/g, options.description);
    result = result.replace(/\{\{#if description\}\}(.+?)\{\{\/if\}\}/g, options.description);
  } else {
    result = result.replace(/\{\{description\}\}/g, '');
    result = result.replace(/\{\{#if description\}\}(.+?)\{\{\/if\}\}/gs, '');
  }

  // Author
  if (options.author) {
    result = result.replace(/\{\{author\}\}/g, options.author);
    result = result.replace(/\{\{#if author\}\}@author \{\{author\}\}\{\{\/if\}\}/g, `@author ${options.author}`);
  } else {
    result = result.replace(/\{\{author\}\}/g, '');
    result = result.replace(/\{\{#if author\}\}.+?\{\{\/if\}\}/gs, '');
  }

  return result;
}

// =============================================================================
// ScaffoldNodeImplTool Class
// =============================================================================

export class ScaffoldNodeImplTool {
  readonly definition: MCPToolDefinition = {
    name: 'scaffold_node_impl',
    description: 'Generates working node implementations from templates. Creates TypeScript files with proper structure, config interfaces, and JSDoc comments for custom node types. Templates are loaded from external files for easy customization.',
    parameters: [
      {
        name: 'nodeType',
        type: 'string',
        required: true,
        description: 'Node type in CATEGORY.SUBTYPE format (e.g., "logic.email-validator")'
      },
      {
        name: 'outputPath',
        type: 'string',
        required: true,
        description: 'Output directory for generated files'
      },
      {
        name: 'templateType',
        type: 'string',
        required: false,
        description: 'Template type: logic-validator, logic-transformer, logic-domain-adapter, control-input, control-display, infra-api-client, infra-storage-local, ui-component'
      },
      {
        name: 'includeConfigInterface',
        type: 'boolean',
        required: false,
        description: 'Include TypeScript config interface (default: true)'
      },
      {
        name: 'includeJSDoc',
        type: 'boolean',
        required: false,
        description: 'Include JSDoc comments (default: true)'
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Description of the node'
      },
      {
        name: 'author',
        type: 'string',
        required: false,
        description: 'Author name'
      }
    ],
    returnType: 'ScaffoldNodeImplResult',
    category: 'bridge',
    bestFor: ['node development', 'extensibility', 'custom nodes', 'code generation'],
    complexity: 'low'
  };

  async execute(input: ScaffoldNodeImplRequest): Promise<MCPToolResult<ScaffoldNodeImplResult>> {
    try {
      // Validate node type format
      if (!input.nodeType.includes('.')) {
        return {
          success: false,
          error: 'Invalid node type format. Must be CATEGORY.SUBTYPE (e.g., "logic.email-validator")'
        };
      }

      const category = extractCategory(input.nodeType);
      const templateType = input.templateType || inferTemplateType(input.nodeType);

      // Create output directory if needed
      if (!fs.existsSync(input.outputPath)) {
        fs.mkdirSync(input.outputPath, { recursive: true });
      }

      // Try to load template from filesystem, fall back to built-in
      let template = loadTemplate(templateType);
      let templateSource: 'filesystem' | 'fallback' = 'filesystem';

      if (!template) {
        template = FALLBACK_TEMPLATES[templateType];
        templateSource = 'fallback';
      }

      if (!template) {
        return {
          success: false,
          error: `Template not found: ${templateType}. Template directory: ${getTemplatesDir()}`
        };
      }

      // Process template
      const nodeContent = processTemplate(template, input.nodeType, category, {
        description: input.description,
        author: input.author,
      });

      // Generate config interface if requested
      let configContent: string | undefined;
      if (input.includeConfigInterface !== false) {
        configContent = this.generateConfigFile(input.nodeType, category, input.description);
      }

      // Generate index file
      const indexContent = this.generateIndexFile(input.nodeType);

      // Prepare files
      const files: GeneratedNodeFile[] = [
        {
          filename: `${toPascalCase(input.nodeType)}Node.ts`,
          content: nodeContent,
          description: `Node implementation for ${input.nodeType}`,
        },
      ];

      if (configContent) {
        files.push({
          filename: `${toPascalCase(input.nodeType)}Config.ts`,
          content: configContent,
          description: `Configuration interface for ${input.nodeType}`,
        });
      }

      files.push({
        filename: 'index.ts',
        content: indexContent,
        description: 'Barrel export file',
      });

      // Write files
      for (const file of files) {
        const filePath = path.join(input.outputPath, file.filename);
        fs.writeFileSync(filePath, file.content);
      }

      // Generate registration code
      const registrationCode = this.generateRegistrationCode(input.nodeType);

      // Generate usage example
      const usageExample = this.generateUsageExample(input.nodeType);

      // Generate next steps
      const nextSteps = [
        `1. Review the generated files in ${input.outputPath}`,
        `2. Customize the implementation for your specific needs`,
        `3. Register the node in your NodeFactory: ${registrationCode.split('\n')[0]}`,
        `4. Test the node using verify_node tool`,
        `5. Add the node to your cartridge configuration`,
        ...(templateSource === 'filesystem'
          ? [`6. Template loaded from: ${getTemplatesDir()}`]
          : [`6. Using built-in fallback template. Create custom templates in ${getTemplatesDir()}`]),
      ];

      // Project Auto-Wiring (App Side)
      try {
        const className = toPascalCase(input.nodeType);
        let currentDir = input.outputPath;
        let customNodesPath: string | null = null;
        let maxDepth = 10;

        while (currentDir && currentDir !== path.parse(currentDir).root && maxDepth > 0) {
          const possiblePath = path.join(currentDir, 'src', 'integration', 'CustomNodes.ts');
          if (fs.existsSync(possiblePath)) {
            customNodesPath = possiblePath;
            break;
          }
          currentDir = path.dirname(currentDir);
          maxDepth--;
        }

        if (customNodesPath && fs.existsSync(customNodesPath)) {
          let customNodesContent = fs.readFileSync(customNodesPath, 'utf-8');
          let relativePath = path.relative(path.dirname(customNodesPath), input.outputPath).replace(/\\/g, '/');
          if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
          }

          const importStatement = `import ${className}Node from '${relativePath}/${className}Node';\n`;
          if (!customNodesContent.includes(importStatement)) {
            customNodesContent = importStatement + customNodesContent;
          }

          const registerStatement = `  factory.registerNodeType('${input.nodeType}', ${className}Node);\n`;
          if (!customNodesContent.includes(registerStatement)) {
            customNodesContent = customNodesContent.replace(
              /export function registerCustomNodes\(factory: any\) \{/,
              `export function registerCustomNodes(factory: any) {\n${registerStatement}`
            );
          }

          fs.writeFileSync(customNodesPath, customNodesContent);
        }
      } catch (err) {
        console.error('Auto-wiring failed:', err);
      }

      // JIT Memory Injection (MCP Testing Side)
      try {
        // JIT Compile the TS code to CommonJS
        const jsCode = ts.transpile(nodeContent, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS });
        const mod = { exports: {} as any };
        // Mock require for core Graph-OS dependencies
        const requireFn = (moduleName: string) => {
          if (moduleName === '@graph-os/core') return require('@graph-os/core');
          if (moduleName === '@graph-os/runtime') return require('@graph-os/runtime');
          return require(moduleName);
        };
        // Evaluate the module in memory
        new Function('exports', 'require', 'module', jsCode)(mod.exports, requireFn, mod);
        const NodeClass = mod.exports.default;

        // Bridge the BaseNode to a NodeImplementation for the testing registry
        globalNodeRegistry.register({
          type: input.nodeType,
          process: async (signal: any, config: any, nodeId: string) => {
            let instance;
            try {
              instance = new NodeClass(nodeId, config);
            } catch {
              instance = new NodeClass(config); // fallback just in case
            }
            if (typeof instance.initialize === 'function') {
              await instance.initialize();
            }
            const result = await instance.process(signal);
            return result ? (Array.isArray(result) ? result : [result]) : null;
          }
        });

        // Ensure the node has an initialize method for the runtime
        if (typeof NodeClass.prototype.initialize !== 'function') {
          NodeClass.prototype.initialize = async function () { };
        }

        // Register to the global runtime factory singleton so run_cartridge can use it
        nodeFactory.registerNodeType(input.nodeType, NodeClass);
      } catch (err) {
        console.error('JIT compilation error:', err);
      }

      return {
        success: true,
        data: {
          success: true,
          nodeType: input.nodeType,
          category,
          files,
          templateUsed: templateType,
          templateSource,
          registrationCode,
          usageExample,
          nextSteps,
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private generateConfigFile(nodeType: string, category: NodeCategory, description?: string): string {
    const className = toPascalCase(nodeType);
    return `/**
 * Configuration interface for ${nodeType}
 * ${description ? `* ${description}` : ''}
 */

import type { NodeConfig } from '@graph-os/core';

export interface ${className}Config extends NodeConfig {
  // Add your configuration properties here
  // Example:
  // enabled?: boolean;
  // timeout?: number;
}

export default ${className}Config;
`;
  }

  private generateIndexFile(nodeType: string): string {
    const className = toPascalCase(nodeType);
    return `/**
 * ${nodeType} node exports
 */

export { ${className}Node, default as ${className}NodeDefault } from './${className}Node';
export type { ${className}Config } from './${className}Config';
`;
  }

  private generateRegistrationCode(nodeType: string): string {
    const className = toPascalCase(nodeType);
    return `import { ${className}Node } from './nodes/${className}Node';

// Register in NodeFactory
nodeFactory.register('${nodeType}', (config) => new ${className}Node(config));

// Or add to built-in types
BUILTIN_NODE_TYPES['${nodeType}'] = {
  type: '${nodeType}',
  description: 'Add your description here',
  category: '${extractCategory(nodeType)}',
};
`;
  }

  private generateUsageExample(nodeType: string): string {
    const className = toPascalCase(nodeType);
    return `// Using ${nodeType} in a cartridge
{
  "id": "my-${nodeType.replace(/\./g, '-')}",
  "type": "${nodeType}",
  "config": {
    // Add your configuration here
  }
}

// Using in code
import { ${className}Node } from './nodes/${className}Node';

const node = new ${className}Node({
  // Add your config here
});

const result = await node.process({
  type: 'INPUT.SIGNAL',
  payload: { /* your data */ },
  timestamp: new Date(),
  sourceNodeId: 'source',
});
`;
  }

  validateParams(params: unknown): params is ScaffoldNodeImplRequest {
    if (typeof params !== 'object' || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.nodeType === 'string' && typeof p.outputPath === 'string';
  }
}

/**
 * Factory function to create a ScaffoldNodeImplTool instance
 */
export function createScaffoldNodeImplTool(): ScaffoldNodeImplTool {
  return new ScaffoldNodeImplTool();
}
